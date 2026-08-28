import React from 'react';
import {
  Folder,
  Archive,
  Compass,
  CheckCircle2,
  Users,
  RotateCcw,
  Cloud,
  Image,
  ArrowUpRight,
  Sparkles,
  Plus
} from 'lucide-react';
import { ProcessingStatus, PipelineMetrics, ProcessedItem } from '../../engine/types';

export type ActiveTab =
  | 'step1-folders'
  | 'step2-culling'
  | 'step3-enhancement'
  | 'step4-output'
  | 'faces'
  | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  status: ProcessingStatus;
  metrics: PipelineMetrics;
  items?: ProcessedItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  metrics,
  items = [],
}) => {
  // Real storage calculation from actual user ingested items
  const totalBytes = items.reduce((sum, item) => sum + item.metadata.fileSize, 0);
  const totalMb = (totalBytes / 1000000).toFixed(1);
  const totalGb = (totalBytes / 1000000000).toFixed(2);

  const formattedStorage =
    totalBytes > 0
      ? totalBytes > 1000000000
        ? `${totalGb} GB`
        : `${totalMb} MB`
      : '0.00 GB';

  const usedPercentage =
    totalBytes > 0
      ? Math.min(100, Math.max(1, (totalBytes / 1000000000000) * 100))
      : 0;

  return (
    <aside className="w-[260px] h-full flex flex-col bg-white select-none flex-shrink-0 border-r border-slate-200">
      {/* 1. Top White Header with Logo & Brand */}
      <div className="bg-white px-6 pt-5 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#1E60E6] text-white flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-lg text-[#1E60E6] tracking-tight">
            LuminaSort
          </span>
        </div>
      </div>

      {/* 2. Main Curved Cobalt Blue Body */}
      <div className="flex-1 bg-[#1E60E6] rounded-tr-[44px] p-5 flex flex-col justify-between text-white overflow-y-auto">
        <div className="flex flex-col gap-3">
          {/* White Pill Action Button */}
          <label className="w-full bg-white text-[#1E60E6] hover:bg-blue-50 font-bold text-xs py-2.5 px-4 rounded-full transition-colors active:scale-98 flex items-center justify-center gap-2 cursor-pointer">
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Upload New Files</span>
            <input
              type="file"
              multiple
              accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff,.tif,.svg,.avif,.heic,.heif,.cr2,.cr3,.nef,.nrw,.arw,.srf,.sr2,.dng,.orf,.rw2,.pef,.ptx,.raf,.raw"
              className="hidden"
              onChange={(e) => {
                setActiveTab('step1-folders');
                const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
                if (fileInput && e.target.files) {
                  // Trigger folder view upload
                }
              }}
            />
          </label>

          {/* 4-Step Pipeline Navigation Menu */}
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-white/70 px-1 pt-1">
            4-Step Photo Pipeline
          </div>

          <nav className="flex flex-col gap-1 text-xs font-medium">
            {/* Step 1: Ingest Folders */}
            <button
              onClick={() => setActiveTab('step1-folders')}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-colors text-left ${
                activeTab === 'step1-folders'
                  ? 'bg-white text-[#1E60E6] font-bold'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Folder className="w-4 h-4 stroke-[2]" />
                <span>1. Ingest Folders</span>
              </div>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeTab === 'step1-folders'
                    ? 'bg-blue-100 text-[#1E60E6]'
                    : 'bg-white/20 text-white'
                }`}
              >
                {metrics.totalScanned > 0 ? metrics.totalScanned : items.length}
              </span>
            </button>

            {/* Step 2: Blur & Motion Culling (Archive Separation) */}
            <button
              onClick={() => setActiveTab('step2-culling')}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-colors text-left ${
                activeTab === 'step2-culling'
                  ? 'bg-white text-[#1E60E6] font-bold'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Archive className="w-4 h-4 stroke-[2]" />
                <span>2. Blur &amp; Motion Culling</span>
              </div>
              {metrics.framesCulled > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    activeTab === 'step2-culling'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-amber-400 text-slate-900'
                  }`}
                >
                  {metrics.framesCulled}
                </span>
              )}
            </button>

            {/* Step 3: Straighten & Lightroom Tone Tuning */}
            <button
              onClick={() => setActiveTab('step3-enhancement')}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-colors text-left ${
                activeTab === 'step3-enhancement'
                  ? 'bg-white text-[#1E60E6] font-bold'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Compass className="w-4 h-4 stroke-[2]" />
                <span>3. Straighten &amp; Tone</span>
              </div>
              {metrics.imagesStraightened > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    activeTab === 'step3-enhancement'
                      ? 'bg-blue-100 text-[#1E60E6]'
                      : 'bg-white/20 text-white'
                  }`}
                >
                  {metrics.imagesStraightened}
                </span>
              )}
            </button>

            {/* Step 4: Final Output Gallery */}
            <button
              onClick={() => setActiveTab('step4-output')}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-colors text-left ${
                activeTab === 'step4-output'
                  ? 'bg-white text-[#1E60E6] font-bold'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 stroke-[2]" />
                <span>4. Output &amp; Review</span>
              </div>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeTab === 'step4-output'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-white/20 text-white'
                }`}
              >
                {items.filter((i) => !i.isArchived).length > 0
                  ? items.filter((i) => !i.isArchived).length
                  : 'Ready'}
              </span>
            </button>
          </nav>

          {/* Secondary Utilities */}
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-white/70 px-1 pt-2">
            Organize &amp; Settings
          </div>

          <nav className="flex flex-col gap-0.5 text-xs font-medium">
            {/* Shared With Me / Face Clusters */}
            <button
              onClick={() => setActiveTab('faces')}
              className={`flex items-center justify-between px-3.5 py-2 rounded-xl transition-colors text-left ${
                activeTab === 'faces'
                  ? 'bg-white text-[#1E60E6] font-bold'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 stroke-[1.8]" />
                <span>Shared With Me</span>
              </div>
              {metrics.distinctPeopleCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-white/20 text-white">
                  {metrics.distinctPeopleCount}
                </span>
              )}
            </button>

            {/* Settings & Backups */}
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl transition-colors text-left ${
                activeTab === 'settings'
                  ? 'bg-white text-[#1E60E6] font-bold'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <RotateCcw className="w-4 h-4 stroke-[1.8]" />
              <span>Backups &amp; Settings</span>
            </button>
          </nav>
        </div>

        {/* 3. Real Bottom Storage Details Section */}
        <div className="flex flex-col gap-3 pt-3 border-t border-white/15 text-xs text-white">
          <div className="text-[10px] font-bold tracking-wider text-white/70 uppercase">
            Storage Details
          </div>

          {/* Real Storage Meter 1 */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-white/90 text-[11px] font-medium">
              <Cloud className="w-3.5 h-3.5" />
              <span>Storage</span>
            </div>
            <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-white h-full rounded-full transition-all duration-300"
                style={{ width: `${usedPercentage}%` }}
              />
            </div>
            <span className="text-[10px] text-white/85 font-mono">
              {formattedStorage} of 1 TB used
            </span>
          </div>

          {/* Real Storage Meter 2: Photos */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-white/90 text-[11px] font-medium">
              <Image className="w-3.5 h-3.5" />
              <span>Photos</span>
            </div>
            <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-white h-full rounded-full transition-all duration-300"
                style={{ width: `${usedPercentage}%` }}
              />
            </div>
            <span className="text-[10px] text-white/85 font-mono">
              {formattedStorage} of 1 TB used
            </span>
          </div>

          {/* Upgrade Storage Link */}
          <button
            onClick={() => setActiveTab('settings')}
            className="flex items-center gap-1 text-[11px] font-bold text-white hover:text-blue-100 transition-colors pt-1"
          >
            <span>Upgrade Storage</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
