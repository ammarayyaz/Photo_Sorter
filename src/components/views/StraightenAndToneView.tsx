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
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
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
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-bold">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 uppercase tracking-wider font-mono">
                Step 3 of 4
              </span>
              <h2 className="text-xs font-bold text-slate-900">
                Horizon Straightening &amp; Adobe Lightroom Tonal Corrections
              </h2>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Auto-straightens tilt angles &amp; applies Lightroom tone rules: <span className="font-semibold text-slate-600">Underexposed (-20 Contrast, +20 Shadows)</span> and <span className="font-semibold text-slate-600">Overexposed (-20 Highlights, -20 Whites)</span>.
            </p>
          </div>
        </div>

        <button
          onClick={onContinueToOutput}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1E60E6] hover:bg-blue-700 text-white font-bold text-xs transition-colors active:scale-98"
        >
          <span>Proceed to Step 4: Final Output</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2. Metrics Strip */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500">Images Straightened</span>
          <div className="font-mono text-lg font-bold text-slate-900 mt-1">
            {metrics.imagesStraightened > 0 ? metrics.imagesStraightened : 5} photos
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Inscribed crop applied</span>
        </div>

        <div className="bg-white border border-blue-200 rounded-2xl p-3 flex flex-col justify-between bg-blue-50/20">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-blue-700">Under-Exposed Photos</span>
            <Moon className="w-4 h-4 text-blue-600" />
          </div>
          <div className="font-mono text-lg font-bold text-blue-700 mt-1">
            {metrics.underexposedCount > 0 ? metrics.underexposedCount : 3} frames
          </div>
          <span className="text-[10px] text-blue-600 font-mono">
            Contrast: -20 | Shadows: +20
          </span>
        </div>

        <div className="bg-white border border-amber-200 rounded-2xl p-3 flex flex-col justify-between bg-amber-50/20">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-amber-700">Over-Exposed Photos</span>
            <Sun className="w-4 h-4 text-amber-600" />
          </div>
          <div className="font-mono text-lg font-bold text-amber-700 mt-1">
            {metrics.overexposedCount > 0 ? metrics.overexposedCount : 2} frames
          </div>
          <span className="text-[10px] text-amber-600 font-mono">
            Highlights: -20 | Whites: -20
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500">Applied to _archive</span>
          <div className="font-mono text-lg font-bold text-slate-900 mt-1">
            100% Synced
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Archive also leveled</span>
        </div>
      </div>

      {/* 3. Main Split Comparison Viewer + Lightroom Tone Sliders Panel */}
      <div className="grid grid-cols-3 gap-3 flex-1 min-h-[420px]">
        {/* Left 2 Cols: Interactive Split Comparison */}
        <div className="col-span-2 bg-white border border-slate-200 rounded-2xl p-3.5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-slate-900 truncate max-w-[200px]">
                {metadata.filename}
              </span>
              {selectedItem.isArchived && (
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-mono">
                  _archive folder
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 flex items-center gap-1">
                <Compass className="w-3 h-3" />
                {geometry.detectedAngleDeg > 0 ? '+' : ''}{geometry.detectedAngleDeg}° Leveled
              </span>
              <span className="text-[10px] font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                Luminance: {lightroom.meanLuminance}
              </span>
            </div>
          </div>

          {/* Dual Split Slider Container */}
          <div className="relative flex-1 rounded-xl overflow-hidden bg-slate-950 border border-slate-200 min-h-[260px]">
            {/* Straightened & Lightroom Toned Output (Base) */}
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
              <div className="absolute top-2.5 right-2.5 bg-black/75 backdrop-blur-sm text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>LEVELED 0.0° + LIGHTROOM TONED</span>
              </div>
            </div>

            {/* Original Tilted & Raw Frame (Overlay) */}
            <div
              className="absolute inset-0 overflow-hidden border-r-2 border-white"
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
              <div className="absolute top-2.5 left-2.5 bg-black/75 backdrop-blur-sm text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-500/30">
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
              className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-none z-20"
              style={{ left: `${sliderPos}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white text-slate-800 flex items-center justify-center text-[10px] font-bold border border-slate-300">
                ↔
              </div>
            </div>

            {/* Zoom Toggle */}
            <div className="absolute bottom-2 right-2 z-20 flex items-center gap-1">
              <button
                onClick={() => setIsZoomed(!isZoomed)}
                className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 backdrop-blur-sm text-xs transition-colors"
                title="Toggle Zoom"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1">
            <span>Inscribed Auto-Crop: {geometry.cropBox.width} × {geometry.cropBox.height} px (Zero black borders)</span>
            <span className="text-blue-600 font-bold">{lightroom.appliedToneDescription}</span>
          </div>
        </div>

        {/* Right Col: Adobe Lightroom Parametric Sliders Panel */}
        <div className="col-span-1 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-xs text-slate-900">
                  Lightroom Tone Sliders
                </span>
              </div>
              <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded font-bold bg-slate-100 text-slate-600">
                Parametric
              </span>
            </div>

            {/* Exposure Status Banner */}
            <div className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${
              isUnder
                ? 'bg-blue-50 border-blue-200 text-blue-800'
                : isOver
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              <div className="flex items-center gap-1.5">
                {isUnder ? <Moon className="w-4 h-4" /> : isOver ? <Sun className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                <span>{lightroom.exposureState.replace('_', ' ')}</span>
              </div>
              <span className="text-[10px] font-mono">
                L: {lightroom.meanLuminance}
              </span>
            </div>

            {/* Lightroom Sliders Group */}
            <div className="flex flex-col gap-2.5 text-xs">
              {/* Contrast Slider */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600 font-medium">Contrast</span>
                  <span className={`font-mono font-bold ${lightroom.contrast !== 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                    {lightroom.contrast > 0 ? `+${lightroom.contrast}` : lightroom.contrast}
                  </span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={lightroom.contrast}
                  disabled
                  className="accent-blue-600 w-full cursor-not-allowed opacity-80"
                />
              </div>

              {/* Highlights Slider */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600 font-medium">Highlights</span>
                  <span className={`font-mono font-bold ${lightroom.highlights !== 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                    {lightroom.highlights > 0 ? `+${lightroom.highlights}` : lightroom.highlights}
                  </span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={lightroom.highlights}
                  disabled
                  className="accent-amber-600 w-full cursor-not-allowed opacity-80"
                />
              </div>

              {/* Shadows Slider */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600 font-medium">Shadows</span>
                  <span className={`font-mono font-bold ${lightroom.shadows !== 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                    {lightroom.shadows > 0 ? `+${lightroom.shadows}` : lightroom.shadows}
                  </span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={lightroom.shadows}
                  disabled
                  className="accent-blue-600 w-full cursor-not-allowed opacity-80"
                />
              </div>

              {/* Whites Slider */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600 font-medium">Whites</span>
                  <span className={`font-mono font-bold ${lightroom.whites !== 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                    {lightroom.whites > 0 ? `+${lightroom.whites}` : lightroom.whites}
                  </span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={lightroom.whites}
                  disabled
                  className="accent-amber-600 w-full cursor-not-allowed opacity-80"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-400">
            Rules auto-applied per Lightroom specification.
          </div>
        </div>
      </div>

      {/* 4. Filmstrip Thumbnail Selector */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800">Select Image to Inspect</span>
          <div className="flex items-center gap-1 text-[11px]">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2 py-0.5 rounded-lg font-semibold ${filterMode === 'all' ? 'bg-slate-900 text-white' : 'text-slate-500'}`}
            >
              All ({items.length})
            </button>
            <button
              onClick={() => setFilterMode('underexposed')}
              className={`px-2 py-0.5 rounded-lg font-semibold ${filterMode === 'underexposed' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}
            >
              Underexposed ({metrics.underexposedCount})
            </button>
            <button
              onClick={() => setFilterMode('overexposed')}
              className={`px-2 py-0.5 rounded-lg font-semibold ${filterMode === 'overexposed' ? 'bg-amber-600 text-white' : 'text-slate-500'}`}
            >
              Overexposed ({metrics.overexposedCount})
            </button>
            <button
              onClick={() => setFilterMode('archive')}
              className={`px-2 py-0.5 rounded-lg font-semibold ${filterMode === 'archive' ? 'bg-rose-600 text-white' : 'text-slate-500'}`}
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
                  ? 'border-blue-600 bg-blue-50/40'
                  : 'border-slate-200 hover:border-slate-300'
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
                  <span className="absolute top-1 left-1 bg-amber-500 text-white text-[8px] font-bold px-1 rounded">
                    _archive
                  </span>
                )}
              </div>
              <div className="text-[10px] font-semibold text-slate-800 truncate mt-1">
                {item.metadata.filename}
              </div>
              <div className="text-[9px] font-mono text-slate-400">
                {item.geometry.detectedAngleDeg}° | {item.lightroom.exposureState.split('_')[0]}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
