import React from 'react';
import {
  ChevronRight,
  MoreVertical,
  Pin,
  Activity,
  Tag,
  Camera,
  Compass,
  ScanEye,
  Folder
} from 'lucide-react';
import { ProcessedItem, PipelineMetrics, FaceCluster } from '../../engine/types';

interface RightInfoPanelProps {
  activeItem: ProcessedItem | null;
  metrics: PipelineMetrics;
  faceClusters: FaceCluster[];
  items?: ProcessedItem[];
}

export const RightInfoPanel: React.FC<RightInfoPanelProps> = ({
  activeItem,
  metrics,
  faceClusters,
  items = [],
}) => {
  // Real storage calculation from actual user ingested items
  const realTotalBytes = items.reduce((sum, item) => sum + item.metadata.fileSize, 0);
  const totalRawMb = (realTotalBytes / 1000000).toFixed(1);
  const totalRawGb = (realTotalBytes / 1000000000).toFixed(2);

  const enhancedItems = items.filter((i) => !i.isArchived);
  const enhancedBytes = enhancedItems.reduce((sum, item) => sum + item.metadata.fileSize, 0);
  const totalEnhancedMb = (enhancedBytes / 1000000).toFixed(1);

  return (
    <aside className="w-[280px] h-full flex flex-col bg-white dark:bg-[#1A0030] border-l border-[#E7E0EE] dark:border-[#4C177D] select-none flex-shrink-0 text-xs overflow-y-auto transition-colors duration-200">
      {/* 1. Header with Collapse / More Menu */}
      <div className="p-4 pb-3 border-b border-[#E7E0EE] dark:border-[#4C177D] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-heading font-extrabold text-xs text-[#23003F] dark:text-[#FFFDB4] tracking-tight">
            Info Inspector
          </span>
          <ChevronRight className="w-4 h-4 text-[#BCACCE] cursor-pointer hover:text-[#F94500] transition-colors" />
        </div>
        <button className="text-[#BCACCE] hover:text-[#F94500] transition-colors">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* 2. Real Storage Gauges (Rule 2 & 3: Clear Hierarchy & High Contrast) */}
        <div className="flex flex-col gap-3">
          {/* Storage Meter 1: RAW Ingested */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-heading font-semibold text-[#23003F] dark:text-[#BCACCE]">RAW Ingested</span>
              <span className="text-2xs font-mono tabular-nums text-[#BCACCE]">
                {items.length > 0 ? items.length : metrics.totalScanned} files
              </span>
            </div>
            <div className="font-mono tabular-nums text-base font-extrabold text-[#23003F] dark:text-[#FFFDB4]">
              {realTotalBytes > 1000000000 ? `${totalRawGb} GB` : `${totalRawMb} MB`}
            </div>
            <div className="w-full bg-[#E7E0EE] dark:bg-[#320857] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#F94500] h-full rounded-full transition-all duration-300"
                style={{
                  width: `${items.length > 0 ? 100 : 0}%`,
                }}
              />
            </div>
          </div>

          {/* Storage Meter 2: Enhanced Images */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-heading font-semibold text-[#23003F] dark:text-[#BCACCE]">Enhanced Images</span>
              <span className="text-2xs font-mono tabular-nums text-[#BCACCE]">
                {enhancedItems.length} files
              </span>
            </div>
            <div className="font-mono tabular-nums text-base font-extrabold text-[#23003F] dark:text-[#FFFDB4]">
              {totalEnhancedMb} MB
            </div>
            <div className="w-full bg-[#E7E0EE] dark:bg-[#320857] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#FFFDB4] h-full rounded-full transition-all duration-300"
                style={{
                  width: `${items.length > 0 ? Math.round((enhancedItems.length / items.length) * 100) : 0}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* 3. Real Properties Section */}
        <div className="flex flex-col gap-2 pt-3 border-t border-[#E7E0EE] dark:border-[#4C177D]">
          <div className="flex items-center justify-between">
            <span className="font-heading text-xs font-extrabold text-[#23003F] dark:text-[#FFFDB4]">Properties</span>
            {activeItem ? (
              <span className="text-2xs font-mono tabular-nums text-[#F94500] font-semibold truncate max-w-[130px]">
                {activeItem.metadata.filename}
              </span>
            ) : (
              <span className="text-2xs font-mono tabular-nums text-[#BCACCE]">
                No item selected
              </span>
            )}
          </div>

          {activeItem ? (
            <div className="flex flex-col gap-1.5 text-xs">
              <div className="flex justify-between py-1 border-b border-[#E7E0EE]/50 dark:border-[#4C177D]/50">
                <span className="font-sans text-[#BCACCE]">Size</span>
                <span className="font-mono tabular-nums text-[#23003F] dark:text-white font-semibold">
                  {(activeItem.metadata.fileSize / 1000000).toFixed(2)} MB
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-[#E7E0EE]/50 dark:border-[#4C177D]/50">
                <span className="font-sans text-[#BCACCE]">Created</span>
                <span className="font-mono tabular-nums text-[#23003F] dark:text-white">
                  {new Date(activeItem.metadata.timestamp).toLocaleDateString()}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-[#E7E0EE]/50 dark:border-[#4C177D]/50">
                <span className="font-sans text-[#BCACCE]">Dimensions</span>
                <span className="font-mono tabular-nums text-[#23003F] dark:text-white">
                  {activeItem.metadata.dimensions.width} × {activeItem.metadata.dimensions.height}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-[#E7E0EE]/50 dark:border-[#4C177D]/50">
                <span className="font-sans text-[#BCACCE] flex items-center gap-1">
                  <Camera className="w-3 h-3 text-[#BCACCE]" />
                  Camera
                </span>
                <span className="font-mono tabular-nums text-[#23003F] dark:text-white truncate max-w-[130px]">
                  {activeItem.metadata.cameraModel}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-[#E7E0EE]/50 dark:border-[#4C177D]/50">
                <span className="font-sans text-[#BCACCE] flex items-center gap-1">
                  <Compass className="w-3 h-3 text-[#F94500]" />
                  Tilt Angle
                </span>
                <span className="font-mono tabular-nums text-[#F94500] font-bold">
                  {activeItem.geometry.detectedAngleDeg > 0 ? '+' : ''}
                  {activeItem.geometry.detectedAngleDeg}°
                </span>
              </div>

              <div className="flex justify-between py-1">
                <span className="font-sans text-[#BCACCE] flex items-center gap-1">
                  <ScanEye className="w-3 h-3 text-[#FFFDB4]" />
                  Focus Sharpness
                </span>
                <span className="font-mono tabular-nums text-[#23003F] dark:text-[#FFFDB4] font-bold">
                  {activeItem.quality.laplacianSharpness.toFixed(1)} / 100
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-[#FAF8FD] dark:bg-[#23003F] border border-[#E7E0EE] dark:border-[#4C177D] rounded-xl p-3 text-center flex flex-col items-center gap-1 my-1">
              <Folder className="w-4 h-4 text-[#BCACCE]" />
              <p className="font-sans text-xs text-[#BCACCE]">
                Click any folder or image to view its real properties.
              </p>
            </div>
          )}
        </div>

        {/* 4. Real Tags Section */}
        <div className="flex flex-col gap-2 pt-3 border-t border-[#E7E0EE] dark:border-[#4C177D]">
          <div className="flex items-center justify-between">
            <span className="font-heading text-xs font-extrabold text-[#23003F] dark:text-[#FFFDB4]">Tags</span>
            <Tag className="w-3 h-3 text-[#BCACCE]" />
          </div>

          {activeItem ? (
            <div className="flex flex-wrap gap-1.5">
              {activeItem.occasion.occasion && (
                <span className="px-2 py-0.5 rounded-full bg-[#FFFDB4]/40 dark:bg-[#FFFDB4]/20 text-[#23003F] dark:text-[#FFFDB4] border border-[#FFFDB4] font-heading text-2xs font-bold">
                  • {activeItem.occasion.occasion}
                </span>
              )}
              {activeItem.isBurstWinner && (
                <span className="px-2 py-0.5 rounded-full bg-[#BCACCE]/30 dark:bg-[#BCACCE]/20 text-[#23003F] dark:text-[#FFFDB4] border border-[#BCACCE] font-heading text-2xs font-bold">
                  • Kept Winner
                </span>
              )}
              {activeItem.isArchived && (
                <span className="px-2 py-0.5 rounded-full bg-[#F94500]/20 text-[#F94500] border border-[#F94500]/40 font-heading text-2xs font-bold">
                  • _archive
                </span>
              )}
              <span className="px-2 py-0.5 rounded-full bg-[#BCACCE]/30 text-[#23003F] dark:text-white border border-[#BCACCE]/50 font-heading text-2xs font-bold">
                • {activeItem.lightroom.exposureState.replace('_', ' ')}
              </span>
              {faceClusters.slice(0, 2).map((c) => (
                <span
                  key={c.clusterId}
                  className="px-2 py-0.5 rounded-full bg-[#FFFDB4]/30 text-[#23003F] dark:text-[#FFFDB4] border border-[#FFFDB4] font-heading text-2xs font-bold"
                >
                  • {c.name || `Person ${c.clusterId}`}
                </span>
              ))}
            </div>
          ) : (
            <p className="font-sans text-xs text-[#BCACCE] italic">
              No active tags
            </p>
          )}
        </div>

        {/* 5. Real Pinned Items & Activity Footer */}
        <div className="flex flex-col gap-2 pt-3 border-t border-[#E7E0EE] dark:border-[#4C177D] mt-auto">
          <div className="flex items-center justify-between text-[#BCACCE] text-xs py-1">
            <span className="flex items-center gap-1.5 font-sans">
              <Pin className="w-3.5 h-3.5" />
              <span>Bursts Identified</span>
            </span>
            <span className="font-mono tabular-nums font-bold text-[#23003F] dark:text-white">
              {metrics.burstGroupsIdentified}
            </span>
          </div>

          <div className="flex items-center justify-between text-[#BCACCE] text-xs py-1">
            <span className="flex items-center gap-1.5 font-sans">
              <Activity className="w-3.5 h-3.5 text-[#F94500]" />
              <span>Straightened</span>
            </span>
            <span className="font-mono tabular-nums font-bold text-[#F94500]">
              {metrics.imagesStraightened}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
