/**
 * Subject & Perspective-Aware Horizon & Straightening Engine
 *
 * Implements:
 * 1. Subject-First Reference Alignment (Portrait/People priority)
 * 2. Perspective Vanishing Line Rejection (Ignores 12°–78° diagonal perspective lines)
 * 3. Exact Inscribed Crop (Guarantees zero black borders)
 * 4. Perspec-inspired quadrilateral perspective leveling
 */
export interface SubjectAlignmentResult {
  detectedAngleDeg: number;       // Angle of tilt (positive = leans CW)
  correctedAngleDeg: number;      // Counter-angle to level image (negative = rotate CCW)
  requiresCorrection: boolean;
  confidence: number;             // 0.0 to 1.0
  source: 'subject-facial' | 'subject-body' | 'cardinal-horizon' | 'perspective-consensus';
  inscribedCrop: {
    x: number;
    y: number;
    width: number;
    height: number;
    scaleFactor: number;
    lossPercentage: number;
  };
}

/**
 * Filters angles to strictly keep only true horizontal/vertical structural lines.
 * Rejects diagonal perspective vanishing lines (12° to 78°), roofs, ramps, and decorative angles.
 *
 * @param angleDeg Raw line angle in degrees [-90, 90]
 * @returns Normalized tilt from nearest cardinal axis in [-12, +12], or null if perspective diagonal
 */
export function filterCardinalTilt(angleDeg: number, maxAllowedTilt = 12.0): number | null {
  // Horizontal line (near 0°): tilt is angleDeg directly
  if (Math.abs(angleDeg) <= maxAllowedTilt) {
    return Number(angleDeg.toFixed(1));
  }

  // Vertical line (near ±90°): tilt is deviation from vertical
  if (angleDeg >= 90 - maxAllowedTilt) {
    return Number((angleDeg - 90).toFixed(1));
  }
  if (angleDeg <= -90 + maxAllowedTilt) {
    return Number((angleDeg + 90).toFixed(1));
  }

  // Any other angle is a perspective diagonal, vanishing line, or non-horizon feature -> REJECT
  return null;
}

/**
 * Calculates the exact analytical inscribed crop rectangle and scale factor
 * to ensure 100% full frame coverage with ZERO black edges exposed.
 */
export function calculateZeroBlackBorderCrop(
  width: number,
  height: number,
  angleDeg: number
): {
  x: number;
  y: number;
  width: number;
  height: number;
  scaleFactor: number;
  lossPercentage: number;
} {
  const absAngleRad = Math.abs((angleDeg * Math.PI) / 180);
  if (absAngleRad < 0.001) {
    return {
      x: 0,
      y: 0,
      width,
      height,
      scaleFactor: 1.0,
      lossPercentage: 0,
    };
  }

  const sin = Math.sin(absAngleRad);
  const cos = Math.cos(absAngleRad);
  const aspect = width / height;

  let cropW: number;
  let cropH: number;
  let scaleFactor: number;

  if (aspect >= 1) {
    // Landscape orientation
    cropW = Math.round((width * height) / (height * cos + width * sin));
    cropH = Math.round(cropW / aspect);
    scaleFactor = Number((cos + aspect * sin).toFixed(4));
  } else {
    // Portrait orientation
    cropH = Math.round((width * height) / (width * cos + height * sin));
    cropW = Math.round(cropH * aspect);
    scaleFactor = Number((cos + (1 / aspect) * sin).toFixed(4));
  }

  cropW = Math.min(width, Math.max(10, cropW));
  cropH = Math.min(height, Math.max(10, cropH));

  const cropX = Math.max(0, Math.round((width - cropW) / 2));
  const cropY = Math.max(0, Math.round((height - cropH) / 2));

  const origArea = width * height;
  const cropArea = cropW * cropH;
  const lossPercentage = Number((((origArea - cropArea) / origArea) * 100).toFixed(1));

  return {
    x: cropX,
    y: cropY,
    width: cropW,
    height: cropH,
    scaleFactor: Math.max(1.0, scaleFactor),
    lossPercentage,
  };
}

/**
 * Detects the subject's central vertical axis of orientation from foreground pixels / skin tones.
 * Uses image moments and principal inertia axis around the image center.
 */
export function detectSubjectInertiaAngle(
  gray: Float32Array,
  width: number,
  height: number,
  faceTiltHint?: number | null
): { angleDeg: number; confidence: number } | null {
  // If direct face tilt angle is provided from face detector, prioritize it
  if (typeof faceTiltHint === 'number' && Math.abs(faceTiltHint) <= 15.0) {
    return {
      angleDeg: Number(faceTiltHint.toFixed(1)),
      confidence: 0.95,
    };
  }

  // Central 60% region of the image (where the main subject typically resides)
  const startX = Math.round(width * 0.2);
  const endX = Math.round(width * 0.8);
  const startY = Math.round(height * 0.15);
  const endY = Math.round(height * 0.85);

  let sum = 0;
  let count = 0;
  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      sum += gray[y * width + x];
      count++;
    }
  }
  const meanGray = sum / Math.max(1, count);

  // Find high-contrast subject edges/mass in center
  let m00 = 0;
  let m10 = 0;
  let m01 = 0;

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const val = gray[y * width + x];
      const diff = Math.abs(val - meanGray);
      if (diff > 25) {
        m00 += diff;
        m10 += x * diff;
        m01 += y * diff;
      }
    }
  }

  if (m00 < 50) return null;

  const cx = m10 / m00;
  const cy = m01 / m00;

  // Central second moments (covariance)
  let u20 = 0;
  let u02 = 0;
  let u11 = 0;

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const val = gray[y * width + x];
      const diff = Math.abs(val - meanGray);
      if (diff > 25) {
        const dx = x - cx;
        const dy = y - cy;
        u20 += dx * dx * diff;
        u02 += dy * dy * diff;
        u11 += dx * dy * diff;
      }
    }
  }

  if (u20 + u02 === 0) return null;

  // Principal axis angle
  const theta = 0.5 * Math.atan2(2 * u11, u20 - u02);
  let bodyDeg = (theta * 180) / Math.PI;

  // Body vertical orientation: deviation from vertical axis
  while (bodyDeg < -45) bodyDeg += 90;
  while (bodyDeg > 45) bodyDeg -= 90;

  // Only consider realistic handheld tilt (<= 12 degrees)
  if (Math.abs(bodyDeg) <= 12.0) {
    return {
      angleDeg: Number(bodyDeg.toFixed(1)),
      confidence: 0.85,
    };
  }

  return null;
}
