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
 * Analyzes image pixel gradients using Multi-Axis Radon Projection & Hough Line Histogram
 * to detect the true tilt angle of horizon, coastlines, architectural lines, or portrait silhouettes.
 * 
 * @param gray Grayscale pixel buffer of size (sampleWidth * sampleHeight)
 * @param sampleWidth Width of sampled pixel buffer (e.g. 320px)
 * @param sampleHeight Height of sampled pixel buffer (e.g. 240px)
 * @param originalWidth Full original image width
 * @param originalHeight Full original image height
 * @param faceTiltHint Optional detected face orientation angle in degrees
 */
export function detectHorizonAndTiltAngle(
  gray: Float32Array,
  sampleWidth: number,
  sampleHeight: number,
  originalWidth: number,
  originalHeight: number,
  faceTiltHint?: number | null
): DetectedHorizonGeometry {
  const minAngle = -45.0;
  const maxAngle = 45.0;
  const step = 0.5; // 0.5 degree precision
  const numBins = Math.round((maxAngle - minAngle) / step) + 1;
  const angleBins = new Float32Array(numBins);
  let totalEdgeEnergy = 0;
  let edgeCount = 0;

  // 1. Compute Sobel Edge Gradients & Cardinal Deviation Mapping
  // Evaluates both Horizontal (horizons, floors) and Vertical (trees, people, walls) edges
  for (let y = 2; y < sampleHeight - 2; y++) {
    for (let x = 2; x < sampleWidth - 2; x++) {
      const idx = y * sampleWidth + x;
      
      // Sobel kernel for gradient components
      const dx =
        (gray[idx + 1] - gray[idx - 1]) * 2 +
        (gray[idx - sampleWidth + 1] - gray[idx - sampleWidth - 1]) +
        (gray[idx + sampleWidth + 1] - gray[idx + sampleWidth - 1]);

      const dy =
        (gray[idx + sampleWidth] - gray[idx - sampleWidth]) * 2 +
        (gray[idx + sampleWidth + 1] - gray[idx + sampleWidth + 1]) +
        (gray[idx + sampleWidth - 1] - gray[idx - sampleWidth - 1]);

      const magSq = dx * dx + dy * dy;

      // Filter out low-contrast texture noise
      if (magSq > 120) {
        const mag = Math.sqrt(magSq);
        let gradAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
        if (gradAngle < 0) gradAngle += 180; // [0, 180)

        // Deviation from nearest cardinal axis (0° or 90°) -> range [-45°, +45°]
        let tilt = gradAngle % 90;
        if (tilt > 45) tilt -= 90;

        if (tilt >= minAngle && tilt <= maxAngle) {
          const binIdx = Math.round((tilt - minAngle) / step);
          if (binIdx >= 0 && binIdx < numBins) {
            // Emphasize prominent clean silhouette edges with mag^1.25
            const weight = Math.pow(mag, 1.25);
            angleBins[binIdx] += weight;
            totalEdgeEnergy += weight;
            edgeCount++;
          }
        }
      }
    }
  }

  // If a portrait face tilt hint was detected, reinforce that angular bin
  if (typeof faceTiltHint === 'number' && !isNaN(faceTiltHint) && Math.abs(faceTiltHint) <= 45) {
    const hintBinIdx = Math.round((faceTiltHint - minAngle) / step);
    if (hintBinIdx >= 0 && hintBinIdx < numBins && totalEdgeEnergy > 0) {
      angleBins[hintBinIdx] += totalEdgeEnergy * 0.15;
    }
  }

  // 2. 5-point Gaussian smoothing on projection bins to suppress discretization noise
  const smoothedBins = new Float32Array(numBins);
  const kernel = [0.06, 0.24, 0.40, 0.24, 0.06];
  for (let i = 2; i < numBins - 2; i++) {
    let s = 0;
    for (let k = -2; k <= 2; k++) {
      s += angleBins[i + k] * kernel[k + 2];
    }
    smoothedBins[i] = s;
  }

  // Copy edge bins
  smoothedBins[0] = angleBins[0];
  smoothedBins[1] = angleBins[1];
  smoothedBins[numBins - 2] = angleBins[numBins - 2];
  smoothedBins[numBins - 1] = angleBins[numBins - 1];

  // 3. Compute statistical baseline (Mean & StdDev for Signal-to-Noise Ratio)
  let sum = 0;
  for (let i = 0; i < numBins; i++) sum += smoothedBins[i];
  const mean = sum / numBins;

  let varianceSum = 0;
  for (let i = 0; i < numBins; i++) {
    const diff = smoothedBins[i] - mean;
    varianceSum += diff * diff;
  }
  const stdDev = Math.sqrt(varianceSum / numBins);

  // 4. Find Peak Angle in Angular Projection Profile
  let peakEnergy = 0;
  let peakBinIdx = Math.round((-minAngle) / step); // Default 0.0 degrees

  for (let i = 1; i < numBins - 1; i++) {
    if (smoothedBins[i] > peakEnergy) {
      peakEnergy = smoothedBins[i];
      peakBinIdx = i;
    }
  }

  const rawDetectedAngle = Number((minAngle + peakBinIdx * step).toFixed(1));
  const snr = stdDev > 0 ? (peakEnergy - mean) / stdDev : 0;
  const confidence = Math.min(1.0, Math.max(0.0, snr / 3.5));

  // Threshold: Require clear statistical significance (SNR >= 1.6) and tilt >= 0.5°
  const requiresCorrection = Math.abs(rawDetectedAngle) >= 0.5 && snr >= 1.6 && edgeCount > 50;
  const finalDetectedAngle = requiresCorrection ? rawDetectedAngle : 0.0;
  const correctedAngleDeg = -finalDetectedAngle;

  // 5. Compute Inscribed Crop Box for full resolution
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
