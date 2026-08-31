import React, { useState } from 'react';
import {
  FolderCheck,
  Archive,
  Download,
  CheckCircle2,
  FolderOpen,
  Sparkles,
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
          <div className="w-10 h-10 rounded-xl bg-[#4D694E]/15 text-[#4D694E] border border-[#4D694E]/30 flex items-center justify-center font-bold">
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
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-heading font-bold text-xs tracking-wide transition-all ${
              isExporting
                ? 'bg-[#4D694E]/70 text-[#FFF3D5] cursor-wait'
                : items.length > 0
                ? 'bg-[#4D694E] hover:bg-[#3C533D] text-[#FFF3D5] active:scale-98 cursor-pointer shadow-none'
                : 'bg-slate-300 dark:bg-slate-800 text-white cursor-not-allowed opacity-70'
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
            className="bg-[#4D694E] h-full rounded-full transition-all duration-200"
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
            <FolderCheck className="w-4 h-4 text-[#4D694E]" />
            <span>Final Enhanced Output</span>
            <span className="text-2xs px-2 py-0.5 rounded-full font-mono tabular-nums font-bold bg-[#4D694E] text-[#FFF3D5]">
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
          <div className="w-12 h-12 rounded-2xl bg-[#4D694E]/15 text-[#4D694E] border border-[#4D694E]/30 flex items-center justify-center">
            <FolderOpen className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-heading text-sm font-bold text-[#111827] dark:text-white">No output photos</h3>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-0 border-t border-l border-[#E5E7EB] dark:border-[#27272A] rounded-2xl overflow-hidden">
          {currentList.map((item) => {
            const lr = item.lightroom;
            const hasDownloaded = downloadedIds.has(item.metadata.id);

            return (
              <div
                key={item.metadata.id}
                className="bg-white dark:bg-[#111111] border-r border-b border-[#E5E7EB] dark:border-[#27272A] rounded-none overflow-hidden flex flex-col justify-between"
              >
                {/* 1. Unobscured Clean Photo */}
                <div className="relative aspect-[4/3] w-full bg-slate-100 dark:bg-[#000000] overflow-hidden">
                  <img
                    src={item.transformedThumbnailUrl || item.thumbnailUrl}
                    alt={item.metadata.filename}
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.src !== item.thumbnailUrl && item.thumbnailUrl) {
                        target.src = item.thumbnailUrl;
                      }
                    }}
                    style={{ filter: lr.cssFilter || 'none' }}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />

                  {/* Top Right Actions */}
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                    {item.isArchived && (
                      <span className="bg-red-600 text-white font-heading font-extrabold text-2xs px-2.5 py-0.5 rounded-md">
                        _archive
                      </span>
                    )}

                    <button
                      onClick={() => handleDownloadSingle(item)}
                      className="p-1.5 rounded-lg bg-black/80 hover:bg-[#4D694E] text-white hover:text-[#FFF3D5] transition-colors flex items-center gap-1 text-2xs font-bold cursor-pointer"
                      title="Download this image"
                    >
                      {hasDownloaded ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* 2. Minimal Footer Below Photo */}
                <div className="p-3.5 flex flex-col gap-2 bg-white dark:bg-[#111111]">
                  {/* Filename & File Size */}
                  <div className="flex items-center justify-between">
                    <span className="font-heading font-bold text-xs text-[#111827] dark:text-white truncate max-w-[180px]" title={item.metadata.filename}>
                      {item.metadata.filename}
                    </span>
                    <span className="text-2xs font-mono font-medium text-[#4B5563] dark:text-[#A1A1AA] tabular-nums">
                      {(item.metadata.fileSize / 1000000).toFixed(2)} MB
                    </span>
                  </div>

                  {/* Destination Path & Download Link */}
                  <div className="flex items-center justify-between pt-1 border-t border-[#E5E7EB] dark:border-[#222222] text-2xs">
                    <span className="font-mono tabular-nums text-[#9CA3AF] truncate max-w-[160px]" title={item.targetPath}>
                      {item.targetPath}
                    </span>
                    <button
                      onClick={() => handleDownloadSingle(item)}
                      className="flex items-center gap-1 text-[#4D694E] hover:text-[#3C533D] font-heading font-bold cursor-pointer transition-colors flex-shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
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
