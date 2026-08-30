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
  EyeOff
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
      : '0 MB';

  const usedPercentage =
    totalBytes > 0
      ? Math.min(100, Math.max(1, (totalBytes / 1000000000000) * 100))
      : 0;

  return (
    <aside className="w-[230px] h-full flex flex-col bg-white dark:bg-[#000000] select-none flex-shrink-0 border-r border-[#E5E7EB] dark:border-[#1E1E1E] transition-colors duration-200">
      {/* 1. Sleek Minimal Logo Header */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#D83C00] text-white flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="font-heading font-bold text-sm text-[#111827] dark:text-white tracking-tight">
            LuminaSort
          </span>
        </div>
      </div>

      {/* 2. Main Minimalist Dark Body (Zero Scrollbar) */}
      <div className="flex-1 bg-[#F9FAFB] dark:bg-[#0A0A0A] rounded-tr-3xl p-3 flex flex-col justify-between text-[#111827] dark:text-white no-scrollbar overflow-hidden border-t border-r border-transparent dark:border-[#1A1A1A]">
        <div className="flex flex-col gap-3">
          {/* Minimalist Primary Upload CTA */}
          <label className="w-full bg-[#D83C00] hover:bg-[#B83300] text-white font-heading font-bold text-xs tracking-wide py-2 px-3 rounded-xl transition-all active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer shadow-none">
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Upload Photos</span>
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

          {/* Pipeline Navigation Menu */}
          <div className="flex flex-col gap-0.5">
            <div className="font-heading text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] dark:text-[#71717A] px-2 pb-1">
              Pipeline
            </div>

            <nav className="flex flex-col gap-0.5 text-xs font-medium">
              {/* Step 1: Ingest Folders */}
              <button
                onClick={() => setActiveTab('step1-folders')}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors text-left cursor-pointer ${
                  activeTab === 'step1-folders'
                    ? 'bg-[#D83C00] text-white font-semibold'
                    : 'text-[#4B5563] dark:text-[#A1A1AA] hover:text-[#111827] dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Folder className="w-3.5 h-3.5 stroke-[1.8]" />
                  <span className="font-sans text-xs">1. Ingest Folders</span>
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono tabular-nums ${
                    activeTab === 'step1-folders'
                      ? 'bg-black/30 text-white'
                      : 'bg-slate-200 dark:bg-white/10 text-[#4B5563] dark:text-[#A1A1AA]'
                  }`}
                >
                  {metrics.totalScanned > 0 ? metrics.totalScanned : items.length}
                </span>
              </button>

              {/* Step 2: Blur & Motion Culling */}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => {
                    setActiveTab('step2-culling');
                    if (onSelectCullingSubTab) onSelectCullingSubTab('all');
                  }}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors text-left cursor-pointer ${
                    activeTab === 'step2-culling' && (!cullingSubTab || cullingSubTab === 'all')
                      ? 'bg-[#D83C00] text-white font-semibold'
                      : 'text-[#4B5563] dark:text-[#A1A1AA] hover:text-[#111827] dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Archive className="w-3.5 h-3.5 stroke-[1.8]" />
                    <span className="font-sans text-xs">2. Eye &amp; Culling</span>
                  </div>
                  {items.length > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono tabular-nums ${
                        activeTab === 'step2-culling' && (!cullingSubTab || cullingSubTab === 'all')
                          ? 'bg-black/30 text-white'
                          : 'bg-slate-200 dark:bg-white/10 text-[#4B5563] dark:text-[#A1A1AA]'
                      }`}
                    >
                      {items.length}
                    </span>
                  )}
                </button>

                {/* Sub-menu: Kept & Archived */}
                {(activeTab === 'step2-culling' || items.length > 0) && (
                  <div className="flex flex-col gap-0.5 pl-3 ml-2 border-l border-slate-200 dark:border-[#222222] my-0.5">
                    {/* Kept Sub-option */}
                    <button
                      onClick={() => {
                        setActiveTab('step2-culling');
                        if (onSelectCullingSubTab) onSelectCullingSubTab('kept');
                      }}
                      className={`flex items-center justify-between px-2 py-1 rounded-md transition-colors text-left text-[11px] cursor-pointer ${
                        activeTab === 'step2-culling' && cullingSubTab === 'kept'
                          ? 'bg-[#D83C00] text-white font-medium'
                          : 'text-[#6B7280] dark:text-[#A1A1AA] hover:text-[#111827] dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-[#D83C00] dark:text-[#FF8C61]" />
                        <span>Kept</span>
                      </div>
                      <span className="font-mono text-[10px]">
                        {items.filter((i) => !i.isArchived).length}
                      </span>
                    </button>

                    {/* Archived Sub-option */}
                    <button
                      onClick={() => {
                        setActiveTab('step2-culling');
                        if (onSelectCullingSubTab) onSelectCullingSubTab('archived');
                      }}
                      className={`flex items-center justify-between px-2 py-1 rounded-md transition-colors text-left text-[11px] cursor-pointer ${
                        activeTab === 'step2-culling' && cullingSubTab === 'archived'
                          ? 'bg-[#27272A] text-white font-medium'
                          : 'text-[#6B7280] dark:text-[#A1A1AA] hover:text-[#111827] dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <EyeOff className="w-3 h-3 text-red-500" />
                        <span>_archive</span>
                      </div>
                      <span className="font-mono text-[10px]">
                        {items.filter((i) => i.isArchived).length}
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Step 3: Straighten & Tone */}
              <button
                onClick={() => setActiveTab('step3-enhancement')}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors text-left cursor-pointer ${
                  activeTab === 'step3-enhancement'
                    ? 'bg-[#D83C00] text-white font-semibold'
                    : 'text-[#4B5563] dark:text-[#A1A1AA] hover:text-[#111827] dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Compass className="w-3.5 h-3.5 stroke-[1.8]" />
                  <span className="font-sans text-xs">3. Straighten</span>
                </div>
                {metrics.imagesStraightened > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono tabular-nums ${
                      activeTab === 'step3-enhancement'
                        ? 'bg-black/30 text-white'
                        : 'bg-slate-200 dark:bg-white/10 text-[#4B5563] dark:text-[#A1A1AA]'
                    }`}
                  >
                    {metrics.imagesStraightened}
                  </span>
                )}
              </button>

              {/* Step 4: Final Output Gallery */}
              <button
                onClick={() => setActiveTab('step4-output')}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors text-left cursor-pointer ${
                  activeTab === 'step4-output'
                    ? 'bg-[#D83C00] text-white font-semibold'
                    : 'text-[#4B5563] dark:text-[#A1A1AA] hover:text-[#111827] dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 stroke-[1.8]" />
                  <span className="font-sans text-xs">4. Review &amp; Export</span>
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono tabular-nums ${
                    activeTab === 'step4-output'
                      ? 'bg-black/30 text-white'
                      : 'bg-slate-200 dark:bg-white/10 text-[#4B5563] dark:text-[#A1A1AA]'
                  }`}
                >
                  {items.filter((i) => !i.isArchived).length}
                </span>
              </button>
            </nav>
          </div>

          {/* Secondary Utilities */}
          <div className="flex flex-col gap-0.5 pt-1">
            <div className="font-heading text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] dark:text-[#71717A] px-2 pb-1">
              Organize
            </div>

            <nav className="flex flex-col gap-0.5 text-xs font-medium">
              {/* Shared With Me / Face Clusters */}
              <button
                onClick={() => setActiveTab('faces')}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors text-left cursor-pointer ${
                  activeTab === 'faces'
                    ? 'bg-[#D83C00] text-white font-semibold'
                    : 'text-[#4B5563] dark:text-[#A1A1AA] hover:text-[#111827] dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 stroke-[1.8]" />
                  <span className="font-sans text-xs">Shared With Me</span>
                </div>
                {metrics.distinctPeopleCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md font-mono tabular-nums bg-[#D83C00]/20 text-[#D83C00] dark:text-[#FF8C61]">
                    {metrics.distinctPeopleCount}
                  </span>
                )}
              </button>

              {/* Settings & Backups */}
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors text-left cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-[#D83C00] text-white font-semibold'
                    : 'text-[#4B5563] dark:text-[#A1A1AA] hover:text-[#111827] dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5 stroke-[1.8]" />
                <span className="font-sans text-xs">Settings</span>
              </button>
            </nav>
          </div>
        </div>

        {/* 3. Minimalist Single-Line Storage Footer */}
        <div className="pt-2 border-t border-slate-200 dark:border-[#1A1A1A] flex flex-col gap-1.5 text-xs">
          <div className="flex items-center justify-between text-[11px] font-medium text-[#6B7280] dark:text-[#A1A1AA]">
            <span className="flex items-center gap-1">
              <Cloud className="w-3 h-3 text-[#D83C00]" />
              <span>Storage</span>
            </span>
            <span className="font-mono text-[10px] tabular-nums">
              {formattedStorage} / 1 TB
            </span>
          </div>

          <div className="w-full bg-slate-200 dark:bg-[#1E1E1E] h-1 rounded-full overflow-hidden">
            <div
              className="bg-[#D83C00] h-full rounded-full transition-all duration-300"
              style={{ width: `${usedPercentage}%` }}
            />
          </div>
        </div>
      </div>
    </aside>
  );
};
