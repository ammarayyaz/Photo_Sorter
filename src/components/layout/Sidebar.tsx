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
  ArrowUpRight,
  FileSignature
} from 'lucide-react';
import { ProcessingStatus, PipelineMetrics, ProcessedItem } from '../../engine/types';
import { analyzeRealImageFile } from '../../engine/realImageProcessor';

export type ActiveTab =
  | 'step1-folders'
  | 'step2-culling'
  | 'step3-enhancement'
  | 'step4-renaming'
  | 'step5-output'
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

  const getTabClass = (isActive: boolean) => 
    `flex items-center justify-between px-3 py-2 rounded-xl transition-all text-left cursor-pointer duration-150 ${
      isActive 
        ? 'bg-[#4D694E] text-[#FFF3D5] font-bold shadow-sm' 
        : 'text-[#2D3F2E]/80 dark:text-[#FFF3D5]/80 hover:text-[#2D3F2E] dark:hover:text-[#FFF3D5] hover:bg-[#4D694E]/10 dark:hover:bg-[#4D694E]/25'
    }`;

  const getSubTabClass = (isActive: boolean) => 
    `flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all text-left text-2xs cursor-pointer duration-150 ${
      isActive 
        ? 'bg-[#4D694E] text-[#FFF3D5] font-bold shadow-sm' 
        : 'text-[#2D3F2E]/80 dark:text-[#FFF3D5]/80 hover:text-[#2D3F2E] dark:hover:text-[#FFF3D5] hover:bg-[#4D694E]/10 dark:hover:bg-[#4D694E]/25'
    }`;

  const getBadgeClass = (isActive: boolean) => 
    `text-2xs px-2 py-0.5 rounded-full font-mono font-bold tabular-nums ${
      isActive 
        ? 'bg-black/20 text-[#FFF3D5]' 
        : 'bg-[#4D694E]/15 dark:bg-white/10 text-[#2D3F2E]/80 dark:text-[#FFF3D5]/80'
    }`;

  return (
    <aside className="relative overflow-hidden w-[245px] h-full flex flex-col bg-white dark:bg-[#121813] select-none flex-shrink-0 transition-colors duration-200">
      {/* Blurred Background Gradient */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-90 dark:opacity-50">
        <div 
          className="w-full h-full filter blur-[20px] scale-125" 
          style={{
            background: 'radial-gradient(circle at top left, var(--nav-gradient-start, #4D694E), var(--nav-gradient-end, #FFF3D5) 75%)'
          }}
        />
      </div>

      {/* 1. Sleek Brand Header */}
      <div className="relative z-10 bg-transparent px-5 py-3.5 flex items-center justify-between transition-colors">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-[#4D694E] text-[#FFF3D5] flex items-center justify-center shadow-none flex-shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-heading font-extrabold text-base text-[#2D3F2E] dark:text-[#FFF3D5] tracking-tight">
            LuminaSort
          </span>
        </div>
      </div>

      {/* 2. Main Curved High-Contrast Body */}
      <div className="relative z-10 flex-1 bg-transparent p-4 flex flex-col justify-between text-[#2D3F2E] dark:text-[#FFF3D5] no-scrollbar overflow-y-auto">
        <div className="flex flex-col gap-3">
          {/* Upload Button */}
          <label className="w-full bg-[#4D694E] hover:bg-[#3C533D] text-white font-heading font-bold text-xs tracking-wide py-2.5 px-3.5 rounded-xl transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer shadow-none">
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

          {/* 5-Step Pipeline Section */}
          <div className="flex flex-col gap-1">
            <div className="font-heading text-2xs font-extrabold uppercase tracking-wider text-[#2D3F2E]/60 dark:text-[#FFF3D5]/60 px-1 pt-1">
              5-Step Photo Pipeline
            </div>

            <nav className="flex flex-col gap-1 text-xs font-semibold">
              {/* Step 1: Ingest Folders */}
              <button
                onClick={() => setActiveTab('step1-folders')}
                className={getTabClass(activeTab === 'step1-folders')}
              >
                <div className="flex items-center gap-2.5">
                  <Folder className="w-4 h-4 stroke-[2]" />
                  <span className="font-sans">1. Ingest Folders</span>
                </div>
                <span className={getBadgeClass(activeTab === 'step1-folders')}>
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
                  className={getTabClass(activeTab === 'step2-culling' && (!cullingSubTab || cullingSubTab === 'all'))}
                >
                  <div className="flex items-center gap-2.5">
                    <Archive className="w-4 h-4 stroke-[2]" />
                    <span className="font-sans">2. Eye &amp; Motion</span>
                  </div>
                  {items.length > 0 && (
                    <span className={getBadgeClass(activeTab === 'step2-culling' && (!cullingSubTab || cullingSubTab === 'all'))}>
                      {items.length}
                    </span>
                  )}
                </button>

                {/* Sub-menu: Kept & Archived */}
                {(activeTab === 'step2-culling' || items.length > 0) && (
                  <div className="flex flex-col gap-1 pl-3.5 ml-2 border-l border-[#2D3F2E]/20 dark:border-[#2C3A2F] my-0.5">
                    {/* Kept Sub-option */}
                    <button
                      onClick={() => {
                        setActiveTab('step2-culling');
                        if (onSelectCullingSubTab) onSelectCullingSubTab('kept');
                      }}
                      className={getSubTabClass(activeTab === 'step2-culling' && cullingSubTab === 'kept')}
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#4D694E]" />
                        <span>Kept Photos</span>
                      </div>
                      <span className={getBadgeClass(activeTab === 'step2-culling' && cullingSubTab === 'kept')}>
                        {items.filter((i) => !i.isArchived).length}
                      </span>
                    </button>

                    {/* Archived Sub-option */}
                    <button
                      onClick={() => {
                        setActiveTab('step2-culling');
                        if (onSelectCullingSubTab) onSelectCullingSubTab('archived');
                      }}
                      className={getSubTabClass(activeTab === 'step2-culling' && cullingSubTab === 'archived')}
                    >
                      <div className="flex items-center gap-2">
                        <EyeOff className="w-3.5 h-3.5 text-red-450" />
                        <span>_archive</span>
                      </div>
                      <span className={getBadgeClass(activeTab === 'step2-culling' && cullingSubTab === 'archived')}>
                        {items.filter((i) => i.isArchived).length}
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Step 3: Straighten & Lightroom Tone Tuning */}
              <button
                onClick={() => setActiveTab('step3-enhancement')}
                className={getTabClass(activeTab === 'step3-enhancement')}
              >
                <div className="flex items-center gap-2.5">
                  <Compass className="w-4 h-4 stroke-[2]" />
                  <span className="font-sans">3. Straighten &amp; Tone</span>
                </div>
                {metrics.imagesStraightened > 0 && (
                  <span className={getBadgeClass(activeTab === 'step3-enhancement')}>
                    {metrics.imagesStraightened}
                  </span>
                )}
              </button>

              {/* Step 4: Batch Renaming */}
              <button
                onClick={() => setActiveTab('step4-renaming')}
                className={getTabClass(activeTab === 'step4-renaming')}
              >
                <div className="flex items-center gap-2.5">
                  <FileSignature className="w-4 h-4 stroke-[2]" />
                  <span className="font-sans">4. Batch Rename</span>
                </div>
                {items.length > 0 && (
                  <span className={getBadgeClass(activeTab === 'step4-renaming')}>
                    {items.length}
                  </span>
                )}
              </button>

              {/* Step 5: Final Output Gallery */}
              <button
                onClick={() => setActiveTab('step5-output')}
                className={getTabClass(activeTab === 'step5-output')}
              >
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 stroke-[2]" />
                  <span className="font-sans">5. Output &amp; Review</span>
                </div>
                <span className={getBadgeClass(activeTab === 'step5-output')}>
                  {items.filter((i) => !i.isArchived).length}
                </span>
              </button>
            </nav>
          </div>

          {/* Secondary Utilities */}
          <div className="flex flex-col gap-1 pt-1">
            <div className="font-heading text-2xs font-extrabold uppercase tracking-wider text-[#2D3F2E]/60 dark:text-[#FFF3D5]/60 px-1">
              Organize &amp; Settings
            </div>

            <nav className="flex flex-col gap-0.5 text-xs font-semibold">
              {/* Shared With Me / Face Clusters */}
              <button
                onClick={() => setActiveTab('faces')}
                className={getTabClass(activeTab === 'faces')}
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 stroke-[1.8]" />
                  <span className="font-sans">Shared With Me</span>
                </div>
                {metrics.distinctPeopleCount > 0 && (
                  <span className={getBadgeClass(activeTab === 'faces')}>
                    {metrics.distinctPeopleCount}
                  </span>
                )}
              </button>

              {/* Settings & Backups */}
              <button
                onClick={() => setActiveTab('settings')}
                className={getTabClass(activeTab === 'settings')}
              >
                <RotateCcw className="w-4 h-4 stroke-[1.8]" />
                <span className="font-sans">Backups &amp; Settings</span>
              </button>
            </nav>
          </div>
        </div>

        {/* 3. Bottom Storage Details */}
        <div className="pt-3 border-t border-[#2D3F2E]/15 dark:border-[#2C3A2F] flex flex-col gap-2 text-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#2D3F2E]/90 dark:text-[#FFF3D5]/90">
            <span className="flex items-center gap-1.5">
              <Cloud className="w-3.5 h-3.5 text-[#2D3F2E]/60 dark:text-[#FFF3D5]/60" />
              <span>Storage</span>
            </span>
            <span className="font-mono text-2xs tabular-nums text-[#2D3F2E]/80 dark:text-[#FFF3D5]/80">
              {formattedStorage} / 1 TB
            </span>
          </div>

          <div className="w-full bg-[#4D694E]/10 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-[#4D694E] h-full rounded-full transition-all duration-300"
              style={{ width: `${usedPercentage}%` }}
            />
          </div>

          <button
            onClick={() => setActiveTab('settings')}
            className="flex items-center justify-between text-2xs font-heading font-bold text-[#4D694E] hover:underline pt-0.5 cursor-pointer"
          >
            <span>Upgrade Storage</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </aside>
  );
};
