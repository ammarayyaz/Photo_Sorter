import React from 'react';
import {
  Folder,
  Archive,
  Compass,
  CheckCircle2,
  Users,
  RotateCcw,
  Cloud,
  Sparkles,
  Plus,
  EyeOff,
  ArrowUpRight
} from 'lucide-react';
import { ProcessingStatus, PipelineMetrics, ProcessedItem } from '../../engine/types';
import { analyzeRealImageFile } from '../../engine/realImageProcessor';

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
  cullingSubTab?: 'all' | 'kept' | 'archived' | 'top_picks';
  onSelectCullingSubTab?: (subTab: 'all' | 'kept' | 'archived' | 'top_picks') => void;
  onAddRealItems?: (newItems: ProcessedItem[], folderName: string, newFolderObj?: any) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  metrics,
  items = [],
  cullingSubTab = 'all',
  onSelectCullingSubTab,
  onAddRealItems,
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
      : '0.00 MB';

  const usedPercentage =
    totalBytes > 0
      ? Math.min(100, Math.max(1, (totalBytes / 1000000000000) * 100))
      : 0;

  return (
    <aside className="w-[245px] h-full flex flex-col bg-white dark:bg-[#000000] select-none flex-shrink-0 border-r border-[#E5E7EB] dark:border-[#222222] transition-colors duration-200">
      {/* 1. Sleek Brand Header */}
      <div className="bg-white dark:bg-[#000000] px-5 py-3.5 flex items-center justify-between transition-colors">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-[#D83C00] text-white flex items-center justify-center shadow-none flex-shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-heading font-extrabold text-base text-[#111827] dark:text-white tracking-tight">
            LuminaSort
          </span>
        </div>
      </div>

      {/* 2. Main Curved High-Contrast Body */}
      <div className="flex-1 bg-[#111827] dark:bg-[#0D0D0D] rounded-tr-[36px] p-4 flex flex-col justify-between text-white no-scrollbar overflow-y-auto border-t border-r border-transparent dark:border-[#222222]">
        <div className="flex flex-col gap-3">
          {/* Upload Button */}
          <label className="w-full bg-[#D83C00] hover:bg-[#B83300] text-white font-heading font-bold text-xs tracking-wide py-2.5 px-3.5 rounded-xl transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer shadow-none">
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Upload New Files</span>
            <input
              type="file"
              multiple
              accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff,.tif,.svg,.avif,.heic,.heif,.cr2,.cr3,.nef,.nrw,.arw,.srf,.sr2,.dng,.orf,.rw2,.pef,.ptx,.raf,.raw"
              className="hidden"
              onChange={async (e) => {
                setActiveTab('step1-folders');
                if (e.target.files && e.target.files.length > 0 && onAddRealItems) {
                  const files = Array.from(e.target.files);
                  const processed: ProcessedItem[] = [];
                  for (let i = 0; i < files.length; i++) {
                    const item = await analyzeRealImageFile(files[i], i);
                    processed.push(item);
                  }
                  const folderName = files[0].webkitRelativePath
                    ? files[0].webkitRelativePath.split('/')[0]
                    : 'Sidebar Uploaded Photos';
                  const folderId = `folder_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
                  const newFolderObj = {
                    id: folderId,
                    name: folderName,
                    isSorted: false,
                    date: new Date().toLocaleDateString(),
                    items: processed,
                  };
                  onAddRealItems(processed, folderName, newFolderObj);
                }
              }}
            />
          </label>

          {/* 4-Step Pipeline Section */}
          <div className="flex flex-col gap-1">
            <div className="font-heading text-2xs font-extrabold uppercase tracking-wider text-[#9CA3AF] dark:text-[#71717A] px-1 pt-1">
              4-Step Photo Pipeline
            </div>

            <nav className="flex flex-col gap-1 text-xs font-semibold">
              {/* Step 1: Ingest Folders */}
              <button
                onClick={() => setActiveTab('step1-folders')}
                className={`flex items-center justify-between px-3 py-2 rounded-xl transition-colors text-left cursor-pointer ${
                  activeTab === 'step1-folders'
                    ? 'bg-[#D83C00] text-white font-bold'
                    : 'text-[#D1D5DB] dark:text-[#A1A1AA] hover:text-white hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Folder className="w-4 h-4 stroke-[2]" />
                  <span className="font-sans">1. Ingest Folders</span>
                </div>
                <span
                  className={`text-2xs px-2 py-0.5 rounded-full font-mono font-bold tabular-nums ${
                    activeTab === 'step1-folders'
                      ? 'bg-black/30 text-white'
                      : 'bg-white/15 text-[#D1D5DB]'
                  }`}
                >
                  {metrics.totalScanned > 0 ? metrics.totalScanned : items.length}
                </span>
              </button>

              {/* Step 2: Blur & Motion Culling */}
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => {
                    setActiveTab('step2-culling');
                    if (onSelectCullingSubTab) onSelectCullingSubTab('all');
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl transition-colors text-left cursor-pointer ${
                    activeTab === 'step2-culling' && (!cullingSubTab || cullingSubTab === 'all')
                      ? 'bg-[#D83C00] text-white font-bold'
                      : 'text-[#D1D5DB] dark:text-[#A1A1AA] hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Archive className="w-4 h-4 stroke-[2]" />
                    <span className="font-sans">2. Eye &amp; Motion</span>
                  </div>
                  {items.length > 0 && (
                    <span
                      className={`text-2xs px-2 py-0.5 rounded-full font-mono font-bold tabular-nums ${
                        activeTab === 'step2-culling' && (!cullingSubTab || cullingSubTab === 'all')
                          ? 'bg-black/30 text-white'
                          : 'bg-white/15 text-[#D1D5DB]'
                      }`}
                    >
                      {items.length}
                    </span>
                  )}
                </button>

                {/* Sub-menu: Kept & Archived */}
                {(activeTab === 'step2-culling' || items.length > 0) && (
                  <div className="flex flex-col gap-1 pl-3.5 ml-2 border-l border-white/20 dark:border-[#27272A] my-0.5">
                    {/* Kept Sub-option */}
                    <button
                      onClick={() => {
                        setActiveTab('step2-culling');
                        if (onSelectCullingSubTab) onSelectCullingSubTab('kept');
                      }}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors text-left text-2xs cursor-pointer ${
                        activeTab === 'step2-culling' && cullingSubTab === 'kept'
                          ? 'bg-[#D83C00] text-white font-bold'
                          : 'text-[#D1D5DB] dark:text-[#A1A1AA] hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#D83C00] dark:text-[#FF8C61]" />
                        <span>Kept Photos</span>
                      </div>
                      <span
                        className={`px-1.5 py-0.2 rounded font-mono font-bold text-2xs ${
                          activeTab === 'step2-culling' && cullingSubTab === 'kept'
                            ? 'bg-black/30 text-white'
                            : 'bg-white/15 text-white'
                        }`}
                      >
                        {items.filter((i) => !i.isArchived).length}
                      </span>
                    </button>

                    {/* Archived Sub-option */}
                    <button
                      onClick={() => {
                        setActiveTab('step2-culling');
                        if (onSelectCullingSubTab) onSelectCullingSubTab('archived');
                      }}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors text-left text-2xs cursor-pointer ${
                        activeTab === 'step2-culling' && cullingSubTab === 'archived'
                          ? 'bg-[#27272A] text-white font-bold border border-[#3F3F46]'
                          : 'text-[#D1D5DB] dark:text-[#A1A1AA] hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <EyeOff className="w-3.5 h-3.5 text-red-400" />
                        <span>_archive</span>
                      </div>
                      <span
                        className={`px-1.5 py-0.2 rounded font-mono font-bold text-2xs ${
                          activeTab === 'step2-culling' && cullingSubTab === 'archived'
                            ? 'bg-black/40 text-white'
                            : 'bg-white/15 text-white'
                        }`}
                      >
                        {items.filter((i) => i.isArchived).length}
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Step 3: Straighten & Lightroom Tone Tuning */}
              <button
                onClick={() => setActiveTab('step3-enhancement')}
                className={`flex items-center justify-between px-3 py-2 rounded-xl transition-colors text-left cursor-pointer ${
                  activeTab === 'step3-enhancement'
                    ? 'bg-[#D83C00] text-white font-bold'
                    : 'text-[#D1D5DB] dark:text-[#A1A1AA] hover:text-white hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Compass className="w-4 h-4 stroke-[2]" />
                  <span className="font-sans">3. Straighten &amp; Tone</span>
                </div>
                {metrics.imagesStraightened > 0 && (
                  <span
                    className={`text-2xs px-2 py-0.5 rounded-full font-mono font-bold tabular-nums ${
                      activeTab === 'step3-enhancement'
                        ? 'bg-black/30 text-white'
                        : 'bg-white/15 text-[#D1D5DB]'
                    }`}
                  >
                    {metrics.imagesStraightened}
                  </span>
                )}
              </button>

              {/* Step 4: Final Output Gallery */}
              <button
                onClick={() => setActiveTab('step4-output')}
                className={`flex items-center justify-between px-3 py-2 rounded-xl transition-colors text-left cursor-pointer ${
                  activeTab === 'step4-output'
                    ? 'bg-[#D83C00] text-white font-bold'
                    : 'text-[#D1D5DB] dark:text-[#A1A1AA] hover:text-white hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 stroke-[2]" />
                  <span className="font-sans">4. Output &amp; Review</span>
                </div>
                <span
                  className={`text-2xs px-2 py-0.5 rounded-full font-mono font-bold tabular-nums ${
                    activeTab === 'step4-output'
                      ? 'bg-black/30 text-white'
                      : 'bg-white/15 text-[#D1D5DB]'
                  }`}
                >
                  {items.filter((i) => !i.isArchived).length}
                </span>
              </button>
            </nav>
          </div>

          {/* Secondary Utilities */}
          <div className="flex flex-col gap-1 pt-1">
            <div className="font-heading text-2xs font-extrabold uppercase tracking-wider text-[#9CA3AF] dark:text-[#71717A] px-1">
              Organize &amp; Settings
            </div>

            <nav className="flex flex-col gap-0.5 text-xs font-semibold">
              {/* Shared With Me / Face Clusters */}
              <button
                onClick={() => setActiveTab('faces')}
                className={`flex items-center justify-between px-3 py-1.5 rounded-xl transition-colors text-left cursor-pointer ${
                  activeTab === 'faces'
                    ? 'bg-[#D83C00] text-white font-bold'
                    : 'text-[#D1D5DB] dark:text-[#A1A1AA] hover:text-white hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 stroke-[1.8]" />
                  <span className="font-sans">Shared With Me</span>
                </div>
                {metrics.distinctPeopleCount > 0 && (
                  <span className="text-2xs px-2 py-0.5 rounded-full font-mono tabular-nums bg-white/20 text-white">
                    {metrics.distinctPeopleCount}
                  </span>
                )}
              </button>

              {/* Settings & Backups */}
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-colors text-left cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-[#D83C00] text-white font-bold'
                    : 'text-[#D1D5DB] dark:text-[#A1A1AA] hover:text-white hover:bg-white/10'
                }`}
              >
                <RotateCcw className="w-4 h-4 stroke-[1.8]" />
                <span className="font-sans">Backups &amp; Settings</span>
              </button>
            </nav>
          </div>
        </div>

        {/* 3. Bottom Storage Details */}
        <div className="pt-3 border-t border-white/15 dark:border-[#222222] flex flex-col gap-2 text-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-white/90">
            <span className="flex items-center gap-1.5">
              <Cloud className="w-3.5 h-3.5 text-[#9CA3AF]" />
              <span>Storage</span>
            </span>
            <span className="font-mono text-2xs tabular-nums text-[#D1D5DB]">
              {formattedStorage} / 1 TB
            </span>
          </div>

          <div className="w-full bg-white/15 dark:bg-[#1E1E1E] h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-[#D83C00] h-full rounded-full transition-all duration-300"
              style={{ width: `${usedPercentage}%` }}
            />
          </div>

          <button
            onClick={() => setActiveTab('settings')}
            className="flex items-center justify-between text-2xs font-heading font-bold text-[#D83C00] dark:text-[#FF8C61] hover:underline pt-0.5 cursor-pointer"
          >
            <span>Upgrade Storage</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </aside>
  );
};
