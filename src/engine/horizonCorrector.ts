import { GeometryCorrection } from './types';

/**
 * Calculates the maximum inner inscribed bounding rectangle inside a rotated image
 * that preserves the original aspect ratio with ZERO black borders.
 */
export function calculateInscribedCrop(
  width: number,
  height: number,
  angleDeg: number
): { x: number; y: number; width: number; height: number; cropLossPercentage: number } {
  if (Math.abs(angleDeg) < 0.01) {
    return { x: 0, y: 0, width, height, cropLossPercentage: 0 };
  }

  const alpha = Math.abs((angleDeg * Math.PI) / 180);
  const r = width / height;

  // Analytical solution for aspect-preserving inscribed rectangle in rotated quadrilateral:
  // w' = (w * h) / (w * sin(alpha) + h * cos(alpha))
  const sinAlpha = Math.sin(alpha);
  const cosAlpha = Math.cos(alpha);

  const inscribedWidth = (width * height) / (width * sinAlpha + height * cosAlpha);
  const inscribedHeight = inscribedWidth / r;

  const cropW = Math.round(Math.min(width, inscribedWidth));
  const cropH = Math.round(Math.min(height, inscribedHeight));

  const cropX = Math.round((width - cropW) / 2);
  const cropY = Math.round((height - cropH) / 2);

  const originalArea = width * height;
  const croppedArea = cropW * cropH;
  const cropLossPercentage = Number((((originalArea - croppedArea) / originalArea) * 100).toFixed(1));

  return {
    x: cropX,
    y: cropY,
    width: cropW,
    height: cropH,
    cropLossPercentage,
  };
}

/**
 * Evaluates whether an image requires tilt/keystone correction based on threshold
 * and computes the rotation matrix parameters.
 */
export function analyzeHorizonGeometry(
  width: number,
  height: number,
  rawDetectedAngleDeg: number,
  thresholdDeg: number = 0.5
): GeometryCorrection {
  const requiresCorrection = Math.abs(rawDetectedAngleDeg) >= thresholdDeg && Math.abs(rawDetectedAngleDeg) <= 45.0;
  
  if (!requiresCorrection) {
    return {
      requiresCorrection: false,
      detectedAngleDeg: Number(rawDetectedAngleDeg.toFixed(2)),
      correctedAngleDeg: 0,
      cropBox: { x: 0, y: 0, width, height },
      cropLossPercentage: 0,
    };
  }

  // Counter-rotation angle to straighten horizon
  const correctedAngleDeg = -rawDetectedAngleDeg;
  const crop = calculateInscribedCrop(width, height, correctedAngleDeg);

  return {
    requiresCorrection: true,
    detectedAngleDeg: Number(rawDetectedAngleDeg.toFixed(2)),
    correctedAngleDeg: Number(correctedAngleDeg.toFixed(2)),
    cropBox: {
      x: crop.x,
      y: crop.y,
      width: crop.width,
      height: crop.height,
    },
    cropLossPercentage: crop.cropLossPercentage,
  };
}
