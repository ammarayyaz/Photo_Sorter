/**
 * Zoltanvin Image Straightening Engine
 * Ported directly from https://github.com/zoltanvin/straight-image
 * Uses Canny Edge Detection + Probabilistic Hough Line Segments + Median Directional Tilt.
 */

export interface HoughLineSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  length: number;
  angleDeg: number;
}

export interface ZoltanvinStraightenResult {
  detectedAngleDeg: number;
  correctedAngleDeg: number;
  requiresCorrection: boolean;
  horizontalLinesCount: number;
  verticalLinesCount: number;
  horizontalMedianDeg: number | null;
  verticalMedianDeg: number | null;
  dominantLines: HoughLineSegment[];
  confidence: number;
}

/**
 * Fast median helper
 */
function computeMedian(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Implements Zoltanvin Hough Line Extraction & Median Straightening
 */
export function detectZoltanvinStraightAngle(
  gray: Float32Array,
  width: number,
  height: number,
  options: {
    cannyThreshold?: number;
    minLineLength?: number;
    lineSegmentLimit?: number;
  } = {}
): ZoltanvinStraightenResult {
  const cannyThresh = options.cannyThreshold || 28;
  const minLineLength = options.minLineLength || 18;
  const maxLineLimit = options.lineSegmentLimit || 250;

  // 1. 3x3 Gaussian Noise Reduction (equivalent to medianBlur in OpenCV)
  const blurred = new Float32Array(width * height);
  const k = [0.0625, 0.125, 0.0625, 0.125, 0.25, 0.125, 0.0625, 0.125, 0.0625];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sum = 0;
      let ki = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          sum += gray[(y + dy) * width + (x + dx)] * k[ki++];
        }
      }
      blurred[y * width + x] = sum;
    }
  }

  // 2. Sobel Gradients
  const mag = new Float32Array(width * height);
  const dir = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const gx =
        (blurred[idx + 1] - blurred[idx - 1]) * 2 +
        (blurred[idx - width + 1] - blurred[idx - width - 1]) +
        (blurred[idx + width + 1] - blurred[idx + width - 1]);

      const gy =
        (blurred[idx + width] - blurred[idx - width]) * 2 +
        (blurred[idx + width + 1] - blurred[idx - width + 1]) +
        (blurred[idx + width - 1] - blurred[idx - width - 1]);

      mag[idx] = Math.sqrt(gx * gx + gy * gy);
      let d = (Math.atan2(gy, gx) * 180) / Math.PI;
      if (d < 0) d += 180;
      dir[idx] = d;
    }
  }

  // 3. Non-Maximum Suppression (Canny Thinning)
  const nms = new Uint8Array(width * height);
  const lowThresh = cannyThresh * 0.4;
  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x < width - 2; x++) {
      const idx = y * width + x;
      const m = mag[idx];
      if (m < lowThresh) continue;

      const d = dir[idx];
      let n1 = 0, n2 = 0;

      if ((d >= 0 && d < 22.5) || (d >= 157.5 && d <= 180)) {
        n1 = mag[idx - 1];
        n2 = mag[idx + 1];
      } else if (d >= 22.5 && d < 67.5) {
        n1 = mag[idx - width + 1];
        n2 = mag[idx + width - 1];
      } else if (d >= 67.5 && d < 112.5) {
        n1 = mag[idx - width];
        n2 = mag[idx + width];
      } else {
        n1 = mag[idx - width - 1];
        n2 = mag[idx + width + 1];
      }

      if (m >= n1 && m >= n2 && m >= cannyThresh) {
        nms[idx] = 255;
      }
    }
  }

  // 4. Trace Straight Line Segments across Edge Map (Probabilistic Line Tracing)
  const edgeVisited = new Uint8Array(width * height);
  const detectedSegments: HoughLineSegment[] = [];

  for (let y = 3; y < height - 3; y += 2) {
    for (let x = 3; x < width - 3; x += 2) {
      const idx = y * width + x;
      if (nms[idx] === 255 && edgeVisited[idx] === 0) {
        // Trace line segment in gradient tangent direction
        const edgeAngleDeg = dir[idx] + 90;
        const rad = (edgeAngleDeg * Math.PI) / 180;
        const stepX = Math.cos(rad);
        const stepY = Math.sin(rad);

        let forwardLen = 0;
        let cx = x, cy = y;
        while (forwardLen < 120) {
          const nx = Math.round(cx + stepX);
          const ny = Math.round(cy + stepY);
          if (nx < 1 || nx >= width - 1 || ny < 1 || ny >= height - 1) break;
          const nIdx = ny * width + nx;
          if (nms[nIdx] === 255 || mag[nIdx] > lowThresh) {
            edgeVisited[nIdx] = 1;
            cx = nx;
            cy = ny;
            forwardLen++;
          } else {
            break;
          }
        }

        let backwardLen = 0;
        let bx = x, by = y;
        while (backwardLen < 120) {
          const nx = Math.round(bx - stepX);
          const ny = Math.round(by - stepY);
          if (nx < 1 || nx >= width - 1 || ny < 1 || ny >= height - 1) break;
          const nIdx = ny * width + nx;
          if (nms[nIdx] === 255 || mag[nIdx] > lowThresh) {
            edgeVisited[nIdx] = 1;
            bx = nx;
            by = ny;
            backwardLen++;
          } else {
            break;
          }
        }

        const totalLength = Math.hypot(cx - bx, cy - by);
        if (totalLength >= minLineLength) {
          let lineAngle = (Math.atan2(cy - by, cx - bx) * 180) / Math.PI;
          // Normalize to [-90, 90]
          while (lineAngle < -90) lineAngle += 180;
          while (lineAngle >= 90) lineAngle -= 180;

          detectedSegments.push({
            x1: bx,
            y1: by,
            x2: cx,
            y2: cy,
            length: totalLength,
            angleDeg: lineAngle,
          });

          if (detectedSegments.length >= maxLineLimit) break;
        }
      }
    }
    if (detectedSegments.length >= maxLineLimit) break;
  }

  // 5. Zoltanvin Line Classification (Horizontal [-45, 45] vs Vertical [<-45 or >45])
  const horizontalAngles: number[] = [];
  const verticalAngles: number[] = [];

  for (const seg of detectedSegments) {
    const angle = seg.angleDeg;
    // Weight votes by line length so longer structural lines (horizons, pillars) dominate
    const votes = Math.max(1, Math.round(seg.length / 8));

    // Strictly filter out diagonal perspective lines (> 12° from horizontal or vertical)
    if (Math.abs(angle) <= 12.0) {
      // True horizontal line
      for (let v = 0; v < votes; v++) horizontalAngles.push(angle);
    } else if (angle >= 78) {
      // True vertical line (positive)
      const vTilt = angle - 90;
      if (Math.abs(vTilt) <= 12.0) {
        for (let v = 0; v < votes; v++) verticalAngles.push(vTilt);
      }
    } else if (angle <= -78) {
      // True vertical line (negative)
      const vTilt = angle + 90;
      if (Math.abs(vTilt) <= 12.0) {
        for (let v = 0; v < votes; v++) verticalAngles.push(vTilt);
      }
    }
  }

  const hMedian = computeMedian(horizontalAngles);
  const vMedian = computeMedian(verticalAngles);

  let globalTiltDeg = 0;
  if (hMedian !== null && vMedian !== null) {
    // Both horizontal and vertical lines present -> combine with length weights
    const hWeight = horizontalAngles.length;
    const vWeight = verticalAngles.length;
    globalTiltDeg = (hMedian * hWeight + vMedian * vWeight) / (hWeight + vWeight);
  } else if (hMedian !== null) {
    globalTiltDeg = hMedian;
  } else if (vMedian !== null) {
    globalTiltDeg = vMedian;
  }

  const detectedAngleDeg = Number(globalTiltDeg.toFixed(1));
  const correctedAngleDeg = Number((-detectedAngleDeg).toFixed(1));
  const requiresCorrection = Math.abs(detectedAngleDeg) >= 0.5;

  const totalLines = horizontalAngles.length + verticalAngles.length;
  const confidence = totalLines > 10 ? Math.min(0.98, 0.65 + totalLines / 200) : 0.4;

  return {
    detectedAngleDeg,
    correctedAngleDeg,
    requiresCorrection,
    horizontalLinesCount: horizontalAngles.length,
    verticalLinesCount: verticalAngles.length,
    horizontalMedianDeg: hMedian !== null ? Number(hMedian.toFixed(1)) : null,
    verticalMedianDeg: vMedian !== null ? Number(vMedian.toFixed(1)) : null,
    dominantLines: detectedSegments.sort((a, b) => b.length - a.length).slice(0, 20),
    confidence: Number(confidence.toFixed(2)),
  };
}
