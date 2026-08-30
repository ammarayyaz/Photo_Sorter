import React from 'react';
import {
  ChevronRight,
  ChevronLeft,
  Pin,
  Activity,
  Tag,
  Camera,
  Compass,
  ScanEye,
  Info,
  Sparkles
} from 'lucide-react';
import { ProcessedItem, PipelineMetrics, FaceCluster } from '../../engine/types';

interface RightInfoPanelProps {
  activeItem: ProcessedItem | null;
  metrics: PipelineMetrics;
  faceClusters: FaceCluster[];
  items?: ProcessedItem[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const RightInfoPanel: React.FC<RightInfoPanelProps> = ({
  activeItem,
  metrics,
  faceClusters,
  items = [],
  isCollapsed = false,
  onToggleCollapse,
}) => {
  // Real storage calculation from actual user ingested items
  const realTotalBytes = items.reduce((sum, item) => sum + item.metadata.fileSize, 0);
  const totalRawMb = (realTotalBytes / 1000000).toFixed(1);
  const totalRawGb = (realTotalBytes / 1000000000).toFixed(2);

  const enhancedItems = items.filter((i) => !i.isArchived);
  const enhancedBytes = enhancedItems.reduce((sum, item) => sum + item.metadata.fileSize, 0);
  const totalEnhancedMb = (enhancedBytes / 1000000).toFixed(1);

  // Use active item or fallback to first item in collection so info is never empty
  const displayItem = activeItem || (items.length > 0 ? items[0] : null);

  // If Collapsed: Render sleek minimal vertical bar
  if (isCollapsed) {
    return (
      <aside className="w-10 h-full flex flex-col items-center py-3 bg-white dark:bg-[#0A0A0A] border-l border-[#E5E7EB] dark:border-[#222222] select-none flex-shrink-0 transition-all duration-200 justify-between">
        <button
          onClick={onToggleCollapse}
          title="Expand Info Inspector"
          className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#D83C00] hover:bg-slate-100 dark:hover:bg-[#181818] transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={onToggleCollapse}
          title="Expand Info Inspector"
          className="flex flex-col items-center gap-2 text-[#9CA3AF] hover:text-[#D83C00] transition-colors cursor-pointer py-4"
        >
          <Info className="w-4 h-4 text-[#D83C00]" />
          <span className="[writing-mode:vertical-lr] rotate-180 text-[10px] font-heading font-extrabold uppercase tracking-widest text-[#9CA3AF] dark:text-[#71717A]">
            Inspector
          </span>
        </button>

        <div className="flex flex-col items-center gap-1.5 text-2xs font-mono text-[#D83C00]">
          {items.length > 0 ? (
            <span className="w-2 h-2 rounded-full bg-[#D83C00]" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-[#9CA3AF]/40" />
          )}
        </div>
      </aside>
    );
  }

  // Expanded Panel
  return (
    <aside className="w-[280px] h-full flex flex-col bg-white dark:bg-[#0A0A0A] border-l border-[#E5E7EB] dark:border-[#222222] select-none flex-shrink-0 text-xs overflow-y-auto no-scrollbar transition-colors duration-200">
      {/* 1. Header with Collapse Action */}
      <div className="p-3.5 pb-2.5 border-b border-[#E5E7EB] dark:border-[#222222] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-[#D83C00]" />
          <span className="font-heading font-extrabold text-xs text-[#111827] dark:text-white tracking-tight">
            Info Inspector
          </span>
        </div>
        <button
          onClick={onToggleCollapse}
          title="Collapse Info Inspector"
          className="p-1 rounded-lg text-[#9CA3AF] hover:text-[#D83C00] hover:bg-slate-100 dark:hover:bg-[#181818] transition-colors cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3.5 flex flex-col gap-3.5">
        {/* 2. Real Storage Gauges */}
        <div className="flex flex-col gap-2.5">
          {/* Storage Meter 1: RAW Ingested */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-heading font-semibold text-[#4B5563] dark:text-[#A1A1AA]">RAW Ingested</span>
              <span className="text-[10px] font-mono tabular-nums text-[#9CA3AF]">
                {items.length > 0 ? items.length : metrics.totalScanned} files
              </span>
            </div>
            <div className="font-mono tabular-nums text-sm font-extrabold text-[#111827] dark:text-white">
              {realTotalBytes > 1000000000 ? `${totalRawGb} GB` : `${totalRawMb} MB`}
            </div>
            <div className="w-full bg-[#E5E7EB] dark:bg-[#1E1E1E] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#D83C00] h-full rounded-full transition-all duration-300"
                style={{
                  width: `${items.length > 0 ? 100 : 0}%`,
                }}
              />
            </div>
          </div>

          {/* Storage Meter 2: Enhanced Images */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-heading font-semibold text-[#4B5563] dark:text-[#A1A1AA]">Enhanced Images</span>
              <span className="text-[10px] font-mono tabular-nums text-[#9CA3AF]">
                {enhancedItems.length} files
              </span>
            </div>
            <div className="font-mono tabular-nums text-sm font-extrabold text-[#111827] dark:text-white">
              {totalEnhancedMb} MB
            </div>
            <div className="w-full bg-[#E5E7EB] dark:bg-[#1E1E1E] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#D83C00]/60 h-full rounded-full transition-all duration-300"
                style={{
                  width: `${items.length > 0 ? Math.round((enhancedItems.length / items.length) * 100) : 0}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* 3. Real Properties Section */}
        <div className="flex flex-col gap-1.5 pt-2.5 border-t border-[#E5E7EB] dark:border-[#222222]">
          <div className="flex items-center justify-between">
            <span className="font-heading text-xs font-extrabold text-[#111827] dark:text-white">Properties</span>
            {displayItem ? (
              <span className="text-[10px] font-mono tabular-nums text-[#D83C00] font-semibold truncate max-w-[130px]">
                {displayItem.metadata.filename}
              </span>
            ) : (
              <span className="text-[10px] font-mono tabular-nums text-[#9CA3AF]">
                Session Overview
              </span>
            )}
          </div>

          {displayItem ? (
            <div className="flex flex-col gap-1 text-[11px]">
              <div className="flex justify-between py-1 border-b border-[#E5E7EB] dark:border-[#222222]">
                <span className="font-sans text-[#9CA3AF] dark:text-[#71717A]">Size</span>
                <span className="font-mono tabular-nums text-[#111827] dark:text-white font-semibold">
                  {(displayItem.metadata.fileSize / 1000000).toFixed(2)} MB
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-[#E5E7EB] dark:border-[#222222]">
                <span className="font-sans text-[#9CA3AF] dark:text-[#71717A]">Created</span>
                <span className="font-mono tabular-nums text-[#111827] dark:text-white">
                  {new Date(displayItem.metadata.timestamp).toLocaleDateString()}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-[#E5E7EB] dark:border-[#222222]">
                <span className="font-sans text-[#9CA3AF] dark:text-[#71717A]">Dimensions</span>
                <span className="font-mono tabular-nums text-[#111827] dark:text-white font-semibold">
                  {displayItem.metadata.dimensions.width} × {displayItem.metadata.dimensions.height}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-[#E5E7EB] dark:border-[#222222]">
                <span className="font-sans text-[#9CA3AF] dark:text-[#71717A] flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5 text-[#9CA3AF]" />
                  Camera
                </span>
                <span className="font-mono tabular-nums text-[#111827] dark:text-white truncate max-w-[130px]">
                  {displayItem.metadata.cameraModel}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-[#E5E7EB] dark:border-[#222222]">
                <span className="font-sans text-[#9CA3AF] dark:text-[#71717A] flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-[#D83C00]" />
                  Tilt Angle
                </span>
                <span className="font-mono tabular-nums text-[#D83C00] font-bold">
                  {displayItem.geometry.detectedAngleDeg > 0 ? '+' : ''}
                  {displayItem.geometry.detectedAngleDeg}°
                </span>
              </div>

              <div className="flex justify-between py-1">
                <span className="font-sans text-[#9CA3AF] dark:text-[#71717A] flex items-center gap-1">
                  <ScanEye className="w-3.5 h-3.5 text-[#D83C00]" />
                  Sharpness
                </span>
                <span className="font-mono tabular-nums text-[#111827] dark:text-white font-bold">
                  {displayItem.quality.laplacianSharpness.toFixed(1)} / 100
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-[#F9FAFB] dark:bg-[#121212] border border-[#E5E7EB] dark:border-[#222222] rounded-xl p-2.5 flex items-center gap-2 my-1">
              <Sparkles className="w-3.5 h-3.5 text-[#D83C00]" />
              <span className="text-xs font-bold text-[#111827] dark:text-white font-heading">No item selected</span>
            </div>
          )}
        </div>

        {/* 4. Real Tags Section */}
        <div className="flex flex-col gap-1.5 pt-2.5 border-t border-[#E5E7EB] dark:border-[#222222]">
          <div className="flex items-center justify-between">
            <span className="font-heading text-xs font-extrabold text-[#111827] dark:text-white">Tags</span>
            <Tag className="w-3.5 h-3.5 text-[#9CA3AF]" />
          </div>

          {displayItem ? (
            <div className="flex flex-wrap gap-1">
              {displayItem.occasion.occasion && (
                <span className="px-2 py-0.5 rounded-full bg-[#181818] text-white border border-[#27272A] font-heading text-[10px] font-bold">
                  • {displayItem.occasion.occasion}
                </span>
              )}
              {displayItem.isBurstWinner && (
                <span className="px-2 py-0.5 rounded-full bg-[#D83C00]/15 text-[#D83C00] dark:text-[#FF8C61] border border-[#D83C00]/30 font-heading text-[10px] font-bold">
                  • Kept Winner
                </span>
              )}
              {displayItem.isArchived && (
                <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-500 border border-red-500/30 font-heading text-[10px] font-bold">
                  • _archive
                </span>
              )}
              <span className="px-2 py-0.5 rounded-full bg-[#181818] text-white border border-[#27272A] font-heading text-[10px] font-bold">
                • {displayItem.lightroom.exposureState.replace('_', ' ')}
              </span>
              {faceClusters.slice(0, 2).map((c) => (
                <span
                  key={c.clusterId}
                  className="px-2 py-0.5 rounded-full bg-[#181818] text-white border border-[#27272A] font-heading text-[10px] font-bold"
                >
                  • {c.name || `Person ${c.clusterId}`}
                </span>
              ))}
            </div>
          ) : (
            <p className="font-sans text-[11px] text-[#9CA3AF] italic">
              No active tags
            </p>
          )}
        </div>

        {/* 5. Metrics Footer */}
        <div className="flex flex-col gap-1.5 pt-2.5 border-t border-[#E5E7EB] dark:border-[#222222] mt-auto">
          <div className="flex items-center justify-between text-[#9CA3AF] text-[11px] py-0.5">
            <span className="flex items-center gap-1.5 font-sans">
              <Pin className="w-3.5 h-3.5" />
              <span>Bursts Identified</span>
            </span>
            <span className="font-mono tabular-nums font-bold text-[#111827] dark:text-white">
              {metrics.burstGroupsIdentified}
            </span>
          </div>

          <div className="flex items-center justify-between text-[#9CA3AF] text-[11px] py-0.5">
            <span className="flex items-center gap-1.5 font-sans">
              <Activity className="w-3.5 h-3.5 text-[#D83C00]" />
              <span>Straightened</span>
            </span>
            <span className="font-mono tabular-nums font-bold text-[#D83C00]">
              {metrics.imagesStraightened}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
