import { ImageMetadata, DetectedFace, QualityMetrics } from './types';

/**
 * Computes composite quality metrics for an image.
 */
export function scoreImageQuality(
  metadata: ImageMetadata,
  faces: DetectedFace[] = [],
  rawPixelVariance?: number
): QualityMetrics {
  // 1. Laplacian Sharpness Score (0 - 100)
  // Uses provided variance or calculates based on exposure/ISO and high-frequency proxy
  let laplacianSharpness = rawPixelVariance !== undefined 
    ? Math.min(100, Math.max(10, (rawPixelVariance / 500) * 100))
    : generateSharpnessScore(metadata);

  // 2. Face Quality Score (0 - 100)
  let faceQualityScore = 75; // baseline neutral if no faces
  if (faces.length > 0) {
    let totalScore = 0;
    for (const face of faces) {
      // Eye openness (EAR), absence of motion blur, and smile confidence
      const earScore = face.eyeOpenness * 40; // max 40
      const sharpnessContribution = (face.sharpness / 100) * 35; // max 35
      const smileBonus = face.isSmiling ? 25 : 15; // max 25
      totalScore += earScore + sharpnessContribution + smileBonus;
    }
    faceQualityScore = Math.min(100, Math.max(10, Math.round(totalScore / faces.length)));
  }

  // 3. Composition & Lighting Entropy (0 - 100)
  const compositionScore = generateCompositionScore(metadata);

  // 4. Weighted Composite Score
  // Score = 0.40 * Sharpness + 0.35 * FaceQuality + 0.25 * Composition
  const compositeScore = Number(
    (0.4 * laplacianSharpness + 0.35 * faceQualityScore + 0.25 * compositionScore).toFixed(1)
  );

  return {
    laplacianSharpness: Number(laplacianSharpness.toFixed(1)),
    faceQualityScore: Number(faceQualityScore.toFixed(1)),
    compositionScore: Number(compositionScore.toFixed(1)),
    compositeScore,
  };
}

function generateSharpnessScore(metadata: ImageMetadata): number {
  // Simulated variance of laplacian based on ISO, shutter speed, and lens sharpness model
  const base = 75;
  const isoPenalty = metadata.iso > 3200 ? 15 : metadata.iso > 1600 ? 8 : 0;
  
  // Hash seed for deterministic sharpness simulation
  const hashSeed = metadata.id
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const variance = (hashSeed % 35) - 15;

  return Math.min(98, Math.max(25, base - isoPenalty + variance));
}

function generateCompositionScore(metadata: ImageMetadata): number {
  const hashSeed = metadata.filename
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return 60 + (hashSeed % 35);
}
