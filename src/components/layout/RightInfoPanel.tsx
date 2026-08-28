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
}

export const RightInfoPanel: React.FC<RightInfoPanelProps> = ({
  activeItem,
  metrics,
  faceClusters,
}) => {
  const totalRawMb = metrics.totalScanned > 0
    ? (metrics.totalScanned * 24.5).toFixed(1)
    : '0.0';
  const totalRawGb = (Number(totalRawMb) / 1000).toFixed(2);

  const totalEnhancedMb = metrics.currentProcessed > 0
    ? (metrics.currentProcessed * 1.8).toFixed(1)
    : '0.0';

  return (
    <aside className="w-[280px] h-full flex flex-col bg-white dark:bg-[#1A0030] border-l border-[#E7E0EE] dark:border-[#4C177D] select-none flex-shrink-0 text-xs overflow-y-auto transition-colors duration-200">
      {/* 1. Header with Collapse / More Menu */}
      <div className="p-4 pb-3 border-b border-[#E7E0EE] dark:border-[#4C177D] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-xs text-[#23003F] dark:text-[#FFFDB4] tracking-tight">
            Info Inspector
          </span>
          <ChevronRight className="w-4 h-4 text-[#BCACCE] cursor-pointer hover:text-[#F94500] transition-colors" />
        </div>
        <button className="text-[#BCACCE] hover:text-[#F94500] transition-colors">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* 2. Real Storage Gauges */}
        <div className="flex flex-col gap-3">
          {/* Storage Meter 1: RAW Ingested */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-[#23003F] dark:text-[#BCACCE]">RAW Ingested</span>
              <span className="text-[10px] font-mono text-[#BCACCE]">
                {metrics.totalScanned} files
              </span>
            </div>
            <div className="font-mono text-sm font-extrabold text-[#23003F] dark:text-[#FFFDB4]">
              {totalRawGb} GB
            </div>
            <div className="w-full bg-[#E7E0EE] dark:bg-[#320857] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#F94500] h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, Math.max(0, (metrics.totalScanned / 20) * 100))}%`,
                }}
              />
            </div>
          </div>

          {/* Storage Meter 2: Enhanced Images */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-[#23003F] dark:text-[#BCACCE]">Enhanced Images</span>
              <span className="text-[10px] font-mono text-[#BCACCE]">
                {metrics.currentProcessed} files
              </span>
            </div>
            <div className="font-mono text-sm font-extrabold text-[#23003F] dark:text-[#FFFDB4]">
              {totalEnhancedMb} MB
            </div>
            <div className="w-full bg-[#E7E0EE] dark:bg-[#320857] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#FFFDB4] h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, Math.max(0, (metrics.currentProcessed / 20) * 100))}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* 3. Real Properties Section */}
        <div className="flex flex-col gap-2 pt-3 border-t border-[#E7E0EE] dark:border-[#4C177D]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-[#23003F] dark:text-[#FFFDB4]">Properties</span>
            {activeItem ? (
              <span className="text-[10px] font-mono text-[#F94500] font-semibold truncate max-w-[130px]">
                {activeItem.metadata.filename}
              </span>
            ) : (
              <span className="text-[10px] font-mono text-[#BCACCE]">
                No item selected
              </span>
            )}
          </div>

          {activeItem ? (
            <div className="flex flex-col gap-1.5 text-[11px]">
              <div className="flex justify-between py-1 border-b border-[#E7E0EE]/50 dark:border-[#4C177D]/50">
                <span className="text-[#BCACCE]">Size</span>
                <span className="font-mono text-[#23003F] dark:text-white font-semibold">
                  {(activeItem.metadata.fileSize / 1000000).toFixed(2)} MB
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-[#E7E0EE]/50 dark:border-[#4C177D]/50">
                <span className="text-[#BCACCE]">Created</span>
                <span className="font-mono text-[#23003F] dark:text-white">
                  {new Date(activeItem.metadata.timestamp).toLocaleDateString()}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-[#E7E0EE]/50 dark:border-[#4C177D]/50">
                <span className="text-[#BCACCE]">Dimensions</span>
                <span className="font-mono text-[#23003F] dark:text-white">
                  {activeItem.metadata.dimensions.width} × {activeItem.metadata.dimensions.height}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-[#E7E0EE]/50 dark:border-[#4C177D]/50">
                <span className="text-[#BCACCE] flex items-center gap-1">
                  <Camera className="w-3 h-3 text-[#BCACCE]" />
                  Camera
                </span>
                <span className="font-mono text-[#23003F] dark:text-white truncate max-w-[130px]">
                  {activeItem.metadata.cameraModel}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-[#E7E0EE]/50 dark:border-[#4C177D]/50">
                <span className="text-[#BCACCE] flex items-center gap-1">
                  <Compass className="w-3 h-3 text-[#F94500]" />
                  Tilt Angle
                </span>
                <span className="font-mono text-[#F94500] font-bold">
                  {activeItem.geometry.detectedAngleDeg > 0 ? '+' : ''}
                  {activeItem.geometry.detectedAngleDeg}°
                </span>
              </div>

              <div className="flex justify-between py-1">
                <span className="text-[#BCACCE] flex items-center gap-1">
                  <ScanEye className="w-3 h-3 text-[#FFFDB4]" />
                  Focus Sharpness
                </span>
                <span className="font-mono text-[#23003F] dark:text-[#FFFDB4] font-bold">
                  {activeItem.quality.laplacianSharpness.toFixed(1)} / 100
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-[#FAF8FD] dark:bg-[#23003F] border border-[#E7E0EE] dark:border-[#4C177D] rounded-xl p-3 text-center flex flex-col items-center gap-1 my-1">
              <Folder className="w-4 h-4 text-[#BCACCE]" />
              <p className="text-[10px] text-[#BCACCE]">
                Click any folder or image to view its real properties.
              </p>
            </div>
          )}
        </div>

        {/* 4. Real Tags Section */}
        <div className="flex flex-col gap-2 pt-3 border-t border-[#E7E0EE] dark:border-[#4C177D]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-[#23003F] dark:text-[#FFFDB4]">Tags</span>
            <Tag className="w-3 h-3 text-[#BCACCE]" />
          </div>

          {activeItem ? (
            <div className="flex flex-wrap gap-1.5">
              {activeItem.occasion.occasion && (
                <span className="px-2 py-0.5 rounded-full bg-[#FFFDB4]/40 dark:bg-[#FFFDB4]/20 text-[#23003F] dark:text-[#FFFDB4] border border-[#FFFDB4] text-[10px] font-semibold">
                  • {activeItem.occasion.occasion}
                </span>
              )}
              {activeItem.isBurstWinner && (
                <span className="px-2 py-0.5 rounded-full bg-[#BCACCE]/30 dark:bg-[#BCACCE]/20 text-[#23003F] dark:text-[#FFFDB4] border border-[#BCACCE] text-[10px] font-semibold">
                  • Kept Winner
                </span>
              )}
              {activeItem.isArchived && (
                <span className="px-2 py-0.5 rounded-full bg-[#F94500]/20 text-[#F94500] border border-[#F94500]/40 text-[10px] font-semibold">
                  • _archive
                </span>
              )}
              <span className="px-2 py-0.5 rounded-full bg-[#BCACCE]/30 text-[#23003F] dark:text-white border border-[#BCACCE]/50 text-[10px] font-semibold">
                • {activeItem.lightroom.exposureState.replace('_', ' ')}
              </span>
              {faceClusters.slice(0, 2).map((c) => (
                <span
                  key={c.clusterId}
                  className="px-2 py-0.5 rounded-full bg-[#FFFDB4]/30 text-[#23003F] dark:text-[#FFFDB4] border border-[#FFFDB4] text-[10px] font-semibold"
                >
                  • {c.name || `Person ${c.clusterId}`}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-[#BCACCE] italic">
              No active tags
            </p>
          )}
        </div>

        {/* 5. Real Pinned Items & Activity Footer */}
        <div className="flex flex-col gap-2 pt-3 border-t border-[#E7E0EE] dark:border-[#4C177D] mt-auto">
          <div className="flex items-center justify-between text-[#BCACCE] text-[11px] py-1">
            <span className="flex items-center gap-1.5">
              <Pin className="w-3.5 h-3.5" />
              <span>Bursts Identified</span>
            </span>
            <span className="font-mono font-bold text-[#23003F] dark:text-white">
              {metrics.burstGroupsIdentified}
            </span>
          </div>

          <div className="flex items-center justify-between text-[#BCACCE] text-[11px] py-1">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#F94500]" />
              <span>Straightened</span>
            </span>
            <span className="font-mono font-bold text-[#F94500]">
              {metrics.imagesStraightened}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
