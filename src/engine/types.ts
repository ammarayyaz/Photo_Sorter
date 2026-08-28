export type FileFormat =
  | 'JPEG'
  | 'PNG'
  | 'WEBP'
  | 'HEIC'
  | 'AVIF'
  | 'TIFF'
  | 'BMP'
  | 'GIF'
  | 'RAW_CR3'
  | 'RAW_NEF'
  | 'RAW_ARW'
  | 'DNG'
  | 'RAW_FUJI'
  | 'RAW_OLYMPUS'
  | 'RAW_PANASONIC'
  | 'RAW_GENERIC';

export interface ImageMetadata {
  id: string;
  filename: string;
  originalPath: string;
  fileSize: number; // in bytes
  format: FileFormat;
  dimensions: { width: number; height: number };
  timestamp: string; // ISO string
  cameraModel: string;
  lens: string;
  focalLength: string;
  iso: number;
  exposureTime: string;
  fNumber: string;
  pHash: string; // 64-bit binary string representation
}

export type ExposureCategory = 'UNDER_EXPOSED' | 'OVER_EXPOSED' | 'BALANCED';

export interface LightroomAdjustments {
  exposureState: ExposureCategory;
  meanLuminance: number;       // 0 - 255
  contrast: number;            // -20 for underexposed, 0 for balanced
  shadows: number;             // +20 for underexposed, 0 for balanced
  highlights: number;          // -20 for overexposed, 0 for balanced
  whites: number;              // -20 for overexposed, 0 for balanced
  appliedToneDescription: string;
  cssFilter: string;           // Simulated browser CSS filter string for live rendering
}

export type BlurType = 'NONE' | 'DEFOCUS_BLUR' | 'MOTION_SHAKE';

export interface BlurClassification {
  isBlur: boolean;
  blurType: BlurType;
  motionDirectionDeg?: number;
  sharpnessScore: number;
  reason: string;
  isArchived: boolean;
}

export interface QualityMetrics {
  laplacianSharpness: number; // 0 - 100
  faceQualityScore: number;   // 0 - 100 (EAR + blur + smile)
  compositionScore: number;   // 0 - 100
  compositeScore: number;     // weighted combination
}

export interface GeometryCorrection {
  requiresCorrection: boolean;
  detectedAngleDeg: number;
  correctedAngleDeg: number;
  cropBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  cropLossPercentage: number;
}

export interface DetectedFace {
  faceId: string;
  boundingBox: { x: number; y: number; width: number; height: number };
  eyeOpenness: number; // 0.0 - 1.0
  isSmiling: boolean;
  sharpness: number;
  embedding: number[]; // 512-D vector
  assignedClusterId?: string;
}

export interface BurstGroup {
  groupId: string;
  timestampRange: { start: string; end: string };
  imageIds: string[];
  primaryWinnerId: string;
  rejectedIds: string[];
}

export interface FaceCluster {
  clusterId: string;
  name: string; // e.g. "Alice", "Bob", or "Person 1"
  sampleAvatarUrl: string;
  imageCount: number;
  associatedImageIds: string[];
  centroid: number[];
}

export interface SceneOccasion {
  occasion: string; // e.g. "Wedding Ceremony", "Birthday Party"
  setting: string;  // e.g. "Outdoor Garden", "Beachfront"
  confidence: number;
  suggestedTags: string[];
  isCloudVerified: boolean;
}

export type ProcessingStatus = 
  | 'IDLE' 
  | 'INGESTING' 
  | 'BURST_CULLING' 
  | 'GEOMETRY_LEVELING' 
  | 'FACE_CLUSTERING' 
  | 'OCCASION_TAGGING' 
  | 'ORGANIZING' 
  | 'COMPLETED' 
  | 'PAUSED' 
  | 'ERROR';

export interface ProcessedItem {
  metadata: ImageMetadata;
  thumbnailUrl: string;
  transformedThumbnailUrl: string;
  burstGroupId: string;
  isBurstWinner: boolean;
  blurClassification: BlurClassification;
  lightroom: LightroomAdjustments;
  quality: QualityMetrics;
  geometry: GeometryCorrection;
  faces: DetectedFace[];
  occasion: SceneOccasion;
  targetPath: string;
  isArchived: boolean;
}

export interface PipelineConfig {
  sourceDirectory: string;
  destinationDirectory: string;
  geminiApiKey: string;
  autoStraighten: boolean;
  straightenThresholdDeg: number;
  inscribedAutoCrop: boolean;
  cullBursts: boolean;
  burstTimeWindowSec: number;
  archiveRejectedBursts: boolean;
  clusterFaces: boolean;
  faceClusteringSensitivity: number; // DBSCAN epsilon
  outputFormat: 'JPEG' | 'WEBP' | 'ORIGINAL';
  jpegQuality: number;
}

export interface PipelineMetrics {
  totalScanned: number;
  currentProcessed: number;
  burstGroupsIdentified: number;
  framesCulled: number;
  imagesStraightened: number;
  avgRotationAppliedDeg: number;
  facesDiscovered: number;
  distinctPeopleCount: number;
  occasionsIdentified: number;
  processingSpeedFps: number;
  elapsedTimeSec: number;
  estimatedTimeRemainingSec: number;
  systemMemoryMb: number;
  underexposedCount: number;
  overexposedCount: number;
  motionBlurCount: number;
  defocusBlurCount: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR';
  filename?: string;
  message: string;
}
