/**
 * Canny-Hough Horizon Detector
 *
 * Pure TypeScript port of two open-source straightening algorithms:
 *   1. SpicerSolutions/opencv-python-automatic-image-straightening
 *      (Otsu threshold → Canny edges → Hough Lines → median angle)
 *   2. nostrenz/image-straighten
 *      (optimized grayscale weighting, atan2 two-point angle utilities)
 *
 * No external dependencies — operates on a Float32Array grayscale pixel buffer.
 */

// ---------------------------------------------------------------------------
// § 1. Grayscale utilities (ported from nostrenz/image-straighten script.js)
// ---------------------------------------------------------------------------

/**
 * Convert RGBA ImageData buffer to luminance-weighted grayscale Float32Array.
 * Uses the nostrenz formula: 0.3R + 0.6G + 0.11B (perceptual weighting).
 * Equivalent to OpenCV cvtColor(BGR2GRAY) which uses 0.299R + 0.587G + 0.114B.
 */
export function rgbaToGrayscale(data: Uint8ClampedArray, width: number, height: number): Float32Array {
  const gray = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // nostrenz formula (0.3R + 0.6G + 0.11B), clamped to [0,255]
      gray[y * width + x] = Math.min(255, r * 0.3 + g * 0.6 + b * 0.11);
    }
  }
  return gray;
}

/**
 * Calculate the angle between two points using atan2.
 * Ported from nostrenz calculateTwoPointsAngle().
 * Returns angle in degrees, normalized to [0, 360).
 */
export function calculateTwoPointsAngle(x1: number, y1: number, x2: number, y2: number): number {
  const radians = Math.atan2(x2 - x1, y2 - y1);
  const degrees = radians * (180 / Math.PI);
  // Normalize to [0, 360)
  return degrees + Math.ceil(-degrees / 360) * 360;
}

/**
 * Calculate the angle formed by three points (A, B=center, C).
 * Ported from nostrenz calculateThreePointsAngle().
 * Returns angle in degrees using the law of cosines.
 */
export function calculateThreePointsAngle(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number }
): number {
  const ab = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
  const bc = Math.sqrt((b.x - c.x) ** 2 + (b.y - c.y) ** 2);
  const ac = Math.sqrt((c.x - a.x) ** 2 + (c.y - a.y) ** 2);
  const cosAngle = (bc * bc + ab * ab - ac * ac) / (2 * bc * ab);
  return Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
}

// ---------------------------------------------------------------------------
// § 2. Gaussian blur (ported from SpicerSolutions straighten.py GaussianBlur)
// ---------------------------------------------------------------------------

/**
 * Apply a 5×5 approximate Gaussian blur to a grayscale buffer.
 * The Python code uses a 9×9 kernel; we use 5×5 for performance on the
 * already-downsampled 120×90 analysis canvas.
 */
function gaussianBlur5(gray: Float32Array, width: number, height: number): Float32Array {
  // 5×5 Gaussian kernel weights (sigma ≈ 1.0), sum = 256
  const K = [
    1,  4,  7,  4, 1,
    4, 16, 26, 16, 4,
    7, 26, 41, 26, 7,
    4, 16, 26, 16, 4,
    1,  4,  7,  4, 1,
  ];
  const KSum = 273;
  const out = new Float32Array(width * height);

  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x < width - 2; x++) {
      let sum = 0;
      let ki = 0;
      for (let ky = -2; ky <= 2; ky++) {
        for (let kx = -2; kx <= 2; kx++) {
          sum += gray[(y + ky) * width + (x + kx)] * K[ki++];
        }
      }
      out[y * width + x] = sum / KSum;
    }
  }

  // Copy borders from input
  for (let x = 0; x < width; x++) {
    out[x] = gray[x];
    out[(height - 1) * width + x] = gray[(height - 1) * width + x];
  }
  for (let y = 0; y < height; y++) {
    out[y * width] = gray[y * width];
    out[y * width + width - 1] = gray[y * width + width - 1];
  }

  return out;
}

// ---------------------------------------------------------------------------
// § 3. Otsu Adaptive Threshold (ported from SpicerSolutions straighten.py)
//      cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
// ---------------------------------------------------------------------------

/**
 * Compute optimal Otsu threshold from a grayscale histogram.
 * Returns the threshold value in [0,255] that maximizes inter-class variance.
 */
