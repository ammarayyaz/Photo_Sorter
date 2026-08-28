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
    // Lift shadows & reduce contrast slightly: brightness(1.14) contrast(0.88)
    cssFilter = 'brightness(1.14) contrast(0.88) saturate(1.05)';
  } else if (exposureState === 'OVER_EXPOSED') {
    // Tame highlights and roll off whites: brightness(0.90) contrast(0.94)
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
 * Evaluates photo quality based on Subject ROI focus, Facial Eye Openness (Eyes Closed / Blinking) & Motion Shake.
 * 
 * Rules:
 * - Kept Winner: Subject is sharp and eyes are open (shallow depth-of-field / background bokeh is protected!).
 * - _archive: Only archived if subject eyes are closed (< 45%), true motion shake smear is detected, or subject is severely out of focus (< 28).
 */
export function classifyBlurAndMotion(
  subjectSharpness: number = 80,
  isMotionSmear: boolean = false,
  motionAngleDeg: number = 0,
  eyeOpennessScore: number = 0.90,
  hasFace: boolean = true
) {
  // 1. Defocus Blur: Only if subject ROI itself is completely out of focus (< 28)
  const isDefocus = subjectSharpness < 28;

  // 2. Eyes Closed / Blinking: Only if a face is detected and eye openness is < 0.45
  const isEyesClosed = hasFace && eyeOpennessScore < 0.45;

  // 3. Overall Culling Decision
  const isCulled = isEyesClosed || isMotionSmear || isDefocus;

  let blurType: 'NONE' | 'DEFOCUS_BLUR' | 'MOTION_SHAKE' = 'NONE';
  let reason = hasFace
    ? `Subject in focus & eyes open (${(eyeOpennessScore * 100).toFixed(0)}%) • Kept Winner`
    : `Subject in focus (${subjectSharpness.toFixed(0)}/100) • Kept Winner`;

  if (isMotionSmear) {
    blurType = 'MOTION_SHAKE';
    reason = `Camera motion shake blur detected along ${motionAngleDeg}° axis`;
  } else if (isEyesClosed) {
    blurType = 'DEFOCUS_BLUR';
    reason = `Subject eyes closed or blinking (${(eyeOpennessScore * 100).toFixed(0)}% < 45%)`;
  } else if (isDefocus) {
    blurType = 'DEFOCUS_BLUR';
    reason = `Subject out of focus (Sharpness ${subjectSharpness.toFixed(0)} < 28)`;
  }

  return {
    isBlur: isCulled,
    blurType,
    eyeOpenness: eyeOpennessScore,
    motionDirectionDeg: isMotionSmear ? motionAngleDeg : undefined,
    sharpnessScore: subjectSharpness,
    reason,
    isArchived: isCulled,
  };
}
