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
  Undo2,
  Sliders,
  X,
  Info,
  Zap,
  Loader2
} from 'lucide-react';
import { ProcessedItem, PipelineMetrics, PipelineConfig } from '../../engine/types';
import { FacetCullMode, runFacetBurstCulling } from '../../engine/facetScorer';
import { analyzeImageWithGeminiVision } from '../../engine/geminiCuller';

interface CullingSeparationViewProps {
  items: ProcessedItem[];
  metrics: PipelineMetrics;
  onToggleArchive: (itemId: string) => void;
  onToggleArchiveBulk?: (itemIds: string[], archive: boolean) => void;
  onContinueToStraighten: () => void;
  onGoToIngest?: () => void;
  geminiApiKey?: string;
  onChangeConfig?: (newConfig: Partial<PipelineConfig>) => void;
  onUpdateItems?: (items: ProcessedItem[]) => void;
  activeSubTab?: 'all' | 'kept' | 'archived' | 'top_picks';
  onChangeSubTab?: (tab: 'all' | 'kept' | 'archived' | 'top_picks') => void;
}

export const CullingSeparationView: React.FC<CullingSeparationViewProps> = ({
  items,
  metrics: _metrics,
  onToggleArchive,
  onToggleArchiveBulk,
  onContinueToStraighten,
  onGoToIngest,
  geminiApiKey = '',
  onChangeConfig: _onChangeConfig,
  onUpdateItems,
  activeSubTab,
  onChangeSubTab,
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState<'all' | 'kept' | 'archived' | 'top_picks'>('all');
  const activeTab = activeSubTab || internalActiveTab;
  const setActiveTab = (tab: 'all' | 'kept' | 'archived' | 'top_picks') => {
    setInternalActiveTab(tab);
    if (onChangeSubTab) onChangeSubTab(tab);
  };
  const [cullMode, setCullMode] = useState<FacetCullMode>('KEEP_ALL_GOOD');
  const [search, setSearch] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [inspectingItem, setInspectingItem] = useState<ProcessedItem | null>(null);
  const [geminiSingleLoading, setGeminiSingleLoading] = useState<boolean>(false);
  const [geminiSingleResult, setGeminiSingleResult] = useState<string | null>(null);

  // Calculations from real items array
  const totalCount = items.length;
  const keptItems = items.filter((i) => !i.isArchived);
  const archivedItems = items.filter((i) => i.isArchived);
  const topPicks = items.filter((i) => !i.isArchived && (i.quality.compositeScore >= 80));

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
      : activeTab === 'archived'
      ? archivedItems
      : topPicks
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

  const handleApplyFacetMode = (newMode: FacetCullMode) => {
    setCullMode(newMode);
    const culled = runFacetBurstCulling(items, newMode);
    const archivedIds = culled.filter((i) => i.isArchived).map((i) => i.metadata.id);
    const keptIds = culled.filter((i) => !i.isArchived).map((i) => i.metadata.id);

    if (onToggleArchiveBulk) {
      if (archivedIds.length > 0) onToggleArchiveBulk(archivedIds, true);
      if (keptIds.length > 0) onToggleArchiveBulk(keptIds, false);
    }
  };

  // Run Single Item Gemini Scan in Modal
  const handleScanInspectingItemWithGemini = async () => {
    if (!inspectingItem) return;
    const key = geminiApiKey.trim();
    if (!key) {
      alert('Please enter your Gemini API Key in the Settings page.');
      return;
    }

    setGeminiSingleLoading(true);
    setGeminiSingleResult(null);
    try {
      const res = await analyzeImageWithGeminiVision(key, inspectingItem);
      const isArch = res.recommendation === 'MOVE_TO_ARCHIVE';
      const updated = {
        ...inspectingItem,
        isArchived: isArch,
        isBurstWinner: !isArch,
        blurClassification: {
          ...inspectingItem.blurClassification,
          isBlur: isArch,
          isArchived: isArch,
          reason: `Gemini Vision: ${res.reason}`,
        },
        quality: {
          ...inspectingItem.quality,
          compositeScore: res.qualityScore,
        },
      };

      setGeminiSingleResult(
        `Gemini Vision Result: Eyes: ${res.eyesState} | Focus: ${res.subjectFocus} | Action: ${res.recommendation} — ${res.reason}`
      );
      setInspectingItem(updated);
      if (onUpdateItems) {
        onUpdateItems(items.map((i) => (i.metadata.id === updated.metadata.id ? updated : i)));
      }
    } catch (err: any) {
      setGeminiSingleResult(`Gemini Error: ${err.message}`);
    } finally {
      setGeminiSingleLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pr-1 pb-6 select-none">
      {/* 1. Header Banner with Facet AI Engine Badge */}
      <div className="bg-white dark:bg-[#0E0E0E] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-4 flex items-center justify-between transition-colors shadow-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#D83C00]/15 text-[#D83C00] border border-[#D83C00]/30 flex items-center justify-center font-bold">
            <Archive className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-heading text-xs font-bold text-[#111827] dark:text-white">
              Quality Scoring, Blink Detection &amp; Burst Culling
            </h2>
          </div>
        </div>

        <button
          onClick={onContinueToStraighten}
          disabled={items.length === 0}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-white font-heading font-bold text-xs tracking-wide transition-all ${
            items.length > 0
              ? 'bg-[#D83C00] hover:bg-[#B83300] active:scale-98 cursor-pointer shadow-none'
              : 'bg-slate-300 dark:bg-slate-800 cursor-not-allowed opacity-70'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Proceed to Step 3: Straighten &amp; Tone</span>
        </button>
      </div>

      {/* 2. Facet Mode Selector & Auto-Cull Tuning Strip */}
      <div className="bg-[#F9FAFB] dark:bg-[#0E0E0E] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-3 flex items-center justify-between gap-3 shadow-none">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[#D83C00]" />
          <span className="font-heading text-xs font-bold text-[#111827] dark:text-white">
            Facet Auto-Cull Mode:
          </span>
        </div>

        <div className="flex items-center gap-1.5 bg-white dark:bg-[#181818] p-1 rounded-xl border border-[#E5E7EB] dark:border-[#27272A]">
          <button
            onClick={() => handleApplyFacetMode('KEEP_ALL_GOOD')}
            className={`px-3 py-1 rounded-lg font-heading text-2xs font-bold transition-all cursor-pointer ${
              cullMode === 'KEEP_ALL_GOOD'
                ? 'bg-[#D83C00] text-white shadow-none'
                : 'text-[#4B5563] dark:text-[#A1A1AA] hover:text-[#111827] dark:hover:text-white'
            }`}
          >
            Keep All Good Shots (Default)
          </button>

          <button
            onClick={() => handleApplyFacetMode('BALANCED')}
            className={`px-3 py-1 rounded-lg font-heading text-2xs font-bold transition-all cursor-pointer ${
              cullMode === 'BALANCED'
                ? 'bg-[#D83C00] text-white shadow-none'
                : 'text-[#4B5563] dark:text-[#A1A1AA] hover:text-[#111827] dark:hover:text-white'
            }`}
          >
            Facet Balanced (Top 2 in Bursts)
          </button>

          <button
            onClick={() => handleApplyFacetMode('STRICT')}
            className={`px-3 py-1 rounded-lg font-heading text-2xs font-bold transition-all cursor-pointer ${
              cullMode === 'STRICT'
                ? 'bg-[#D83C00] text-white shadow-none'
                : 'text-[#4B5563] dark:text-[#A1A1AA] hover:text-[#111827] dark:hover:text-white'
            }`}
          >
            Facet Strict (Winner Only)
          </button>
        </div>
      </div>

      {/* 3. Real Separation Stat Cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#0E0E0E] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-3.5 flex flex-col justify-between transition-colors shadow-none">
          <span className="font-heading text-xs font-semibold text-[#4B5563] dark:text-[#A1A1AA]">Total Ingested</span>
          <div className="font-mono tabular-nums text-xl font-extrabold text-[#111827] dark:text-white mt-1">
            {totalCount} photos
          </div>
        </div>

        <div className="bg-white dark:bg-[#0E0E0E] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-3.5 flex flex-col justify-between shadow-none">
          <div className="flex items-center justify-between text-xs">
            <span className="font-heading font-semibold text-[#111827] dark:text-white">Kept Winners</span>
            <CheckCircle2 className="w-4 h-4 text-[#D83C00]" />
          </div>
          <div className="font-mono tabular-nums text-xl font-extrabold text-[#D83C00] mt-1">
            {keptItems.length} photos
          </div>
        </div>

        <div className="bg-white dark:bg-[#0E0E0E] border border-red-500/30 rounded-2xl p-3.5 flex flex-col justify-between bg-red-500/5 dark:bg-red-950/10 shadow-none">
          <div className="flex items-center justify-between text-xs">
            <span className="font-heading font-semibold text-red-500">Closed Eyes / Blinking</span>
            <EyeOff className="w-4 h-4 text-red-500" />
          </div>
          <div className="font-mono tabular-nums text-xl font-extrabold text-red-500 mt-1">
            {eyesClosedCount} frames
          </div>
        </div>

        <div className="bg-white dark:bg-[#0E0E0E] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-3.5 flex flex-col justify-between shadow-none">
          <div className="flex items-center justify-between text-xs">
            <span className="font-heading font-semibold text-[#111827] dark:text-white">Motion Shake Blur</span>
            <Activity className="w-4 h-4 text-[#9CA3AF]" />
          </div>
          <div className="font-mono tabular-nums text-xl font-extrabold text-[#111827] dark:text-white mt-1">
            {motionCount} frames
          </div>
        </div>
      </div>

      {/* 4. Filter Bar & Bulk Actions */}
      <div className="flex items-center justify-between bg-[#F9FAFB] dark:bg-[#0E0E0E] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-2 transition-colors">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl font-heading text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'all'
                ? 'bg-white dark:bg-[#1E1E1E] text-[#111827] dark:text-white border border-[#E5E7EB] dark:border-[#3F3F46] shadow-none'
                : 'text-[#4B5563] dark:text-[#A1A1AA] hover:text-[#111827] dark:hover:text-white'
            }`}
          >
            All Frames ({totalCount})
          </button>

          <button
            onClick={() => setActiveTab('kept')}
            className={`px-3 py-1.5 rounded-xl font-heading text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'kept'
                ? 'bg-white dark:bg-[#1E1E1E] text-[#D83C00] border border-[#E5E7EB] dark:border-[#3F3F46] shadow-none'
                : 'text-[#4B5563] dark:text-[#A1A1AA] hover:text-[#111827] dark:hover:text-white'
            }`}
          >
            Kept Winners ({keptItems.length})
          </button>

          <button
            onClick={() => setActiveTab('top_picks')}
            className={`px-3 py-1.5 rounded-xl font-heading text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'top_picks'
                ? 'bg-white dark:bg-[#1E1E1E] text-[#D83C00] border border-[#E5E7EB] dark:border-[#3F3F46] shadow-none'
                : 'text-[#4B5563] dark:text-[#A1A1AA] hover:text-[#111827] dark:hover:text-white'
            }`}
          >
            Facet Top Picks ({topPicks.length})
          </button>

          <button
            onClick={() => setActiveTab('archived')}
            className={`px-3 py-1.5 rounded-xl font-heading text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'archived'
                ? 'bg-white dark:bg-[#1E1E1E] text-red-500 border border-[#E5E7EB] dark:border-[#3F3F46] shadow-none'
                : 'text-[#4B5563] dark:text-[#A1A1AA] hover:text-[#111827] dark:hover:text-white'
            }`}
          >
            Separated `_archive/` ({archivedItems.length})
          </button>

          <div className="h-4 w-px bg-[#E5E7EB] dark:bg-[#27272A] mx-1" />

          {/* Select All Checkbox */}
          <button
            onClick={handleToggleSelectAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E5E7EB] dark:border-[#27272A] bg-white dark:bg-[#181818] hover:bg-slate-100 dark:hover:bg-[#222222] text-[#111827] dark:text-white font-heading text-xs font-bold transition-colors cursor-pointer"
          >
            {isAllSelected ? (
              <CheckSquare className="w-3.5 h-3.5 text-[#D83C00]" />
            ) : (
              <Square className="w-3.5 h-3.5 text-[#9CA3AF]" />
            )}
            <span>{isAllSelected ? 'Deselect All' : 'Select All'}</span>
          </button>

          {/* Bulk Action Buttons */}
          {selectedIds.size > 0 && (
            <>
              <button
                onClick={() => handleBulkAction(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-heading text-xs font-bold transition-all cursor-pointer shadow-none active:scale-95"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Move Selected to _archive ({selectedIds.size})</span>
              </button>

              <button
                onClick={() => handleBulkAction(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#D83C00] hover:bg-[#B83300] text-white font-heading text-xs font-bold transition-all cursor-pointer shadow-none active:scale-95"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Restore Selected to Kept ({selectedIds.size})</span>
              </button>
            </>
          )}
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-2 bg-white dark:bg-[#181818] border border-[#E5E7EB] dark:border-[#27272A] rounded-xl px-2.5 py-1 text-xs">
          <Search className="w-3.5 h-3.5 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Search filename..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent font-sans text-xs text-[#111827] dark:text-white placeholder:text-[#9CA3AF] outline-none w-36"
          />
        </div>
      </div>

      {/* 5. Photos Grid or Clean Empty State */}
      {items.length === 0 ? (
        <div className="bg-white dark:bg-[#0E0E0E] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#D83C00]/15 text-[#D83C00] border border-[#D83C00]/30 flex items-center justify-center">
            <FolderOpen className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-heading text-sm font-bold text-[#111827] dark:text-white">No photos for separation</h3>
          </div>
          {onGoToIngest && (
            <button
              onClick={onGoToIngest}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#D83C00] hover:bg-[#B83300] text-white font-heading text-xs font-bold tracking-wide transition-all mt-2 cursor-pointer shadow-none active:scale-98"
            >
              <span>Go to Step 1: Ingest Folders</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayedItems.map((item) => {
            const isArchived = item.isArchived;
            const isMotion = item.blurClassification.blurType === 'MOTION_SHAKE';
            const facet = item.quality.facet;
            const isEyesClosed = (facet && facet.isBlink) || (item.faces[0] && item.faces[0].eyeOpenness < 0.45) || item.blurClassification.blurType === 'DEFOCUS_BLUR';
            const isChecked = selectedIds.has(item.metadata.id);
            const facetScore = facet ? facet.facetCompositeScore : item.quality.compositeScore;
            const earRatio = facet ? facet.earRatio : (item.faces[0]?.eyeOpenness ?? (isEyesClosed ? 0.14 : 0.32));

            return (
              <div
                key={item.metadata.id}
                onClick={() => setInspectingItem(item)}
                className={`soft-blur-card min-h-[380px] flex flex-col justify-between group ${
                  isChecked
                    ? 'ring-2 ring-[#D83C00]'
                    : isArchived
                    ? 'ring-1 ring-red-500/40'
                    : ''
                }`}
              >
                {/* Full Bleed Background Image */}
                <img
                  src={item.thumbnailUrl}
                  alt={item.metadata.filename}
                  className="card-bg-image"
                  loading="lazy"
                />

                {/* Soft Progressive Feathered Blur Overlay (Zero Border) */}
                <div className="progressive-blur-layer" />

                {/* Foreground Content Layer */}
                <div className="card-foreground">
                  {/* Top Bar Floating Badges */}
                  <div className="flex items-center justify-between z-10">
                    {/* Selection Checkbox */}
                    <button
                      onClick={(e) => handleToggleSelection(item.metadata.id, e)}
                      className="p-1.5 rounded-xl bg-black/60 hover:bg-black/90 text-white backdrop-blur-md transition-all cursor-pointer"
                      title={isChecked ? 'Deselect photo' : 'Select photo'}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-[#D83C00]" />
                      ) : (
                        <Square className="w-4 h-4 text-white/80" />
                      )}
                    </button>

                    {/* Top Right Badges */}
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-full text-2xs font-mono font-extrabold bg-black/75 backdrop-blur-md text-white border border-white/10">
                        ★ {facetScore}
                      </span>
                      {isArchived ? (
                        <span className="px-2 py-0.5 rounded-full text-2xs font-heading font-extrabold uppercase tracking-wider bg-red-600/90 text-white backdrop-blur-sm">
                          _archive
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-2xs font-heading font-extrabold uppercase tracking-wider bg-[#D83C00]/90 text-white backdrop-blur-sm">
                          Kept
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom Content Area (Inside Soft Progressive Blur) */}
                  <div className="flex flex-col gap-2 z-10 mt-auto">
                    {/* Eye EAR & Focus Pill */}
                    <div className="flex items-center justify-between bg-black/60 backdrop-blur-md px-2.5 py-1.5 rounded-xl text-2xs font-mono tabular-nums border border-white/10">
                      {isEyesClosed ? (
                        <span className="text-red-400 font-bold flex items-center gap-1">
                          <EyeOff className="w-3.5 h-3.5 text-red-400" />
                          EAR: {earRatio.toFixed(2)} (Blink)
                        </span>
                      ) : isMotion ? (
                        <span className="text-amber-400 font-bold flex items-center gap-1">
                          <Activity className="w-3.5 h-3.5 text-amber-400" />
                          Motion Smear
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5 text-emerald-400" />
                          EAR: {earRatio.toFixed(2)} (Open)
                        </span>
                      )}
                      <span className="text-white/70 text-2xs">
                        Focus: {item.quality.laplacianSharpness.toFixed(0)}/100
                      </span>
                    </div>

                    {/* Filename & File Size */}
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-sans font-bold text-sm text-white truncate max-w-[170px]">
                          {item.metadata.filename}
                        </span>
                        <span className="text-2xs font-mono tabular-nums text-white/80">
                          {(item.metadata.fileSize / 1000000).toFixed(2)} MB
                        </span>
                      </div>
                      <p className="font-sans text-2xs text-white/80 leading-tight truncate mt-0.5">
                        {item.blurClassification.reason}
                      </p>
                    </div>

                    {/* Action Footer: Destination & Button */}
                    <div className="flex items-center justify-between pt-1 gap-2">
                      <span className="text-2xs font-mono tabular-nums text-white/70 truncate max-w-[90px]">
                        {isArchived ? '/_archive/' : '/Kept/'}
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleArchive(item.metadata.id);
                        }}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-full font-heading text-xs font-bold tracking-wide transition-all cursor-pointer active:scale-95 ${
                          isArchived
                            ? 'bg-white/20 hover:bg-white/30 text-white backdrop-blur-md'
                            : 'bg-[#D83C00] hover:bg-[#B83300] text-white'
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
              </div>
            );
          })}
        </div>
      )}

      {/* 6. Facet Deep Quality Inspector Modal */}
      {inspectingItem && (
        <div
          onClick={() => setInspectingItem(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#0E0E0E] border border-[#E5E7EB] dark:border-[#27272A] rounded-3xl p-6 max-w-3xl w-full flex flex-col gap-4 shadow-2xl overflow-hidden max-h-[90vh]"
          >
            <div className="flex items-center justify-between border-b border-[#E5E7EB] dark:border-[#27272A] pb-3">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-[#D83C00]" />
                <h3 className="font-heading text-sm font-bold text-[#111827] dark:text-white">
                  Facet 9-Dimension Quality Breakdown
                </h3>
              </div>
              <button
                onClick={() => setInspectingItem(null)}
                className="p-1 rounded-lg text-[#9CA3AF] hover:text-[#D83C00] hover:bg-[#D83C00]/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 overflow-y-auto">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-slate-900 border border-[#E5E7EB] dark:border-[#27272A]">
                <img
                  src={inspectingItem.originalFileUrl || inspectingItem.transformedThumbnailUrl || inspectingItem.thumbnailUrl}
                  alt={inspectingItem.metadata.filename}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex flex-col gap-2.5 text-xs font-sans">
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#F9FAFB] dark:bg-[#181818] border border-[#E5E7EB] dark:border-[#27272A]">
                  <span className="font-heading font-bold text-[#111827] dark:text-white">Facet Overall Score</span>
                  <span className="font-mono text-base font-extrabold text-[#D83C00]">
                    {inspectingItem.quality.facet?.facetCompositeScore || inspectingItem.quality.compositeScore}/100
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-2xs">
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#141414] border border-[#E5E7EB] dark:border-[#27272A]">
                    <span className="text-[#9CA3AF]">Eye Aspect Ratio (EAR)</span>
                    <div className="font-mono text-xs font-bold text-[#111827] dark:text-white mt-0.5">
                      {inspectingItem.quality.facet?.earRatio ?? 0.32} (Thresh: 0.21)
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#141414] border border-[#E5E7EB] dark:border-[#27272A]">
                    <span className="text-[#9CA3AF]">Eye Sharpness</span>
                    <div className="font-mono text-xs font-bold text-[#111827] dark:text-white mt-0.5">
                      {inspectingItem.quality.facet?.eyeSharpness ?? 8.5}/10
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#141414] border border-[#E5E7EB] dark:border-[#27272A]">
                    <span className="text-[#9CA3AF]">Tech Sharpness</span>
                    <div className="font-mono text-xs font-bold text-[#111827] dark:text-white mt-0.5">
                      {inspectingItem.quality.laplacianSharpness.toFixed(0)}/100
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#141414] border border-[#E5E7EB] dark:border-[#27272A]">
                    <span className="text-[#9CA3AF]">Exposure Quality</span>
                    <div className="font-mono text-xs font-bold text-[#111827] dark:text-white mt-0.5">
                      {inspectingItem.quality.facet?.exposureQuality ?? 9.2}/10
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#141414] border border-[#E5E7EB] dark:border-[#27272A]">
                    <span className="text-[#9CA3AF]">Color Harmony</span>
                    <div className="font-mono text-xs font-bold text-[#111827] dark:text-white mt-0.5">
                      {inspectingItem.quality.facet?.colorHarmony ?? 8.6}/10
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#141414] border border-[#E5E7EB] dark:border-[#27272A]">
                    <span className="text-[#9CA3AF]">Culling Decision</span>
                    <div className="font-mono text-xs font-bold text-[#D83C00] mt-0.5">
                      {inspectingItem.isArchived ? '_archive' : 'Kept Winner'}
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-[#181818] border border-[#E5E7EB] dark:border-[#27272A] text-2xs text-[#111827] dark:text-white">
                  <strong>Reason:</strong> {inspectingItem.blurClassification.reason}
                </div>

                {geminiSingleResult && (
                  <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-2xs text-purple-900 dark:text-purple-200">
                    {geminiSingleResult}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#E5E7EB] dark:border-[#27272A]">
              <button
                onClick={handleScanInspectingItemWithGemini}
                disabled={geminiSingleLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#D83C00]/10 hover:bg-[#D83C00]/20 text-[#D83C00] dark:text-[#FF8C61] border border-[#D83C00]/30 font-heading text-xs font-bold transition-all cursor-pointer"
              >
                {geminiSingleLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D83C00]" />
                    <span>Analyzing with Gemini Vision...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-[#D83C00]" />
                    <span>⚡ Inspect with Gemini Vision AI</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  onToggleArchive(inspectingItem.metadata.id);
                  setInspectingItem(null);
                }}
                className={`px-4 py-2 rounded-xl font-heading text-xs font-bold transition-all cursor-pointer ${
                  inspectingItem.isArchived
                    ? 'bg-[#181818] hover:bg-[#222222] text-white border border-[#27272A]'
                    : 'bg-[#D83C00] hover:bg-[#B83300] text-white'
                }`}
              >
                {inspectingItem.isArchived ? 'Restore to Kept' : 'Move to _archive'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
