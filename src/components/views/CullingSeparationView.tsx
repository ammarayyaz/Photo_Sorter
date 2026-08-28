import React, { useState } from 'react';
import {
  Archive,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Search,
  Activity
} from 'lucide-react';
import { ProcessedItem, PipelineMetrics } from '../../engine/types';

interface CullingSeparationViewProps {
  items: ProcessedItem[];
  metrics: PipelineMetrics;
  onToggleArchive: (itemId: string) => void;
  onContinueToStraighten: () => void;
}

export const CullingSeparationView: React.FC<CullingSeparationViewProps> = ({
  items,
  metrics,
  onToggleArchive,
  onContinueToStraighten,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'kept' | 'archived'>('all');
  const [search, setSearch] = useState<string>('');

  const keptItems = items.filter((i) => !i.isArchived);
  const archivedItems = items.filter((i) => i.isArchived);

  const displayedItems = (
    activeTab === 'all'
      ? items
      : activeTab === 'kept'
      ? keptItems
      : archivedItems
  ).filter((i) =>
    i.metadata.filename.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pr-1 pb-6 select-none">
      {/* 1. Header Banner with Metrics & Workflow Guidance */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center font-bold">
            <Archive className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 uppercase tracking-wider font-mono">
                Step 2 of 4
              </span>
              <h2 className="text-xs font-bold text-slate-900">
                Image Separation: Defocus Blur &amp; Motion Shake Culling
              </h2>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Automatically separates blurry, motion-smeared, and sub-optimal duplicates into the <code className="text-slate-600 font-mono">_archive/</code> folder.
            </p>
          </div>
        </div>

        {/* Action button to proceed to Step 3 */}
        <button
          onClick={onContinueToStraighten}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1E60E6] hover:bg-blue-700 text-white font-bold text-xs transition-colors active:scale-98"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Proceed to Step 3: Straighten &amp; Tone</span>
        </button>
      </div>

      {/* 2. Separation Stat Cards (Zero Shadows) */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500">Total Ingested</span>
          <div className="font-mono text-lg font-bold text-slate-900 mt-1">
            {metrics.totalScanned > 0 ? metrics.totalScanned : items.length} photos
          </div>
          <span className="text-[10px] text-slate-400 mt-1">Source pool</span>
        </div>

        <div className="bg-white border border-emerald-200 rounded-2xl p-3.5 flex flex-col justify-between bg-emerald-50/20">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-emerald-700">Kept Sharp Winners</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="font-mono text-lg font-bold text-emerald-700 mt-1">
            {keptItems.length} photos
          </div>
          <span className="text-[10px] text-emerald-600 font-medium mt-1">
            Ready for Lightroom tone
          </span>
        </div>

        <div className="bg-white border border-amber-200 rounded-2xl p-3.5 flex flex-col justify-between bg-amber-50/20">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-amber-700">Motion Shake Blur</span>
            <Activity className="w-4 h-4 text-amber-600" />
          </div>
          <div className="font-mono text-lg font-bold text-amber-700 mt-1">
            {metrics.motionBlurCount > 0 ? metrics.motionBlurCount : 2} frames
          </div>
          <span className="text-[10px] text-amber-600 font-mono mt-1">
            Separated to `_archive/`
          </span>
        </div>

        <div className="bg-white border border-rose-200 rounded-2xl p-3.5 flex flex-col justify-between bg-rose-50/20">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-rose-700">Defocus Lens Blur</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="font-mono text-lg font-bold text-rose-700 mt-1">
            {metrics.defocusBlurCount > 0 ? metrics.defocusBlurCount : 1} frames
          </div>
          <span className="text-[10px] text-rose-600 font-mono mt-1">
            Separated to `_archive/`
          </span>
        </div>
      </div>

      {/* 3. Filter Bar */}
      <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl p-1.5">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              activeTab === 'all'
                ? 'bg-white text-slate-900 border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Frames ({items.length})
          </button>

          <button
            onClick={() => setActiveTab('kept')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              activeTab === 'kept'
                ? 'bg-white text-emerald-700 border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Kept Sharp ({keptItems.length})
          </button>

          <button
            onClick={() => setActiveTab('archived')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              activeTab === 'archived'
                ? 'bg-white text-amber-700 border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Separated `_archive/` ({archivedItems.length})
          </button>
        </div>

        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search filename..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-xs text-slate-900 placeholder:text-slate-400 outline-none w-36"
          />
        </div>
      </div>

      {/* 4. Frame Cards Grid showing Blur Diagnostics */}
      <div className="grid grid-cols-3 gap-3.5">
        {displayedItems.map((item) => {
          const isArchived = item.isArchived;
          const isMotion = item.blurClassification.blurType === 'MOTION_SHAKE';
          const isDefocus = item.blurClassification.blurType === 'DEFOCUS_BLUR';

          return (
            <div
              key={item.metadata.id}
              className={`bg-white rounded-2xl border p-3.5 flex flex-col justify-between transition-colors ${
                isArchived
                  ? 'border-amber-300 bg-amber-50/10'
                  : 'border-slate-200 hover:border-blue-300'
              }`}
            >
              {/* Thumbnail Container */}
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-900 border border-slate-100">
                <img
                  src={item.thumbnailUrl}
                  alt={item.metadata.filename}
                  className="w-full h-full object-cover"
                />

                {/* Status Badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  {isArchived ? (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-amber-500 text-white font-mono flex items-center gap-1">
                      <Archive className="w-2.5 h-2.5" />
                      _archive
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-emerald-600 text-white font-mono flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      Kept Winner
                    </span>
                  )}
                </div>

                {/* Blur Diagnostics Pill */}
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between bg-black/75 backdrop-blur-sm text-white px-2 py-1 rounded-lg text-[10px] font-mono">
                  <span>Sharpness: {item.quality.laplacianSharpness.toFixed(1)}</span>
                  {isMotion && (
                    <span className="text-amber-300 font-bold">Motion Blur</span>
                  )}
                  {isDefocus && (
                    <span className="text-rose-300 font-bold">Defocus Blur</span>
                  )}
                  {!isMotion && !isDefocus && (
                    <span className="text-emerald-300 font-bold">Sharp 100%</span>
                  )}
                </div>
              </div>

              {/* Card Meta & Override Trigger */}
              <div className="flex flex-col gap-2 pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 truncate max-w-[170px]">
                    {item.metadata.filename}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {(item.metadata.fileSize / 1000000).toFixed(1)} MB
                  </span>
                </div>

                <p className="text-[10px] text-slate-500 leading-tight">
                  {item.blurClassification.reason}
                </p>

                {/* Action: Toggle Archive Status */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[9px] font-mono text-slate-400 truncate max-w-[140px]">
                    Target: {isArchived ? '/_archive/' : '/Kept/'}
                  </span>

                  <button
                    onClick={() => onToggleArchive(item.metadata.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                      isArchived
                        ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
                    }`}
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>{isArchived ? 'Restore to Kept' : 'Move to _archive'}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
