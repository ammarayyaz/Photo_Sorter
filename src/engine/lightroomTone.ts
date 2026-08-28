import { LightroomAdjustments, ExposureCategory } from './types';

/**
 * Analyzes photo luminance and determines Lightroom-grade tonal adjustments.
 * 
 * Rules:
 * - Under-exposed (< 95 luminance): Contrast -20, Shadows +20 (lifts shadows, softens harsh clip)
 * - Over-exposed (> 170 luminance): Highlights -20, Whites -20 (recovers blown sky & specular roll-off)
 * - Balanced (95 - 170 luminance): 0 adjustments
 */
export function calculateLightroomAdjustments(meanLuminance: number): LightroomAdjustments {
  let exposureState: ExposureCategory = 'BALANCED';
  let contrast = 0;
  let shadows = 0;
  let highlights = 0;
  let whites = 0;
  let appliedToneDescription = 'Balanced exposure (No tonal clipping detected)';

  if (meanLuminance < 95) {
    exposureState = 'UNDER_EXPOSED';
    contrast = -20;
    shadows = 20;
    appliedToneDescription = 'Under-exposed: Applied Contrast -20, Shadows +20';
  } else if (meanLuminance > 170) {
    exposureState = 'OVER_EXPOSED';
    highlights = -20;
    whites = -20;
    appliedToneDescription = 'Over-exposed: Applied Highlights -20, Whites -20';
  }

  // Generate real-time CSS filter matrix for visual reproduction
  let cssFilter = 'none';
  if (exposureState === 'UNDER_EXPOSED') {
    // Lift shadows & reduce contrast slightly: brightness(1.12) contrast(0.88)
    cssFilter = 'brightness(1.14) contrast(0.88) saturate(1.05)';
  } else if (exposureState === 'OVER_EXPOSED') {
    // Tame highlights and roll off whites: brightness(0.90) contrast(0.92)
    cssFilter = 'brightness(0.90) contrast(0.94) saturate(1.02)';
  }

  return {
    exposureState,
    meanLuminance,
    contrast,
    shadows,
    highlights,
    whites,
    appliedToneDescription,
    cssFilter,
  };
}

/**
 * Classifies whether a frame is blurred, and distinguishes defocus blur from camera motion shake blur.
 */
export function classifyBlurAndMotion(
  laplacianSharpness: number,
  isMotionSmear: boolean = false,
  motionAngleDeg: number = 0
) {
  const isBlur = laplacianSharpness < 50 || isMotionSmear;

  let blurType: 'NONE' | 'DEFOCUS_BLUR' | 'MOTION_SHAKE' = 'NONE';
  let reason = 'Sharp winner frame';

  if (isMotionSmear) {
    blurType = 'MOTION_SHAKE';
    reason = `Camera motion shake blur detected along ${motionAngleDeg}° axis`;
  } else if (laplacianSharpness < 50) {
    blurType = 'DEFOCUS_BLUR';
    reason = `Defocus lens blur (Sharpness ${laplacianSharpness.toFixed(1)} < threshold 50.0)`;
  }

  return {
    isBlur,
    blurType,
    motionDirectionDeg: isMotionSmear ? motionAngleDeg : undefined,
    sharpnessScore: laplacianSharpness,
    reason,
    isArchived: isBlur,
  };
}
