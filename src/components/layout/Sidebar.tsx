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
    <aside className="w-[260px] h-full flex flex-col bg-white dark:bg-[#17002B] select-none flex-shrink-0 border-r border-[#E7E0EE] dark:border-[#4C177D] transition-colors duration-200">
      {/* 1. Top Header with Logo & Brand */}
      <div className="bg-white dark:bg-[#17002B] px-6 pt-5 pb-4 flex items-center justify-between transition-colors">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#F94500] text-white flex items-center justify-center shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-lg text-[#23003F] dark:text-[#FFFDB4] tracking-tight">
            LuminaSort
          </span>
        </div>
      </div>

      {/* 2. Main Curved Dark Indigo Body */}
      <div className="flex-1 bg-[#23003F] dark:bg-[#20003A] rounded-tr-[44px] p-5 flex flex-col justify-between text-white overflow-y-auto border-t border-r border-[#4A1578]/50">
        <div className="flex flex-col gap-3">
          {/* Vibrant Red/Orange Action Button */}
          <label className="w-full bg-[#F94500] hover:bg-[#D83C00] text-white font-bold text-xs py-2.5 px-4 rounded-full transition-colors active:scale-98 flex items-center justify-center gap-2 cursor-pointer shadow-sm">
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Upload New Files</span>
            <input
              type="file"
              multiple
              accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff,.tif,.svg,.avif,.heic,.heif,.cr2,.cr3,.nef,.nrw,.arw,.srf,.sr2,.dng,.orf,.rw2,.pef,.ptx,.raf,.raw"
              className="hidden"
              onChange={() => {
                setActiveTab('step1-folders');
              }}
            />
          </label>

          {/* 4-Step Pipeline Navigation Menu */}
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#BCACCE] px-1 pt-1">
            4-Step Photo Pipeline
          </div>

          <nav className="flex flex-col gap-1 text-xs font-medium">
            {/* Step 1: Ingest Folders */}
            <button
              onClick={() => setActiveTab('step1-folders')}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-colors text-left cursor-pointer ${
                activeTab === 'step1-folders'
                  ? 'bg-white text-[#23003F] font-bold'
                  : 'text-[#BCACCE] hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Folder className="w-4 h-4 stroke-[2]" />
                <span>1. Ingest Folders</span>
              </div>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                  activeTab === 'step1-folders'
                    ? 'bg-[#FFFDB4] text-[#23003F]'
                    : 'bg-white/20 text-[#FFFDB4]'
                }`}
              >
                {metrics.totalScanned > 0 ? metrics.totalScanned : items.length}
              </span>
            </button>

            {/* Step 2: Blur & Motion Culling (Archive Separation) */}
            <button
              onClick={() => setActiveTab('step2-culling')}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-colors text-left cursor-pointer ${
                activeTab === 'step2-culling'
                  ? 'bg-white text-[#23003F] font-bold'
                  : 'text-[#BCACCE] hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Archive className="w-4 h-4 stroke-[2]" />
                <span>2. Eye &amp; Motion Culling</span>
              </div>
              {metrics.framesCulled > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                    activeTab === 'step2-culling'
                      ? 'bg-[#F94500] text-white'
                      : 'bg-[#F94500] text-white'
                  }`}
                >
                  {metrics.framesCulled}
                </span>
              )}
            </button>

            {/* Step 3: Straighten & Lightroom Tone Tuning */}
            <button
              onClick={() => setActiveTab('step3-enhancement')}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-colors text-left cursor-pointer ${
                activeTab === 'step3-enhancement'
                  ? 'bg-white text-[#23003F] font-bold'
                  : 'text-[#BCACCE] hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Compass className="w-4 h-4 stroke-[2]" />
                <span>3. Straighten &amp; Tone</span>
              </div>
              {metrics.imagesStraightened > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                    activeTab === 'step3-enhancement'
                      ? 'bg-[#FFFDB4] text-[#23003F]'
                      : 'bg-white/20 text-[#FFFDB4]'
                  }`}
                >
                  {metrics.imagesStraightened}
                </span>
              )}
            </button>

            {/* Step 4: Final Output Gallery */}
            <button
              onClick={() => setActiveTab('step4-output')}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-colors text-left cursor-pointer ${
                activeTab === 'step4-output'
                  ? 'bg-white text-[#23003F] font-bold'
                  : 'text-[#BCACCE] hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 stroke-[2]" />
                <span>4. Output &amp; Review</span>
              </div>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                  activeTab === 'step4-output'
                    ? 'bg-[#FFFDB4] text-[#23003F]'
                    : 'bg-white/20 text-[#FFFDB4]'
                }`}
              >
                {items.filter((i) => !i.isArchived).length > 0
                  ? items.filter((i) => !i.isArchived).length
                  : 'Ready'}
              </span>
            </button>
          </nav>

          {/* Secondary Utilities */}
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#BCACCE] px-1 pt-2">
            Organize &amp; Settings
          </div>

          <nav className="flex flex-col gap-0.5 text-xs font-medium">
            {/* Shared With Me / Face Clusters */}
            <button
              onClick={() => setActiveTab('faces')}
              className={`flex items-center justify-between px-3.5 py-2 rounded-xl transition-colors text-left cursor-pointer ${
                activeTab === 'faces'
                  ? 'bg-white text-[#23003F] font-bold'
                  : 'text-[#BCACCE] hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 stroke-[1.8]" />
                <span>Shared With Me</span>
              </div>
              {metrics.distinctPeopleCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-white/20 text-[#FFFDB4]">
                  {metrics.distinctPeopleCount}
                </span>
              )}
            </button>

            {/* Settings & Backups */}
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl transition-colors text-left cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-white text-[#23003F] font-bold'
                  : 'text-[#BCACCE] hover:text-white hover:bg-white/10'
              }`}
            >
              <RotateCcw className="w-4 h-4 stroke-[1.8]" />
              <span>Backups &amp; Settings</span>
            </button>
          </nav>
        </div>

        {/* 3. Real Bottom Storage Details Section */}
        <div className="flex flex-col gap-3 pt-3 border-t border-[#4A1578] text-xs text-white">
          <div className="text-[10px] font-bold tracking-wider text-[#BCACCE] uppercase">
            Storage Details
          </div>

          {/* Real Storage Meter 1 */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-white/90 text-[11px] font-medium">
              <Cloud className="w-3.5 h-3.5 text-[#BCACCE]" />
              <span>Storage</span>
            </div>
            <div className="w-full bg-white/15 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#F94500] h-full rounded-full transition-all duration-300"
                style={{ width: `${usedPercentage}%` }}
              />
            </div>
            <span className="text-[10px] text-[#BCACCE] font-mono">
              {formattedStorage} of 1 TB used
            </span>
          </div>

          {/* Real Storage Meter 2: Photos */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-white/90 text-[11px] font-medium">
              <Image className="w-3.5 h-3.5 text-[#BCACCE]" />
              <span>Photos</span>
            </div>
            <div className="w-full bg-white/15 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#FFFDB4] h-full rounded-full transition-all duration-300"
                style={{ width: `${usedPercentage}%` }}
              />
            </div>
            <span className="text-[10px] text-[#BCACCE] font-mono">
              {formattedStorage} of 1 TB used
            </span>
          </div>

          {/* Upgrade Storage Link */}
          <button
            onClick={() => setActiveTab('settings')}
            className="flex items-center gap-1 text-[11px] font-bold text-[#FFFDB4] hover:text-white transition-colors pt-1 cursor-pointer"
          >
            <span>Upgrade Storage</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
