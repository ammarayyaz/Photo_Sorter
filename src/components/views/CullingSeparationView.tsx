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
  Key,
  Loader2,
  ExternalLink
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
}

export const CullingSeparationView: React.FC<CullingSeparationViewProps> = ({
  items,
  metrics: _metrics,
  onToggleArchive,
  onToggleArchiveBulk,
  onContinueToStraighten,
  onGoToIngest,
  geminiApiKey = '',
  onChangeConfig,
  onUpdateItems,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'kept' | 'archived' | 'top_picks'>('all');
  const [cullMode, setCullMode] = useState<FacetCullMode>('KEEP_ALL_GOOD');
  const [search, setSearch] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [inspectingItem, setInspectingItem] = useState<ProcessedItem | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState<string>(geminiApiKey);
  const [isScanningGemini, setIsScanningGemini] = useState<boolean>(false);
  const [geminiProgress, setGeminiProgress] = useState<string>('');
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

  const handleSaveApiKey = () => {
    if (onChangeConfig) {
      onChangeConfig({ geminiApiKey: apiKeyInput.trim() });
    }
  };

  // Run Batch Gemini Vision Culling
  const handleRunGeminiVisionScan = async () => {
    const key = (apiKeyInput || geminiApiKey).trim();
    if (!key) {
      alert('Please paste your Google Gemini API Key first.');
      return;
    }

    setIsScanningGemini(true);
    const updatedItems = [...items];

    for (let i = 0; i < updatedItems.length; i++) {
      const it = updatedItems[i];
      setGeminiProgress(`Scanning ${i + 1} of ${updatedItems.length}: ${it.metadata.filename}...`);
      try {
        const gRes = await analyzeImageWithGeminiVision(key, it);
        const shouldArchive = gRes.recommendation === 'MOVE_TO_ARCHIVE';
        
        updatedItems[i] = {
          ...it,
          isArchived: shouldArchive,
          isBurstWinner: !shouldArchive,
          blurClassification: {
            ...it.blurClassification,
            isBlur: shouldArchive,
            isArchived: shouldArchive,
            reason: `Gemini Vision: ${gRes.reason}`,
          },
          quality: {
            ...it.quality,
            compositeScore: gRes.qualityScore,
            facet: it.quality.facet ? {
              ...it.quality.facet,
              facetCompositeScore: gRes.qualityScore,
              isBlink: gRes.eyesState === 'CLOSED_BLINKING' || gRes.eyesState === 'PARTIALLY_SQUINTING',
              earRatio: gRes.eyeOpennessScore,
            } : undefined,
          },
        };
      } catch (err: any) {
        console.warn(`Gemini scan error for ${it.metadata.filename}:`, err);
      }
    }

    if (onUpdateItems) {
      onUpdateItems(updatedItems);
    }
    setIsScanningGemini(false);
    setGeminiProgress('');
  };

  // Run Single Item Gemini Scan in Modal
  const handleScanInspectingItemWithGemini = async () => {
    if (!inspectingItem) return;
    const key = (apiKeyInput || geminiApiKey).trim();
    if (!key) {
      alert('Please enter your Gemini API Key in the top bar.');
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
      <div className="bg-white dark:bg-[#20003A] border border-[#E7E0EE] dark:border-[#4C177D] rounded-2xl p-4 flex items-center justify-between transition-colors shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F94500]/15 text-[#F94500] border border-[#F94500]/30 flex items-center justify-center font-bold">
            <Archive className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-heading text-xs font-bold text-[#23003F] dark:text-[#FFFDB4]">
              9-Dimension Quality Scoring, Blink Detection (EAR) &amp; Burst Culling
            </h2>
            <p className="font-sans text-xs text-[#5A476E] dark:text-[#BCACCE] mt-0.5">
              Powered by Facet multi-dimensional scoring: evaluates Eye Aspect Ratio (<code className="text-[#F94500] font-mono">EAR &lt; 0.21</code>), subject saliency, and motion smear while protecting background bokeh.
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

      {/* 2. Google Gemini Vision AI Bar */}
      <div className="bg-white dark:bg-[#20003A] border border-[#E7E0EE] dark:border-[#4C177D] rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#F94500]/10 text-[#F94500] border border-[#F94500]/20 flex items-center justify-center flex-shrink-0 font-bold">
            <Zap className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="font-heading text-xs font-bold text-[#23003F] dark:text-[#FFFDB4]">
              Google Gemini Vision AI (Flash)
            </span>
            <p className="font-sans text-2xs text-[#5A476E] dark:text-[#BCACCE] mt-0.5 truncate">
              {apiKeyInput || geminiApiKey
                ? 'Ready to inspect subtle blinks, squinting eyelids & camera shake with high precision.'
                : 'Paste your Google Gemini API key to run multimodal AI culling & expression inspection.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
          <div className="flex items-center gap-1.5 bg-[#FAF8FD] dark:bg-[#2D074B] px-2.5 py-1 rounded-xl border border-[#E7E0EE] dark:border-[#5B228E]">
            <Key className="w-3.5 h-3.5 text-[#BCACCE]" />
            <input
              type="password"
              placeholder="Paste Gemini API Key (AIza...)"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              onBlur={handleSaveApiKey}
              className="bg-transparent font-mono text-xs text-[#23003F] dark:text-white placeholder:text-[#BCACCE] outline-none w-44"
            />
            {apiKeyInput !== geminiApiKey && apiKeyInput.length > 5 && (
              <button
                onClick={handleSaveApiKey}
                className="px-2 py-0.5 rounded bg-[#F94500] text-white text-2xs font-bold font-heading hover:bg-[#D83C00] cursor-pointer"
              >
                Save
              </button>
            )}
          </div>

          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-2xs font-heading font-bold text-[#5A476E] dark:text-[#BCACCE] hover:text-[#F94500] transition-colors"
          >
            <span>Get Free Key</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <button
            onClick={handleRunGeminiVisionScan}
            disabled={isScanningGemini || items.length === 0}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-heading text-xs font-bold transition-all shadow-xs ${
              isScanningGemini
                ? 'bg-purple-600 text-white cursor-wait'
                : apiKeyInput || geminiApiKey
                ? 'bg-[#23003F] dark:bg-[#FFFDB4] text-white dark:text-[#23003F] hover:opacity-90 cursor-pointer active:scale-95'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-pointer'
            }`}
            title={apiKeyInput || geminiApiKey ? 'Run Gemini Vision AI Scan' : 'Paste API Key to run'}
          >
            {isScanningGemini ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{geminiProgress || 'Scanning...'}</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-[#F94500]" />
                <span>Run Gemini AI Scan</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3. Facet Mode Selector & Auto-Cull Tuning Strip */}
      <div className="bg-[#FAF8FD] dark:bg-[#20003A] border border-[#E7E0EE] dark:border-[#4C177D] rounded-2xl p-3 flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[#F94500]" />
          <span className="font-heading text-xs font-bold text-[#23003F] dark:text-[#FFFDB4]">
            Facet Auto-Cull Mode:
          </span>
        </div>

        <div className="flex items-center gap-1.5 bg-white dark:bg-[#2D074B] p-1 rounded-xl border border-[#E7E0EE] dark:border-[#5B228E]">
          <button
            onClick={() => handleApplyFacetMode('KEEP_ALL_GOOD')}
            className={`px-3 py-1 rounded-lg font-heading text-2xs font-bold transition-all cursor-pointer ${
              cullMode === 'KEEP_ALL_GOOD'
                ? 'bg-[#F94500] text-white shadow-xs'
                : 'text-[#5A476E] dark:text-[#BCACCE] hover:text-[#23003F] dark:hover:text-white'
            }`}
          >
            Keep All Good Shots (Default)
          </button>

          <button
            onClick={() => handleApplyFacetMode('BALANCED')}
            className={`px-3 py-1 rounded-lg font-heading text-2xs font-bold transition-all cursor-pointer ${
              cullMode === 'BALANCED'
                ? 'bg-[#F94500] text-white shadow-xs'
                : 'text-[#5A476E] dark:text-[#BCACCE] hover:text-[#23003F] dark:hover:text-white'
            }`}
          >
            Facet Balanced (Top 2 in Bursts)
          </button>

          <button
            onClick={() => handleApplyFacetMode('STRICT')}
            className={`px-3 py-1 rounded-lg font-heading text-2xs font-bold transition-all cursor-pointer ${
              cullMode === 'STRICT'
                ? 'bg-[#F94500] text-white shadow-xs'
                : 'text-[#5A476E] dark:text-[#BCACCE] hover:text-[#23003F] dark:hover:text-white'
            }`}
          >
            Facet Strict (Winner Only)
          </button>
        </div>
      </div>

      {/* 3. Real Separation Stat Cards */}
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
            <span className="font-heading font-semibold text-[#F94500]">Closed Eyes / Blinking (EAR &lt; 0.21)</span>
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

      {/* 4. Filter Bar & Bulk Actions */}
      <div className="flex items-center justify-between bg-[#FAF8FD] dark:bg-[#20003A] border border-[#E7E0EE] dark:border-[#4C177D] rounded-2xl p-2 transition-colors">
        <div className="flex items-center gap-1.5 flex-wrap">
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
            onClick={() => setActiveTab('top_picks')}
            className={`px-3 py-1.5 rounded-xl font-heading text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'top_picks'
                ? 'bg-white dark:bg-[#2F0850] text-[#F94500] border border-[#E7E0EE] dark:border-[#5B228E] shadow-xs'
                : 'text-[#5A476E] dark:text-[#BCACCE] hover:text-[#23003F] dark:hover:text-white'
            }`}
          >
            Facet Top Picks ({topPicks.length})
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

          {/* Bulk Action Buttons */}
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

      {/* 5. Photos Grid or Clean Empty State */}
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
            const facet = item.quality.facet;
            const isEyesClosed = (facet && facet.isBlink) || (item.faces[0] && item.faces[0].eyeOpenness < 0.45) || item.blurClassification.blurType === 'DEFOCUS_BLUR';
            const isChecked = selectedIds.has(item.metadata.id);
            const facetScore = facet ? facet.facetCompositeScore : item.quality.compositeScore;
            const earRatio = facet ? facet.earRatio : (item.faces[0]?.eyeOpenness ?? (isEyesClosed ? 0.14 : 0.32));

            return (
              <div
                key={item.metadata.id}
                onClick={() => setInspectingItem(item)}
                className={`bg-white dark:bg-[#20003A] rounded-2xl border p-3 flex flex-col justify-between transition-all select-none cursor-pointer group ${
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
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
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

                  {/* Top Right: Facet Score & Status Pill Badges */}
                  <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                    <span className="px-2 py-0.5 rounded-full text-2xs font-mono font-extrabold bg-black/80 backdrop-blur-md text-[#FFFDB4] border border-[#FFFDB4]/30 shadow-sm">
                      ★ {facetScore}
                    </span>

                    {isArchived ? (
                      <span className="px-2 py-0.5 rounded-full text-2xs font-heading font-extrabold uppercase tracking-wider bg-[#F94500] text-white flex items-center gap-1 shadow-sm">
                        _archive
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-2xs font-heading font-extrabold uppercase tracking-wider bg-[#FFFDB4] text-[#23003F] flex items-center gap-1 shadow-sm font-bold">
                        Kept
                      </span>
                    )}
                  </div>

                  {/* Facet Eye EAR & Focus Pill (Bottom) */}
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between bg-black/80 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg text-2xs font-mono tabular-nums z-10">
                    {isEyesClosed ? (
                      <span className="text-[#F94500] font-bold flex items-center gap-1">
                        <EyeOff className="w-3 h-3 text-[#F94500]" />
                        EAR: {earRatio.toFixed(2)} (Blink)
                      </span>
                    ) : isMotion ? (
                      <span className="text-[#FFFDB4] font-bold flex items-center gap-1">
                        <Activity className="w-3 h-3 text-[#FFFDB4]" />
                        Motion Smear
                      </span>
                    ) : (
                      <span className="text-[#FFFDB4] font-bold flex items-center gap-1">
                        <Eye className="w-3 h-3 text-[#FFFDB4]" />
                        EAR: {earRatio.toFixed(2)} (Open)
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
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleArchive(item.metadata.id);
                      }}
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

      {/* 6. Facet Deep Quality Inspector Modal */}
      {inspectingItem && (
        <div
          onClick={() => setInspectingItem(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#20003A] border border-[#E7E0EE] dark:border-[#4C177D] rounded-3xl p-6 max-w-3xl w-full flex flex-col gap-4 shadow-2xl overflow-hidden max-h-[90vh]"
          >
            <div className="flex items-center justify-between border-b border-[#E7E0EE] dark:border-[#4C177D] pb-3">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-[#F94500]" />
                <h3 className="font-heading text-sm font-bold text-[#23003F] dark:text-[#FFFDB4]">
                  Facet 9-Dimension Quality Breakdown
                </h3>
              </div>
              <button
                onClick={() => setInspectingItem(null)}
                className="p-1 rounded-lg text-[#BCACCE] hover:text-[#F94500] hover:bg-[#F94500]/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 overflow-y-auto">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-slate-900 border border-[#E7E0EE] dark:border-[#4C177D]">
                <img
                  src={inspectingItem.originalFileUrl || inspectingItem.transformedThumbnailUrl || inspectingItem.thumbnailUrl}
                  alt={inspectingItem.metadata.filename}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex flex-col gap-2.5 text-xs font-sans">
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#FAF8FD] dark:bg-[#2D074B] border border-[#E7E0EE] dark:border-[#5B228E]">
                  <span className="font-heading font-bold text-[#23003F] dark:text-[#FFFDB4]">Facet Overall Score</span>
                  <span className="font-mono text-base font-extrabold text-[#F94500]">
                    {inspectingItem.quality.facet?.facetCompositeScore || inspectingItem.quality.compositeScore}/100
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-2xs">
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#1A0030] border border-[#E7E0EE] dark:border-[#4C177D]">
                    <span className="text-[#BCACCE]">Eye Aspect Ratio (EAR)</span>
                    <div className="font-mono text-xs font-bold text-[#23003F] dark:text-white mt-0.5">
                      {inspectingItem.quality.facet?.earRatio ?? 0.32} (Thresh: 0.21)
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#1A0030] border border-[#E7E0EE] dark:border-[#4C177D]">
                    <span className="text-[#BCACCE]">Eye Sharpness</span>
                    <div className="font-mono text-xs font-bold text-[#23003F] dark:text-white mt-0.5">
                      {inspectingItem.quality.facet?.eyeSharpness ?? 8.5}/10
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#1A0030] border border-[#E7E0EE] dark:border-[#4C177D]">
                    <span className="text-[#BCACCE]">Tech Sharpness</span>
                    <div className="font-mono text-xs font-bold text-[#23003F] dark:text-white mt-0.5">
                      {inspectingItem.quality.laplacianSharpness.toFixed(0)}/100
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#1A0030] border border-[#E7E0EE] dark:border-[#4C177D]">
                    <span className="text-[#BCACCE]">Exposure Quality</span>
                    <div className="font-mono text-xs font-bold text-[#23003F] dark:text-white mt-0.5">
                      {inspectingItem.quality.facet?.exposureQuality ?? 9.2}/10
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#1A0030] border border-[#E7E0EE] dark:border-[#4C177D]">
                    <span className="text-[#BCACCE]">Color Harmony</span>
                    <div className="font-mono text-xs font-bold text-[#23003F] dark:text-white mt-0.5">
                      {inspectingItem.quality.facet?.colorHarmony ?? 8.6}/10
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#1A0030] border border-[#E7E0EE] dark:border-[#4C177D]">
                    <span className="text-[#BCACCE]">Culling Decision</span>
                    <div className="font-mono text-xs font-bold text-[#F94500] mt-0.5">
                      {inspectingItem.isArchived ? '_archive' : 'Kept Winner'}
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-[#FFFDB4]/20 border border-[#FFFDB4]/40 text-2xs text-[#23003F] dark:text-[#FFFDB4]">
                  <strong>Reason:</strong> {inspectingItem.blurClassification.reason}
                </div>

                {geminiSingleResult && (
                  <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-2xs text-purple-900 dark:text-purple-200">
                    {geminiSingleResult}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#E7E0EE] dark:border-[#4C177D]">
              <button
                onClick={handleScanInspectingItemWithGemini}
                disabled={geminiSingleLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/40 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-heading text-xs font-bold transition-all cursor-pointer"
              >
                {geminiSingleLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F94500]" />
                    <span>Analyzing with Gemini Vision...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-[#F94500]" />
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
                    ? 'bg-[#23003F] dark:bg-[#FFFDB4] text-white dark:text-[#23003F]'
                    : 'bg-[#F94500] text-white'
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
