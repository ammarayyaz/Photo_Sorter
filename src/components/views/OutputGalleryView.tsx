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
      <div className="bg-white dark:bg-[#20003A] border border-[#E7E0EE] dark:border-[#4C177D] rounded-2xl p-4 flex items-center justify-between transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FFFDB4]/30 text-[#F94500] border border-[#FFFDB4] flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-heading text-xs font-bold text-[#23003F] dark:text-[#FFFDB4]">
              Final Output &amp; Separation Review
            </h2>
            <p className="font-sans text-xs text-[#5A476E] dark:text-[#BCACCE] mt-0.5">
              All images have been leveled, color-corrected with Lightroom parameters, and separated from sub-optimal blur frames.
            </p>
          </div>
        </div>

        {/* Real ZIP Folder Export Download Action (Rule 7: High-Impact CTA) */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportZip}
            disabled={items.length === 0 || isExporting}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-white font-heading font-bold text-xs tracking-wide transition-all ${
              isExporting
                ? 'bg-[#F94500]/70 cursor-wait'
                : items.length > 0
                ? 'bg-[#F94500] hover:bg-[#D83C00] active:scale-98 cursor-pointer shadow-sm'
                : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed opacity-70'
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
        <div className="w-full bg-[#E7E0EE] dark:bg-[#320857] h-2 rounded-full overflow-hidden">
          <div
            className="bg-[#F94500] h-full rounded-full transition-all duration-200"
            style={{ width: `${exportProgress}%` }}
          />
        </div>
      )}

      {/* 2. Output Tab Switcher: Main Kept vs _archive */}
      <div className="flex items-center justify-between bg-[#FAF8FD] dark:bg-[#20003A] border border-[#E7E0EE] dark:border-[#4C177D] rounded-2xl p-1.5 transition-colors">
        <div className="flex items-center gap-1">
          {/* Main Kept Output Tab */}
          <button
            onClick={() => setOutputTab('main')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-heading text-xs font-bold transition-colors cursor-pointer ${
              outputTab === 'main'
                ? 'bg-white dark:bg-[#2F0850] text-[#23003F] dark:text-[#FFFDB4] border border-[#E7E0EE] dark:border-[#5B228E]'
                : 'text-[#5A476E] dark:text-[#BCACCE] hover:text-[#23003F] dark:hover:text-white'
            }`}
          >
            <FolderCheck className="w-4 h-4 text-[#F94500]" />
            <span>Final Enhanced Output</span>
            <span className="text-2xs px-2 py-0.5 rounded-full font-mono tabular-nums font-bold bg-[#FFFDB4] text-[#23003F]">
              {mainItems.length}
            </span>
          </button>

          {/* Separated _archive Folder Tab */}
          <button
            onClick={() => setOutputTab('archive')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-heading text-xs font-bold transition-colors cursor-pointer ${
              outputTab === 'archive'
                ? 'bg-white dark:bg-[#2F0850] text-[#F94500] border border-[#E7E0EE] dark:border-[#5B228E]'
                : 'text-[#5A476E] dark:text-[#BCACCE] hover:text-[#23003F] dark:hover:text-white'
            }`}
          >
            <Archive className="w-4 h-4 text-[#F94500]" />
            <span>Separated `_archive/` Folder</span>
            <span className="text-2xs px-2 py-0.5 rounded-full font-mono tabular-nums font-bold bg-[#F94500]/15 text-[#F94500]">
              {archiveItems.length}
            </span>
          </button>
        </div>

        <div className="text-2xs font-mono tabular-nums text-[#BCACCE] pr-2">
          Destination: {destinationDirectory}
        </div>
      </div>

      {/* 3. Output Photo Grid with Direct Download Triggers */}
      {items.length === 0 ? (
        <div className="bg-white dark:bg-[#20003A] border border-[#E7E0EE] dark:border-[#4C177D] rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#F94500]/15 text-[#F94500] border border-[#F94500]/30 flex items-center justify-center">
            <FolderOpen className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-heading text-sm font-bold text-[#23003F] dark:text-[#FFFDB4]">No output photos generated yet</h3>
            <p className="font-sans text-xs text-[#5A476E] dark:text-[#BCACCE] mt-1 max-w-sm">
              Please ingest photos in Step 1 and run the pipeline to view and download your organized collections.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3.5">
          {currentList.map((item) => {
            const lr = item.lightroom;
            const isUnder = lr.exposureState === 'UNDER_EXPOSED';
            const isOver = lr.exposureState === 'OVER_EXPOSED';
            const hasDownloaded = downloadedIds.has(item.metadata.id);

            return (
              <div
                key={item.metadata.id}
                className="bg-white dark:bg-[#20003A] border border-[#E7E0EE] dark:border-[#4C177D] hover:border-[#F94500] rounded-2xl p-3.5 flex flex-col justify-between transition-colors"
              >
                {/* Photo Preview with Real-time Lightroom CSS Filter Applied */}
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-950 border border-slate-100 dark:border-[#4C177D]">
                  <img
                    src={item.thumbnailUrl}
                    alt={item.metadata.filename}
                    style={{ filter: lr.cssFilter }}
                    className="w-full h-full object-cover"
                  />

                  {/* Top Badges */}
                  <div className="absolute top-2 left-2 flex items-center gap-1 z-10">
                    {item.isArchived ? (
                      <span className="bg-[#F94500] text-white font-heading font-extrabold text-2xs px-2 py-0.5 rounded-full shadow-sm">
                        _archive
                      </span>
                    ) : (
                      <span className="bg-[#FFFDB4] text-[#23003F] font-heading font-extrabold text-2xs px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                        <Sparkles className="w-2.5 h-2.5 text-[#F94500]" />
                        Enhanced
                      </span>
                    )}
                  </div>

                  {/* 1-Click Single Image Download Button */}
                  <button
                    onClick={() => handleDownloadSingle(item)}
                    className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-black/70 hover:bg-black text-white transition-colors flex items-center gap-1 text-2xs font-bold backdrop-blur-sm cursor-pointer"
                    title="Download this image"
                  >
                    {hasDownloaded ? (
                      <Check className="w-3 h-3 text-[#FFFDB4]" />
                    ) : (
                      <Download className="w-3 h-3" />
                    )}
                  </button>

                  {/* Bottom Stats Overlay */}
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between bg-black/75 backdrop-blur-sm text-white px-2 py-1 rounded-lg text-2xs font-mono tabular-nums z-10">
                    <span className="flex items-center gap-1 text-[#FFFDB4]">
                      <Compass className="w-3 h-3 text-[#F94500]" />
                      {item.geometry.detectedAngleDeg > 0 ? '+' : ''}{item.geometry.detectedAngleDeg}° Leveled
                    </span>
                    <span className="text-[#FFFDB4]">
                      {lr.exposureState.split('_')[0]}
                    </span>
                  </div>
                </div>

                {/* Card Metadata & Lightroom Adjustments Summary */}
                <div className="flex flex-col gap-2 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="font-sans font-bold text-xs text-[#23003F] dark:text-[#FFFDB4] truncate max-w-[170px]">
                      {item.metadata.filename}
                    </span>
                    <span className="text-2xs font-mono tabular-nums text-[#BCACCE]">
                      {(item.metadata.fileSize / 1000000).toFixed(2)} MB
                    </span>
                  </div>

                  {/* Lightroom Parameters Pill */}
                  <div className="bg-[#FAF8FD] dark:bg-[#2A0548] border border-[#E7E0EE] dark:border-[#4C177D] rounded-xl p-2 flex flex-col gap-1 text-2xs font-mono tabular-nums">
                    <div className="flex items-center justify-between text-[#23003F] dark:text-[#FFFDB4]">
                      <span className="font-semibold flex items-center gap-1">
                        <Sliders className="w-3 h-3 text-[#F94500]" />
                        Lightroom Tone
                      </span>
                      <span className={isUnder || isOver ? 'text-[#F94500] font-bold' : 'text-[#BCACCE]'}>
                        {isUnder ? 'Contrast -20 / Shadows +20' : isOver ? 'Highlights -20 / Whites -20' : 'Balanced (0)'}
                      </span>
                    </div>
                  </div>

                  {/* Target File Destination & Download Trigger */}
                  <div className="pt-2 border-t border-[#E7E0EE] dark:border-[#4C177D] flex items-center justify-between text-2xs">
                    <span className="font-mono tabular-nums text-[#BCACCE] truncate max-w-[170px]">
                      {item.targetPath}
                    </span>

                    <button
                      onClick={() => handleDownloadSingle(item)}
                      className="flex items-center gap-1 font-heading text-[#F94500] hover:text-[#D83C00] font-bold cursor-pointer transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download</span>
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
