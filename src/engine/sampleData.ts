import { ImageMetadata, DetectedFace } from './types';

// Helper to generate high quality visual SVG data URLs for instant rendering
function createPhotoDataUrl(
  title: string,
  horizonAngle: number,
  bgGrad1: string,
  bgGrad2: string,
  sharpnessText: string,
  faceExpression: string,
  blurType?: string
): string {
  const isMotion = blurType === 'MOTION_SHAKE';
  const isDefocus = blurType === 'DEFOCUS_BLUR';

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <defs>
    <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${bgGrad1}"/>
      <stop offset="100%" stop-color="${bgGrad2}"/>
    </linearGradient>
    ${isMotion ? `
    <filter id="motionBlurFilter">
      <feGaussianBlur stdDeviation="8,1" result="blur"/>
    </filter>` : ''}
    ${isDefocus ? `
    <filter id="defocusBlurFilter">
      <feGaussianBlur stdDeviation="5" result="blur"/>
    </filter>` : ''}
  </defs>

  <!-- Sky / Background -->
  <rect width="800" height="600" fill="url(#skyGrad)"/>

  <!-- Content Group with Potential Blur Filter -->
  <g ${isMotion ? 'filter="url(#motionBlurFilter)"' : isDefocus ? 'filter="url(#defocusBlurFilter)"' : ''}>
    <!-- Tilted Horizon Ground -->
    <g transform="rotate(${horizonAngle}, 400, 380)">
      <rect x="-300" y="380" width="1400" height="400" fill="#0f2b1d" opacity="0.9"/>
      <line x1="-300" y1="380" x2="1100" y2="380" stroke="${Math.abs(horizonAngle) > 0.5 ? '#f87171' : '#34d399'}" stroke-width="3" stroke-dasharray="8 6"/>
    </g>

    <!-- Scenery Elements -->
    <polygon points="120,380 260,210 400,380" fill="rgba(15, 23, 42, 0.6)"/>
    <polygon points="320,380 480,180 640,380" fill="rgba(30, 41, 59, 0.7)"/>

    <!-- Person Silhouette & Face Target -->
    <circle cx="400" cy="290" r="45" fill="#fbcfe8"/>
    <rect x="360" y="340" width="80" height="120" rx="20" fill="#1e293b"/>
    
    <circle cx="388" cy="285" r="5" fill="#1e293b"/>
    <circle cx="412" cy="285" r="5" fill="#1e293b"/>
    ${faceExpression === 'smile' 
      ? '<path d="M 388 305 Q 400 320 412 305" fill="none" stroke="#1e293b" stroke-width="3" stroke-linecap="round"/>' 
      : '<path d="M 388 310 L 412 310" fill="none" stroke="#1e293b" stroke-width="3" stroke-linecap="round"/>'}
  </g>

  <!-- Image Info Overlay Badge -->
  <rect x="24" y="24" width="380" height="65" rx="8" fill="rgba(11, 17, 32, 0.85)" stroke="rgba(255,255,255,0.1)"/>
  <text x="40" y="50" fill="#38bdf8" font-family="Inter, sans-serif" font-weight="600" font-size="16">${title}</text>
  <text x="40" y="72" fill="#94a3b8" font-family="Inter, monospace" font-size="12">Tilt: ${horizonAngle}° | ${sharpnessText}</text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Generate 512-D normalized synthetic face vector around a cluster base
function generateFaceVector(clusterSeed: number, variationSeed: number): number[] {
  const vec = new Array(512).fill(0);
  for (let i = 0; i < 512; i++) {
    const clusterBase = seededRandom(clusterSeed * 1000 + i) * 2 - 1;
    const noise = (seededRandom(variationSeed * 10000 + i) * 2 - 1) * 0.08;
    vec[i] = clusterBase + noise;
  }
  const norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
  return vec.map((v) => v / norm);
}

export interface SamplePhotoItem {
  metadata: ImageMetadata;
  thumbnailUrl: string;
  detectedAngleDeg: number;
  simulatedSharpness: number;
  simulatedLuminance: number; // 0 - 255 (determines Underexposed, Overexposed, or Balanced)
  isMotionSmear: boolean;
  motionAngleDeg?: number;
  faces: DetectedFace[];
  burstGroupId?: string;
}

export const SAMPLE_PHOTOS: SamplePhotoItem[] = [
  // --- Burst Group 1: Wedding Ceremony (Alice & Bob) ---
  {
    metadata: {
      id: 'img_001',
      filename: 'DSC_4901.CR3',
      originalPath: 'D:/Photos/Wedding_Dump/DSC_4901.CR3',
      fileSize: 34800000,
      format: 'RAW_CR3',
      dimensions: { width: 6000, height: 4000 },
      timestamp: '2026-08-28T14:15:02.100Z',
      cameraModel: 'Canon EOS R5',
      lens: 'RF 50mm f/1.2L USM',
      focalLength: '50mm',
      iso: 200,
      exposureTime: '1/800s',
      fNumber: 'f/1.4',
      pHash: '1100101011001010110010101100101011001010110010101100101011001010',
    },
    thumbnailUrl: createPhotoDataUrl('DSC_4901.CR3 (Burst 1 - Motion Shake)', 3.8, '#1e3a8a', '#3b82f6', 'Motion Blur / Hand Shake', 'neutral', 'MOTION_SHAKE'),
    detectedAngleDeg: 3.8,
    simulatedSharpness: 42.0, // Motion Blur -> separate to _archive/
    simulatedLuminance: 72,   // Under-exposed -> Contrast -20, Shadows +20
    isMotionSmear: true,
    motionAngleDeg: 12,
    faces: [
      {
        faceId: 'face_01_a',
        boundingBox: { x: 340, y: 220, width: 90, height: 90 },
        eyeOpenness: 0.6,
        isSmiling: false,
        sharpness: 40,
        embedding: generateFaceVector(1, 1), // Alice
      },
    ],
  },
  {
    metadata: {
      id: 'img_002',
      filename: 'DSC_4902.CR3',
      originalPath: 'D:/Photos/Wedding_Dump/DSC_4902.CR3',
      fileSize: 35200000,
      format: 'RAW_CR3',
      dimensions: { width: 6000, height: 4000 },
      timestamp: '2026-08-28T14:15:02.800Z',
      cameraModel: 'Canon EOS R5',
      lens: 'RF 50mm f/1.2L USM',
      focalLength: '50mm',
      iso: 200,
      exposureTime: '1/800s',
      fNumber: 'f/1.4',
      pHash: '1100101011001010110010101100101011001010110010101100101011001011',
    },
    thumbnailUrl: createPhotoDataUrl('DSC_4902.CR3 (Burst 2 - WINNER)', 3.8, '#1e3a8a', '#3b82f6', 'Sharpness: 94.8 (Peak)', 'smile'),
    detectedAngleDeg: 3.8,
    simulatedSharpness: 94.8, // Sharp Winner
    simulatedLuminance: 78,   // Under-exposed -> Contrast -20, Shadows +20
    isMotionSmear: false,
    faces: [
      {
        faceId: 'face_01_b',
        boundingBox: { x: 340, y: 220, width: 90, height: 90 },
        eyeOpenness: 0.98,
        isSmiling: true,
        sharpness: 95,
        embedding: generateFaceVector(1, 2), // Alice
      },
    ],
  },
  {
    metadata: {
      id: 'img_003',
      filename: 'DSC_4903.CR3',
      originalPath: 'D:/Photos/Wedding_Dump/DSC_4903.CR3',
      fileSize: 34900000,
      format: 'RAW_CR3',
      dimensions: { width: 6000, height: 4000 },
      timestamp: '2026-08-28T14:15:03.400Z',
      cameraModel: 'Canon EOS R5',
      lens: 'RF 50mm f/1.2L USM',
      focalLength: '50mm',
      iso: 200,
      exposureTime: '1/800s',
      fNumber: 'f/1.4',
      pHash: '1100101011001010110010101100101011001010110010101100101011001010',
    },
    thumbnailUrl: createPhotoDataUrl('DSC_4903.CR3 (Burst 3 - Defocus Blur)', 3.8, '#1e3a8a', '#3b82f6', 'Defocus Blur', 'neutral', 'DEFOCUS_BLUR'),
    detectedAngleDeg: 3.8,
    simulatedSharpness: 38.0, // Defocus Blur -> separate to _archive/
    simulatedLuminance: 75,
    isMotionSmear: false,
    faces: [
      {
        faceId: 'face_01_c',
        boundingBox: { x: 340, y: 220, width: 90, height: 90 },
        eyeOpenness: 0.2, // Closed eyes
        isSmiling: true,
        sharpness: 38,
        embedding: generateFaceVector(1, 3), // Alice
      },
    ],
  },

  // --- Group 2: Beach Vacation (Over-Exposed Sunlit Coastline) ---
  {
    metadata: {
      id: 'img_004',
      filename: 'SONY_8810.ARW',
      originalPath: 'D:/Photos/Vacation/SONY_8810.ARW',
      fileSize: 42100000,
      format: 'RAW_ARW',
      dimensions: { width: 7952, height: 5304 },
      timestamp: '2026-08-28T16:20:10.000Z',
      cameraModel: 'Sony A7R V',
      lens: 'FE 24-70mm f/2.8 GM II',
      focalLength: '35mm',
      iso: 100,
      exposureTime: '1/1200s',
      fNumber: 'f/4.0',
      pHash: '0011001100110011001100110011001100110011001100110011001100110011',
    },
    thumbnailUrl: createPhotoDataUrl('SONY_8810.ARW (Tilted Coastline)', -4.2, '#0369a1', '#38bdf8', 'Sharpness: 91.5 (Overexposed)', 'smile'),
    detectedAngleDeg: -4.2,
    simulatedSharpness: 91.5,
    simulatedLuminance: 195, // Over-exposed -> Highlights -20, Whites -20
    isMotionSmear: false,
    faces: [
      {
        faceId: 'face_02_a',
        boundingBox: { x: 320, y: 200, width: 100, height: 100 },
        eyeOpenness: 0.95,
        isSmiling: true,
        sharpness: 92,
        embedding: generateFaceVector(2, 1), // Bob
      },
    ],
  },
  {
    metadata: {
      id: 'img_005',
      filename: 'SONY_8811.ARW',
      originalPath: 'D:/Photos/Vacation/SONY_8811.ARW',
      fileSize: 42300000,
      format: 'RAW_ARW',
      dimensions: { width: 7952, height: 5304 },
      timestamp: '2026-08-28T16:20:11.200Z',
      cameraModel: 'Sony A7R V',
      lens: 'FE 24-70mm f/2.8 GM II',
      focalLength: '35mm',
      iso: 100,
      exposureTime: '1/1200s',
      fNumber: 'f/4.0',
      pHash: '0011001100110011001100110011001100110011001100110011001100110010',
    },
    thumbnailUrl: createPhotoDataUrl('SONY_8811.ARW (Motion Blur)', -4.2, '#0369a1', '#38bdf8', 'Motion Blur', 'smile', 'MOTION_SHAKE'),
    detectedAngleDeg: -4.2,
    simulatedSharpness: 44.0, // Motion Blur -> separate to _archive/
    simulatedLuminance: 190, // Over-exposed -> Highlights -20, Whites -20
    isMotionSmear: true,
    motionAngleDeg: 45,
    faces: [
      {
        faceId: 'face_02_b',
        boundingBox: { x: 320, y: 200, width: 100, height: 100 },
        eyeOpenness: 0.88,
        isSmiling: true,
        sharpness: 45,
        embedding: generateFaceVector(2, 2), // Bob
      },
    ],
  },

  // --- Photo 3: Birthday Party (Charlie - Balanced Exposure) ---
  {
    metadata: {
      id: 'img_006',
      filename: 'IMG_7190.HEIC',
      originalPath: 'D:/Photos/iPhone_Dump/IMG_7190.HEIC',
      fileSize: 4800000,
      format: 'HEIC',
      dimensions: { width: 4032, height: 3024 },
      timestamp: '2026-08-28T18:40:00.000Z',
      cameraModel: 'iPhone 16 Pro',
      lens: '48MP Main 24mm',
      focalLength: '24mm',
      iso: 640,
      exposureTime: '1/60s',
      fNumber: 'f/1.78',
      pHash: '1010101010101010101010101010101010101010101010101010101010101010',
    },
    thumbnailUrl: createPhotoDataUrl('IMG_7190.HEIC (Birthday Cake)', 0.2, '#4c1d95', '#7c3aed', 'Sharpness: 88.0 (Level)', 'smile'),
    detectedAngleDeg: 0.2,
    simulatedSharpness: 88.0,
    simulatedLuminance: 130, // Balanced exposure
    isMotionSmear: false,
    faces: [
      {
        faceId: 'face_03_a',
        boundingBox: { x: 360, y: 240, width: 85, height: 85 },
        eyeOpenness: 0.94,
        isSmiling: true,
        sharpness: 89,
        embedding: generateFaceVector(3, 1), // Charlie
      },
    ],
  },

  // --- Photo 4: Mountain Trail Landscape (Under-Exposed Dusk) ---
  {
    metadata: {
      id: 'img_007',
      filename: 'NIKON_3042.NEF',
      originalPath: 'D:/Photos/Hiking/NIKON_3042.NEF',
      fileSize: 29500000,
      format: 'RAW_NEF',
      dimensions: { width: 5568, height: 3712 },
      timestamp: '2026-08-28T09:12:30.000Z',
      cameraModel: 'Nikon Z8',
      lens: 'NIKKOR Z 24-120mm f/4 S',
      focalLength: '70mm',
      iso: 64,
      exposureTime: '1/500s',
      fNumber: 'f/8.0',
      pHash: '1111000011110000111100001111000011110000111100001111000011110000',
    },
    thumbnailUrl: createPhotoDataUrl('NIKON_3042.NEF (Mountain Horizon)', 2.1, '#064e3b', '#059669', 'Sharpness: 96.2 (Landscape)', 'none'),
    detectedAngleDeg: 2.1,
    simulatedSharpness: 96.2,
    simulatedLuminance: 68, // Under-exposed -> Contrast -20, Shadows +20
    isMotionSmear: false,
    faces: [],
  },

  // --- Photo 5: Group Photo (Alice + Bob + Charlie) ---
  {
    metadata: {
      id: 'img_008',
      filename: 'DSC_4950.CR3',
      originalPath: 'D:/Photos/Wedding_Dump/DSC_4950.CR3',
      fileSize: 36100000,
      format: 'RAW_CR3',
      dimensions: { width: 6000, height: 4000 },
      timestamp: '2026-08-28T15:30:15.000Z',
      cameraModel: 'Canon EOS R5',
      lens: 'RF 28-70mm f/2L USM',
      focalLength: '35mm',
      iso: 400,
      exposureTime: '1/250s',
      fNumber: 'f/2.8',
      pHash: '0101010101010101010101010101010101010101010101010101010101010101',
    },
    thumbnailUrl: createPhotoDataUrl('DSC_4950.CR3 (Group Shot)', -1.8, '#1e3a8a', '#0284c7', 'Sharpness: 92.4 (3 Faces)', 'smile'),
    detectedAngleDeg: -1.8,
    simulatedSharpness: 92.4,
    simulatedLuminance: 125, // Balanced exposure
    isMotionSmear: false,
    faces: [
      {
        faceId: 'face_grp_a',
        boundingBox: { x: 220, y: 220, width: 80, height: 80 },
        eyeOpenness: 0.96,
        isSmiling: true,
        sharpness: 91,
        embedding: generateFaceVector(1, 4), // Alice
      },
      {
        faceId: 'face_grp_b',
        boundingBox: { x: 380, y: 210, width: 80, height: 80 },
        eyeOpenness: 0.94,
        isSmiling: true,
        sharpness: 93,
        embedding: generateFaceVector(2, 3), // Bob
      },
      {
        faceId: 'face_grp_c',
        boundingBox: { x: 540, y: 230, width: 80, height: 80 },
        eyeOpenness: 0.91,
        isSmiling: true,
        sharpness: 89,
        embedding: generateFaceVector(3, 2), // Charlie
      },
    ],
  },
];
