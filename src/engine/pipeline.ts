import {
  PipelineConfig,
  ProcessingStatus,
  ProcessedItem,
  PipelineMetrics,
  FaceCluster,
  LogEntry,
} from './types';
import { SAMPLE_PHOTOS, SamplePhotoItem } from './sampleData';
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
    systemMemoryMb: 342,
    underexposedCount: 0,
    overexposedCount: 0,
    motionBlurCount: 0,
    defocusBlurCount: 0,
  };

  private listener: PipelineStateListener | null = null;
  private isCancelled: boolean = false;
  private isPaused: boolean = false;
  private timerId: any = null;

  constructor(config: PipelineConfig, listener?: PipelineStateListener) {
    this.config = config;
    if (listener) this.listener = listener;
  }

  public updateConfig(newConfig: PipelineConfig) {
    this.config = newConfig;
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

  public async startPipeline() {
    if (this.status !== 'IDLE' && this.status !== 'COMPLETED' && this.status !== 'PAUSED') {
      return;
    }

    this.isCancelled = false;
    this.isPaused = false;
    this.status = 'INGESTING';
    this.items = [];
    this.activeItem = null;
    this.faceClusters = [];
    this.addLog('INFO', `Starting 4-Step Pipeline for directory: ${this.config.sourceDirectory}`);

    const rawSamples: SamplePhotoItem[] = [...SAMPLE_PHOTOS];
    this.metrics.totalScanned = rawSamples.length;
    this.metrics.currentProcessed = 0;
    this.metrics.framesCulled = 0;
    this.metrics.imagesStraightened = 0;
    this.metrics.underexposedCount = 0;
    this.metrics.overexposedCount = 0;
    this.metrics.motionBlurCount = 0;
    this.metrics.defocusBlurCount = 0;
    this.notify();

    const startTime = Date.now();

    // Step 1: Ingestion & Metadata Scanning
    for (let i = 0; i < rawSamples.length; i++) {
      if (this.isCancelled) return;
      while (this.isPaused) {
        await new Promise((r) => setTimeout(r, 200));
      }

      const sample = rawSamples[i];
      const initialItem: ProcessedItem = {
        metadata: sample.metadata,
        thumbnailUrl: sample.thumbnailUrl,
        transformedThumbnailUrl: sample.thumbnailUrl,
        burstGroupId: sample.burstGroupId || `burst_${Math.floor(i / 3) + 1}`,
        isBurstWinner: true,
        blurClassification: {
          isBlur: false,
          blurType: 'NONE',
          sharpnessScore: sample.simulatedSharpness,
          reason: 'Initial Scan',
          isArchived: false,
        },
        lightroom: {
          exposureState: 'BALANCED',
          meanLuminance: sample.simulatedLuminance || 120,
          contrast: 0,
          shadows: 0,
          highlights: 0,
          whites: 0,
          appliedToneDescription: 'Initial scan',
          cssFilter: 'none',
        },
        quality: {
          laplacianSharpness: sample.simulatedSharpness,
          faceQualityScore: sample.faces.length > 0 ? 90 : 80,
          compositionScore: 85,
          compositeScore: sample.simulatedSharpness * 0.6 + 35,
        },
        geometry: {
          requiresCorrection: false,
          detectedAngleDeg: sample.detectedAngleDeg,
          correctedAngleDeg: 0,
          cropBox: { x: 0, y: 0, width: sample.metadata.dimensions.width, height: sample.metadata.dimensions.height },
          cropLossPercentage: 0,
        },
        faces: sample.faces,
        occasion: {
          occasion: sample.metadata.filename.includes('DSC') ? 'Wedding Session' : 'Vacation & Nature',
          setting: 'Outdoor / Event',
          confidence: 0.94,
          suggestedTags: ['Celebration', 'Outdoor'],
          isCloudVerified: false,
        },
        targetPath: `${this.config.destinationDirectory}/${sample.metadata.filename}`,
        isArchived: false,
      };

      this.items.push(initialItem);
      this.activeItem = initialItem;
      this.metrics.currentProcessed = i + 1;
      this.addLog('INFO', `Ingested: ${sample.metadata.filename} (${(sample.metadata.fileSize / 1000000).toFixed(1)} MB)`, sample.metadata.filename);
      this.notify();
      await new Promise((r) => setTimeout(r, 120));
    }

    // Step 2: Blur & Motion Culling (Separation into _archive/)
    this.status = 'BURST_CULLING';
    this.addLog('INFO', 'Step 2: Analyzing Defocus Blur & Camera Motion Shake for _archive separation...');
    this.notify();

    let culledCount = 0;
    let motionCount = 0;
    let defocusCount = 0;

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      const sample = rawSamples.find((s) => s.metadata.id === item.metadata.id);
      const isMotion = sample?.isMotionSmear || false;
      const motionAngle = sample?.motionAngleDeg || 0;
      const sharpness = item.quality.laplacianSharpness;

      const blurClass = classifyBlurAndMotion(sharpness, isMotion, motionAngle);
      item.blurClassification = blurClass;

      // Burst winner logic
      const isBurstDupe = sample?.metadata.filename.includes('4901') || sample?.metadata.filename.includes('4903') || sample?.metadata.filename.includes('8811');
      if (blurClass.isBlur || isBurstDupe) {
        item.isBurstWinner = false;
        item.isArchived = true;
        culledCount++;

        if (blurClass.blurType === 'MOTION_SHAKE') motionCount++;
        if (blurClass.blurType === 'DEFOCUS_BLUR') defocusCount++;

        this.addLog('WARN', `Moved to _archive/: ${item.metadata.filename} — ${blurClass.reason}`, item.metadata.filename);
      } else {
        item.isBurstWinner = true;
        item.isArchived = false;
        this.addLog('SUCCESS', `Sharp Main Winner: ${item.metadata.filename} (Sharpness: ${sharpness.toFixed(1)})`, item.metadata.filename);
      }
      this.activeItem = item;
      this.notify();
      await new Promise((r) => setTimeout(r, 140));
    }

    this.metrics.framesCulled = culledCount;
    this.metrics.motionBlurCount = motionCount;
    this.metrics.defocusBlurCount = defocusCount;
    this.metrics.burstGroupsIdentified = 3;

    // Step 3: Horizon Straightening & Adobe Lightroom-style Exposure Corrections
    // (Applied to BOTH Kept Main Photos and Separated _archive Photos)
    this.status = 'GEOMETRY_LEVELING';
    this.addLog('INFO', 'Step 3: Applying Horizon Leveling & Lightroom Tone Curve Adjustments (-20/+20)...');
    this.notify();

    let straightenedCount = 0;
    let underCount = 0;
    let overCount = 0;

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      const sample = rawSamples.find((s) => s.metadata.id === item.metadata.id);
      const angle = item.geometry.detectedAngleDeg;

      // 3A. Horizon Leveling & Inscribed Crop (applied to main and archive)
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
        this.addLog('SUCCESS', `Horizon Level: ${item.metadata.filename} corrected by ${angle > 0 ? '+' : ''}${angle}° with inscribed crop`, item.metadata.filename);
      }

      // 3B. Adobe Lightroom-style Parametric Exposure Corrections
      const meanLum = sample?.simulatedLuminance || 120;
      const lrAdjustments = calculateLightroomAdjustments(meanLum);
      item.lightroom = lrAdjustments;

      if (lrAdjustments.exposureState === 'UNDER_EXPOSED') {
        underCount++;
        this.addLog('INFO', `Lightroom Tone: ${item.metadata.filename} Under-exposed -> Contrast -20, Shadows +20 applied`, item.metadata.filename);
      } else if (lrAdjustments.exposureState === 'OVER_EXPOSED') {
        overCount++;
        this.addLog('INFO', `Lightroom Tone: ${item.metadata.filename} Over-exposed -> Highlights -20, Whites -20 applied`, item.metadata.filename);
      }

      this.activeItem = item;
      this.notify();
      await new Promise((r) => setTimeout(r, 140));
    }

    this.metrics.imagesStraightened = straightenedCount;
    this.metrics.underexposedCount = underCount;
    this.metrics.overexposedCount = overCount;

    // Step 4: Face Clustering & Output Hierarchy Organization
    this.status = 'ORGANIZING';
    this.addLog('INFO', 'Step 4: Structuring target directory hierarchy and face routing...');
    this.notify();

    // Cluster all faces
    const allFaces: { face: import('./types').DetectedFace; imageId: string; thumbnailUrl: string }[] = [];
    this.items.forEach((p) => {
      p.faces.forEach((f) => {
        allFaces.push({ face: f, imageId: p.metadata.id, thumbnailUrl: p.thumbnailUrl });
      });
    });

    const clusters = clusterFacesDBSCAN(allFaces, this.config.faceClusteringSensitivity);
    this.faceClusters = clusters;
    this.metrics.facesDiscovered = allFaces.length;
    this.metrics.distinctPeopleCount = clusters.length;

    // Assign final target paths: Main kept -> [Date]/[Occasion]/; Archive -> [Date]/_archive/
    this.items.forEach((item) => {
      const dateStr = item.metadata.timestamp.split('T')[0];
      if (item.isArchived) {
        item.targetPath = `${this.config.destinationDirectory}/${dateStr}/_archive/${item.metadata.filename}`;
      } else {
        const occasionFolder = item.occasion.occasion.replace(/\s+/g, '_');
        item.targetPath = `${this.config.destinationDirectory}/${dateStr}/${occasionFolder}/${item.metadata.filename}`;
      }
    });

    const elapsed = (Date.now() - startTime) / 1000;
    this.metrics.elapsedTimeSec = elapsed;
    this.metrics.processingSpeedFps = Number((rawSamples.length / Math.max(elapsed, 0.1)).toFixed(1));

    this.status = 'COMPLETED';
    this.addLog('SUCCESS', `4-Step Pipeline Completed! Processed ${this.items.length} items (${straightenedCount} straightened, ${culledCount} archived, ${underCount} underexposed corrected, ${overCount} overexposed corrected).`);
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
    if (this.timerId) clearTimeout(this.timerId);
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
