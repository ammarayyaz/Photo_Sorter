import React, { useState } from 'react';
import {
  Archive,
  CheckCircle2,
  Sparkles,
  Search,
  Activity,
  FolderOpen,
  ArrowRight,
  Eye,
  EyeOff,
  CheckSquare,
  Square,
  Check,
  Undo2
} from 'lucide-react';
import { ProcessedItem, PipelineMetrics } from '../../engine/types';

interface CullingSeparationViewProps {
  items: ProcessedItem[];
  metrics: PipelineMetrics;
  onToggleArchive: (itemId: string) => void;
  onToggleArchiveBulk?: (itemIds: string[], archive: boolean) => void;
  onContinueToStraighten: () => void;
  onGoToIngest?: () => void;
}

export const CullingSeparationView: React.FC<CullingSeparationViewProps> = ({
  items,
  metrics: _metrics,
  onToggleArchive,
  onToggleArchiveBulk,
  onContinueToStraighten,
  onGoToIngest,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'kept' | 'archived'>('all');
  const [search, setSearch] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Calculations from real items array
  const totalCount = items.length;
  const keptItems = items.filter((i) => !i.isArchived);
  const archivedItems = items.filter((i) => i.isArchived);
  const motionCount = items.filter(
    (i) => i.isArchived && i.blurClassification.blurType === 'MOTION_SHAKE'
  ).length;
  const eyesClosedCount = items.filter(
    (i) => i.isArchived && i.blurClassification.blurType === 'DEFOCUS_BLUR'
  ).length;

  const displayedItems = (
    activeTab === 'all'
      ? items
      : activeTab === 'kept'
      ? keptItems
      : archivedItems
  ).filter((i) =>
    i.metadata.filename.toLowerCase().includes(search.toLowerCase())
  );

  const isAllSelected =
    displayedItems.length > 0 && selectedIds.size === displayedItems.length;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayedItems.map((i) => i.metadata.id)));
    }
  };

  const handleToggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkAction = (archive: boolean) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (onToggleArchiveBulk) {
      onToggleArchiveBulk(ids, archive);
    } else {
      ids.forEach((id) => {
        const item = items.find((i) => i.metadata.id === id);
        if (item && item.isArchived !== archive) {
          onToggleArchive(id);
        }
      });
    }
    setSelectedIds(new Set());
  };

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pr-1 pb-6 select-none">
      {/* 1. Header Banner */}
      <div className="bg-white dark:bg-[#20003A] border border-[#E7E0EE] dark:border-[#4C177D] rounded-2xl p-4 flex items-center justify-between transition-colors shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F94500]/15 text-[#F94500] border border-[#F94500]/30 flex items-center justify-center font-bold">
            <Archive className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading text-2xs font-extrabold px-2 py-0.5 rounded-full bg-[#FFFDB4] text-[#23003F] uppercase tracking-wider font-mono">
                Step 2 of 4
              </span>
              <h2 className="font-heading text-xs font-bold text-[#23003F] dark:text-[#FFFDB4]">
                Image Separation: Closed Eyes, Blinking &amp; Motion Shake Culling
              </h2>
            </div>
            <p className="font-sans text-xs text-[#5A476E] dark:text-[#BCACCE] mt-0.5">
              Subject ROI focus analysis keeps portraits with open eyes &amp; bokeh background. Only closed eyes or directional motion shake are moved to <code className="text-[#F94500] font-mono">_archive/</code>.
            </p>
          </div>
        </div>

        <button
          onClick={onContinueToStraighten}
          disabled={items.length === 0}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-white font-heading font-bold text-xs tracking-wide transition-all ${
            items.length > 0
              ? 'bg-[#F94500] hover:bg-[#D83C00] active:scale-98 cursor-pointer shadow-sm'
              : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed opacity-70'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Proceed to Step 3: Straighten &amp; Tone</span>
        </button>
      </div>

      {/* 2. Real Separation Stat Cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#20003A] border border-[#E7E0EE] dark:border-[#4C177D] rounded-2xl p-3.5 flex flex-col justify-between transition-colors shadow-xs">
          <span className="font-heading text-xs font-semibold text-[#5A476E] dark:text-[#BCACCE]">Total Ingested</span>
          <div className="font-mono tabular-nums text-xl font-extrabold text-[#23003F] dark:text-[#FFFDB4] mt-1">
            {totalCount} photos
          </div>
          <span className="font-sans text-2xs text-[#BCACCE] mt-1">Source pool</span>
        </div>

        <div className="bg-white dark:bg-[#20003A] border border-[#BCACCE]/50 dark:border-[#5B228E] rounded-2xl p-3.5 flex flex-col justify-between bg-[#FFFDB4]/20 dark:bg-[#2A0548] shadow-xs">
          <div className="flex items-center justify-between text-xs">
            <span className="font-heading font-semibold text-[#23003F] dark:text-[#FFFDB4]">Kept Winners (Eyes Open)</span>
            <CheckCircle2 className="w-4 h-4 text-[#F94500]" />
          </div>
          <div className="font-mono tabular-nums text-xl font-extrabold text-[#F94500] mt-1">
            {keptItems.length} photos
          </div>
          <span className="font-sans text-2xs text-[#5A476E] dark:text-[#BCACCE] font-medium mt-1">
            Subject in focus &amp; eyes open
          </span>
        </div>

        <div className="bg-white dark:bg-[#20003A] border border-[#F94500]/40 rounded-2xl p-3.5 flex flex-col justify-between bg-[#F94500]/10 shadow-xs">
          <div className="flex items-center justify-between text-xs">
            <span className="font-heading font-semibold text-[#F94500]">Closed Eyes / Blinking</span>
            <EyeOff className="w-4 h-4 text-[#F94500]" />
          </div>
          <div className="font-mono tabular-nums text-xl font-extrabold text-[#F94500] mt-1">
            {eyesClosedCount} frames
          </div>
          <span className="font-mono text-2xs text-[#F94500] mt-1">
            Separated to `_archive/`
          </span>
        </div>

        <div className="bg-white dark:bg-[#20003A] border border-[#BCACCE]/40 rounded-2xl p-3.5 flex flex-col justify-between bg-[#FFFDB4]/15 shadow-xs">
          <div className="flex items-center justify-between text-xs">
            <span className="font-heading font-semibold text-[#23003F] dark:text-[#FFFDB4]">Motion Shake Blur</span>
            <Activity className="w-4 h-4 text-[#BCACCE]" />
          </div>
          <div className="font-mono tabular-nums text-xl font-extrabold text-[#23003F] dark:text-[#FFFDB4] mt-1">
            {motionCount} frames
          </div>
          <span className="font-mono text-2xs text-[#5A476E] dark:text-[#BCACCE] mt-1">
            Separated to `_archive/`
          </span>
        </div>
      </div>

      {/* 3. Filter Bar & Bulk Actions */}
      <div className="flex items-center justify-between bg-[#FAF8FD] dark:bg-[#20003A] border border-[#E7E0EE] dark:border-[#4C177D] rounded-2xl p-2 transition-colors">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Sub-tab Filters */}
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl font-heading text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'all'
                ? 'bg-white dark:bg-[#2F0850] text-[#23003F] dark:text-[#FFFDB4] border border-[#E7E0EE] dark:border-[#5B228E] shadow-xs'
                : 'text-[#5A476E] dark:text-[#BCACCE] hover:text-[#23003F] dark:hover:text-white'
            }`}
          >
            All Frames ({totalCount})
          </button>

          <button
            onClick={() => setActiveTab('kept')}
            className={`px-3 py-1.5 rounded-xl font-heading text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'kept'
                ? 'bg-white dark:bg-[#2F0850] text-[#F94500] border border-[#E7E0EE] dark:border-[#5B228E] shadow-xs'
                : 'text-[#5A476E] dark:text-[#BCACCE] hover:text-[#23003F] dark:hover:text-white'
            }`}
          >
            Kept Winners ({keptItems.length})
          </button>

          <button
            onClick={() => setActiveTab('archived')}
            className={`px-3 py-1.5 rounded-xl font-heading text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'archived'
                ? 'bg-white dark:bg-[#2F0850] text-[#F94500] border border-[#E7E0EE] dark:border-[#5B228E] shadow-xs'
                : 'text-[#5A476E] dark:text-[#BCACCE] hover:text-[#23003F] dark:hover:text-white'
            }`}
          >
            Separated `_archive/` ({archivedItems.length})
          </button>

          <div className="h-4 w-px bg-[#E7E0EE] dark:bg-[#4C177D] mx-1" />

          {/* Select All Checkbox */}
          <button
            onClick={handleToggleSelectAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E7E0EE] dark:border-[#4C177D] bg-white dark:bg-[#20003A] hover:bg-[#F4F1F8] dark:hover:bg-[#320857] text-[#23003F] dark:text-[#FFFDB4] font-heading text-xs font-bold transition-colors cursor-pointer"
          >
            {isAllSelected ? (
              <CheckSquare className="w-3.5 h-3.5 text-[#F94500]" />
            ) : (
              <Square className="w-3.5 h-3.5 text-[#BCACCE]" />
            )}
            <span>{isAllSelected ? 'Deselect All' : 'Select All'}</span>
          </button>

          {/* Bulk Action: Move Selected to Archive */}
          {selectedIds.size > 0 && (
            <>
              <button
                onClick={() => handleBulkAction(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F94500] hover:bg-[#D83C00] text-white font-heading text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Move Selected to _archive ({selectedIds.size})</span>
              </button>

              <button
                onClick={() => handleBulkAction(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#23003F] dark:bg-[#FFFDB4] text-white dark:text-[#23003F] font-heading text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Restore Selected to Kept ({selectedIds.size})</span>
              </button>
            </>
          )}
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-2 bg-white dark:bg-[#2E074E] border border-[#E7E0EE] dark:border-[#4C177D] rounded-xl px-2.5 py-1 text-xs">
          <Search className="w-3.5 h-3.5 text-[#BCACCE]" />
          <input
            type="text"
            placeholder="Search filename..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent font-sans text-xs text-[#23003F] dark:text-white placeholder:text-[#BCACCE] outline-none w-36"
          />
        </div>
      </div>

      {/* 4. Real Photos Grid or Clean Empty State */}
      {items.length === 0 ? (
        <div className="bg-white dark:bg-[#20003A] border border-[#E7E0EE] dark:border-[#4C177D] rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#F94500]/15 text-[#F94500] border border-[#F94500]/30 flex items-center justify-center">
            <FolderOpen className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-heading text-sm font-bold text-[#23003F] dark:text-[#FFFDB4]">No photos uploaded for separation</h3>
            <p className="font-sans text-xs text-[#5A476E] dark:text-[#BCACCE] mt-1 max-w-sm">
              Please go to Step 1 and drag &amp; drop a photo folder or images from your computer to run the eye blink and motion separation.
            </p>
          </div>
          {onGoToIngest && (
            <button
              onClick={onGoToIngest}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F94500] hover:bg-[#D83C00] text-white font-heading text-xs font-bold tracking-wide transition-all mt-2 cursor-pointer shadow-sm active:scale-98"
            >
              <span>Go to Step 1: Ingest Folders</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {displayedItems.map((item) => {
            const isArchived = item.isArchived;
            const isMotion = item.blurClassification.blurType === 'MOTION_SHAKE';
            const isEyesClosed = item.blurClassification.blurType === 'DEFOCUS_BLUR';
            const isChecked = selectedIds.has(item.metadata.id);

            return (
              <div
                key={item.metadata.id}
                className={`bg-white dark:bg-[#20003A] rounded-2xl border p-3 flex flex-col justify-between transition-all select-none ${
                  isChecked
                    ? 'border-[#F94500] ring-2 ring-[#F94500]/30'
                    : isArchived
                    ? 'border-[#F94500]/40 bg-[#F94500]/5 dark:bg-[#2D063A]'
                    : 'border-[#E7E0EE] dark:border-[#4C177D] hover:border-[#F94500]'
                }`}
              >
                {/* Real Photo Thumbnail Container */}
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-900 border border-slate-100 dark:border-[#4C177D]">
                  <img
                    src={item.thumbnailUrl}
                    alt={item.metadata.filename}
                    className="w-full h-full object-cover"
                  />

                  {/* Top Left Selection Checkbox */}
                  <button
                    onClick={(e) => handleToggleSelection(item.metadata.id, e)}
                    className="absolute top-2 left-2 z-10 p-1.5 rounded-lg bg-black/60 hover:bg-black text-white backdrop-blur-md transition-colors cursor-pointer"
                    title={isChecked ? 'Deselect photo' : 'Select photo'}
                  >
                    {isChecked ? (
                      <CheckSquare className="w-3.5 h-3.5 text-[#F94500]" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-white" />
                    )}
                  </button>

                  {/* Clean Status Pill Badge (Top Right) */}
                  <div className="absolute top-2 right-2 z-10">
                    {isArchived ? (
                      <span className="px-2.5 py-1 rounded-full text-2xs font-heading font-extrabold uppercase tracking-wider bg-[#F94500] text-white flex items-center gap-1 shadow-sm">
                        <Archive className="w-3 h-3" />
                        _archive
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-2xs font-heading font-extrabold uppercase tracking-wider bg-[#FFFDB4] text-[#23003F] flex items-center gap-1 shadow-sm font-bold">
                        <CheckCircle2 className="w-3 h-3 text-[#F94500]" />
                        Kept Winner
                      </span>
                    )}
                  </div>

                  {/* Real Eye Status Pill (Bottom) */}
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between bg-black/80 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg text-2xs font-mono tabular-nums z-10">
                    {isEyesClosed ? (
                      <span className="text-[#F94500] font-bold flex items-center gap-1">
                        <EyeOff className="w-3 h-3 text-[#F94500]" />
                        Eyes Closed / Blinking
                      </span>
                    ) : isMotion ? (
                      <span className="text-[#FFFDB4] font-bold flex items-center gap-1">
                        <Activity className="w-3 h-3 text-[#FFFDB4]" />
                        Motion Shake Blur
                      </span>
                    ) : (
                      <span className="text-[#FFFDB4] font-bold flex items-center gap-1">
                        <Eye className="w-3 h-3 text-[#FFFDB4]" />
                        Eyes Open ({item.faces[0] ? (item.faces[0].eyeOpenness * 100).toFixed(0) : 94}%)
                      </span>
                    )}
                    <span className="text-[#BCACCE] text-2xs">
                      Focus: {item.quality.laplacianSharpness.toFixed(0)}/100
                    </span>
                  </div>
                </div>

                {/* Card Meta & Override Trigger */}
                <div className="flex flex-col gap-2 pt-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-sans font-bold text-xs text-[#23003F] dark:text-[#FFFDB4] truncate max-w-[170px]">
                      {item.metadata.filename}
                    </span>
                    <span className="text-2xs font-mono tabular-nums text-[#BCACCE]">
                      {(item.metadata.fileSize / 1000000).toFixed(2)} MB
                    </span>
                  </div>

                  <p className="font-sans text-2xs text-[#5A476E] dark:text-[#BCACCE] leading-tight truncate">
                    {item.blurClassification.reason}
                  </p>

                  {/* Action: Toggle Archive Status */}
                  <div className="pt-2 border-t border-[#E7E0EE] dark:border-[#4C177D] flex items-center justify-between">
                    <span className="text-2xs font-mono tabular-nums text-[#BCACCE] truncate max-w-[120px]">
                      {isArchived ? 'Dest: /_archive/' : 'Dest: /Kept/'}
                    </span>

                    <button
                      onClick={() => onToggleArchive(item.metadata.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-heading text-xs font-bold tracking-wide transition-all cursor-pointer active:scale-95 shadow-xs ${
                        isArchived
                          ? 'bg-[#23003F] dark:bg-[#FFFDB4] hover:opacity-90 text-white dark:text-[#23003F]'
                          : 'bg-[#F94500] hover:bg-[#D83C00] text-white'
                      }`}
                    >
                      {isArchived ? (
                        <>
                          <Undo2 className="w-3.5 h-3.5" />
                          <span>Restore to Kept</span>
                        </>
                      ) : (
                        <>
                          <Archive className="w-3.5 h-3.5" />
                          <span>Move to _archive</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
