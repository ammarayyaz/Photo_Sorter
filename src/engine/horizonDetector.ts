/**
 * Real Horizon Detection & Image Straightening Engine
 * Implements Hough Transform Line Orientation & Radon Projection Profile Analysis
 * Ported from OpenCV / Deskew / Horizon-Detection algorithms.
 */

export interface DetectedHorizonGeometry {
  detectedAngleDeg: number;
  correctedAngleDeg: number;
  requiresCorrection: boolean;
  confidence: number;
  cropBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  cropLossPercentage: number;
}

/**
 * Computes the maximum inscribed rectangle with the original aspect ratio
 * that fits inside a rotated rectangle (eliminates all black corners).
 */
export function calculateInscribedCrop(
  width: number,
  height: number,
  angleDeg: number
): { x: number; y: number; width: number; height: number; lossPercentage: number } {
  const absAngleRad = Math.abs((angleDeg * Math.PI) / 180);
  if (absAngleRad < 0.001) {
    return { x: 0, y: 0, width, height, lossPercentage: 0 };
  }

  const sin = Math.sin(absAngleRad);
  const cos = Math.cos(absAngleRad);

  // Maximum inscribed rectangle algorithm for bounding box without black corners
  const aspect = width / height;
  let cropW: number;
  let cropH: number;

  if (aspect >= 1) {
    // Landscape or square orientation
    cropW = Math.round((width * height) / (height * cos + width * sin));
    cropH = Math.round(cropW / aspect);
  } else {
    // Portrait orientation
    cropH = Math.round((width * height) / (width * cos + height * sin));
    cropW = Math.round(cropH * aspect);
  }

  cropW = Math.min(width, Math.max(10, cropW));
  cropH = Math.min(height, Math.max(10, cropH));

  const cropX = Math.max(0, Math.round((width - cropW) / 2));
  const cropY = Math.max(0, Math.round((height - cropH) / 2));

  const originalArea = width * height;
  const croppedArea = cropW * cropH;
  const lossPercentage = Number((((originalArea - croppedArea) / originalArea) * 100).toFixed(1));

  return {
    x: cropX,
    y: cropY,
    width: cropW,
    height: cropH,
    lossPercentage,
  };
}

import { detectZoltanvinStraightAngle } from './zoltanvinStraightener';
import { detectAngleWithCannyHough } from './cannyHoughDetector';
import { detectSubjectInertiaAngle, calculateZeroBlackBorderCrop } from './subjectPerspectiveStraightener';
export { calculateMaxIncludedRectKeepAR, computePerspectiveTrapezoid, createTrapezoid } from './jpegviewPerspective';
export type { JpegViewTrapezoid, InscribedRect } from './jpegviewPerspective';
export { calculateZeroBlackBorderCrop, detectSubjectInertiaAngle } from './subjectPerspectiveStraightener';

/**
 * Available straightening algorithm modes:
 *  - 'zoltanvin-hough'  : Probabilistic Hough Line segments (Zoltanvin)
 *  - 'canny-hough'      : Canny edge detection + Hough Lines (SpicerSolutions port)
 *  - 'radon-profile'    : Radon / Sobel projection profile
 *  - 'portrait-body'    : Face/body tilt hint from pose estimation
 *  - 'hybrid-ensemble'  : Weighted consensus of all four methods (most accurate)
 */
export type StraighteningAlgorithm = 'zoltanvin-hough' | 'canny-hough' | 'hybrid-ensemble' | 'radon-profile' | 'portrait-body';

/**
 * Analyzes image pixel gradients using Multi-Axis Radon Projection, Zoltanvin Hough Line Segments,
 * and Portrait Body Inertial Analysis to detect the true tilt angle.
 * 
 * @param gray Grayscale pixel buffer of size (sampleWidth * sampleHeight)
 * @param sampleWidth Width of sampled pixel buffer (e.g. 480px)
 * @param sampleHeight Height of sampled pixel buffer (e.g. 320px)
 * @param originalWidth Full original image width
 * @param originalHeight Full original image height
 * @param faceTiltHint Optional detected face orientation angle in degrees
 * @param algorithm Selected straightening algorithm engine
 */
