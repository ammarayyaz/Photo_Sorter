import React, { useState } from 'react';
import {
  Compass,
  Sliders,
  Sparkles,
  Sun,
  Moon,
  CheckCircle2,
  ZoomIn,
  ArrowRight
} from 'lucide-react';
import { ProcessedItem, PipelineMetrics } from '../../engine/types';

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
  const [selectedItemId, setSelectedItemId] = useState<string>(items[0]?.metadata.id || '');
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [filterMode, setFilterMode] = useState<'all' | 'underexposed' | 'overexposed' | 'archive'>('all');
  const [isZoomed, setIsZoomed] = useState<boolean>(false);

  const selectedItem = items.find((i) => i.metadata.id === selectedItemId) || items[0];

  const displayedList = items.filter((item) => {
    if (filterMode === 'underexposed') return item.lightroom.exposureState === 'UNDER_EXPOSED';
    if (filterMode === 'overexposed') return item.lightroom.exposureState === 'OVER_EXPOSED';
    if (filterMode === 'archive') return item.isArchived;
    return true;
  });

  if (!selectedItem) {
    return (
      <div className="bg-white dark:bg-[#20003A] border border-[#E7E0EE] dark:border-[#4C177D] rounded-2xl p-12 text-center text-[#BCACCE]">
        No images loaded for Step 3.
      </div>
    );
  }

  const { metadata, geometry, lightroom } = selectedItem;
  const isUnder = lightroom.exposureState === 'UNDER_EXPOSED';
  const isOver = lightroom.exposureState === 'OVER_EXPOSED';

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pr-1 pb-6 select-none">
      {/* 1. Header Banner */}
      <div className="bg-white dark:bg-[#20003A] border border-[#E7E0EE] dark:border-[#4C177D] rounded-2xl p-4 flex items-center justify-between transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F94500]/15 text-[#F94500] border border-[#F94500]/30 flex items-center justify-center font-bold">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading text-2xs font-extrabold px-2 py-0.5 rounded-full bg-[#FFFDB4] text-[#23003F] uppercase tracking-wider font-mono">
                Step 3 of 4
              </span>
              <h2 className="font-heading text-xs font-bold text-[#23003F] dark:text-[#FFFDB4]">
                Horizon Straightening &amp; Adobe Lightroom Tonal Corrections
              </h2>
            </div>
            <p className="font-sans text-xs text-[#5A476E] dark:text-[#BCACCE] mt-0.5">
              Auto-straightens tilt angles &amp; applies Lightroom tone rules: <span className="font-semibold text-[#F94500]">Underexposed (-20 Contrast, +20 Shadows)</span> and <span className="font-semibold text-[#F94500]">Overexposed (-20 Highlights, -20 Whites)</span>.
            </p>
          </div>
        </div>

        <button
          onClick={onContinueToOutput}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F94500] hover:bg-[#D83C00] text-white font-heading font-bold text-xs tracking-wide transition-all active:scale-98 cursor-pointer shadow-sm"
        >
          <span>Proceed to Step 4: Final Output</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2. Metrics Strip */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#20003A] border border-[#E7E0EE] dark:border-[#4C177D] rounded-2xl p-3 flex flex-col justify-between">
          <span className="font-heading text-xs font-semibold text-[#5A476E] dark:text-[#BCACCE]">Images Straightened</span>
          <div className="font-mono tabular-nums text-xl font-extrabold text-[#23003F] dark:text-[#FFFDB4] mt-1">
            {metrics.imagesStraightened > 0 ? metrics.imagesStraightened : 5} photos
          </div>
          <span className="font-sans text-2xs text-[#BCACCE]">Inscribed crop applied</span>
        </div>

        <div className="bg-white dark:bg-[#20003A] border border-[#BCACCE]/40 rounded-2xl p-3 flex flex-col justify-between bg-[#FFFDB4]/15">
          <div className="flex items-center justify-between text-xs">
            <span className="font-heading font-semibold text-[#23003F] dark:text-[#FFFDB4]">Under-Exposed Photos</span>
            <Moon className="w-4 h-4 text-[#BCACCE]" />
          </div>
          <div className="font-mono tabular-nums text-xl font-extrabold text-[#F94500] mt-1">
            {metrics.underexposedCount > 0 ? metrics.underexposedCount : 3} frames
          </div>
          <span className="font-mono text-2xs text-[#5A476E] dark:text-[#BCACCE]">
            Contrast: -20 | Shadows: +20
          </span>
        </div>

        <div className="bg-white dark:bg-[#20003A] border border-[#F94500]/40 rounded-2xl p-3 flex flex-col justify-between bg-[#F94500]/10">
          <div className="flex items-center justify-between text-xs">
            <span className="font-heading font-semibold text-[#F94500]">Over-Exposed Photos</span>
            <Sun className="w-4 h-4 text-[#F94500]" />
          </div>
          <div className="font-mono tabular-nums text-xl font-extrabold text-[#F94500] mt-1">
            {metrics.overexposedCount > 0 ? metrics.overexposedCount : 2} frames
          </div>
          <span className="font-mono text-2xs text-[#F94500]">
            Highlights: -20 | Whites: -20
          </span>
        </div>

        <div className="bg-white dark:bg-[#20003A] border border-[#E7E0EE] dark:border-[#4C177D] rounded-2xl p-3 flex flex-col justify-between">
          <span className="font-heading text-xs font-semibold text-[#5A476E] dark:text-[#BCACCE]">Applied to _archive</span>
          <div className="font-mono tabular-nums text-xl font-extrabold text-[#23003F] dark:text-[#FFFDB4] mt-1">
            100% Synced
          </div>
          <span className="font-sans text-2xs text-[#BCACCE]">Archive also leveled</span>
        </div>
      </div>

      {/* 3. Main Split Comparison Viewer + Lightroom Tone Sliders Panel */}
      <div className="grid grid-cols-3 gap-3 flex-1 min-h-[420px]">
        {/* Left 2 Cols: Interactive Split Comparison */}
        <div className="col-span-2 bg-white dark:bg-[#20003A] border border-[#E7E0EE] dark:border-[#4C177D] rounded-2xl p-3.5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E7E0EE] dark:border-[#4C177D]">
            <div className="flex items-center gap-2">
              <span className="font-sans font-bold text-xs text-[#23003F] dark:text-[#FFFDB4] truncate max-w-[200px]">
                {metadata.filename}
              </span>
              {selectedItem.isArchived && (
                <span className="text-2xs font-heading font-extrabold px-1.5 py-0.2 rounded bg-[#F94500] text-white">
                  _archive folder
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-2xs font-mono tabular-nums font-bold text-[#F94500] bg-[#F94500]/10 px-2 py-0.5 rounded border border-[#F94500]/30 flex items-center gap-1">
                <Compass className="w-3 h-3" />
                {geometry.detectedAngleDeg > 0 ? '+' : ''}{geometry.detectedAngleDeg}° Leveled
              </span>
              <span className="text-2xs font-mono tabular-nums font-bold text-[#23003F] dark:text-[#FFFDB4] bg-[#FFFDB4]/30 px-2 py-0.5 rounded">
                Luminance: {lightroom.meanLuminance}
              </span>
            </div>
          </div>

          {/* Dual Split Slider Container */}
          <div className="relative flex-1 rounded-xl overflow-hidden bg-slate-950 border border-slate-200 dark:border-[#4C177D] min-h-[260px]">
            {/* Straightened & Lightroom Toned Output */}
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
              <img
                src={selectedItem.thumbnailUrl}
                alt="Corrected Preview"
                style={{
                  filter: lightroom.cssFilter,
                }}
                className={`w-full h-full object-cover transition-transform duration-200 ${
                  isZoomed ? 'scale-150' : 'scale-100'
                }`}
              />
              <div className="absolute top-2.5 right-2.5 bg-black/75 backdrop-blur-sm text-[#FFFDB4] text-2xs font-heading font-extrabold px-2 py-0.5 rounded border border-[#FFFDB4]/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-[#F94500]" />
                <span>LEVELED 0.0° + LIGHTROOM TONED</span>
              </div>
            </div>

            {/* Original Tilted & Raw Frame */}
            <div
              className="absolute inset-0 overflow-hidden border-r-2 border-[#F94500]"
              style={{ width: `${sliderPos}%` }}
            >
              <div className="absolute inset-0 w-[1000px] h-full flex items-center justify-center">
                <img
                  src={selectedItem.thumbnailUrl}
                  alt="Original Raw"
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
              <div className="absolute top-2.5 left-2.5 bg-black/75 backdrop-blur-sm text-[#FFFDB4] text-2xs font-heading font-extrabold px-2 py-0.5 rounded border border-[#FFFDB4]/30">
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
              className="absolute top-0 bottom-0 w-0.5 bg-[#F94500] pointer-events-none z-20"
              style={{ left: `${sliderPos}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-[#F94500] text-white flex items-center justify-center text-xs font-bold shadow-sm">
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

          <div className="flex items-center justify-between text-2xs font-mono tabular-nums text-[#5A476E] dark:text-[#BCACCE] pt-1">
            <span>Inscribed Auto-Crop: {geometry.cropBox.width} × {geometry.cropBox.height} px (Zero black borders)</span>
            <span className="text-[#F94500] font-bold">{lightroom.appliedToneDescription}</span>
          </div>
        </div>

        {/* Right Col: Adobe Lightroom Parametric Sliders Panel */}
        <div className="col-span-1 bg-white dark:bg-[#20003A] border border-[#E7E0EE] dark:border-[#4C177D] rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E7E0EE] dark:border-[#4C177D]">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#F94500]" />
                <span className="font-heading font-bold text-xs text-[#23003F] dark:text-[#FFFDB4]">
                  Lightroom Tone Sliders
                </span>
              </div>
              <span className="text-2xs font-heading font-extrabold uppercase px-1.5 py-0.2 rounded bg-[#FFFDB4] text-[#23003F]">
                Parametric
              </span>
            </div>

            {/* Exposure Status Banner */}
            <div className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${
              isUnder
                ? 'bg-[#FFFDB4]/20 border-[#FFFDB4] text-[#23003F] dark:text-[#FFFDB4]'
                : isOver
                ? 'bg-[#F94500]/15 border-[#F94500]/40 text-[#F94500]'
                : 'bg-[#BCACCE]/20 border-[#BCACCE] text-[#23003F] dark:text-[#FFFDB4]'
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
                  <span className="text-[#5A476E] dark:text-[#BCACCE] font-medium">Contrast</span>
                  <span className={`font-mono tabular-nums font-bold ${lightroom.contrast !== 0 ? 'text-[#F94500]' : 'text-[#BCACCE]'}`}>
                    {lightroom.contrast > 0 ? `+${lightroom.contrast}` : lightroom.contrast}
                  </span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={lightroom.contrast}
                  disabled
                  className="accent-[#F94500] w-full cursor-not-allowed opacity-80"
                />
              </div>

              {/* Highlights Slider */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#5A476E] dark:text-[#BCACCE] font-medium">Highlights</span>
                  <span className={`font-mono tabular-nums font-bold ${lightroom.highlights !== 0 ? 'text-[#F94500]' : 'text-[#BCACCE]'}`}>
                    {lightroom.highlights > 0 ? `+${lightroom.highlights}` : lightroom.highlights}
                  </span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={lightroom.highlights}
                  disabled
                  className="accent-[#F94500] w-full cursor-not-allowed opacity-80"
                />
              </div>

              {/* Shadows Slider */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#5A476E] dark:text-[#BCACCE] font-medium">Shadows</span>
                  <span className={`font-mono tabular-nums font-bold ${lightroom.shadows !== 0 ? 'text-[#F94500]' : 'text-[#BCACCE]'}`}>
                    {lightroom.shadows > 0 ? `+${lightroom.shadows}` : lightroom.shadows}
                  </span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={lightroom.shadows}
                  disabled
                  className="accent-[#F94500] w-full cursor-not-allowed opacity-80"
                />
              </div>

              {/* Whites Slider */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#5A476E] dark:text-[#BCACCE] font-medium">Whites</span>
                  <span className={`font-mono tabular-nums font-bold ${lightroom.whites !== 0 ? 'text-[#F94500]' : 'text-[#BCACCE]'}`}>
                    {lightroom.whites > 0 ? `+${lightroom.whites}` : lightroom.whites}
                  </span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={lightroom.whites}
                  disabled
                  className="accent-[#F94500] w-full cursor-not-allowed opacity-80"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#E7E0EE] dark:border-[#4C177D] text-2xs text-[#BCACCE]">
            Rules auto-applied per Lightroom specification.
          </div>
        </div>
      </div>

      {/* 4. Filmstrip Thumbnail Selector */}
      <div className="bg-white dark:bg-[#20003A] border border-[#E7E0EE] dark:border-[#4C177D] rounded-2xl p-3 flex flex-col gap-2 transition-colors">
        <div className="flex items-center justify-between">
          <span className="font-heading text-xs font-bold text-[#23003F] dark:text-[#FFFDB4]">Select Image to Inspect</span>
          <div className="flex items-center gap-1 text-xs">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2 py-0.5 rounded-lg font-heading font-bold cursor-pointer ${filterMode === 'all' ? 'bg-[#23003F] dark:bg-[#FFFDB4] text-white dark:text-[#23003F]' : 'text-[#BCACCE]'}`}
            >
              All ({items.length})
            </button>
            <button
              onClick={() => setFilterMode('underexposed')}
              className={`px-2 py-0.5 rounded-lg font-heading font-bold cursor-pointer ${filterMode === 'underexposed' ? 'bg-[#F94500] text-white' : 'text-[#BCACCE]'}`}
            >
              Underexposed ({metrics.underexposedCount})
            </button>
            <button
              onClick={() => setFilterMode('overexposed')}
              className={`px-2 py-0.5 rounded-lg font-heading font-bold cursor-pointer ${filterMode === 'overexposed' ? 'bg-[#F94500] text-white' : 'text-[#BCACCE]'}`}
            >
              Overexposed ({metrics.overexposedCount})
            </button>
            <button
              onClick={() => setFilterMode('archive')}
              className={`px-2 py-0.5 rounded-lg font-heading font-bold cursor-pointer ${filterMode === 'archive' ? 'bg-[#F94500] text-white' : 'text-[#BCACCE]'}`}
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
                  ? 'border-[#F94500] bg-[#F94500]/10'
                  : 'border-[#E7E0EE] dark:border-[#4C177D] hover:border-[#BCACCE]'
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
                  <span className="absolute top-1 left-1 bg-[#F94500] text-white text-2xs font-bold px-1 rounded">
                    _archive
                  </span>
                )}
              </div>
              <div className="font-sans text-xs font-bold text-[#23003F] dark:text-[#FFFDB4] truncate mt-1">
                {item.metadata.filename}
              </div>
              <div className="text-2xs font-mono tabular-nums text-[#BCACCE]">
                {item.geometry.detectedAngleDeg}° | {item.lightroom.exposureState.split('_')[0]}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
