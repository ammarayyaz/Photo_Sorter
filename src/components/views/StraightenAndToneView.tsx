import React, { useState, useEffect } from 'react';
import {
  Compass,
  Sliders,
  CheckCircle2,
  ZoomIn,
  ArrowRight,
  Sun,
  Moon,
  Sparkles
} from 'lucide-react';
import { ProcessedItem, PipelineMetrics } from '../../engine/types';
import { getOriginalFileBlob } from '../../engine/storageManager';

interface StraightenAndToneViewProps {
  items: ProcessedItem[];
  metrics: PipelineMetrics;
  onContinueToOutput: () => void;
}

export const StraightenAndToneView: React.FC<StraightenAndToneViewProps> = ({
  items,
  metrics,
  onContinueToOutput,
}) => {
  const [selectedItemId, setSelectedItemId] = useState<string>(
    items[0]?.metadata.id || ''
  );
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);
  const [filterMode, setFilterMode] = useState<
    'all' | 'underexposed' | 'overexposed' | 'archive'
  >('all');
  const [activeFullResUrl, setActiveFullResUrl] = useState<string>('');

  const selectedItem = items.find((i) => i.metadata.id === selectedItemId) || items[0];

  useEffect(() => {
    let isMounted = true;
    if (selectedItem) {
      if (selectedItem.originalFileUrl && selectedItem.originalFileUrl.startsWith('blob:')) {
        setActiveFullResUrl(selectedItem.originalFileUrl);
      } else {
        getOriginalFileBlob(selectedItem.metadata.id).then((blob: Blob | null) => {
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
        }).catch(() => {
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

  const displayedList = items.filter((item) => {
    if (filterMode === 'underexposed') return item.lightroom.exposureState === 'UNDER_EXPOSED';
    if (filterMode === 'overexposed') return item.lightroom.exposureState === 'OVER_EXPOSED';
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
          </div>
        </div>

        <button
          onClick={onContinueToOutput}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#D83C00] hover:bg-[#B83300] text-white font-heading font-bold text-xs tracking-wide transition-all active:scale-98 cursor-pointer shadow-none"
        >
          <span>Proceed to Step 4: Batch Rename</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
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
          <span className="font-heading text-xs font-semibold text-[#4B5563] dark:text-[#A1A1AA]">Applied to _archive</span>
          <div className="font-mono tabular-nums text-xl font-extrabold text-[#111827] dark:text-white mt-1">
            100% Leveled
          </div>
        </div>
      </div>

      {/* 3. Main Split Comparison Viewer + Lightroom Tone Sliders Panel */}
      <div className="grid grid-cols-3 gap-3 flex-1 min-h-[420px]">
        {/* Left 2 Cols: Interactive Split Comparison */}
        <div className="col-span-2 bg-white dark:bg-[#0E0E0E] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-3.5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB] dark:border-[#27272A]">
            <div className="flex items-center gap-2">
              <span className="font-sans font-bold text-xs text-[#111827] dark:text-white truncate max-w-[200px]">
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
                {geometry.detectedAngleDeg > 0 ? '+' : ''}{geometry.detectedAngleDeg}° Leveled
              </span>
              <span className="text-2xs font-mono tabular-nums font-bold text-[#111827] dark:text-white bg-slate-100 dark:bg-[#181818] px-2 py-0.5 rounded border border-[#E5E7EB] dark:border-[#27272A]">
                Luminance: {lightroom.meanLuminance}
              </span>
            </div>
          </div>

          {/* Dual Split Slider Container */}
          <div className="relative flex-1 rounded-xl overflow-hidden bg-slate-950 border border-slate-200 dark:border-[#27272A] min-h-[300px]">
            {/* Straightened & Lightroom Toned Output (Full Resolution) */}
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
              <img
                src={activeFullResUrl || selectedItem.transformedThumbnailUrl || selectedItem.thumbnailUrl}
                alt="Corrected Preview"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.src !== selectedItem.transformedThumbnailUrl && selectedItem.transformedThumbnailUrl) {
                    target.src = selectedItem.transformedThumbnailUrl;
                  } else if (target.src !== selectedItem.thumbnailUrl && selectedItem.thumbnailUrl) {
                    target.src = selectedItem.thumbnailUrl;
                  }
                }}
                style={{
                  filter: lightroom.cssFilter,
                }}
                className={`w-full h-full object-cover transition-transform duration-200 ${
                  isZoomed ? 'scale-150' : 'scale-100'
                }`}
              />
              <div className="absolute top-2.5 right-2.5 bg-black/75 backdrop-blur-sm text-white text-2xs font-heading font-extrabold px-2 py-0.5 rounded border border-white/20 flex items-center gap-1 z-10">
                <CheckCircle2 className="w-3 h-3 text-[#D83C00]" />
                <span>LEVELED 0.0° + LIGHTROOM TONED</span>
              </div>
            </div>

            {/* Original Tilted & Raw Frame (Full Resolution) */}
            <div
              className="absolute inset-0 overflow-hidden border-r-2 border-[#D83C00] z-10"
              style={{ width: `${sliderPos}%` }}
            >
              <div className="absolute inset-0 w-full h-full min-w-[600px] flex items-center justify-center pointer-events-none">
                <img
                  src={activeFullResUrl || selectedItem.thumbnailUrl}
                  alt="Original Raw"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src !== selectedItem.thumbnailUrl && selectedItem.thumbnailUrl) {
                      target.src = selectedItem.thumbnailUrl;
                    }
                  }}
                  className={`w-full h-full object-cover transition-transform duration-200 ${
                    isZoomed ? 'scale-150' : 'scale-100'
                  }`}
                  style={{
                    transform: `rotate(${-geometry.detectedAngleDeg}deg) ${
                      isZoomed ? 'scale(1.5)' : 'scale(1)'
                    }`,
                  }}
                />
              </div>
              <div className="absolute top-2.5 left-2.5 bg-black/75 backdrop-blur-sm text-white text-2xs font-heading font-extrabold px-2 py-0.5 rounded border border-white/20 whitespace-nowrap">
                ORIGINAL RAW TILTED ({geometry.detectedAngleDeg}°)
              </div>
            </div>

            {/* Slider Input Overlay */}
            <input
              type="range"
              min="0"
              max="100"
              value={sliderPos}
              onChange={(e) => setSliderPos(Number(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30"
            />

            {/* Divider Handle */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-[#D83C00] pointer-events-none z-20"
              style={{ left: `${sliderPos}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-[#D83C00] text-white flex items-center justify-center text-xs font-bold shadow-sm">
                ↔
              </div>
            </div>

            {/* Zoom Toggle */}
            <div className="absolute bottom-2 right-2 z-20 flex items-center gap-1">
              <button
                onClick={() => setIsZoomed(!isZoomed)}
                className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 backdrop-blur-sm text-xs transition-colors cursor-pointer"
                title="Toggle Zoom"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-2xs font-mono tabular-nums text-[#4B5563] dark:text-[#A1A1AA] pt-1">
            <span>Inscribed Auto-Crop: {geometry.cropBox.width} × {geometry.cropBox.height} px (Zero black borders)</span>
            <span className="text-[#D83C00] font-bold">{lightroom.appliedToneDescription}</span>
          </div>
        </div>

        {/* Right Col: Adobe Lightroom Parametric Sliders Panel */}
        <div className="col-span-1 bg-white dark:bg-[#0E0E0E] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB] dark:border-[#27272A]">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#D83C00]" />
                <span className="font-heading font-bold text-xs text-[#111827] dark:text-white">
                  Lightroom Tone Sliders
                </span>
              </div>
              <span className="text-2xs font-heading font-extrabold uppercase px-1.5 py-0.2 rounded bg-[#D83C00]/15 text-[#D83C00] dark:text-[#FF8C61] border border-[#D83C00]/30">
                Parametric
              </span>
            </div>

            {/* Exposure Status Banner */}
            <div className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${
              isUnder
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                : isOver
                ? 'bg-[#D83C00]/15 border-[#D83C00]/40 text-[#D83C00]'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
            }`}>
              <div className="flex items-center gap-1.5 font-heading">
                {isUnder ? <Moon className="w-4 h-4" /> : isOver ? <Sun className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                <span>{lightroom.exposureState.replace('_', ' ')}</span>
              </div>
              <span className="text-2xs font-mono tabular-nums">
                L: {lightroom.meanLuminance}
              </span>
            </div>

            {/* Lightroom Sliders Group */}
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
                  disabled
                  className="accent-[#D83C00] w-full cursor-not-allowed opacity-80"
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
                  disabled
                  className="accent-[#D83C00] w-full cursor-not-allowed opacity-80"
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
                  disabled
                  className="accent-[#D83C00] w-full cursor-not-allowed opacity-80"
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
                  disabled
                  className="accent-[#D83C00] w-full cursor-not-allowed opacity-80"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Filmstrip Thumbnail Selector */}
      <div className="bg-white dark:bg-[#0E0E0E] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-3 flex flex-col gap-2 transition-colors">
        <div className="flex items-center justify-between">
          <span className="font-heading text-xs font-bold text-[#111827] dark:text-white">Select Image to Inspect</span>
          <div className="flex items-center gap-1 text-xs">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2 py-0.5 rounded-lg font-heading font-bold cursor-pointer ${filterMode === 'all' ? 'bg-[#D83C00] text-white' : 'text-[#9CA3AF]'}`}
            >
              All ({items.length})
            </button>
            <button
              onClick={() => setFilterMode('underexposed')}
              className={`px-2 py-0.5 rounded-lg font-heading font-bold cursor-pointer ${filterMode === 'underexposed' ? 'bg-[#D83C00] text-white' : 'text-[#9CA3AF]'}`}
            >
              Underexposed ({metrics.underexposedCount})
            </button>
            <button
              onClick={() => setFilterMode('overexposed')}
              className={`px-2 py-0.5 rounded-lg font-heading font-bold cursor-pointer ${filterMode === 'overexposed' ? 'bg-[#D83C00] text-white' : 'text-[#9CA3AF]'}`}
            >
              Overexposed ({metrics.overexposedCount})
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
                  style={{ filter: item.lightroom.cssFilter }}
                  className="w-full h-full object-cover"
                />
                {item.isArchived && (
                  <span className="absolute top-1 left-1 bg-red-600 text-white text-2xs font-bold px-1 rounded">
                    _archive
                  </span>
                )}
              </div>
              <div className="font-sans text-xs font-bold text-[#111827] dark:text-white truncate mt-1">
                {item.metadata.filename}
              </div>
              <div className="text-2xs font-mono tabular-nums text-[#9CA3AF]">
                {item.geometry.detectedAngleDeg}° | {item.lightroom.exposureState.split('_')[0]}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
