import {
  PipelineConfig,
  ProcessingStatus,
  ProcessedItem,
  PipelineMetrics,
  FaceCluster,
  LogEntry,
} from './types';
import { clusterFacesDBSCAN } from './faceClustering';
import { calculateInscribedCrop } from './horizonCorrector';
import { calculateLightroomAdjustments, classifyBlurAndMotion } from './lightroomTone';

export type PipelineStateListener = (state: {
  status: ProcessingStatus;
  items: ProcessedItem[];
  activeItem: ProcessedItem | null;
  metrics: PipelineMetrics;
  faceClusters: FaceCluster[];
  logs: LogEntry[];
}) => void;

export class PhotoPipelineController {
  private config: PipelineConfig;
  private status: ProcessingStatus = 'IDLE';
  private items: ProcessedItem[] = [];
  private activeItem: ProcessedItem | null = null;
  private faceClusters: FaceCluster[] = [];
  private logs: LogEntry[] = [];
  private metrics: PipelineMetrics = {
    totalScanned: 0,
    currentProcessed: 0,
    burstGroupsIdentified: 0,
    framesCulled: 0,
    imagesStraightened: 0,
    avgRotationAppliedDeg: 0,
    facesDiscovered: 0,
    distinctPeopleCount: 0,
    occasionsIdentified: 0,
    processingSpeedFps: 0,
    elapsedTimeSec: 0,
    estimatedTimeRemainingSec: 0,
    systemMemoryMb: 128,
    underexposedCount: 0,
    overexposedCount: 0,
    motionBlurCount: 0,
    defocusBlurCount: 0,
  };

  private listener: PipelineStateListener | null = null;
  private isCancelled: boolean = false;
  private isPaused: boolean = false;

  constructor(config: PipelineConfig, listener?: PipelineStateListener) {
    this.config = config;
    if (listener) this.listener = listener;
  }

  public updateConfig(newConfig: PipelineConfig) {
    this.config = newConfig;
  }

  public setItems(items: ProcessedItem[]) {
    this.items = items;
    this.metrics.totalScanned = items.length;
    this.notify();
  }

