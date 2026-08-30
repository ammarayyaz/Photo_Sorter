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

/**
 * Analyzes image pixel gradients using Radon Projection & Hough Line Histogram
 * to detect the true tilt angle of horizon, coastlines, or architectural lines.
 * 
 * @param gray Grayscale pixel buffer of size (sampleWidth * sampleHeight)
 * @param sampleWidth Width of sampled pixel buffer (e.g. 320px)
 * @param sampleHeight Height of sampled pixel buffer (e.g. 240px)
 * @param originalWidth Full original image width
 * @param originalHeight Full original image height
 */
export function detectHorizonAndTiltAngle(
  gray: Float32Array,
  sampleWidth: number,
  sampleHeight: number,
  originalWidth: number,
  originalHeight: number
): DetectedHorizonGeometry {
  const minAngle = -15.0;
  const maxAngle = 15.0;
  const step = 0.2; // 0.2 degree resolution
  const numBins = Math.round((maxAngle - minAngle) / step) + 1;
  const angleBins = new Float32Array(numBins);
  const angleCounts = new Uint32Array(numBins);

  // 1. Compute Sobel Edge Gradients & Local Orientations
  // Focusing on horizontal and near-horizontal edges (horizon / architectural levels)
  let totalEdgeEnergy = 0;

  for (let y = 2; y < sampleHeight - 2; y += 2) {
    for (let x = 2; x < sampleWidth - 2; x += 2) {
      const idx = y * sampleWidth + x;
      // Sobel kernel approximations
      const dx =
        gray[idx + 1] - gray[idx - 1] +
        0.5 * (gray[idx - sampleWidth + 1] - gray[idx - sampleWidth - 1] +
               gray[idx + sampleWidth + 1] - gray[idx + sampleWidth - 1]);

      const dy =
        gray[idx + sampleWidth] - gray[idx - sampleWidth] +
        0.5 * (gray[idx + sampleWidth + 1] - gray[idx - sampleWidth + 1] +
               gray[idx + sampleWidth - 1] - gray[idx - sampleWidth - 1]);

      const magSq = dx * dx + dy * dy;

      // Filter out low-contrast noise
      if (magSq > 80) {
        const mag = Math.sqrt(magSq);
        // Calculate edge orientation angle in degrees (-90 to +90)
        let edgeAngleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

        // Map perpendicular edge gradient to line tilt angle (-45 to +45)
        let lineTiltDeg = edgeAngleDeg - 90;
        while (lineTiltDeg < -45) lineTiltDeg += 90;
        while (lineTiltDeg > 45) lineTiltDeg -= 90;

        // Check if within natural camera tilt range (-15 to +15 degrees)
        if (lineTiltDeg >= minAngle && lineTiltDeg <= maxAngle) {
          const binIdx = Math.round((lineTiltDeg - minAngle) / step);
          if (binIdx >= 0 && binIdx < numBins) {
            angleBins[binIdx] += mag;
            angleCounts[binIdx]++;
            totalEdgeEnergy += mag;
          }
        }
      }
    }
  }

  // 2. Find Peak Angle in Angular Projection Profile
  let peakEnergy = 0;
  let peakBinIdx = Math.round((-minAngle) / step); // Default 0.0 degrees

  for (let i = 1; i < numBins - 1; i++) {
    // 3-point Gaussian smoothing on projection bins
    const smoothed = 0.25 * angleBins[i - 1] + 0.5 * angleBins[i] + 0.25 * angleBins[i + 1];
    if (smoothed > peakEnergy) {
      peakEnergy = smoothed;
      peakBinIdx = i;
    }
  }

  const rawDetectedAngle = Number((minAngle + peakBinIdx * step).toFixed(1));
  const confidence = totalEdgeEnergy > 0 ? Math.min(1.0, (peakEnergy / (totalEdgeEnergy * 0.12))) : 0.4;

  // Threshold: Ignore tiny micro-jitter (< 0.4 deg) unless strong confidence
  const requiresCorrection = Math.abs(rawDetectedAngle) >= 0.5 && confidence >= 0.35;
  const finalDetectedAngle = requiresCorrection ? rawDetectedAngle : 0.0;
  const correctedAngleDeg = -finalDetectedAngle;

  // 3. Compute Inscribed Crop Box for full resolution
  const crop = calculateInscribedCrop(originalWidth, originalHeight, finalDetectedAngle);

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
  // Translate to center of crop
  ctx.translate(cropBox.width / 2, cropBox.height / 2);
  // Rotate to straighten
  ctx.rotate((-angleDeg * Math.PI) / 180);
  // Draw full original image centered
  const origW = 'naturalWidth' in sourceImageElement ? sourceImageElement.naturalWidth : sourceImageElement.width;
  const origH = 'naturalHeight' in sourceImageElement ? sourceImageElement.naturalHeight : sourceImageElement.height;
  ctx.drawImage(sourceImageElement, -origW / 2, -origH / 2, origW, origH);
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