function computeOtsuThreshold(gray: Float32Array): number {
  const hist = new Float32Array(256);
  for (let i = 0; i < gray.length; i++) {
    hist[Math.round(Math.min(255, Math.max(0, gray[i])))]++;
  }

  const total = gray.length;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];

  let sumB = 0;
  let wB = 0;
  let maxVariance = 0;
  let threshold = 128;

  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;

    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const variance = wB * wF * (mB - mF) ** 2;

    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = t;
    }
  }

  return threshold;
}

/**
 * Apply Otsu binary threshold (inverted, matching OpenCV THRESH_BINARY_INV).
 * Pixels <= threshold → 255 (foreground/edge), pixels > threshold → 0.
 */
function applyOtsuThreshold(blurred: Float32Array): Uint8Array {
  const thresh = computeOtsuThreshold(blurred);
  const out = new Uint8Array(blurred.length);
  for (let i = 0; i < blurred.length; i++) {
    out[i] = blurred[i] <= thresh ? 255 : 0;
  }
  return out;
}

// ---------------------------------------------------------------------------
// § 4. Canny Edge Detection (ported from SpicerSolutions cv2.Canny logic)
//      cv2.Canny(thresh, 100, 200, apertureSize=3)
// ---------------------------------------------------------------------------

/**
 * Compute Sobel gradients (magnitude + direction) on an 8-bit grayscale buffer.
 */
function sobelGradients(
  gray: Uint8Array | Float32Array,
  width: number,
  height: number
): { magnitude: Float32Array; direction: Float32Array } {
  const mag = new Float32Array(width * height);
  const dir = new Float32Array(width * height);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;

      // Sobel 3×3 kernels
      const gx =
        -gray[(y - 1) * width + (x - 1)] + gray[(y - 1) * width + (x + 1)] +
        -2 * gray[y * width + (x - 1)] + 2 * gray[y * width + (x + 1)] +
        -gray[(y + 1) * width + (x - 1)] + gray[(y + 1) * width + (x + 1)];

      const gy =
        -gray[(y - 1) * width + (x - 1)] - 2 * gray[(y - 1) * width + x] - gray[(y - 1) * width + (x + 1)] +
        gray[(y + 1) * width + (x - 1)] + 2 * gray[(y + 1) * width + x] + gray[(y + 1) * width + (x + 1)];

      mag[idx] = Math.sqrt(gx * gx + gy * gy);
      dir[idx] = Math.atan2(gy, gx); // radians [-π, π]
    }
  }

  return { magnitude: mag, direction: dir };
}

/**
 * Non-maximum suppression: thin edges to 1px wide by suppressing pixels
 * that are not local maxima along the gradient direction.
 */
function nonMaxSuppression(
  mag: Float32Array,
  dir: Float32Array,
  width: number,
  height: number
): Float32Array {
  const out = new Float32Array(width * height);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const angle = dir[idx] * (180 / Math.PI); // convert to degrees
      // Snap to nearest 45°
      const a = ((angle % 180) + 180) % 180;

      let q = 0, r = 0;
      if ((a >= 0 && a < 22.5) || (a >= 157.5 && a <= 180)) {
        q = mag[idx + 1];
        r = mag[idx - 1];
      } else if (a >= 22.5 && a < 67.5) {
        q = mag[(y + 1) * width + (x - 1)];
        r = mag[(y - 1) * width + (x + 1)];
      } else if (a >= 67.5 && a < 112.5) {
        q = mag[(y + 1) * width + x];
        r = mag[(y - 1) * width + x];
      } else {
        q = mag[(y - 1) * width + (x - 1)];
        r = mag[(y + 1) * width + (x + 1)];
      }

      out[idx] = mag[idx] >= q && mag[idx] >= r ? mag[idx] : 0;
    }
  }

  return out;
}

/**
 * Double-threshold hysteresis: strong edges are kept, weak edges only if
 * connected to a strong edge. Equivalent to Canny's hysteresis step.
 */