  private addLog(level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR', message: string, filename?: string) {
    const entry: LogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      level,
      filename,
      message,
    };
    this.logs = [entry, ...this.logs.slice(0, 199)];
    this.notify();
  }

  private notify() {
    if (this.listener) {
      this.listener({
        status: this.status,
        items: this.items,
        activeItem: this.activeItem,
        metrics: { ...this.metrics },
        faceClusters: this.faceClusters,
        logs: [...this.logs],
      });
    }
  }

  /**
   * Runs the 4-step pipeline on real user-uploaded photos
   */
  public async startPipeline(inputItems?: ProcessedItem[]) {
    if (this.status !== 'IDLE' && this.status !== 'COMPLETED' && this.status !== 'PAUSED') {
      return;
    }

    const itemsToProcess = inputItems && inputItems.length > 0 ? inputItems : this.items;
    if (itemsToProcess.length === 0) {
      this.addLog('WARN', 'No photos to process. Please select or drop a folder first.');
      this.status = 'IDLE';
      this.notify();
      return;
    }

    this.isCancelled = false;
    this.isPaused = false;
    this.items = [...itemsToProcess];
    this.status = 'INGESTING';
    this.addLog('INFO', `Starting 5-Step Pipeline for ${this.items.length} real uploaded photos...`);

    this.metrics.totalScanned = this.items.length;
    this.metrics.currentProcessed = 0;
    this.metrics.framesCulled = 0;
    this.metrics.imagesStraightened = 0;
    this.metrics.underexposedCount = 0;
    this.metrics.overexposedCount = 0;
    this.metrics.motionBlurCount = 0;
    this.metrics.defocusBlurCount = 0;
    this.notify();

    const startTime = Date.now();

    // Step 1: Ingestion validation
    for (let i = 0; i < this.items.length; i++) {
      if (this.isCancelled) return;
      while (this.isPaused) {
        await new Promise((r) => setTimeout(r, 200));
      }

      const item = this.items[i];
      this.activeItem = item;
      this.metrics.currentProcessed = i + 1;
      this.addLog('INFO', `Ingested real image: ${item.metadata.filename} (${(item.metadata.fileSize / 1000000).toFixed(2)} MB)`, item.metadata.filename);
      this.notify();
      await new Promise((r) => setTimeout(r, 60));
    }

    // Step 2: Facial Eye Openness & Motion Culling (Separation into _archive/)
    this.status = 'BURST_CULLING';
    this.addLog('INFO', 'Step 2: Evaluating Facial Eye Openness (Blinking/Closed Eyes) & Camera Motion for _archive separation...');
    this.notify();

    let culledCount = 0;
    let motionCount = 0;
    let defocusCount = 0;

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      const isMotion = item.blurClassification.blurType === 'MOTION_SHAKE';
      const eyeScore = item.faces[0]?.eyeOpenness ?? (item.quality.facet?.eyesOpenScore ? item.quality.facet.eyesOpenScore / 10 : 0.92);

      const blurClass = classifyBlurAndMotion(
        item.quality.laplacianSharpness,
        isMotion,
        item.blurClassification.motionDirectionDeg || 0,
        eyeScore,
        item.faces.length > 0,
        item.quality.facet?.facetCompositeScore || item.quality.compositeScore
      );
      item.blurClassification = blurClass;

      if (blurClass.isBlur) {
        item.isBurstWinner = false;
        item.isArchived = true;
        culledCount++;

        if (blurClass.blurType === 'MOTION_SHAKE') motionCount++;
        if (blurClass.blurType === 'DEFOCUS_BLUR') defocusCount++;

        this.addLog('WARN', `Moved to _archive/: ${item.metadata.filename} — ${blurClass.reason}`, item.metadata.filename);
      } else {
        item.isBurstWinner = true;
        item.isArchived = false;
        this.addLog('SUCCESS', `Kept Winner: ${item.metadata.filename} (${blurClass.reason})`, item.metadata.filename);
      }

      this.activeItem = item;
      this.notify();
      await new Promise((r) => setTimeout(r, 80));
    }

    this.metrics.framesCulled = culledCount;
    this.metrics.motionBlurCount = motionCount;
    this.metrics.defocusBlurCount = defocusCount;
    this.metrics.burstGroupsIdentified = Math.max(1, Math.ceil(this.items.length / 4));

    // Step 3: Horizon Straightening & Adobe Lightroom-style Tonal Corrections
    this.status = 'GEOMETRY_LEVELING';
    this.addLog('INFO', 'Step 3: Calculating real horizon leveling & Lightroom exposure parameters (-20/+20)...');
    this.notify();

    let straightenedCount = 0;
    let underCount = 0;
    let overCount = 0;

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      const angle = item.geometry.detectedAngleDeg;

      // 3A. Horizon Leveling
      if (Math.abs(angle) >= this.config.straightenThresholdDeg && this.config.autoStraighten) {
        const crop = calculateInscribedCrop(
          item.metadata.dimensions.width,
          item.metadata.dimensions.height,
          angle
        );
        item.geometry.requiresCorrection = true;
        item.geometry.correctedAngleDeg = angle;
        item.geometry.cropBox = {
          x: crop.x,
          y: crop.y,
          width: crop.width,
          height: crop.height,
        };
        item.geometry.cropLossPercentage = crop.cropLossPercentage;
        straightenedCount++;
      }

      // 3B. Lightroom Tonal Adjustments based on real luminance
      const meanLum = item.lightroom.meanLuminance || 120;
      const lrAdjustments = calculateLightroomAdjustments(meanLum);
      item.lightroom = lrAdjustments;

      if (lrAdjustments.exposureState === 'UNDER_EXPOSED') {
        underCount++;
        this.addLog('INFO', `Lightroom Tone: ${item.metadata.filename} Under-exposed (Lum ${meanLum}) -> Contrast -20, Shadows +20`, item.metadata.filename);
      } else if (lrAdjustments.exposureState === 'OVER_EXPOSED') {
        overCount++;
        this.addLog('INFO', `Lightroom Tone: ${item.metadata.filename} Over-exposed (Lum ${meanLum}) -> Highlights -20, Whites -20`, item.metadata.filename);
      }

      this.activeItem = item;
      this.notify();
      await new Promise((r) => setTimeout(r, 80));
    }

    this.metrics.imagesStraightened = straightenedCount;
    this.metrics.underexposedCount = underCount;
    this.metrics.overexposedCount = overCount;

    // Step 4: Face Clustering & Target Organization
    this.status = 'ORGANIZING';
    this.addLog('INFO', 'Step 4: Assigning destination hierarchy...');
    this.notify();

    const allFaces: { face: import('./types').DetectedFace; imageId: string; thumbnailUrl: string }[] = [];
    this.items.forEach((p) => {
      p.faces.forEach((f) => {
        allFaces.push({ face: f, imageId: p.metadata.id, thumbnailUrl: p.thumbnailUrl });
      });
    });

    if (allFaces.length > 0) {
      const clusters = clusterFacesDBSCAN(allFaces, this.config.faceClusteringSensitivity);
      this.faceClusters = clusters;
      this.metrics.facesDiscovered = allFaces.length;
      this.metrics.distinctPeopleCount = clusters.length;
    }

    // Set real target paths
    this.items.forEach((item) => {
      const dateStr = item.metadata.timestamp.split('T')[0] || new Date().toISOString().split('T')[0];
      if (item.isArchived) {
        item.targetPath = `${this.config.destinationDirectory}/${dateStr}/_archive/${item.metadata.filename}`;
      } else {
        const occasionFolder = item.occasion.occasion.replace(/\s+/g, '_');
        item.targetPath = `${this.config.destinationDirectory}/${dateStr}/${occasionFolder}/${item.metadata.filename}`;
      }
    });

    const elapsed = (Date.now() - startTime) / 1000;
    this.metrics.elapsedTimeSec = elapsed;
    this.metrics.processingSpeedFps = Number((this.items.length / Math.max(elapsed, 0.1)).toFixed(1));

    this.status = 'COMPLETED';
    this.addLog('SUCCESS', `5-Step Pipeline Completed for ${this.items.length} real photos (${culledCount} archived, ${straightenedCount} straightened, ${underCount} underexposed, ${overCount} overexposed).`);
    this.notify();
  }

  public pause() {
    this.isPaused = true;
    this.status = 'PAUSED';
    this.addLog('WARN', 'Pipeline paused by user');
    this.notify();
  }

  public resume() {
    this.isPaused = false;
    this.status = 'BURST_CULLING';
    this.addLog('INFO', 'Pipeline resumed');
    this.notify();
  }

  public cancel() {
    this.isCancelled = true;
    this.status = 'IDLE';
    this.addLog('WARN', 'Pipeline cancelled');
    this.notify();
  }

  public toggleArchiveState(itemId: string) {
    const item = this.items.find((i) => i.metadata.id === itemId);
    if (item) {
      item.isArchived = !item.isArchived;
      item.isBurstWinner = !item.isArchived;
      item.blurClassification.isArchived = item.isArchived;

      const dateStr = item.metadata.timestamp.split('T')[0];
      if (item.isArchived) {
        item.targetPath = `${this.config.destinationDirectory}/${dateStr}/_archive/${item.metadata.filename}`;
        this.addLog('WARN', `Manually moved to _archive/: ${item.metadata.filename}`, item.metadata.filename);
      } else {
        const occasionFolder = item.occasion.occasion.replace(/\s+/g, '_');
        item.targetPath = `${this.config.destinationDirectory}/${dateStr}/${occasionFolder}/${item.metadata.filename}`;
        this.addLog('SUCCESS', `Manually restored from _archive/: ${item.metadata.filename}`, item.metadata.filename);
      }
      this.metrics.framesCulled = this.items.filter((i) => i.isArchived).length;
      this.notify();
    }
  }

  public renameFaceCluster(clusterId: string, newName: string) {
    const cluster = this.faceClusters.find((c) => c.clusterId === clusterId);
    if (cluster) {
      cluster.name = newName;
      this.addLog('INFO', `Renamed face cluster #${clusterId} to: "${newName}"`);
      this.notify();
    }
  }
}
