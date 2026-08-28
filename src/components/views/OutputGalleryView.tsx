import React, { useState } from 'react';
import {
  FolderCheck,
  Archive,
  Download,
  Compass,
  Sparkles,
  CheckCircle2,
  Sliders
} from 'lucide-react';
import { ProcessedItem, PipelineMetrics, FaceCluster } from '../../engine/types';

interface OutputGalleryViewProps {
  items: ProcessedItem[];
  metrics?: PipelineMetrics;
  faceClusters?: FaceCluster[];
  destinationDirectory: string;
}

export const OutputGalleryView: React.FC<OutputGalleryViewProps> = ({
  items,
  destinationDirectory,
}) => {
  const [outputTab, setOutputTab] = useState<'main' | 'archive'>('main');

  const mainItems = items.filter((i) => !i.isArchived);
  const archiveItems = items.filter((i) => i.isArchived);

  const currentList = outputTab === 'main' ? mainItems : archiveItems;

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pr-1 pb-6 select-none">
      {/* 1. Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 uppercase tracking-wider font-mono">
                Step 4 of 4
              </span>
              <h2 className="text-xs font-bold text-slate-900">
                Final Output &amp; Separation Review
              </h2>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              All images have been leveled, color-corrected with Lightroom parameters, and separated from sub-optimal blur frames.
            </p>
          </div>
        </div>

        {/* Export / Explorer Action */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => alert(`Exporting to: ${destinationDirectory}`)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1E60E6] hover:bg-blue-700 text-white font-bold text-xs transition-colors active:scale-98"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Organized Hierarchy</span>
          </button>
        </div>
      </div>

      {/* 2. Output Tab Switcher: Main Kept vs _archive */}
      <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl p-1.5">
        <div className="flex items-center gap-1">
          {/* Main Kept Output Tab */}
          <button
            onClick={() => setOutputTab('main')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              outputTab === 'main'
                ? 'bg-white text-emerald-700 border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderCheck className="w-4 h-4 text-emerald-600" />
            <span>Final Enhanced Output</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-emerald-100 text-emerald-800">
              {mainItems.length}
            </span>
          </button>

          {/* Separated _archive Folder Tab */}
          <button
            onClick={() => setOutputTab('archive')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              outputTab === 'archive'
                ? 'bg-white text-amber-700 border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Archive className="w-4 h-4 text-amber-500" />
            <span>Separated `_archive/` Folder</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-amber-100 text-amber-800">
              {archiveItems.length}
            </span>
          </button>
        </div>

        <div className="text-[11px] font-mono text-slate-400 pr-2">
          Target: {destinationDirectory}
        </div>
      </div>

      {/* 3. Output Photo Grid with Lightroom Badges */}
      <div className="grid grid-cols-3 gap-3.5">
        {currentList.map((item) => {
          const lr = item.lightroom;
          const isUnder = lr.exposureState === 'UNDER_EXPOSED';
          const isOver = lr.exposureState === 'OVER_EXPOSED';

          return (
            <div
              key={item.metadata.id}
              className="bg-white border border-slate-200 hover:border-blue-300 rounded-2xl p-3.5 flex flex-col justify-between transition-colors"
            >
              {/* Photo Preview with Real-time Lightroom CSS Filter Applied */}
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-950 border border-slate-100">
                <img
                  src={item.thumbnailUrl}
                  alt={item.metadata.filename}
                  style={{ filter: lr.cssFilter }}
                  className="w-full h-full object-cover"
                />

                {/* Top Badges */}
                <div className="absolute top-2 left-2 flex items-center gap-1">
                  {item.isArchived ? (
                    <span className="bg-amber-500 text-white font-extrabold text-[9px] px-2 py-0.5 rounded-full font-mono">
                      _archive
                    </span>
                  ) : (
                    <span className="bg-emerald-600 text-white font-extrabold text-[9px] px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" />
                      Enhanced
                    </span>
                  )}
                </div>

                {/* Bottom Stats Overlay */}
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between bg-black/75 backdrop-blur-sm text-white px-2 py-1 rounded-lg text-[10px] font-mono">
                  <span className="flex items-center gap-1 text-blue-300">
                    <Compass className="w-3 h-3" />
                    {item.geometry.detectedAngleDeg > 0 ? '+' : ''}{item.geometry.detectedAngleDeg}° Leveled
                  </span>
                  <span className="text-emerald-300">
                    {lr.exposureState.split('_')[0]}
                  </span>
                </div>
              </div>

              {/* Card Metadata & Lightroom Adjustments Summary */}
              <div className="flex flex-col gap-2 pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 truncate max-w-[170px]">
                    {item.metadata.filename}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {(item.metadata.fileSize / 1000000).toFixed(1)} MB
                  </span>
                </div>

                {/* Lightroom Parameters Pill */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 flex flex-col gap-1 text-[10px] font-mono">
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="font-semibold flex items-center gap-1">
                      <Sliders className="w-3 h-3 text-blue-600" />
                      Lightroom Tone
                    </span>
                    <span className={isUnder ? 'text-blue-600 font-bold' : isOver ? 'text-amber-600 font-bold' : 'text-slate-400'}>
                      {isUnder ? 'Contrast -20 / Shadows +20' : isOver ? 'Highlights -20 / Whites -20' : 'Balanced (0)'}
                    </span>
                  </div>
                </div>

                {/* Target File Destination */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                  <span className="font-mono text-slate-400 truncate max-w-[190px]">
                    {item.targetPath}
                  </span>
                  <span className="text-blue-600 font-semibold truncate max-w-[90px]">
                    {item.occasion?.occasion}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