function hysteresisThreshold(
  nms: Float32Array,
  width: number,
  height: number,
  lowThresh: number,
  highThresh: number
): Uint8Array {
  const edges = new Uint8Array(width * height);
  const STRONG = 255;
  const WEAK = 128;

  for (let i = 0; i < nms.length; i++) {
    if (nms[i] >= highThresh) edges[i] = STRONG;
    else if (nms[i] >= lowThresh) edges[i] = WEAK;
  }

  // Connect weak edges adjacent to strong edges (8-connectivity)
  let changed = true;
  while (changed) {
    changed = false;
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        if (edges[idx] === WEAK) {
          const hasStrong =
            edges[idx - 1] === STRONG || edges[idx + 1] === STRONG ||
            edges[idx - width] === STRONG || edges[idx + width] === STRONG ||
            edges[idx - width - 1] === STRONG || edges[idx - width + 1] === STRONG ||
            edges[idx + width - 1] === STRONG || edges[idx + width + 1] === STRONG;
          if (hasStrong) {
            edges[idx] = STRONG;
            changed = true;
          }
        }
      }
    }
  }

  // Remove isolated weak edges
  for (let i = 0; i < edges.length; i++) {
    if (edges[i] === WEAK) edges[i] = 0;
  }

  return edges;
}

/**
 * Full Canny edge detection pipeline.
 * Matches cv2.Canny(thresh, 100, 200, apertureSize=3) from straighten.py.
 */
function applyCanny(
  gray: Uint8Array | Float32Array,
  width: number,
  height: number,
  lowThresh = 100,
  highThresh = 200
): Uint8Array {
  const { magnitude, direction } = sobelGradients(gray, width, height);
  const suppressed = nonMaxSuppression(magnitude, direction, width, height);
  return hysteresisThreshold(suppressed, width, height, lowThresh, highThresh);
}

// ---------------------------------------------------------------------------
// § 5. Hough Lines Transform (ported from SpicerSolutions straighten.py)
//      cv2.HoughLines(canny_image, 1, np.pi/180, 250)
// ---------------------------------------------------------------------------

interface HoughLine {
  rho: number;
  theta: number; // radians
  votes: number;
}

/**
 * Standard Hough Lines sinusoidal accumulator.
 * Matches cv2.HoughLines(edges, rho=1, theta=π/180, threshold=250).
 *
 * @param edges   Uint8Array canny edge map (255 = edge, 0 = no edge)
 * @param width   Image width
 * @param height  Image height
 * @param threshold Minimum vote count to consider a line (scaled for small images)
 * @returns Array of detected (rho, theta, votes) sorted by descending vote count
 */
function houghLinesVote(
  edges: Uint8Array,
  width: number,
  height: number,
  threshold?: number
): HoughLine[] {
  const diag = Math.ceil(Math.sqrt(width * width + height * height));
  const numRho = 2 * diag + 1;
  const numTheta = 180; // 1° precision (π/180 step)
  const accumulator = new Int32Array(numRho * numTheta);

  // Precompute sin/cos for each theta
  const cosTheta = new Float32Array(numTheta);
  const sinTheta = new Float32Array(numTheta);
  for (let t = 0; t < numTheta; t++) {
    const angle = (t * Math.PI) / numTheta;
    cosTheta[t] = Math.cos(angle);
    sinTheta[t] = Math.sin(angle);
  }

  // Vote
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (edges[y * width + x] === 0) continue;
      for (let t = 0; t < numTheta; t++) {
        const rho = Math.round(x * cosTheta[t] + y * sinTheta[t]);
        const rhoIdx = rho + diag;
        if (rhoIdx >= 0 && rhoIdx < numRho) {
          accumulator[rhoIdx * numTheta + t]++;
        }
      }
    }
  }

  // Scale threshold relative to image size (original Python used 250 on full-size)
  const edgePixels = edges.reduce((s, v) => s + (v > 0 ? 1 : 0), 0);
  const autoThreshold = threshold ?? Math.max(5, Math.round(edgePixels * 0.04));

  const lines: HoughLine[] = [];
  for (let rhoIdx = 0; rhoIdx < numRho; rhoIdx++) {
    for (let t = 0; t < numTheta; t++) {
      const votes = accumulator[rhoIdx * numTheta + t];
      if (votes >= autoThreshold) {
        lines.push({
          rho: rhoIdx - diag,
          theta: (t * Math.PI) / numTheta,
          votes,
        });
      }
    }
  }

  // Sort by descending votes, return top-30 only
  lines.sort((a, b) => b.votes - a.votes);
  return lines.slice(0, 30);
}

