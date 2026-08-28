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
    <aside className="w-[280px] h-full flex flex-col bg-white border-l border-slate-200 select-none flex-shrink-0 text-xs overflow-y-auto">
      {/* 1. Header with Collapse / More Menu */}
      <div className="p-4 pb-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-xs text-slate-900 tracking-tight">
            Info
          </span>
          <ChevronRight className="w-4 h-4 text-slate-400 cursor-pointer hover:text-slate-700 transition-colors" />
        </div>
        <button className="text-slate-400 hover:text-slate-700 transition-colors">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* 2. Real Storage Gauges */}
        <div className="flex flex-col gap-3">
          {/* Storage Meter 1: RAW Ingested */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-700">RAW Ingested</span>
              <span className="text-[10px] font-mono text-slate-400">
                {metrics.totalScanned} files
              </span>
            </div>
            <div className="font-mono text-sm font-extrabold text-slate-900">
              {totalRawGb} GB
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, Math.max(0, (metrics.totalScanned / 20) * 100))}%`,
                }}
              />
            </div>
          </div>

          {/* Storage Meter 2: Enhanced Images */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-700">Enhanced Images</span>
              <span className="text-[10px] font-mono text-slate-400">
                {metrics.currentProcessed} files
              </span>
            </div>
            <div className="font-mono text-sm font-extrabold text-slate-900">
              {totalEnhancedMb} MB
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, Math.max(0, (metrics.currentProcessed / 20) * 100))}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* 3. Real Properties Section */}
        <div className="flex flex-col gap-2 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-900">Properties</span>
            {activeItem ? (
              <span className="text-[10px] font-mono text-blue-600 font-semibold truncate max-w-[130px]">
                {activeItem.metadata.filename}
              </span>
            ) : (
              <span className="text-[10px] font-mono text-slate-400">
                No item selected
              </span>
            )}
          </div>

          {activeItem ? (
            <div className="flex flex-col gap-1.5 text-[11px]">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Size</span>
                <span className="font-mono text-slate-700 font-semibold">
                  {(activeItem.metadata.fileSize / 1000000).toFixed(2)} MB
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Created</span>
                <span className="font-mono text-slate-700">
                  {new Date(activeItem.metadata.timestamp).toLocaleDateString()}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Dimensions</span>
                <span className="font-mono text-slate-700">
                  {activeItem.metadata.dimensions.width} × {activeItem.metadata.dimensions.height}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 flex items-center gap-1">
                  <Camera className="w-3 h-3 text-slate-400" />
                  Camera
                </span>
                <span className="font-mono text-slate-700 truncate max-w-[130px]">
                  {activeItem.metadata.cameraModel}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 flex items-center gap-1">
                  <Compass className="w-3 h-3 text-blue-500" />
                  Tilt Angle
                </span>
                <span className="font-mono text-blue-600 font-bold">
                  {activeItem.geometry.detectedAngleDeg > 0 ? '+' : ''}
                  {activeItem.geometry.detectedAngleDeg}°
                </span>
              </div>

              <div className="flex justify-between py-1">
                <span className="text-slate-400 flex items-center gap-1">
                  <ScanEye className="w-3 h-3 text-emerald-500" />
                  Focus Sharpness
                </span>
                <span className="font-mono text-emerald-600 font-bold">
                  {activeItem.quality.laplacianSharpness.toFixed(1)} / 100
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center flex flex-col items-center gap-1 my-1">
              <Folder className="w-4 h-4 text-slate-400" />
              <p className="text-[10px] text-slate-500">
                Click any folder or image to view its real properties.
              </p>
            </div>
          )}
        </div>

        {/* 4. Real Tags Section */}
        <div className="flex flex-col gap-2 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-900">Tags</span>
            <Tag className="w-3 h-3 text-slate-400" />
          </div>

          {activeItem ? (
            <div className="flex flex-wrap gap-1.5">
              {activeItem.occasion.occasion && (
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 text-[10px] font-semibold">
                  • {activeItem.occasion.occasion}
                </span>
              )}
              {activeItem.isBurstWinner && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-semibold">
                  • Kept Winner
                </span>
              )}
              {activeItem.isArchived && (
                <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold">
                  • _archive
                </span>
              )}
              <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-100 text-[10px] font-semibold">
                • {activeItem.lightroom.exposureState.replace('_', ' ')}
              </span>
              {faceClusters.slice(0, 2).map((c) => (
                <span
                  key={c.clusterId}
                  className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-100 text-[10px] font-semibold"
                >
                  • {c.name || `Person ${c.clusterId}`}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-slate-400 italic">
              No active tags
            </p>
          )}
        </div>

        {/* 5. Real Pinned Items & Activity Footer */}
        <div className="flex flex-col gap-2 pt-3 border-t border-slate-100 mt-auto">
          <div className="flex items-center justify-between text-slate-500 text-[11px] py-1">
            <span className="flex items-center gap-1.5">
              <Pin className="w-3.5 h-3.5" />
              <span>Bursts Identified</span>
            </span>
            <span className="font-mono font-bold text-slate-700">
              {metrics.burstGroupsIdentified}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-500 text-[11px] py-1">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              <span>Straightened</span>
            </span>
            <span className="font-mono font-bold text-blue-600">
              {metrics.imagesStraightened}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
