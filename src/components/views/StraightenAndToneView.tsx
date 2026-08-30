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
  RefreshCw
} from 'lucide-react';
import { ProcessedItem, PipelineMetrics } from '../../engine/types';
import { getOriginalFileBlob } from '../../engine/storageManager';
import { calculateInscribedCrop, detectHorizonAndTiltAngle } from '../../engine/horizonDetector';
import { calculateLightroomAdjustments } from '../../engine/lightroomTone';

interface StraightenAndToneViewProps {
  items: ProcessedItem[];
  metrics: PipelineMetrics;
  onContinueToOutput: () => void;
  onUpdateItems?: (items: ProcessedItem[]) => void;
}

export const StraightenAndToneView: React.FC<StraightenAndToneViewProps> = ({
  items,
  metrics,
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
  const [filterMode, setFilterMode] = useState<
    'all' | 'straightened' | 'underexposed' | 'overexposed' | 'archive'
  >('all');
  const [activeFullResUrl, setActiveFullResUrl] = useState<string>('');

  const selectedItem = items.find((i) => i.metadata.id === selectedItemId) || items[0];

  useEffect(() => {
    let isMounted = true;
    if (selectedItem) {
      if (selectedItem.originalFileUrl && selectedItem.originalFileUrl.startsWith('blob:')) {
        setActiveFullResUrl(selectedItem.originalFileUrl);
      } else {
        getOriginalFileBlob(selectedItem.metadata.id)
          .then((blob: Blob | null) => {
            if (isMounted) {
              if (blob) {
                const url = URL.createObjectURL(blob);
                setActiveFullResUrl(url);
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
    }

    return () => {
      isMounted = false;
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

      const updatedList = items.map((item) => {
        if (item.metadata.id === selectedItem.metadata.id) {
          return {
            ...item,
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
    [items, onUpdateItems, selectedItem]
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

      const sampleWidth = 320;
      const sampleHeight = Math.round((sampleWidth * img.naturalHeight) / img.naturalWidth) || 240;
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
          img.naturalWidth,
          img.naturalHeight
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

  // Batch auto-straighten all photos in queue
  const handleBatchStraightenAll = useCallback(async () => {
    if (!onUpdateItems || items.length === 0) return;
    setIsAutoDetecting(true);

    const updated = items.map((item) => {
      const angle = item.geometry.detectedAngleDeg;
      if (Math.abs(angle) >= 0.5) {
        const crop = calculateInscribedCrop(
          item.metadata.dimensions.width,
          item.metadata.dimensions.height,
          -angle
        );
        return {
          ...item,
          geometry: {
            ...item.geometry,
            requiresCorrection: true,
            correctedAngleDeg: -angle,
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

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pr-1 pb-6 select-none">
      {/* 1. Header Banner */}
      <div className="bg-white dark:bg-[#0E0E0E] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-4 flex items-center justify-between transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#D83C00]/15 text-[#D83C00] border border-[#D83C00]/30 flex items-center justify-center font-bold">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-heading text-xs font-bold text-[#111827] dark:text-white">
              Horizon Straightening &amp; Lightroom Tonal Corrections
            </h2>
            <p className="text-2xs text-[#4B5563] dark:text-[#A1A1AA]">
              AI multi-axis tilt detection &amp; inscribed crop (zero black borders) with parametric tone curve.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleBatchStraightenAll}
            disabled={isAutoDetecting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#181818] dark:hover:bg-[#222222] text-[#111827] dark:text-white border border-[#E5E7EB] dark:border-[#27272A] font-heading font-semibold text-xs tracking-wide transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#D83C00]" />
            <span>Auto-Level All</span>
          </button>

          <button
            onClick={onContinueToOutput}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#D83C00] hover:bg-[#B83300] text-white font-heading font-bold text-xs tracking-wide transition-all active:scale-98 cursor-pointer shadow-none"
          >
            <span>Proceed to Step 4: Batch Rename</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Metrics Strip */}
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
          <div className="font-mono tabular-nums text-xl font-extrabold text-[#D83C00] mt-1">
            {metrics.underexposedCount > 0 ? metrics.underexposedCount : realUnderexposed} frames
          </div>
        </div>

        <div className="bg-white dark:bg-[#0E0E0E] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs">
            <span className="font-heading font-semibold text-[#D83C00]">Over-Exposed Photos</span>
            <Sun className="w-4 h-4 text-[#D83C00]" />
          </div>
          <div className="font-mono tabular-nums text-xl font-extrabold text-[#D83C00] mt-1">
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
              <span className="text-2xs font-mono tabular-nums font-bold text-[#D83C00] bg-[#D83C00]/10 px-2 py-0.5 rounded border border-[#D83C00]/30 flex items-center gap-1">
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
                    <div className="absolute inset-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 border border-[#D83C00]/60 rounded-full" />
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
                style={{
                  filter: lightroom.cssFilter || 'none',
                  transform: `rotate(${geometry.correctedAngleDeg}deg) scale(${previewScale * (isZoomed ? 1.5 : 1.0)})`,
                  transformOrigin: 'center center',
                }}
                className="w-full h-full object-cover transition-transform duration-150"
              />
              <div className="absolute top-2.5 right-2.5 bg-black/80 backdrop-blur-sm text-white text-2xs font-heading font-extrabold px-2 py-0.5 rounded border border-white/20 flex items-center gap-1 z-30">
                <CheckCircle2 className="w-3 h-3 text-[#D83C00]" />
                <span>
                  {geometry.correctedAngleDeg !== 0
                    ? `STRAIGHTENED (${geometry.correctedAngleDeg > 0 ? '+' : ''}${geometry.correctedAngleDeg.toFixed(1)}°) + TONED`
                    : 'LEVELED 0.0° + TONED'}
                </span>
              </div>
            </div>

            {/* OVERLAY LAYER (Left side): Pure Original Raw Input */}
            <div
              className="absolute inset-0 overflow-hidden border-r-2 border-[#D83C00] z-10"
              style={{ width: `${sliderPos}%` }}
            >
              <div className="absolute inset-0 w-full h-full min-w-[640px] flex items-center justify-center pointer-events-none">
                <img
                  src={activeFullResUrl || selectedItem.thumbnailUrl}
                  alt="Original Raw Input"
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
              className="absolute top-0 bottom-0 w-0.5 bg-[#D83C00] pointer-events-none z-30"
              style={{ left: `${sliderPos}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-[#D83C00] text-white flex items-center justify-center text-xs font-bold shadow-md">
                ↔
              </div>
            </div>

            {/* Quick View Controls (Grid & Zoom) */}
            <div className="absolute bottom-2 right-2 z-30 flex items-center gap-1.5 bg-black/60 backdrop-blur-md p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  showGrid ? 'bg-[#D83C00] text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
                title="Toggle Leveling Grid"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setIsZoomed(!isZoomed)}
                className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  isZoomed ? 'bg-[#D83C00] text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
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
            <span className="text-[#D83C00] font-bold">{lightroom.appliedToneDescription}</span>
          </div>
        </div>

        {/* Right 4 Cols: Precision Straighten Controls + Lightroom Sliders */}
        <div className="col-span-4 bg-white dark:bg-[#0E0E0E] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-4 flex flex-col justify-between gap-4 overflow-y-auto">
          {/* Section 1: Precision Straighten & Angle Controls */}
          <div className="flex flex-col gap-3 pb-3 border-b border-[#E5E7EB] dark:border-[#27272A]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#D83C00]" />
                <span className="font-heading font-bold text-xs text-[#111827] dark:text-white">
                  Straighten &amp; Leveling
                </span>
              </div>
              <button
                onClick={handleAutoDetect}
                disabled={isAutoDetecting}
                className="flex items-center gap-1 text-2xs font-heading font-bold px-2 py-0.5 rounded-lg bg-[#D83C00]/15 hover:bg-[#D83C00]/25 text-[#D83C00] border border-[#D83C00]/30 cursor-pointer transition-colors"
                title="Re-run AI Horizon / Portrait detection"
              >
                <Wand2 className={`w-3 h-3 ${isAutoDetecting ? 'animate-spin' : ''}`} />
                <span>{isAutoDetecting ? 'Detecting...' : 'Auto-Detect'}</span>
              </button>
            </div>

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
                    className="w-16 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#181818] border border-[#E5E7EB] dark:border-[#27272A] text-right font-mono text-xs font-bold text-[#D83C00] focus:outline-none focus:border-[#D83C00]"
                  />
                  <span className="text-[#D83C00]">°</span>
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
                className="accent-[#D83C00] w-full cursor-pointer"
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
                  className="px-1 py-1 rounded bg-slate-100 dark:bg-[#181818] hover:bg-slate-200 dark:hover:bg-[#222222] text-2xs font-mono font-bold text-[#D83C00] border border-[#E5E7EB] dark:border-[#27272A] cursor-pointer"
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

              {/* 90 Degree Rotation Shift */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  onClick={() => handleApplyAngle(geometry.correctedAngleDeg - 90)}
                  className="flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-slate-100 dark:bg-[#181818] hover:bg-slate-200 dark:hover:bg-[#222222] text-2xs font-heading font-semibold text-[#111827] dark:text-white border border-[#E5E7EB] dark:border-[#27272A] cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Rotate 90° CCW</span>
                </button>
                <button
                  onClick={() => handleApplyAngle(geometry.correctedAngleDeg + 90)}
                  className="flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-slate-100 dark:bg-[#181818] hover:bg-slate-200 dark:hover:bg-[#222222] text-2xs font-heading font-semibold text-[#111827] dark:text-white border border-[#E5E7EB] dark:border-[#27272A] cursor-pointer"
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
                <Sliders className="w-4 h-4 text-[#D83C00]" />
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
                  ? 'bg-[#D83C00]/15 border-[#D83C00]/40 text-[#D83C00]'
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
                  <span className={`font-mono tabular-nums font-bold ${lightroom.contrast !== 0 ? 'text-[#D83C00]' : 'text-[#9CA3AF]'}`}>
                    {lightroom.contrast > 0 ? `+${lightroom.contrast}` : lightroom.contrast}
                  </span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={lightroom.contrast}
                  onChange={(e) => handleToneChange('contrast', parseInt(e.target.value, 10))}
                  className="accent-[#D83C00] w-full cursor-pointer"
                />
              </div>

              {/* Highlights Slider */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#4B5563] dark:text-[#A1A1AA] font-medium">Highlights</span>
                  <span className={`font-mono tabular-nums font-bold ${lightroom.highlights !== 0 ? 'text-[#D83C00]' : 'text-[#9CA3AF]'}`}>
                    {lightroom.highlights > 0 ? `+${lightroom.highlights}` : lightroom.highlights}
                  </span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={lightroom.highlights}
                  onChange={(e) => handleToneChange('highlights', parseInt(e.target.value, 10))}
                  className="accent-[#D83C00] w-full cursor-pointer"
                />
              </div>

              {/* Shadows Slider */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#4B5563] dark:text-[#A1A1AA] font-medium">Shadows</span>
                  <span className={`font-mono tabular-nums font-bold ${lightroom.shadows !== 0 ? 'text-[#D83C00]' : 'text-[#9CA3AF]'}`}>
                    {lightroom.shadows > 0 ? `+${lightroom.shadows}` : lightroom.shadows}
                  </span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={lightroom.shadows}
                  onChange={(e) => handleToneChange('shadows', parseInt(e.target.value, 10))}
                  className="accent-[#D83C00] w-full cursor-pointer"
                />
              </div>

              {/* Whites Slider */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#4B5563] dark:text-[#A1A1AA] font-medium">Whites</span>
                  <span className={`font-mono tabular-nums font-bold ${lightroom.whites !== 0 ? 'text-[#D83C00]' : 'text-[#9CA3AF]'}`}>
                    {lightroom.whites > 0 ? `+${lightroom.whites}` : lightroom.whites}
                  </span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={lightroom.whites}
                  onChange={(e) => handleToneChange('whites', parseInt(e.target.value, 10))}
                  className="accent-[#D83C00] w-full cursor-pointer"
                />
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
              className={`px-2 py-0.5 rounded-lg font-heading font-bold cursor-pointer ${filterMode === 'all' ? 'bg-[#D83C00] text-white' : 'text-[#9CA3AF]'}`}
            >
              All ({items.length})
            </button>
            <button
              onClick={() => setFilterMode('straightened')}
              className={`px-2 py-0.5 rounded-lg font-heading font-bold cursor-pointer ${filterMode === 'straightened' ? 'bg-[#D83C00] text-white' : 'text-[#9CA3AF]'}`}
            >
              Straightened ({realStraightened})
            </button>
            <button
              onClick={() => setFilterMode('underexposed')}
              className={`px-2 py-0.5 rounded-lg font-heading font-bold cursor-pointer ${filterMode === 'underexposed' ? 'bg-[#D83C00] text-white' : 'text-[#9CA3AF]'}`}
            >
              Underexposed ({metrics.underexposedCount || realUnderexposed})
            </button>
            <button
              onClick={() => setFilterMode('overexposed')}
              className={`px-2 py-0.5 rounded-lg font-heading font-bold cursor-pointer ${filterMode === 'overexposed' ? 'bg-[#D83C00] text-white' : 'text-[#9CA3AF]'}`}
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
          {displayedList.map((item) => (
            <div
              key={item.metadata.id}
              onClick={() => setSelectedItemId(item.metadata.id)}
              className={`w-28 flex-shrink-0 cursor-pointer rounded-xl border p-1.5 transition-colors ${
                selectedItemId === item.metadata.id
                  ? 'border-[#D83C00] bg-[#D83C00]/10'
                  : 'border-[#E5E7EB] dark:border-[#27272A] hover:border-[#9CA3AF]'
              }`}
            >
              <div className="aspect-[4/3] rounded-lg overflow-hidden bg-slate-900 relative">
                <img
                  src={item.thumbnailUrl}
                  alt={item.metadata.filename}
                  style={{ filter: item.lightroom?.cssFilter || 'none' }}
                  className="w-full h-full object-cover"
                />
                {item.isArchived && (
                  <span className="absolute top-1 left-1 bg-red-600 text-white text-2xs font-bold px-1 rounded">
                    _archive
                  </span>
                )}
                {item.geometry && item.geometry.requiresCorrection && (
                  <span className="absolute bottom-1 right-1 bg-[#D83C00] text-white text-2xs font-mono font-bold px-1 rounded">
                    {item.geometry.correctedAngleDeg > 0 ? '+' : ''}{item.geometry.correctedAngleDeg}°
                  </span>
                )}
              </div>
              <div className="font-sans text-xs font-bold text-[#111827] dark:text-white truncate mt-1">
                {item.metadata.filename}
              </div>
              <div className="text-2xs font-mono tabular-nums text-[#9CA3AF]">
                {item.geometry?.correctedAngleDeg !== 0 ? `${item.geometry?.correctedAngleDeg}°` : 'Level'} | {item.lightroom?.exposureState?.split('_')[0]}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
