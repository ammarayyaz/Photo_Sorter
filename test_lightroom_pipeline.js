import { calculateLightroomAdjustments, classifyBlurAndMotion } from './src/engine/lightroomTone.ts';
import { PhotoPipelineController } from './src/engine/pipeline.ts';

console.log('====================================================');
console.log('  Testing 4-Step Photo Pipeline & Lightroom Tuning');
console.log('====================================================\n');

// Test 1: Lightroom Tone Adjustment Rules
console.log('[Test 1] Verifying Adobe Lightroom-style Tonal Parameters...');
const under = calculateLightroomAdjustments(65); // Underexposed (< 95)
console.log(`  Underexposed (Lum: 65) -> Contrast: ${under.contrast}, Shadows: +${under.shadows}`);
if (under.exposureState !== 'UNDER_EXPOSED' || under.contrast !== -20 || under.shadows !== 20) {
  throw new Error('Test 1 Failed: Underexposed must set Contrast: -20, Shadows: +20');
}

const over = calculateLightroomAdjustments(190); // Overexposed (> 170)
console.log(`  Overexposed (Lum: 190) -> Highlights: ${over.highlights}, Whites: ${over.whites}`);
if (over.exposureState !== 'OVER_EXPOSED' || over.highlights !== -20 || over.whites !== -20) {
  throw new Error('Test 1 Failed: Overexposed must set Highlights: -20, Whites: -20');
}

const balanced = calculateLightroomAdjustments(128); // Balanced
console.log(`  Balanced (Lum: 128) -> Contrast: ${balanced.contrast}, Highlights: ${balanced.highlights}`);
if (balanced.exposureState !== 'BALANCED' || balanced.contrast !== 0 || balanced.shadows !== 0) {
  throw new Error('Test 1 Failed: Balanced exposure must leave parameters at 0');
}
console.log('  ✓ Adobe Lightroom-style tonal parameters verified 100%.\n');

// Test 2: Defocus Blur vs Motion Shake Classification
console.log('[Test 2] Verifying Defocus Blur & Camera Motion Shake Separation...');
const blurDefocus = classifyBlurAndMotion(35.0, false);
console.log(`  Defocus Blur (Sharpness 35.0) -> ${blurDefocus.blurType} (Archived: ${blurDefocus.isArchived})`);
if (blurDefocus.blurType !== 'DEFOCUS_BLUR' || !blurDefocus.isArchived) {
  throw new Error('Test 2 Failed: Sharpness < 50 must classify as DEFOCUS_BLUR and archive');
}

const blurMotion = classifyBlurAndMotion(45.0, true, 25);
console.log(`  Motion Blur (Directional Smear) -> ${blurMotion.blurType} (Archived: ${blurMotion.isArchived})`);
if (blurMotion.blurType !== 'MOTION_SHAKE' || !blurMotion.isArchived) {
  throw new Error('Test 2 Failed: Motion smear must classify as MOTION_SHAKE and archive');
}
console.log('  ✓ Blur & Motion culling classification verified 100%.\n');

// Test 3: Full Pipeline Execution
console.log('[Test 3] Verifying 4-Step Pipeline Execution...');
const controller = new PhotoPipelineController({
  sourceDirectory: 'D:/DCIM/Wedding_Dump',
  destinationDirectory: 'D:/Photos/Organized',
  geminiApiKey: '',
  autoStraighten: true,
  straightenThresholdDeg: 0.5,
  inscribedAutoCrop: true,
  cullBursts: true,
  burstTimeWindowSec: 3.0,
  archiveRejectedBursts: true,
  clusterFaces: true,
  faceClusteringSensitivity: 0.38,
  outputFormat: 'JPEG',
  jpegQuality: 92,
});

await controller.startPipeline();
console.log('  ✓ Full 4-Step Pipeline completed successfully.\n');

console.log('====================================================');
console.log('  Results: 3 / 3 Test Suites Passed Successfully (100%)');
console.log('====================================================\n');
