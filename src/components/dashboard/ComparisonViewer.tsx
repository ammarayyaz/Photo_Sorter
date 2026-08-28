import React, { useState } from 'react';
import {
  Compass,
  Sparkles,
  Maximize2,
  CheckCircle2,
  Layers,
  ZoomIn
} from 'lucide-react';
import { ProcessedItem } from '../../engine/types';

interface ComparisonViewerProps {
  activeItem: ProcessedItem | null;
}

export const ComparisonViewer: React.FC<ComparisonViewerProps> = ({
  activeItem,
}) => {
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);

  if (!activeItem) {
    return (
      <div className="h-full bg-white border border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center select-none">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 border border-blue-100">
          <Layers className="w-6 h-6" />
        </div>
        <h3 className="text-xs font-bold text-slate-800">
          Ready for Real-Time Processing
        </h3>
        <p className="text-[11px] text-slate-400 max-w-sm mt-1">
          Start the pipeline to view live horizon straightening and burst culling frame comparisons.
        </p>
      </div>
    );
  }

  const { metadata, geometry, quality, occasion } = activeItem;

  return (
    <div className="h-full bg-white border border-slate-200 rounded-2xl p-3.5 flex flex-col gap-2.5 select-none">
      {/* Top Metadata Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xs text-slate-900 truncate max-w-[200px]">
            {metadata.filename}
          </span>
          <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
            {metadata.cameraModel}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
            <Compass className="w-3 h-3" />
            {geometry.detectedAngleDeg > 0 ? '+' : ''}{geometry.detectedAngleDeg}° Leveled
          </span>
          <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
            <Sparkles className="w-3 h-3" />
            Laplacian: {quality.laplacianSharpness.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Interactive Dual Slider Viewer */}
      <div className="relative flex-1 rounded-xl overflow-hidden bg-slate-950 border border-slate-200 min-h-[220px]">
        {/* Straightened Image (Base) */}
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          <img
            src={activeItem.transformedThumbnailUrl || activeItem.thumbnailUrl}
            alt="Straightened Output"
            className={`w-full h-full object-cover transition-transform duration-300 ${
              isZoomed ? 'scale-150' : 'scale-100'
            }`}
          />
          <div className="absolute top-2.5 right-2.5 bg-black/70 backdrop-blur-sm text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>AUTO-STRAIGHTENED ({geometry.correctedAngleDeg > 0 ? '+' : ''}{geometry.correctedAngleDeg.toFixed(1)}°)</span>
          </div>
        </div>

        {/* Original Tilted Frame (Overlay) */}
        <div
          className="absolute inset-0 overflow-hidden border-r-2 border-white"
          style={{ width: `${sliderPos}%` }}
        >
          <div className="absolute inset-0 w-[1000px] h-full flex items-center justify-center">
            <img
              src={activeItem.thumbnailUrl}
              alt="Original Input"
              className={`w-full h-full object-cover transition-transform duration-300 ${
                isZoomed ? 'scale-150' : 'scale-100'
              }`}
              style={{
                transform: `rotate(${-geometry.correctedAngleDeg}deg) ${
                  isZoomed ? 'scale(1.5)' : 'scale(1)'
                }`,
              }}
            />
          </div>
          <div className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-sm text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-500/30">
            ORIGINAL TILTED ({geometry.detectedAngleDeg}°)
          </div>
        </div>

        {/* Range Slider Overlay */}
        <input
          type="range"
          min="0"
          max="100"
          value={sliderPos}
          onChange={(e) => setSliderPos(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30"
        />

        {/* Divider Visual Indicator */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-none z-20"
          style={{ left: `${sliderPos}%` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white text-slate-800 flex items-center justify-center text-[10px] font-bold border border-slate-300">
            ↔
          </div>
        </div>

        {/* Bottom Zoom & Fullscreen Controls */}
        <div className="absolute bottom-2 right-2 z-20 flex items-center gap-1">
          <button
            onClick={() => setIsZoomed(!isZoomed)}
            className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 backdrop-blur-sm text-xs transition-colors"
            title="Toggle 150% 1:1 Pixel Zoom"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              const el = document.fullscreenElement;
              if (!el) document.documentElement.requestFullscreen?.();
              else document.exitFullscreen?.();
            }}
            className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 backdrop-blur-sm text-xs transition-colors"
            title="Toggle Fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bottom Sub-Strip */}
      <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1">
        <span>Inscribed Auto-Crop: {geometry.cropBox.width} × {geometry.cropBox.height} px</span>
        <span className="text-blue-600 font-bold">Occasion: {occasion?.occasion || 'General'}</span>
      </div>
    </div>
  );
};