export function detectHorizonAndTiltAngle(
  gray: Float32Array,
  sampleWidth: number,
  sampleHeight: number,
  originalWidth: number,
  originalHeight: number,
  faceTiltHint?: number | null,
  algorithm: StraighteningAlgorithm = 'zoltanvin-hough'
): DetectedHorizonGeometry {
  // 1. Run Zoltanvin Probabilistic Hough Line Algorithm (from zoltanvin/straight-image)
  const zoltanResult = detectZoltanvinStraightAngle(gray, sampleWidth, sampleHeight);

  // 1b. Run Canny-Hough pipeline (ported from SpicerSolutions/opencv-python-automatic-image-straightening)
  const cannyHoughResult = detectAngleWithCannyHough(gray, sampleWidth, sampleHeight);

  // 2. Run Radon & Cardinal Sobel Projection Profile
  const minAngle = -45.0;
  const maxAngle = 45.0;
  const step = 0.5; // 0.5 degree precision
  const numBins = Math.round((maxAngle - minAngle) / step) + 1;
  const angleBins = new Float32Array(numBins);
  let totalEdgeEnergy = 0;
  let edgeCount = 0;

  for (let y = 2; y < sampleHeight - 2; y++) {
    for (let x = 2; x < sampleWidth - 2; x++) {
      const idx = y * sampleWidth + x;

      const dx =
        (gray[idx + 1] - gray[idx - 1]) * 2 +
        (gray[idx - sampleWidth + 1] - gray[idx - sampleWidth - 1]) +
        (gray[idx + sampleWidth + 1] - gray[idx - sampleWidth - 1]);

      const dy =
        (gray[idx + sampleWidth] - gray[idx - sampleWidth]) * 2 +
        (gray[idx + sampleWidth + 1] - gray[idx - sampleWidth + 1]) +
        (gray[idx + sampleWidth - 1] - gray[idx - sampleWidth - 1]);

      const magSq = dx * dx + dy * dy;

      if (magSq > 25) {
        const mag = Math.sqrt(magSq);
        let phi = (Math.atan2(dy, dx) * 180) / Math.PI;
        if (phi < 0) phi += 180;
        while (phi >= 180) phi -= 180;

        const tiltFromVertical = phi > 90 ? phi - 180 : phi;
        const tiltFromHorizontal = phi - 90;

        const tilt =
          Math.abs(tiltFromVertical) <= Math.abs(tiltFromHorizontal)
            ? tiltFromVertical
            : tiltFromHorizontal;

        if (tilt >= minAngle && tilt <= maxAngle) {
          const binIdx = Math.round((tilt - minAngle) / step);
          if (binIdx >= 0 && binIdx < numBins) {
            const weight = Math.pow(mag, 1.25);
            angleBins[binIdx] += weight;
            totalEdgeEnergy += weight;
            edgeCount++;
          }
        }
      }
    }
  }

  // 3. 5-point Gaussian smoothing on projection bins
  const smoothedBins = new Float32Array(numBins);
  const kernel = [0.06, 0.24, 0.40, 0.24, 0.06];
  for (let i = 2; i < numBins - 2; i++) {
    let s = 0;
    for (let k = -2; k <= 2; k++) {
      s += angleBins[i + k] * kernel[k + 2];
    }
    smoothedBins[i] = s;
  }

  smoothedBins[0] = angleBins[0];
  smoothedBins[1] = angleBins[1];
  smoothedBins[numBins - 2] = angleBins[numBins - 2];
  smoothedBins[numBins - 1] = angleBins[numBins - 1];

  let sum = 0;
  for (let i = 0; i < numBins; i++) sum += smoothedBins[i];
  const mean = sum / numBins;

  let varianceSum = 0;
  for (let i = 0; i < numBins; i++) {
    const diff = smoothedBins[i] - mean;
    varianceSum += diff * diff;
  }
  const stdDev = Math.sqrt(varianceSum / numBins);

  let peakEnergy = 0;
  let peakBinIdx = Math.round((-minAngle) / step);

  for (let i = 1; i < numBins - 1; i++) {
    if (smoothedBins[i] > peakEnergy) {
      peakEnergy = smoothedBins[i];
      peakBinIdx = i;
    }
  }

  const radonRawAngle = Number((minAngle + peakBinIdx * step).toFixed(1));
  const snr = stdDev > 0 ? (peakEnergy - mean) / stdDev : 0;

    // 4. Decide Angle Based on Requested Algorithm Mode
  // Subject Reference Check: If subject (person/face) is detected, lock to subject vertical
  const subjectAxis = detectSubjectInertiaAngle(gray, sampleWidth, sampleHeight, faceTiltHint);

  let finalDetectedAngle = 0.0;
  let confidence = 0.5;

  if (algorithm === 'portrait-body' || (algorithm === 'hybrid-ensemble' && subjectAxis && subjectAxis.confidence >= 0.85)) {
    // Subject-First Reference: Align vertical posture of the person
    finalDetectedAngle = subjectAxis ? subjectAxis.angleDeg : (typeof faceTiltHint === 'number' ? faceTiltHint : 0);
    confidence = subjectAxis ? subjectAxis.confidence : 0.90;
  } else if (algorithm === 'zoltanvin-hough') {
    if (zoltanResult.requiresCorrection && Math.abs(zoltanResult.detectedAngleDeg) <= 12.0) {
      finalDetectedAngle = zoltanResult.detectedAngleDeg;
      confidence = zoltanResult.confidence;
    } else if (Math.abs(radonRawAngle) >= 0.5 && Math.abs(radonRawAngle) <= 12.0 && (snr >= 1.15 || peakEnergy > mean * 1.15)) {
      finalDetectedAngle = radonRawAngle;
      confidence = Math.min(0.95, snr / 3.0);
    }
  } else if (algorithm === 'canny-hough') {
    // Pure Canny-Hough with perspective vanishing filter
    if (cannyHoughResult.requiresCorrection && Math.abs(cannyHoughResult.angleDeg) <= 12.0) {
      finalDetectedAngle = cannyHoughResult.angleDeg;
      confidence = cannyHoughResult.confidence;
    }
  } else if (algorithm === 'radon-profile') {
    if (Math.abs(radonRawAngle) >= 0.5 && Math.abs(radonRawAngle) <= 12.0 && (snr >= 1.15 || peakEnergy > mean * 1.15)) {
      finalDetectedAngle = radonRawAngle;
      confidence = Math.min(0.95, snr / 3.0);
    }
  } else {
    // Hybrid Ensemble: Weighted consensus of Subject + Zoltanvin + Canny-Hough + Radon
    const candidates: Array<{ angle: number; weight: number; source: string }> = [];

    if (subjectAxis && subjectAxis.confidence > 0.7) {
      candidates.push({ angle: subjectAxis.angleDeg, weight: 2.5, source: 'subject-axis' });
    }
    if (zoltanResult.requiresCorrection && Math.abs(zoltanResult.detectedAngleDeg) <= 12.0) {
      candidates.push({ angle: zoltanResult.detectedAngleDeg, weight: 1.5, source: 'zoltanvin' });
    }
    if (cannyHoughResult.requiresCorrection && Math.abs(cannyHoughResult.angleDeg) <= 12.0 && cannyHoughResult.lineCount >= 3) {
      candidates.push({
        angle: cannyHoughResult.angleDeg,
        weight: 1.4 * cannyHoughResult.confidence,
        source: 'canny-hough',
      });
    }
    if (Math.abs(radonRawAngle) >= 0.5 && Math.abs(radonRawAngle) <= 12.0 && snr >= 1.15) {
      candidates.push({ angle: radonRawAngle, weight: 1.0, source: 'radon' });
    }

    if (candidates.length > 0) {
      let weightedSum = 0;
      let totalW = 0;
      for (const c of candidates) {
        weightedSum += c.angle * c.weight;
        totalW += c.weight;
      }
      finalDetectedAngle = Number((weightedSum / totalW).toFixed(1));
      confidence = Math.min(0.98, 0.70 + candidates.length * 0.08);
    }
  }

  // Strictly clamp final angle to realistic tilt (never rotate more than 12° unless manually overridden)
  finalDetectedAngle = Math.max(-12.0, Math.min(12.0, finalDetectedAngle));

  const requiresCorrection = Math.abs(finalDetectedAngle) >= 0.5;
  const correctedAngleDeg = Number((-finalDetectedAngle).toFixed(1));
  const crop = calculateZeroBlackBorderCrop(originalWidth, originalHeight, finalDetectedAngle);

  return {
    detectedAngleDeg: finalDetectedAngle,
    correctedAngleDeg,
    requiresCorrection,
    confidence: Number(confidence.toFixed(2)),
    cropBox: {
      x: crop.x,
      y: crop.y,
      width: crop.width,
      height: crop.height,
    },
    cropLossPercentage: crop.lossPercentage,
  };
}

