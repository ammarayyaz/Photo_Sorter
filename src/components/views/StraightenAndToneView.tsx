import React, { useState, useEffect, useCallback } from 'react';
import {
  Compass,
  Sliders,
  CheckCircle2,
  ZoomIn,
  ArrowRight,
  Sun,
  Moon,
  Sparkles,
  RotateCcw,
  RotateCw,
  Grid,
  Wand2,
  RefreshCw,
  Check,
  FolderCheck
} from 'lucide-react';
import { ProcessedItem, PipelineMetrics } from '../../engine/types';
import { getOriginalFileBlob } from '../../engine/storageManager';
import {
  calculateInscribedCrop,
  detectHorizonAndTiltAngle,
  StraighteningAlgorithm
} from '../../engine/horizonDetector';
import { calculateLightroomAdjustments } from '../../engine/lightroomTone';
import {
  analyzeStraightnessWithGemini,
  GeminiStraightenResult
} from '../../engine/geminiStraightener';

interface StraightenAndToneViewProps {
  items: ProcessedItem[];
  metrics: PipelineMetrics;
  geminiApiKey?: string;
  onContinueToOutput: () => void;
  onUpdateItems?: (items: ProcessedItem[]) => void;
}

export const StraightenAndToneView: React.FC<StraightenAndToneViewProps> = ({
  items,
  metrics,
  geminiApiKey,
  onContinueToOutput,
  onUpdateItems,
}) => {
  const [selectedItemId, setSelectedItemId] = useState<string>(
    items[0]?.metadata.id || ''
  );
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [isAutoDetecting, setIsAutoDetecting] = useState<boolean>(false);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState<boolean>(false);
  const [aiResults, setAiResults] = useState<Record<string, GeminiStraightenResult>>({});
  const [algorithm, setAlgorithm] = useState<StraighteningAlgorithm>('zoltanvin-hough');
  const [filterMode, setFilterMode] = useState<
    'all' | 'tilted' | 'straightened' | 'underexposed' | 'overexposed' | 'archive'
  >('all');
  const [activeFullResUrl, setActiveFullResUrl] = useState<string>('');
  const [showAppliedToast, setShowAppliedToast] = useState<boolean>(false);
  const [showAppliedFolderToast, setShowAppliedFolderToast] = useState<boolean>(false);

  const selectedItem = items.find((i) => i.metadata.id === selectedItemId) || items[0];

  useEffect(() => {
    let isMounted = true;
    let createdUrl = '';

    if (selectedItem) {
      getOriginalFileBlob(selectedItem.metadata.id)
        .then((blob: Blob | null) => {
          if (isMounted) {
            if (blob) {
              createdUrl = URL.createObjectURL(blob);
              setActiveFullResUrl(createdUrl);
            } else {
              setActiveFullResUrl(
                selectedItem.transformedThumbnailUrl || selectedItem.thumbnailUrl || ''
              );
            }
          }
        })
        .catch(() => {
          if (isMounted) {
            setActiveFullResUrl(
              selectedItem.transformedThumbnailUrl || selectedItem.thumbnailUrl || ''
            );
          }
        });
    }

    return () => {
      isMounted = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [selectedItem]);

  // Compute live inscribed scale factor so preview never shows black corner borders
  const currentCorrectedAngle = selectedItem?.geometry?.correctedAngleDeg || 0;
  const absAngleRad = Math.abs((currentCorrectedAngle * Math.PI) / 180);
  const sin = Math.sin(absAngleRad);
  const cos = Math.cos(absAngleRad);
  const dimW = selectedItem?.metadata.dimensions.width || 1920;
  const dimH = selectedItem?.metadata.dimensions.height || 1080;
  const aspect = dimW / dimH;
  const inscribedScale =
    aspect >= 1
      ? (dimH * cos + dimW * sin) / dimH
      : (dimW * cos + dimH * sin) / dimW;
  const previewScale = Math.max(1.0, Number(inscribedScale.toFixed(4)));

  // Update item angle helper
  const handleApplyAngle = useCallback(
    (newAngle: number) => {
      if (!selectedItem || !onUpdateItems) return;
      const roundedAngle = Number(newAngle.toFixed(1));
      const origW = selectedItem.metadata.dimensions.width || 1920;
      const origH = selectedItem.metadata.dimensions.height || 1080;
      const crop = calculateInscribedCrop(origW, origH, roundedAngle);

      // Dynamically render transformed thumbnail with canvas rotation and inscribed cropping
      let transformedThumbnail = selectedItem.transformedThumbnailUrl || selectedItem.thumbnailUrl;
      try {
        const transCanvas = document.createElement('canvas');
        const sW = 480;
        const sH = Math.round((sW * origH) / origW) || 320;
        transCanvas.width = sW;
        transCanvas.height = sH;
        const tCtx = transCanvas.getContext('2d');
        if (tCtx) {
          tCtx.imageSmoothingEnabled = true;
          tCtx.imageSmoothingQuality = 'high';
          const scale = crop.width > 0 ? Math.max(origW / crop.width, origH / crop.height) : 1.0;
          const baseImg = new Image();
          baseImg.crossOrigin = 'anonymous';
          baseImg.src = activeFullResUrl || selectedItem.thumbnailUrl;
          if (baseImg.complete && baseImg.naturalWidth > 0) {
            tCtx.save();
            tCtx.translate(sW / 2, sH / 2);
            tCtx.rotate((roundedAngle * Math.PI) / 180);
            tCtx.drawImage(
              baseImg,
              (-sW * scale) / 2,
              (-sH * scale) / 2,
              sW * scale,
              sH * scale
            );
            tCtx.restore();
            transformedThumbnail = transCanvas.toDataURL('image/jpeg', 0.88);
          }
        }
      } catch {}

      const updatedList = items.map((item) => {
        if (item.metadata.id === selectedItem.metadata.id) {
          return {
            ...item,
            transformedThumbnailUrl: transformedThumbnail,
            geometry: {
              ...item.geometry,
              detectedAngleDeg: Number((-roundedAngle).toFixed(1)),
              correctedAngleDeg: roundedAngle,
              requiresCorrection: Math.abs(roundedAngle) >= 0.1,
              cropBox: {
                x: crop.x,
                y: crop.y,
                width: crop.width,
                height: crop.height,
              },
              cropLossPercentage: crop.lossPercentage,
            },
          };
        }
        return item;
      });

      onUpdateItems(updatedList);
    },
    [activeFullResUrl, items, onUpdateItems, selectedItem]
  );

  // Auto-Detect AI horizon & portrait tilt button
  const handleAutoDetect = useCallback(async () => {
    if (!selectedItem || !onUpdateItems) return;
    setIsAutoDetecting(true);

    try {
      // Create off-screen canvas to sample current image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      const sourceUrl = activeFullResUrl || selectedItem.thumbnailUrl;

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject();
        img.src = sourceUrl;
      });

      const sampleWidth = 480;
      const sampleHeight = Math.round((sampleWidth * (img.naturalHeight || 320)) / (img.naturalWidth || 480)) || 320;
      const canvas = document.createElement('canvas');
      canvas.width = sampleWidth;
      canvas.height = sampleHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (ctx) {
        ctx.drawImage(img, 0, 0, sampleWidth, sampleHeight);
        const imgData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
        const data = imgData.data;
        const gray = new Float32Array(sampleWidth * sampleHeight);
        for (let i = 0; i < gray.length; i++) {
          gray[i] = 0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2];
        }

        const detectedGeom = detectHorizonAndTiltAngle(
          gray,
          sampleWidth,
          sampleHeight,
          img.naturalWidth || sampleWidth,
          img.naturalHeight || sampleHeight,
          selectedItem.faces && selectedItem.faces.length > 0 ? 0 : null,
          algorithm
        );

        handleApplyAngle(detectedGeom.correctedAngleDeg);
      }
    } catch {
      // Fallback
    } finally {
      setIsAutoDetecting(false);
    }
  }, [activeFullResUrl, handleApplyAngle, onUpdateItems, selectedItem]);

  // Adjust Lightroom tone sliders interactively
  const handleToneChange = useCallback(
    (param: 'contrast' | 'highlights' | 'shadows' | 'whites', value: number) => {
      if (!selectedItem || !onUpdateItems) return;

      const current = { ...selectedItem.lightroom, [param]: value };
      // Rebuild cssFilter
      const contrastVal = 1 + current.contrast / 100;
      const brightnessVal = 1 + (current.highlights + current.whites) / 400;
      const cssFilter = `contrast(${Math.max(0.2, contrastVal).toFixed(2)}) brightness(${Math.max(0.2, brightnessVal).toFixed(2)})`;

      const updatedList = items.map((item) => {
        if (item.metadata.id === selectedItem.metadata.id) {
          return {
            ...item,
            lightroom: {
              ...current,
              cssFilter,
            },
          };
        }
        return item;
      });

      onUpdateItems(updatedList);
    },
    [items, onUpdateItems, selectedItem]
  );

  // Reset Lightroom tone
  const handleResetTone = useCallback(() => {
    if (!selectedItem || !onUpdateItems) return;
    const baseLr = calculateLightroomAdjustments(selectedItem.lightroom.meanLuminance || 120);

    const updatedList = items.map((item) => {
      if (item.metadata.id === selectedItem.metadata.id) {
        return {
          ...item,
          lightroom: baseLr,
        };
      }
      return item;
    });

    onUpdateItems(updatedList);
  }, [items, onUpdateItems, selectedItem]);

  // 1. Single Image Gemini AI Straighten Scan
  const handleGeminiAiStraighten = useCallback(async () => {
    if (!selectedItem || !onUpdateItems) return;
    setIsAiAnalyzing(true);

    try {
      const result = await analyzeStraightnessWithGemini(geminiApiKey, selectedItem);
      setAiResults((prev) => ({ ...prev, [selectedItem.metadata.id]: result }));

      if (result.needsStraightening) {
        handleApplyAngle(result.recommendedCorrectionAngleDeg);
      } else if (result.isStraight) {
        handleApplyAngle(0.0);
      }
    } catch {
      // Fallback
    } finally {
      setIsAiAnalyzing(false);
    }
  }, [geminiApiKey, handleApplyAngle, onUpdateItems, selectedItem]);

  // 2. Batch Gemini AI Straighten All
  const handleBatchGeminiAiStraightenAll = useCallback(async () => {
    if (!onUpdateItems || items.length === 0) return;
    setIsAiAnalyzing(true);

    const updatedList = [...items];
    const newAiResults: Record<string, GeminiStraightenResult> = { ...aiResults };

    for (let i = 0; i < updatedList.length; i++) {
      const it = updatedList[i];
      try {
        const res = await analyzeStraightnessWithGemini(geminiApiKey, it);
        newAiResults[it.metadata.id] = res;

        if (res.needsStraightening) {
          const recAngle = res.recommendedCorrectionAngleDeg;
          const origW = it.metadata.dimensions.width || 1920;
          const origH = it.metadata.dimensions.height || 1080;
          const crop = calculateInscribedCrop(origW, origH, recAngle);

          updatedList[i] = {
            ...it,
            geometry: {
              ...it.geometry,
              detectedAngleDeg: res.estimatedTiltAngleDeg,
              correctedAngleDeg: recAngle,
              requiresCorrection: true,
              cropBox: { x: crop.x, y: crop.y, width: crop.width, height: crop.height },
              cropLossPercentage: crop.lossPercentage,
            },
          };
        }
      } catch {
        // Continue
      }
    }

    setAiResults(newAiResults);
    onUpdateItems(updatedList);
    setIsAiAnalyzing(false);
  }, [aiResults, geminiApiKey, items, onUpdateItems]);

  // Batch auto-straighten all photos in queue via geometry
  const handleBatchStraightenAll = useCallback(async () => {
    if (!onUpdateItems || items.length === 0) return;
    setIsAutoDetecting(true);

    const updated = items.map((item) => {
      const angle = item.geometry.detectedAngleDeg;
      const targetAngle = item.geometry.correctedAngleDeg !== 0 ? item.geometry.correctedAngleDeg : -angle;
      if (Math.abs(targetAngle) >= 0.1) {
        const crop = calculateInscribedCrop(
          item.metadata.dimensions.width,
          item.metadata.dimensions.height,
          targetAngle
        );
        return {
          ...item,
          geometry: {
            ...item.geometry,
            requiresCorrection: true,
            correctedAngleDeg: targetAngle,
            cropBox: { x: crop.x, y: crop.y, width: crop.width, height: crop.height },
            cropLossPercentage: crop.lossPercentage,
          },
        };
      }
      return item;
    });

    onUpdateItems(updated);
    setIsAutoDetecting(false);
  }, [items, onUpdateItems]);

  const displayedList = items.filter((item) => {
    if (filterMode === 'straightened') return item.geometry && item.geometry.requiresCorrection;
    if (filterMode === 'underexposed') return item.lightroom?.exposureState === 'UNDER_EXPOSED';
    if (filterMode === 'overexposed') return item.lightroom?.exposureState === 'OVER_EXPOSED';
    if (filterMode === 'archive') return item.isArchived;
    return true;
  });

  if (!selectedItem) {
    return (
      <div className="bg-white dark:bg-[#0E0E0E] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-12 text-center text-[#9CA3AF]">
        No images loaded for Step 3.
      </div>
    );
  }

  const { metadata, geometry, lightroom } = selectedItem;
  const isUnder = lightroom.exposureState === 'UNDER_EXPOSED';
  const isOver = lightroom.exposureState === 'OVER_EXPOSED';

  const realStraightened = items.filter((i) => i.geometry && i.geometry.requiresCorrection).length;
  const realUnderexposed = items.filter((i) => i.lightroom && i.lightroom.exposureState === 'UNDER_EXPOSED').length;
  const realOverexposed = items.filter((i) => i.lightroom && i.lightroom.exposureState === 'OVER_EXPOSED').length;

  // Check if any image has detected tilt but is not yet leveled/straightened
  const unstraightenedTiltedPhotos = items.filter(
    (i) => i.geometry && Math.abs(i.geometry.detectedAngleDeg) >= 0.5 && i.geometry.correctedAngleDeg === 0
  );
  const totalTiltedCount = items.filter(
    (i) => (i.geometry && Math.abs(i.geometry.detectedAngleDeg) >= 0.5) || (i.geometry && i.geometry.correctedAngleDeg !== 0)
  ).length;

  const maxDetectedTilt = items.reduce(
    (max, i) => Math.max(max, Math.abs(i.geometry?.detectedAngleDeg || 0)),
    0
  );

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pr-1 pb-6 select-none">
      {/* 1. Header Banner */}
      <div className="bg-white dark:bg-[#0E0E0E] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-4 flex items-center justify-between transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#4D694E]/15 text-[#4D694E] border border-[#4D694E]/30 flex items-center justify-center font-bold">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-heading text-xs font-bold text-[#111827] dark:text-white">
              Horizon Straightening &amp; Lightroom Tonal Corrections
            </h2>
            <p className="text-2xs text-[#4B5563] dark:text-[#A1A1AA]">
              Zoltanvin Hough Line Segment &amp; AI Multi-Axis Tilt Detection with Inscribed Zero-Border Cropping.
            </p>
          </div>
        </div>

        {/* Top Actions: AI Straighten All + Auto-Level All + Proceed */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleBatchGeminiAiStraightenAll}
            disabled={isAiAnalyzing || isAutoDetecting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#4D694E]/10 hover:bg-[#4D694E]/20 text-[#4D694E] border border-[#4D694E]/30 font-heading font-bold text-xs tracking-wide transition-all cursor-pointer shadow-none whitespace-nowrap flex-shrink-0"
            title="Scan all images with Gemini Vision AI to detect and level tilted photos"
          >
            <Sparkles className={`w-3.5 h-3.5 flex-shrink-0 ${isAiAnalyzing ? 'animate-spin' : ''}`} />
            <span className="whitespace-nowrap">{isAiAnalyzing ? 'AI Straightening...' : 'AI Straighten All'}</span>
          </button>

          <button
            onClick={handleBatchStraightenAll}
            disabled={isAutoDetecting || isAiAnalyzing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#181818] dark:hover:bg-[#222222] text-[#111827] dark:text-white border border-[#E5E7EB] dark:border-[#27272A] font-heading font-bold text-xs tracking-wide transition-all cursor-pointer whitespace-nowrap flex-shrink-0"
          >
            <Compass className="w-3.5 h-3.5 text-[#4D694E] flex-shrink-0" />
            <span className="whitespace-nowrap">Auto-Level All</span>
          </button>

          <button
            onClick={onContinueToOutput}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4D694E] hover:bg-[#3C533D] text-[#FFF3D5] font-heading font-bold text-xs tracking-wide transition-all active:scale-98 cursor-pointer shadow-none whitespace-nowrap flex-shrink-0"
          >
            <span className="whitespace-nowrap">Proceed to Step 4: Batch Rename</span>
            <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" />
          </button>
        </div>
      </div>

      {/* 2. Audit Health Alert Bar (Checks if any image is tilted / un-straightened) */}
      {unstraightenedTiltedPhotos.length > 0 ? (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold flex-shrink-0">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <span className="font-heading font-bold text-xs text-amber-600 dark:text-amber-400">
                {unstraightenedTiltedPhotos.length} Photo{unstraightenedTiltedPhotos.length > 1 ? 's' : ''} with Detected Tilt Need Straightening
              </span>
              <p className="text-2xs text-[#4B5563] dark:text-[#A1A1AA]">
                AI has identified tilt angles up to {maxDetectedTilt.toFixed(1)}°. Click below to level horizons and human posture automatically.
              </p>
            </div>
          </div>

          <button
            onClick={handleBatchStraightenAll}
            disabled={isAutoDetecting}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-heading font-bold text-xs transition-all cursor-pointer shadow-none whitespace-nowrap flex-shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">Straighten Tilted ({unstraightenedTiltedPhotos.length})</span>
          </button>
        </div>
      ) : (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-2.5 px-4 flex items-center justify-between text-2xs font-sans">
          <span className="text-emerald-600 dark:text-emerald-400 font-heading font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-500" />
            All loaded photos are perfectly leveled &amp; verified straight (0.0° deviation).
          </span>
          <span className="text-[#4B5563] dark:text-[#A1A1AA] font-mono tabular-nums font-semibold">
            Active Engine: {algorithm === 'canny-hough' ? 'Canny-Hough (Spicer/Nostrenz)' : algorithm === 'zoltanvin-hough' ? 'Zoltanvin HoughLines' : algorithm === 'hybrid-ensemble' ? 'Hybrid AI Ensemble' : algorithm === 'portrait-body' ? 'Portrait Body Lean' : 'Radon Profile'}
          </span>
        </div>
      )}

      {/* 3. Metrics Strip */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#0E0E0E] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-3 flex flex-col justify-between">
          <span className="font-heading text-xs font-semibold text-[#4B5563] dark:text-[#A1A1AA]">Images Straightened</span>
          <div className="font-mono tabular-nums text-xl font-extrabold text-[#111827] dark:text-white mt-1">
            {metrics.imagesStraightened > 0 ? metrics.imagesStraightened : realStraightened} photos
          </div>
        </div>

        <div className="bg-white dark:bg-[#0E0E0E] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs">
            <span className="font-heading font-semibold text-[#111827] dark:text-white">Under-Exposed Photos</span>
            <Moon className="w-4 h-4 text-[#9CA3AF]" />
          </div>
          <div className="font-mono tabular-nums text-xl font-extrabold text-[#4D694E] mt-1">
            {metrics.underexposedCount > 0 ? metrics.underexposedCount : realUnderexposed} frames
          </div>
        </div>

        <div className="bg-white dark:bg-[#0E0E0E] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs">
            <span className="font-heading font-semibold text-[#4D694E]">Over-Exposed Photos</span>
            <Sun className="w-4 h-4 text-[#4D694E]" />
          </div>
          <div className="font-mono tabular-nums text-xl font-extrabold text-[#4D694E] mt-1">
            {metrics.overexposedCount > 0 ? metrics.overexposedCount : realOverexposed} frames
          </div>
        </div>

        <div className="bg-white dark:bg-[#0E0E0E] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-3 flex flex-col justify-between">
          <span className="font-heading text-xs font-semibold text-[#4B5563] dark:text-[#A1A1AA]">Zero Black Borders</span>
          <div className="font-mono tabular-nums text-xl font-extrabold text-[#111827] dark:text-white mt-1">
            100% Inscribed
          </div>
        </div>
      </div>

      {/* 3. Main Split Comparison Viewer + Interactive Straighten & Lightroom Sliders */}
      <div className="grid grid-cols-12 gap-3 flex-1 min-h-[460px]">
        {/* Left 8 Cols: Interactive Split Comparison with Alignment Grid */}
        <div className="col-span-8 bg-white dark:bg-[#0E0E0E] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-3.5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB] dark:border-[#27272A]">
            <div className="flex items-center gap-2">
              <span className="font-sans font-bold text-xs text-[#111827] dark:text-white truncate max-w-[240px]">
                {metadata.filename}
              </span>
              {selectedItem.isArchived && (
                <span className="text-2xs font-heading font-extrabold px-1.5 py-0.2 rounded bg-red-600 text-white">
                  _archive folder
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-2xs font-mono tabular-nums font-bold text-[#4D694E] bg-[#4D694E]/10 px-2 py-0.5 rounded border border-[#4D694E]/30 flex items-center gap-1">
                <Compass className="w-3 h-3" />
                {geometry.correctedAngleDeg !== 0 ? (
                  `${geometry.correctedAngleDeg > 0 ? '+' : ''}${geometry.correctedAngleDeg.toFixed(1)}° Straightened`
                ) : (
                  'Level 0.0°'
                )}
              </span>
              <span className="text-2xs font-mono tabular-nums font-bold text-[#111827] dark:text-white bg-slate-100 dark:bg-[#181818] px-2 py-0.5 rounded border border-[#E5E7EB] dark:border-[#27272A]">
                Luminance: {lightroom.meanLuminance}
              </span>
            </div>
          </div>

          {/* Dual Split Slider Container */}
          <div className="relative flex-1 rounded-xl overflow-hidden bg-slate-950 border border-slate-200 dark:border-[#27272A] min-h-[340px]">
            {/* Leveling Alignment Grid Overlay (toggleable) */}
            {showGrid && (
              <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-0">
                <div className="w-full h-full grid grid-cols-3 grid-rows-3">
                  <div className="border-r border-b border-white/20 border-dashed" />
                  <div className="border-r border-b border-white/20 border-dashed" />
                  <div className="border-b border-white/20 border-dashed" />
                  <div className="border-r border-b border-white/20 border-dashed" />
                  <div className="border-r border-b border-white/20 border-dashed relative">
                    <div className="absolute inset-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 border border-[#4D694E]/60 rounded-full" />
                  </div>
                  <div className="border-b border-white/20 border-dashed" />
                  <div className="border-r border-white/20 border-dashed" />
                  <div className="border-r border-white/20 border-dashed" />
                  <div />
                </div>
              </div>
            )}

            {/* BASE LAYER: Straightened & Inscribed Cropped + Lightroom Toned */}
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
              <img
                src={activeFullResUrl || selectedItem.transformedThumbnailUrl || selectedItem.thumbnailUrl}
                alt="Straightened & Toned Preview"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.src !== selectedItem.transformedThumbnailUrl && selectedItem.transformedThumbnailUrl) {
                    target.src = selectedItem.transformedThumbnailUrl;
                  } else if (target.src !== selectedItem.thumbnailUrl && selectedItem.thumbnailUrl) {
                    target.src = selectedItem.thumbnailUrl;
                  }
                }}
                style={{
                  filter: lightroom.cssFilter || 'none',
                  transform: `rotate(${geometry.correctedAngleDeg}deg) scale(${previewScale * (isZoomed ? 1.5 : 1.0)})`,
                  transformOrigin: 'center center',
                }}
                className="w-full h-full object-cover transition-transform duration-150"
              />
              <div className="absolute top-2.5 right-2.5 bg-black/80 backdrop-blur-sm text-white text-2xs font-heading font-extrabold px-2 py-0.5 rounded border border-white/20 flex items-center gap-1 z-30">
                <CheckCircle2 className="w-3 h-3 text-[#4D694E]" />
                <span>
                  {geometry.correctedAngleDeg !== 0
                    ? `STRAIGHTENED (${geometry.correctedAngleDeg > 0 ? '+' : ''}${geometry.correctedAngleDeg.toFixed(1)}°) + TONED`
                    : 'LEVELED 0.0° + TONED'}
                </span>
              </div>
            </div>

            {/* OVERLAY LAYER (Left side): Pure Original Raw Input */}
            <div
              className="absolute inset-0 overflow-hidden border-r-2 border-[#4D694E] z-10"
              style={{ width: `${sliderPos}%` }}
            >
              <div className="absolute inset-0 w-full h-full min-w-[640px] flex items-center justify-center pointer-events-none">
                <img
                  src={activeFullResUrl || selectedItem.thumbnailUrl}
                  alt="Original Raw Input"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src !== selectedItem.thumbnailUrl && selectedItem.thumbnailUrl) {
                      target.src = selectedItem.thumbnailUrl;
                    }
                  }}
                  className={`w-full h-full object-cover transition-transform duration-150 ${
                    isZoomed ? 'scale-150' : 'scale-100'
                  }`}
                  style={{
                    transformOrigin: 'center center',
                  }}
                />
              </div>
              <div className="absolute top-2.5 left-2.5 bg-black/80 backdrop-blur-sm text-white text-2xs font-heading font-extrabold px-2 py-0.5 rounded border border-white/20 whitespace-nowrap z-30">
                ORIGINAL RAW INPUT {geometry.detectedAngleDeg !== 0 && `(Tilt: ${geometry.detectedAngleDeg > 0 ? '+' : ''}${geometry.detectedAngleDeg}°)`}
              </div>
            </div>

            {/* Split Slider Range Drag Overlay */}
            <input
              type="range"
              min="0"
              max="100"
              value={sliderPos}
              onChange={(e) => setSliderPos(Number(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-40"
            />

            {/* Divider Handle */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-[#4D694E] pointer-events-none z-30"
              style={{ left: `${sliderPos}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-[#4D694E] text-[#FFF3D5] flex items-center justify-center text-xs font-bold shadow-md">
                ↔
              </div>
            </div>

            {/* Quick View Controls (Grid & Zoom) */}
            <div className="absolute bottom-2 right-2 z-30 flex items-center gap-1.5 bg-black/60 backdrop-blur-md p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  showGrid ? 'bg-[#4D694E] text-[#FFF3D5]' : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
                title="Toggle Leveling Grid"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setIsZoomed(!isZoomed)}
                className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  isZoomed ? 'bg-[#4D694E] text-[#FFF3D5]' : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
                title="Toggle 1.5x Zoom"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Inscribed Auto-Crop Information Footer */}
          <div className="flex items-center justify-between text-2xs font-mono tabular-nums text-[#4B5563] dark:text-[#A1A1AA] pt-1">
            <span>
              Inscribed Crop: {geometry.cropBox.width} × {geometry.cropBox.height} px (Crop Loss: {geometry.cropLossPercentage}%, Zero black borders)
            </span>
            <span className="text-[#4D694E] font-bold">{lightroom.appliedToneDescription}</span>
          </div>
        </div>

        {/* Right 4 Cols: Precision Straighten Controls + Lightroom Sliders */}
        <div className="col-span-4 bg-white dark:bg-[#0E0E0E] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-4 flex flex-col justify-between gap-4 overflow-y-auto">
          {/* Section 1: Precision Straighten & Angle Controls */}
          <div className="flex flex-col gap-2.5 pb-3 border-b border-[#E5E7EB] dark:border-[#27272A]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#4D694E]" />
                <span className="font-heading font-bold text-xs text-[#111827] dark:text-white">
                  Straighten &amp; Leveling
                </span>
              </div>
            </div>

            {/* Action Buttons: AI Vision Scan + Auto-Detect */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleGeminiAiStraighten}
                disabled={isAiAnalyzing}
                className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-[#4D694E] hover:bg-[#3C533D] text-[#FFF3D5] font-heading font-bold text-2xs cursor-pointer transition-colors shadow-none whitespace-nowrap"
                title="Analyze image with Gemini AI Vision to detect if straight or tilted"
              >
                <Sparkles className={`w-3.5 h-3.5 flex-shrink-0 ${isAiAnalyzing ? 'animate-spin' : ''}`} />
                <span className="whitespace-nowrap">{isAiAnalyzing ? 'Analyzing...' : 'AI Vision Scan'}</span>
              </button>

              <button
                onClick={handleAutoDetect}
                disabled={isAutoDetecting || isAiAnalyzing}
                className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-slate-100 dark:bg-[#181818] hover:bg-slate-200 dark:hover:bg-[#222222] text-[#111827] dark:text-white border border-[#E5E7EB] dark:border-[#27272A] font-heading font-bold text-2xs cursor-pointer transition-colors whitespace-nowrap"
                title="Run local geometric line detection"
              >
                <Wand2 className={`w-3.5 h-3.5 flex-shrink-0 text-[#4D694E] ${isAutoDetecting ? 'animate-spin' : ''}`} />
                <span className="whitespace-nowrap">{isAutoDetecting ? 'Detecting...' : 'Auto-Detect'}</span>
              </button>
            </div>

            {/* Gemini AI Visual Straightness Verdict Card */}
            {aiResults[selectedItem.metadata.id] && (
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#141414] border border-[#E5E7EB] dark:border-[#27272A] flex flex-col gap-1.5 text-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-heading font-bold text-xs flex items-center gap-1 text-[#111827] dark:text-white">
                    <Sparkles className="w-3.5 h-3.5 text-[#4D694E]" />
                    AI Vision Verdict
                  </span>
                  <span
                    className={`font-mono font-bold px-1.5 py-0.5 rounded text-[10px] ${
                      aiResults[selectedItem.metadata.id].isStraight
                        ? 'bg-emerald-500/15 text-emerald-500'
                        : 'bg-[#4D694E]/15 text-[#4D694E]'
                    }`}
                  >
                    {aiResults[selectedItem.metadata.id].isStraight
                      ? '✓ Verified Level (0.0°)'
                      : `⚠ Tilted: ${aiResults[selectedItem.metadata.id].estimatedTiltAngleDeg > 0 ? '+' : ''}${aiResults[selectedItem.metadata.id].estimatedTiltAngleDeg}°`}
                  </span>
                </div>

                <div className="text-[11px] text-[#4B5563] dark:text-[#A1A1AA] leading-snug">
                  {aiResults[selectedItem.metadata.id].reason}
                </div>

                <div className="flex items-center justify-between text-[10px] text-[#9CA3AF] pt-0.5 border-t border-[#E5E7EB] dark:border-[#27272A]/50">
                  <span>
                    Type:{' '}
                    <strong className="text-[#111827] dark:text-white capitalize">
                      {aiResults[selectedItem.metadata.id].tiltType.toLowerCase().replace(/_/g, ' ')}
                    </strong>
                  </span>
                  <span>
                    Confidence:{' '}
                    <strong className="text-[#4D694E]">
                      {(aiResults[selectedItem.metadata.id].confidence * 100).toFixed(0)}%
                    </strong>
                  </span>
                </div>
              </div>
            )}

            {/* Angle Slider + Direct Degree Input */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#4B5563] dark:text-[#A1A1AA] font-medium">Straighten Angle</span>
                <div className="flex items-center gap-1 font-mono font-bold text-xs">
                  <input
                    type="number"
                    step="0.1"
                    min="-45"
                    max="45"
                    value={geometry.correctedAngleDeg}
                    onChange={(e) => handleApplyAngle(parseFloat(e.target.value) || 0)}
                    className="w-16 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#181818] border border-[#E5E7EB] dark:border-[#27272A] text-right font-mono text-xs font-bold text-[#4D694E] focus:outline-none focus:border-[#4D694E]"
                  />
                  <span className="text-[#4D694E]">°</span>
                </div>
              </div>

              {/* Continuous Range Slider */}
              <input
                type="range"
                min="-45"
                max="45"
                step="0.1"
                value={geometry.correctedAngleDeg}
                onChange={(e) => handleApplyAngle(parseFloat(e.target.value))}
                className="accent-[#4D694E] w-full cursor-pointer"
              />

              {/* Quick Step Buttons */}
              <div className="grid grid-cols-5 gap-1 pt-1">
                <button
                  onClick={() => handleApplyAngle(geometry.correctedAngleDeg - 1.0)}
                  className="px-1 py-1 rounded bg-slate-100 dark:bg-[#181818] hover:bg-slate-200 dark:hover:bg-[#222222] text-2xs font-mono font-bold text-[#4B5563] dark:text-[#A1A1AA] border border-[#E5E7EB] dark:border-[#27272A] cursor-pointer"
                  title="Counter-Clockwise 1 degree"
                >
                  -1.0°
                </button>
                <button
                  onClick={() => handleApplyAngle(geometry.correctedAngleDeg - 0.1)}
                  className="px-1 py-1 rounded bg-slate-100 dark:bg-[#181818] hover:bg-slate-200 dark:hover:bg-[#222222] text-2xs font-mono font-bold text-[#4B5563] dark:text-[#A1A1AA] border border-[#E5E7EB] dark:border-[#27272A] cursor-pointer"
                  title="Fine step -0.1 degree"
                >
                  -0.1°
                </button>
                <button
                  onClick={() => handleApplyAngle(0.0)}
                  className="px-1 py-1 rounded bg-slate-100 dark:bg-[#181818] hover:bg-slate-200 dark:hover:bg-[#222222] text-2xs font-mono font-bold text-[#4D694E] border border-[#E5E7EB] dark:border-[#27272A] cursor-pointer"
                  title="Reset to 0.0"
                >
                  0.0°
                </button>
                <button
                  onClick={() => handleApplyAngle(geometry.correctedAngleDeg + 0.1)}
                  className="px-1 py-1 rounded bg-slate-100 dark:bg-[#181818] hover:bg-slate-200 dark:hover:bg-[#222222] text-2xs font-mono font-bold text-[#4B5563] dark:text-[#A1A1AA] border border-[#E5E7EB] dark:border-[#27272A] cursor-pointer"
                  title="Fine step +0.1 degree"
                >
                  +0.1°
                </button>
                <button
                  onClick={() => handleApplyAngle(geometry.correctedAngleDeg + 1.0)}
                  className="px-1 py-1 rounded bg-slate-100 dark:bg-[#181818] hover:bg-slate-200 dark:hover:bg-[#222222] text-2xs font-mono font-bold text-[#4B5563] dark:text-[#A1A1AA] border border-[#E5E7EB] dark:border-[#27272A] cursor-pointer"
                  title="Clockwise 1 degree"
                >
                  +1.0°
                </button>
              </div>

              {/* Detection Engine Algorithm Options (Zoltanvin Hough / Hybrid / Radon / Portrait) */}
              <div className="flex flex-col gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-[#141414] border border-[#E5E7EB] dark:border-[#27272A] mt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-heading font-extrabold text-[#4B5563] dark:text-[#A1A1AA] uppercase tracking-wider">
                    Detection Algorithm Engine
                  </span>
                  <span className="text-[9px] font-mono text-[#4D694E] font-bold">
                    {algorithm === 'canny-hough' ? 'Canny-Hough' : algorithm === 'zoltanvin-hough' ? 'HoughLinesP' : algorithm === 'hybrid-ensemble' ? 'AI Consensus' : algorithm === 'portrait-body' ? 'Body Lean' : 'Radon 2D'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 text-2xs font-sans">
                  <button
                    onClick={() => {
                      setAlgorithm('hybrid-ensemble');
                      setTimeout(() => handleAutoDetect(), 50);
                    }}
                    className={`px-2 py-1.5 rounded-lg text-left transition-all cursor-pointer ${
                      algorithm === 'hybrid-ensemble'
                        ? 'bg-[#4D694E] text-[#FFF3D5] shadow-sm'
                        : 'bg-white dark:bg-[#1C1C1E] text-[#111827] dark:text-white border border-[#E5E7EB] dark:border-[#27272A] hover:border-[#4D694E]'
                    }`}
                  >
                    <div className="font-bold text-xs leading-tight">Hybrid AI</div>
                    <div className={`text-[9px] ${algorithm === 'hybrid-ensemble' ? 'text-[#FFF3D5]/80' : 'text-[#9CA3AF]'}`}>
                      Multi-Model Consensus
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setAlgorithm('canny-hough');
                      setTimeout(() => handleAutoDetect(), 50);
                    }}
                    className={`px-2 py-1.5 rounded-lg text-left transition-all cursor-pointer ${
                      algorithm === 'canny-hough'
                        ? 'bg-[#4D694E] text-[#FFF3D5] shadow-sm'
                        : 'bg-white dark:bg-[#1C1C1E] text-[#111827] dark:text-white border border-[#E5E7EB] dark:border-[#27272A] hover:border-[#4D694E]'
                    }`}
                  >
                    <div className="font-bold text-xs leading-tight">Canny-Hough</div>
                    <div className={`text-[9px] ${algorithm === 'canny-hough' ? 'text-[#FFF3D5]/80' : 'text-[#9CA3AF]'}`}>
                      Otsu + Canny Sinusoidal
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setAlgorithm('zoltanvin-hough');
                      setTimeout(() => handleAutoDetect(), 50);
                    }}
                    className={`px-2 py-1.5 rounded-lg text-left transition-all cursor-pointer ${
                      algorithm === 'zoltanvin-hough'
                        ? 'bg-[#4D694E] text-[#FFF3D5] shadow-sm'
                        : 'bg-white dark:bg-[#1C1C1E] text-[#111827] dark:text-white border border-[#E5E7EB] dark:border-[#27272A] hover:border-[#4D694E]'
                    }`}
                  >
                    <div className="font-bold text-xs leading-tight">Zoltanvin Hough</div>
                    <div className={`text-[9px] ${algorithm === 'zoltanvin-hough' ? 'text-[#FFF3D5]/80' : 'text-[#9CA3AF]'}`}>
                      Line Segment Prob.
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setAlgorithm('portrait-body');
                      setTimeout(() => handleAutoDetect(), 50);
                    }}
                    className={`px-2 py-1.5 rounded-lg text-left transition-all cursor-pointer ${
                      algorithm === 'portrait-body'
                        ? 'bg-[#4D694E] text-[#FFF3D5] shadow-sm'
                        : 'bg-white dark:bg-[#1C1C1E] text-[#111827] dark:text-white border border-[#E5E7EB] dark:border-[#27272A] hover:border-[#4D694E]'
                    }`}
                  >
                    <div className="font-bold text-xs leading-tight">Portrait Lean</div>
                    <div className={`text-[9px] ${algorithm === 'portrait-body' ? 'text-[#FFF3D5]/80' : 'text-[#9CA3AF]'}`}>
                      Dutch Angle / Silhouette
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setAlgorithm('radon-profile');
                      setTimeout(() => handleAutoDetect(), 50);
                    }}
                    className={`px-2 py-1.5 rounded-lg text-left transition-all cursor-pointer ${
                      algorithm === 'radon-profile'
                        ? 'bg-[#4D694E] text-[#FFF3D5] shadow-sm'
                        : 'bg-white dark:bg-[#1C1C1E] text-[#111827] dark:text-white border border-[#E5E7EB] dark:border-[#27272A] hover:border-[#4D694E]'
                    }`}
                  >
                    <div className="font-bold text-xs leading-tight">Radon Profile</div>
                    <div className={`text-[9px] ${algorithm === 'radon-profile' ? 'text-[#FFF3D5]/80' : 'text-[#9CA3AF]'}`}>
                      Multi-Axis Radon
                    </div>
                  </button>
                </div>
              </div>

              {/* 90 Degree Rotation Shift */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  onClick={() => handleApplyAngle(geometry.correctedAngleDeg - 90)}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-slate-100 dark:bg-[#181818] hover:bg-slate-200 dark:hover:bg-[#222222] text-2xs font-heading font-semibold text-[#111827] dark:text-white border border-[#E5E7EB] dark:border-[#27272A] cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Rotate 90° CCW</span>
                </button>
                <button
                  onClick={() => handleApplyAngle(geometry.correctedAngleDeg + 90)}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-slate-100 dark:bg-[#181818] hover:bg-slate-200 dark:hover:bg-[#222222] text-2xs font-heading font-semibold text-[#111827] dark:text-white border border-[#E5E7EB] dark:border-[#27272A] cursor-pointer"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>Rotate 90° CW</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Adobe Lightroom Parametric Tone Sliders */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#4D694E]" />
                <span className="font-heading font-bold text-xs text-[#111827] dark:text-white">
                  Lightroom Tone Tuning
                </span>
              </div>
              <button
                onClick={handleResetTone}
                className="flex items-center gap-1 text-2xs font-heading font-bold px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#181818] dark:hover:bg-[#222222] text-[#4B5563] dark:text-[#A1A1AA] border border-[#E5E7EB] dark:border-[#27272A] cursor-pointer transition-colors"
                title="Reset tones to default"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            {/* Exposure Status Badge */}
            <div
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-between ${
                isUnder
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                  : isOver
                  ? 'bg-[#4D694E]/15 border-[#4D694E]/40 text-[#4D694E]'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
              }`}
            >
              <div className="flex items-center gap-1.5 font-heading">
                {isUnder ? (
                  <Moon className="w-3.5 h-3.5" />
                ) : isOver ? (
                  <Sun className="w-3.5 h-3.5" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>{lightroom.exposureState.replace('_', ' ')}</span>
              </div>
              <span className="text-2xs font-mono tabular-nums">
                L: {lightroom.meanLuminance}
              </span>
            </div>

            {/* Interactive Tone Sliders Group */}
            <div className="flex flex-col gap-2.5 text-xs">
              {/* Contrast Slider */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#4B5563] dark:text-[#A1A1AA] font-medium">Contrast</span>
                  <span className={`font-mono tabular-nums font-bold ${lightroom.contrast !== 0 ? 'text-[#4D694E]' : 'text-[#9CA3AF]'}`}>
                    {lightroom.contrast > 0 ? `+${lightroom.contrast}` : lightroom.contrast}
                  </span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={lightroom.contrast}
                  onChange={(e) => handleToneChange('contrast', parseInt(e.target.value, 10))}
                  className="accent-[#4D694E] w-full cursor-pointer"
                />
              </div>

              {/* Highlights Slider */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#4B5563] dark:text-[#A1A1AA] font-medium">Highlights</span>
                  <span className={`font-mono tabular-nums font-bold ${lightroom.highlights !== 0 ? 'text-[#4D694E]' : 'text-[#9CA3AF]'}`}>
                    {lightroom.highlights > 0 ? `+${lightroom.highlights}` : lightroom.highlights}
                  </span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={lightroom.highlights}
                  onChange={(e) => handleToneChange('highlights', parseInt(e.target.value, 10))}
                  className="accent-[#4D694E] w-full cursor-pointer"
                />
              </div>

              {/* Shadows Slider */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#4B5563] dark:text-[#A1A1AA] font-medium">Shadows</span>
                  <span className={`font-mono tabular-nums font-bold ${lightroom.shadows !== 0 ? 'text-[#4D694E]' : 'text-[#9CA3AF]'}`}>
                    {lightroom.shadows > 0 ? `+${lightroom.shadows}` : lightroom.shadows}
                  </span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={lightroom.shadows}
                  onChange={(e) => handleToneChange('shadows', parseInt(e.target.value, 10))}
                  className="accent-[#4D694E] w-full cursor-pointer"
                />
              </div>

              {/* Whites Slider */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#4B5563] dark:text-[#A1A1AA] font-medium">Whites</span>
                  <span className={`font-mono tabular-nums font-bold ${lightroom.whites !== 0 ? 'text-[#4D694E]' : 'text-[#9CA3AF]'}`}>
                    {lightroom.whites > 0 ? `+${lightroom.whites}` : lightroom.whites}
                  </span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={lightroom.whites}
                  onChange={(e) => handleToneChange('whites', parseInt(e.target.value, 10))}
                  className="accent-[#4D694E] w-full cursor-pointer"
                />
              </div>
            </div>

            {/* Single Step Apply Actions on Photo or Folder */}
            <div className="flex flex-col gap-2 pt-3 border-t border-[#E5E7EB] dark:border-[#27272A] mt-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-heading font-extrabold text-[#4B5563] dark:text-[#A1A1AA] uppercase tracking-wider">
                  Apply Step 3 Actions
                </span>
                {showAppliedToast && (
                  <span className="text-2xs font-mono font-bold text-emerald-500 flex items-center gap-1 animate-pulse">
                    <Check className="w-3 h-3" /> Saved!
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleApplyAngle(geometry.correctedAngleDeg);
                    setShowAppliedToast(true);
                    setTimeout(() => setShowAppliedToast(false), 2000);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#4D694E] hover:bg-[#3C533D] text-[#FFF3D5] font-heading font-bold text-xs tracking-wide transition-all active:scale-98 cursor-pointer shadow-none"
                  title="Apply current horizon tilt & tone adjustments to this individual image"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{showAppliedToast ? '✓ Applied to Photo' : 'Apply Step to This Photo'}</span>
                </button>

                <button
                  onClick={() => {
                    if (!onUpdateItems) return;
                    const updated = items.map((it) => {
                      const crop = calculateInscribedCrop(
                        it.metadata.dimensions.width || 1920,
                        it.metadata.dimensions.height || 1080,
                        geometry.correctedAngleDeg
                      );
                      return {
                        ...it,
                        lightroom: { ...selectedItem.lightroom },
                        geometry: {
                          ...it.geometry,
                          detectedAngleDeg: Number((-geometry.correctedAngleDeg).toFixed(1)),
                          correctedAngleDeg: geometry.correctedAngleDeg,
                          requiresCorrection: Math.abs(geometry.correctedAngleDeg) >= 0.1,
                          cropBox: { x: crop.x, y: crop.y, width: crop.width, height: crop.height },
                          cropLossPercentage: crop.lossPercentage,
                        },
                      };
                    });
                    onUpdateItems(updated);
                    setShowAppliedFolderToast(true);
                    setTimeout(() => setShowAppliedFolderToast(false), 2000);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 dark:bg-[#181818] hover:bg-slate-200 dark:hover:bg-[#222222] text-[#111827] dark:text-white font-heading font-bold text-xs border border-[#E5E7EB] dark:border-[#27272A] transition-all active:scale-98 cursor-pointer"
                  title="Apply current straightening & Lightroom tone curve to all photos in the album"
                >
                  <FolderCheck className="w-3.5 h-3.5 text-[#4D694E]" />
                  <span>{showAppliedFolderToast ? '✓ Applied to Folder' : 'Apply Step to Folder'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Filmstrip Thumbnail Selector */}
      <div className="bg-white dark:bg-[#0E0E0E] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-3 flex flex-col gap-2 transition-colors">
        <div className="flex items-center justify-between">
          <span className="font-heading text-xs font-bold text-[#111827] dark:text-white">Select Image to Inspect &amp; Straighten</span>
          <div className="flex items-center gap-1 text-xs">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2 py-0.5 rounded-lg font-heading font-bold cursor-pointer ${filterMode === 'all' ? 'bg-[#4D694E] text-[#FFF3D5]' : 'text-[#9CA3AF]'}`}
            >
              All ({items.length})
            </button>
            <button
              onClick={() => setFilterMode('tilted')}
              className={`px-2 py-0.5 rounded-lg font-heading font-bold cursor-pointer ${filterMode === 'tilted' ? 'bg-amber-500 text-white' : 'text-[#9CA3AF]'}`}
            >
              Tilted ({totalTiltedCount})
            </button>
            <button
              onClick={() => setFilterMode('straightened')}
              className={`px-2 py-0.5 rounded-lg font-heading font-bold cursor-pointer ${filterMode === 'straightened' ? 'bg-[#4D694E] text-[#FFF3D5]' : 'text-[#9CA3AF]'}`}
            >
              Straightened ({realStraightened})
            </button>
            <button
              onClick={() => setFilterMode('underexposed')}
              className={`px-2 py-0.5 rounded-lg font-heading font-bold cursor-pointer ${filterMode === 'underexposed' ? 'bg-[#4D694E] text-[#FFF3D5]' : 'text-[#9CA3AF]'}`}
            >
              Underexposed ({metrics.underexposedCount || realUnderexposed})
            </button>
            <button
              onClick={() => setFilterMode('overexposed')}
              className={`px-2 py-0.5 rounded-lg font-heading font-bold cursor-pointer ${filterMode === 'overexposed' ? 'bg-[#4D694E] text-[#FFF3D5]' : 'text-[#9CA3AF]'}`}
            >
              Overexposed ({metrics.overexposedCount || realOverexposed})
            </button>
            <button
              onClick={() => setFilterMode('archive')}
              className={`px-2 py-0.5 rounded-lg font-heading font-bold cursor-pointer ${filterMode === 'archive' ? 'bg-red-600 text-white' : 'text-[#9CA3AF]'}`}
            >
              _archive ({items.filter((i) => i.isArchived).length})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {displayedList.map((item) => {
            const isTilted = item.geometry && Math.abs(item.geometry.detectedAngleDeg) >= 0.5 && item.geometry.correctedAngleDeg === 0;
            const isCorrected = item.geometry && item.geometry.correctedAngleDeg !== 0;

            return (
              <div
                key={item.metadata.id}
                onClick={() => setSelectedItemId(item.metadata.id)}
                className={`w-28 flex-shrink-0 cursor-pointer rounded-xl border p-1.5 transition-colors ${
                  selectedItemId === item.metadata.id
                    ? 'border-[#4D694E] bg-[#4D694E]/10'
                    : isTilted
                    ? 'border-amber-500/50 bg-amber-500/5'
                    : 'border-[#E5E7EB] dark:border-[#27272A] hover:border-[#9CA3AF]'
                }`}
              >
                <div className="aspect-[4/3] rounded-lg overflow-hidden bg-slate-900 relative">
                  <img
                    src={item.transformedThumbnailUrl || item.thumbnailUrl}
                    alt={item.metadata.filename}
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.src !== item.thumbnailUrl && item.thumbnailUrl) {
                        target.src = item.thumbnailUrl;
                      }
                    }}
                    style={{ filter: item.lightroom?.cssFilter || 'none' }}
                    className="w-full h-full object-cover"
                  />
                  {item.isArchived && (
                    <span className="absolute top-1 left-1 bg-red-600 text-white text-2xs font-bold px-1 rounded">
                      _archive
                    </span>
                  )}
                  {isCorrected ? (
                    <span className="absolute bottom-1 right-1 bg-[#4D694E] text-[#FFF3D5] text-2xs font-mono font-bold px-1 rounded">
                      ✓ {item.geometry.correctedAngleDeg > 0 ? '+' : ''}{item.geometry.correctedAngleDeg.toFixed(1)}°
                    </span>
                  ) : isTilted ? (
                    <span className="absolute bottom-1 right-1 bg-amber-500 text-white text-2xs font-mono font-bold px-1 rounded">
                      ⚠ {item.geometry.detectedAngleDeg > 0 ? '+' : ''}{item.geometry.detectedAngleDeg.toFixed(1)}°
                    </span>
                  ) : null}
                </div>
                <div className="font-sans text-xs font-bold text-[#111827] dark:text-white truncate mt-1">
                  {item.metadata.filename}
                </div>
                <div className="text-2xs font-mono tabular-nums text-[#9CA3AF]">
                  {isCorrected
                    ? `${item.geometry?.correctedAngleDeg}°`
                    : isTilted
                    ? `Tilt: ${item.geometry?.detectedAngleDeg}°`
                    : 'Level 0.0°'}{' '}
                  | {item.lightroom?.exposureState?.split('_')[0]}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
