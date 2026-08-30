import React, { useState } from 'react';
import {
  FolderCheck,
  Archive,
  Download,
  Compass,
  Sparkles,
  CheckCircle2,
  Sliders,
  FolderOpen,
  Check
} from 'lucide-react';
import { ProcessedItem, PipelineMetrics, FaceCluster } from '../../engine/types';
import { downloadSingleImage, downloadOrganizedFolderZip } from '../../engine/downloadHelper';

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
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());

  const mainItems = items.filter((i) => !i.isArchived);
  const archiveItems = items.filter((i) => i.isArchived);

  const currentList = outputTab === 'main' ? mainItems : archiveItems;

  const handleExportZip = async () => {
    if (items.length === 0 || isExporting) return;
    setIsExporting(true);
    setExportProgress(10);

    try {
      await downloadOrganizedFolderZip(items, 'LuminaSort_Organized_Photos', (percent) => {
        setExportProgress(percent);
      });
    } catch {
      // Handled
    } finally {
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
      }, 1000);
    }
  };

  const handleDownloadSingle = async (item: ProcessedItem) => {
    await downloadSingleImage(item);
    setDownloadedIds((prev) => new Set(prev).add(item.metadata.id));
  };

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pr-1 pb-6 select-none">
      {/* 1. Header Banner */}
      <div className="bg-white dark:bg-[#0E0E0E] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-4 flex items-center justify-between transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#D83C00]/15 text-[#D83C00] border border-[#D83C00]/30 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-heading text-xs font-bold text-[#111827] dark:text-white">
              Step 5: Final Output &amp; Separation Review
            </h2>
          </div>
        </div>

        {/* Real ZIP Folder Export Download Action */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportZip}
            disabled={items.length === 0 || isExporting}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-white font-heading font-bold text-xs tracking-wide transition-all ${
              isExporting
                ? 'bg-[#D83C00]/70 cursor-wait'
                : items.length > 0
                ? 'bg-[#D83C00] hover:bg-[#B83300] active:scale-98 cursor-pointer shadow-none'
                : 'bg-slate-300 dark:bg-slate-800 cursor-not-allowed opacity-70'
            }`}
          >
            {isExporting ? (
              <>
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                <span>Downloading ZIP ({exportProgress}%)...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Download Organized ZIP Folder ({items.length})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Progress Bar when packaging ZIP */}
      {isExporting && (
        <div className="w-full bg-[#E5E7EB] dark:bg-[#1E1E1E] h-2 rounded-full overflow-hidden">
          <div
            className="bg-[#D83C00] h-full rounded-full transition-all duration-200"
            style={{ width: `${exportProgress}%` }}
          />
        </div>
      )}

      {/* 2. Output Tab Switcher: Main Kept vs _archive */}
      <div className="flex items-center justify-between bg-[#F9FAFB] dark:bg-[#0E0E0E] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-1.5 transition-colors">
        <div className="flex items-center gap-1">
          {/* Main Kept Output Tab */}
          <button
            onClick={() => setOutputTab('main')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-heading text-xs font-bold transition-colors cursor-pointer ${
              outputTab === 'main'
                ? 'bg-white dark:bg-[#1E1E1E] text-[#111827] dark:text-white border border-[#E5E7EB] dark:border-[#3F3F46]'
                : 'text-[#4B5563] dark:text-[#A1A1AA] hover:text-[#111827] dark:hover:text-white'
            }`}
          >
            <FolderCheck className="w-4 h-4 text-[#D83C00]" />
            <span>Final Enhanced Output</span>
            <span className="text-2xs px-2 py-0.5 rounded-full font-mono tabular-nums font-bold bg-[#D83C00] text-white">
              {mainItems.length}
            </span>
          </button>

          {/* Separated _archive Folder Tab */}
          <button
            onClick={() => setOutputTab('archive')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-heading text-xs font-bold transition-colors cursor-pointer ${
              outputTab === 'archive'
                ? 'bg-white dark:bg-[#1E1E1E] text-red-500 border border-[#E5E7EB] dark:border-[#3F3F46]'
                : 'text-[#4B5563] dark:text-[#A1A1AA] hover:text-[#111827] dark:hover:text-white'
            }`}
          >
            <Archive className="w-4 h-4 text-red-500" />
            <span>Separated `_archive/` Folder</span>
            <span className="text-2xs px-2 py-0.5 rounded-full font-mono tabular-nums font-bold bg-red-500/15 text-red-500">
              {archiveItems.length}
            </span>
          </button>
        </div>

        <div className="text-2xs font-mono tabular-nums text-[#9CA3AF] pr-2">
          Destination: {destinationDirectory}
        </div>
      </div>

      {/* 3. Output Photo Grid with Direct Download Triggers */}
      {items.length === 0 ? (
        <div className="bg-white dark:bg-[#0E0E0E] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#D83C00]/15 text-[#D83C00] border border-[#D83C00]/30 flex items-center justify-center">
            <FolderOpen className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-heading text-sm font-bold text-[#111827] dark:text-white">No output photos</h3>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {currentList.map((item) => {
            const lr = item.lightroom;
            const isUnder = lr.exposureState === 'UNDER_EXPOSED';
            const isOver = lr.exposureState === 'OVER_EXPOSED';
            const hasDownloaded = downloadedIds.has(item.metadata.id);

            return (
              <div
                key={item.metadata.id}
                className="soft-blur-card min-h-[380px] flex flex-col justify-between group"
              >
                {/* Full Bleed Background Image with Lightroom CSS Filter */}
                <img
                  src={item.thumbnailUrl}
                  alt={item.metadata.filename}
                  style={{ filter: lr.cssFilter || 'none' }}
                  className="card-bg-image"
                  loading="lazy"
                />

                {/* Soft Progressive Feathered Blur Overlay (Zero Border) */}
                <div className="progressive-blur-layer" />

                {/* Foreground Content Layer */}
                <div className="card-foreground">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between z-10">
                    {item.isArchived ? (
                      <span className="bg-red-600/90 text-white font-heading font-extrabold text-2xs px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                        _archive
                      </span>
                    ) : (
                      <span className="bg-[#D83C00]/90 text-white font-heading font-extrabold text-2xs px-2.5 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-sm">
                        <Sparkles className="w-3 h-3 text-white" />
                        Enhanced
                      </span>
                    )}

                    {/* 1-Click Single Image Download Button */}
                    <button
                      onClick={() => handleDownloadSingle(item)}
                      className="p-1.5 rounded-xl bg-black/60 hover:bg-black/90 text-white backdrop-blur-md transition-all flex items-center gap-1 text-2xs font-bold cursor-pointer"
                      title="Download this image"
                    >
                      {hasDownloaded ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Bottom Content Area (Inside Soft Progressive Blur) */}
                  <div className="flex flex-col gap-2 z-10 mt-auto">
                    {/* Leveling & Exposure Stat Pill */}
                    <div className="flex items-center justify-between bg-black/60 backdrop-blur-md px-2.5 py-1.5 rounded-xl text-2xs font-mono tabular-nums border border-white/10">
                      <span className="flex items-center gap-1 text-white">
                        <Compass className="w-3 h-3 text-[#D83C00]" />
                        {item.geometry.correctedAngleDeg !== 0
                          ? `${item.geometry.correctedAngleDeg > 0 ? '+' : ''}${item.geometry.correctedAngleDeg.toFixed(1)}° Straightened`
                          : 'Level 0.0°'}
                      </span>
                      <span className="text-white font-bold">
                        {lr.exposureState.split('_')[0]}
                      </span>
                    </div>

                    {/* Filename & File Size */}
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-sans font-bold text-sm text-white truncate max-w-[180px]">
                          {item.metadata.filename}
                        </span>
                        <span className="text-2xs font-mono tabular-nums text-white/80">
                          {(item.metadata.fileSize / 1000000).toFixed(2)} MB
                        </span>
                      </div>

                      {/* Lightroom Tone Pill */}
                      <div className="mt-1 flex items-center justify-between bg-black/50 backdrop-blur-md border border-white/10 rounded-xl px-2.5 py-1 text-2xs font-mono tabular-nums text-white">
                        <span className="flex items-center gap-1 text-white/90">
                          <Sliders className="w-3 h-3 text-[#D83C00]" />
                          Lightroom Tone
                        </span>
                        <span className={isUnder || isOver ? 'text-[#D83C00] font-bold' : 'text-white/70'}>
                          {isUnder ? 'Contrast -20 / Shadows +20' : isOver ? 'Highlights -20 / Whites -20' : 'Balanced (0)'}
                        </span>
                      </div>
                    </div>

                    {/* Action Footer: Destination & Download */}
                    <div className="flex items-center justify-between pt-1 text-2xs">
                      <span className="font-mono tabular-nums text-white/70 truncate max-w-[160px]">
                        {item.targetPath}
                      </span>

                      <button
                        onClick={() => handleDownloadSingle(item)}
                        className="flex items-center gap-1 font-heading text-white hover:text-[#D83C00] font-bold cursor-pointer transition-colors"
                      >
                        <Download className="w-3.5 h-3.5 text-[#D83C00]" />
                        <span>Download</span>
                      </button>
                    </div>
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
