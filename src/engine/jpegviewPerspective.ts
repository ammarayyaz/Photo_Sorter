/**
 * JPEGView Perspective & Keystone Correction Engine
 * 
 * Ported from sylikc/jpegview (C++):
 * - Helpers.cpp: CalculateMaxIncludedRectKeepAR
 * - ImageProcessingTypes.h: CTrapezoid
 * - TiltCorrectionPanelCtl.cpp: Perspective tilt & asymmetric trapezoid calculation
 */

export interface JpegViewTrapezoid {
  x1s: number; // Top-left X
  x1e: number; // Top-right X
  y1: number;  // Top Y
  x2s: number; // Bottom-left X
  x2e: number; // Bottom-right X
  y2: number;  // Bottom Y
}

export interface InscribedRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  lossPercentage: number;
}

/**
 * Creates a normalized CTrapezoid matching JPEGView ImageProcessingTypes.h
 */
export function createTrapezoid(
  x1s: number,
  x1e: number,
  y1: number,
  x2s: number,
  x2e: number,
  y2: number
): JpegViewTrapezoid {
  return {
    x1s: Math.min(x1s, x1e),
    x1e: Math.max(x1s, x1e),
    y1: Math.min(y1, y2),
    x2s: Math.min(x2s, x2e),
    x2e: Math.max(x2s, x2e),
    y2: Math.max(y1, y2),
  };
}

/**
 * Port of JPEGView's CalculateMaxIncludedRectKeepAR (Helpers.cpp: line 630).
 * Analytically computes the maximum inscribed rectangle that strictly preserves
 * the original aspect ratio inside any perspective-deformed trapezoid.
 *
 * @param trapezoid The distorted quadrilateral boundary
 * @param aspectRatio Target aspect ratio (width / height)
 * @param origWidth Original image width (for loss calculation)
 * @param origHeight Original image height (for loss calculation)
 */
export function calculateMaxIncludedRectKeepAR(
  trapezoid: JpegViewTrapezoid,
  aspectRatio: number,
  origWidth?: number,
  origHeight?: number
): InscribedRect {
  const w1 = trapezoid.x1e - trapezoid.x1s;
  const w2 = trapezoid.x2e - trapezoid.x2s;

  if (
    (trapezoid.x1s >= trapezoid.x2s && trapezoid.x1e <= trapezoid.x2e) ||
    (trapezoid.x1s <= trapezoid.x2s && trapezoid.x1e >= trapezoid.x2e)
  ) {
    const h = trapezoid.y2 - trapezoid.y1;
    if (h <= 0) {
      return { left: 0, top: 0, right: w1, bottom: h, width: w1, height: h, lossPercentage: 0 };
    }

    const dTerm = (w2 - w1) / h;
    const bPyramid = w1 < w2;
    const dY = bPyramid
      ? (aspectRatio * h - w1) / (aspectRatio + dTerm)
      : w1 / (aspectRatio - dTerm);

    const dAlpha = Math.max(0, Math.min(1, dY / h));
    let dX = (trapezoid.x2s - trapezoid.x1s) * dAlpha + trapezoid.x1s;
    const computedY = dY + trapezoid.y1;

    const left = Math.round(dX);
    const top = bPyramid ? Math.round(computedY) : trapezoid.y1;
    const right = Math.round(trapezoid.x1e + (trapezoid.x2e - trapezoid.x1e) * dAlpha);
    const bottom = bPyramid ? trapezoid.y2 : Math.round(computedY);

    const width = Math.max(1, right - left);
    const height = Math.max(1, bottom - top);

    const totalOrigArea = (origWidth && origHeight) ? origWidth * origHeight : (trapezoid.x1e - trapezoid.x1s) * (trapezoid.y2 - trapezoid.y1);
    const croppedArea = width * height;
    const lossPercentage = totalOrigArea > 0 ? Number((((totalOrigArea - croppedArea) / totalOrigArea) * 100).toFixed(1)) : 0;

    return {
      left,
      top,
      right,
      bottom,
      width,
      height,
      lossPercentage: Math.max(0, lossPercentage),
    };
  }

  if (trapezoid.x1s < trapezoid.x2s) {
    if (w1 < w2) {
      return calculateMaxIncludedRectKeepAR(
        createTrapezoid(trapezoid.x2s, trapezoid.x1e, trapezoid.y1, trapezoid.x2s, trapezoid.x2e, trapezoid.y2),
        aspectRatio,
        origWidth,
        origHeight
      );
    } else {
      return calculateMaxIncludedRectKeepAR(
        createTrapezoid(trapezoid.x1s, trapezoid.x1e, trapezoid.y1, trapezoid.x2s, trapezoid.x1e, trapezoid.y2),
        aspectRatio,
        origWidth,
        origHeight
      );
    }
  } else {
    if (w1 < w2) {
      return calculateMaxIncludedRectKeepAR(
        createTrapezoid(trapezoid.x1s, trapezoid.x2e, trapezoid.y1, trapezoid.x2s, trapezoid.x2e, trapezoid.y2),
        aspectRatio,
        origWidth,
        origHeight
      );
    } else {
      return calculateMaxIncludedRectKeepAR(
        createTrapezoid(trapezoid.x1s, trapezoid.x1e, trapezoid.y1, trapezoid.x1s, trapezoid.x2e, trapezoid.y2),
        aspectRatio,
        origWidth,
        origHeight
      );
    }
  }
}

/**
 * Computes perspective trapezoid coordinates from keystone tilt parameters.
 * Ported from JPEGView CTiltCorrectionPanelCtl::GetCurrentTrapezoid.
 * 
 * @param width Full image width
 * @param height Full image height
 * @param horizontalKeystoneDeg Angle/intensity of horizontal perspective tilt (-45 to 45)
 * @param verticalKeystoneDeg Angle/intensity of vertical keystone tilt (-45 to 45)
 */
export function computePerspectiveTrapezoid(
  width: number,
  height: number,
  horizontalKeystoneDeg: number = 0,
  verticalKeystoneDeg: number = 0
): { trapezoid: JpegViewTrapezoid; cropRect: InscribedRect } {
  // Map keystone angle to pixel delta shift
  const maxShiftX = width * 0.25;
  const shiftX = Math.tan((horizontalKeystoneDeg * Math.PI) / 180) * (height / 2);
  const clampedShiftX = Math.max(-maxShiftX, Math.min(maxShiftX, shiftX));

  const maxShiftY = height * 0.25;
  const shiftY = Math.tan((verticalKeystoneDeg * Math.PI) / 180) * (width / 2);
  const clampedShiftY = Math.max(-maxShiftY, Math.min(maxShiftY, shiftY));

  // Build symmetrical or asymmetrical trapezoid
  const x1s = Math.round(Math.max(0, clampedShiftX));
  const x1e = Math.round(Math.min(width - 1, width - 1 + clampedShiftX));
  const y1 = Math.round(Math.max(0, clampedShiftY));

  const x2s = Math.round(Math.max(0, -clampedShiftX));
  const x2e = Math.round(Math.min(width - 1, width - 1 - clampedShiftX));
  const y2 = Math.round(Math.min(height - 1, height - 1 - clampedShiftY));

  const trapezoid = createTrapezoid(x1s, x1e, y1, x2s, x2e, y2);
  const aspectRatio = width / Math.max(1, height);
  const cropRect = calculateMaxIncludedRectKeepAR(trapezoid, aspectRatio, width, height);

  return { trapezoid, cropRect };
}