/**
 * Performs real high-resolution canvas transformation and cropping
 * to generate the leveled, straightened image.
 */
export async function renderStraightenedImageBlob(
  sourceImageElement: HTMLImageElement | ImageBitmap,
  angleDeg: number,
  cropBox: { x: number; y: number; width: number; height: number },
  format: string = 'image/jpeg',
  quality: number = 0.92
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = cropBox.width;
  canvas.height = cropBox.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const origW = 'naturalWidth' in sourceImageElement ? sourceImageElement.naturalWidth : sourceImageElement.width;
  const origH = 'naturalHeight' in sourceImageElement ? sourceImageElement.naturalHeight : sourceImageElement.height;

  if (Math.abs(angleDeg) < 0.01) {
    // 0° rotation: direct draw full crop without rotation
    ctx.drawImage(sourceImageElement, 0, 0, cropBox.width, cropBox.height);
  } else {
    // Translate to center of crop
    ctx.translate(cropBox.width / 2, cropBox.height / 2);
    // Rotate to straighten matching CSS rotation (positive = CW, negative = CCW)
    ctx.rotate((angleDeg * Math.PI) / 180);
    // Draw full original image centered
    ctx.drawImage(sourceImageElement, -origW / 2, -origH / 2, origW, origH);
  }
  ctx.restore();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create straightened canvas blob'));
      },
      format,
      quality
    );
  });
}