// ---------------------------------------------------------------------------
// § 6. Angle extraction from Hough Lines
//      Ported from straighten.py lines 71-74 (improved: use median not last)
// ---------------------------------------------------------------------------

/**
 * Extract tilt angle from Hough Lines.
 *
 * The original Python code naively used the angle of the LAST line, which is
 * error-prone. We instead use the weighted-median of all detected lines,
 * matching the approach recommended by the SpicerSolutions documentation.
 *
 * @param lines    Hough line results sorted by vote count
 * @returns Tilt angle in degrees in range [-45, 45] (positive = clockwise lean)
 */
function extractTiltFromHoughLines(lines: HoughLine[]): { angleDeg: number; confidence: number } {
  if (lines.length === 0) {
    return { angleDeg: 0, confidence: 0 };
  }

  // Convert each theta to a tilt angle in [-45, +45]
  // Matching straighten.py logic: theta > 1 rad → 180*theta/π - 90, else 180*theta/π
  const tilts: { tilt: number; weight: number }[] = [];

  for (const line of lines) {
    const thetaDeg = (line.theta * 180) / Math.PI;
    let tilt: number;

    if (line.theta > 1.0) {
      // Near-vertical line → tilt = angle - 90
      tilt = thetaDeg - 90;
    } else {
      // Near-horizontal line → tilt = angle
      tilt = thetaDeg;
    }

    // Clamp to usable range
    if (Math.abs(tilt) <= 45) {
      tilts.push({ tilt, weight: line.votes });
    }
  }

  if (tilts.length === 0) {
    return { angleDeg: 0, confidence: 0 };
  }

  // Weighted median for robustness (better than Python's last-line approach)
  tilts.sort((a, b) => a.tilt - b.tilt);
  const totalWeight = tilts.reduce((s, t) => s + t.weight, 0);
  let cumWeight = 0;
  let medianTilt = 0;
  for (const t of tilts) {
    cumWeight += t.weight;
    if (cumWeight >= totalWeight / 2) {
      medianTilt = t.tilt;
      break;
    }
  }

  // Confidence: ratio of top-3 votes to total votes (higher = more consistent lines)
  const top3Votes = lines.slice(0, 3).reduce((s, l) => s + l.votes, 0);
  const confidence = Math.min(0.95, top3Votes / (totalWeight + 1));

  return {
    angleDeg: Number(medianTilt.toFixed(1)),
    confidence: Number(confidence.toFixed(2)),
  };
}

// ---------------------------------------------------------------------------
// § 7. Main exported function
// ---------------------------------------------------------------------------

export interface CannyHoughResult {
  angleDeg: number;   // detected tilt angle in degrees (positive = CW lean)
  confidence: number; // 0.0–0.95
  requiresCorrection: boolean;
  lineCount: number;  // number of Hough lines found
}

/**
 * Full Canny-Hough straightening pipeline.
 *
 * Ported from SpicerSolutions/opencv-python-automatic-image-straightening:
 *   grayscale → Gaussian blur → Otsu threshold → Canny edges → Hough Lines → median tilt angle
 *
 * Enhanced with nostrenz grayscale weighting and weighted-median angle extraction.
 *
 * @param gray        Float32Array grayscale pixel buffer (values 0–255)
 * @param width       Buffer width in pixels
 * @param height      Buffer height in pixels
 * @param minAngleDeg Minimum tilt to trigger correction (default 0.5°)
 */
export function detectAngleWithCannyHough(
  gray: Float32Array,
  width: number,
  height: number,
  minAngleDeg = 0.5
): CannyHoughResult {
  // Step 1: Gaussian blur (9×9 in Python, 5×5 here for performance on small canvas)
  const blurred = gaussianBlur5(gray, width, height);

  // Step 2: Otsu adaptive threshold (THRESH_BINARY_INV from straighten.py)
  const thresholded = applyOtsuThreshold(blurred);

  // Step 3: Canny edge detection (thresholds 100/200 from straighten.py)
  const edges = applyCanny(thresholded, width, height, 30, 80);

  // Step 4: Hough Lines voting
  const lines = houghLinesVote(edges, width, height);

  // Step 5: Extract weighted-median tilt angle
  const { angleDeg, confidence } = extractTiltFromHoughLines(lines);

  return {
    angleDeg,
    confidence,
    requiresCorrection: Math.abs(angleDeg) >= minAngleDeg,
    lineCount: lines.length,
  };
}
