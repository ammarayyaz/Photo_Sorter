import React from 'react';
import {
  FolderSearch,
  Crop,
  Layers,
  Users,
  FolderTree,
  Clock,
  Zap
} from 'lucide-react';
import { ProcessingStatus, PipelineMetrics, ProcessedItem } from '../../engine/types';

interface PipelineProgressProps {
  status: ProcessingStatus;
  metrics: PipelineMetrics;
  activeItem: ProcessedItem | null;
}

export const PipelineProgress: React.FC<PipelineProgressProps> = ({
  status,
  metrics,
  activeItem,
}) => {
  const percentage =
    metrics.totalScanned > 0
      ? Math.min(100, Math.round((metrics.currentProcessed / metrics.totalScanned) * 100))
      : 0;

  const stages = [
    { id: 'INGESTING', label: '1. Ingestion', icon: FolderSearch },
    { id: 'BURST_CULLING', label: '2. Burst Culling', icon: Layers },
    { id: 'GEOMETRY_LEVELING', label: '3. Horizon Leveling', icon: Crop },
    { id: 'FACE_CLUSTERING', label: '4. Face DBSCAN', icon: Users },
    { id: 'ORGANIZING', label: '5. Directory Export', icon: FolderTree },
  ];

  const getStageStatus = (stageId: string) => {
    if (status === 'COMPLETED') return 'completed';
    if (status === stageId) return 'active';
    // Sequence order check
    const order = ['INGESTING', 'BURST_CULLING', 'GEOMETRY_LEVELING', 'FACE_CLUSTERING', 'ORGANIZING', 'COMPLETED'];
    const currentIdx = order.indexOf(status);
    const stageIdx = order.indexOf(stageId);
    if (currentIdx > stageIdx) return 'completed';
    return 'pending';
  };

  return (
    <div className="bg-base-surface border border-base-border rounded-xl p-3.5 select-none">
      {/* Stages Progress Indicator */}
      <div className="grid grid-cols-5 gap-2 mb-3">
        {stages.map((stage) => {
          const Icon = stage.icon;
          const stageState = getStageStatus(stage.id);

          return (
            <div
              key={stage.id}
              className={`flex items-center gap-2 p-2 rounded-lg border text-xs transition-all ${
                stageState === 'active'
                  ? 'bg-accent-subtle border-accent-border text-accent-cyan font-semibold'
                  : stageState === 'completed'
                  ? 'bg-base-elevated border-base-border text-text-primary'
                  : 'bg-base-card border-base-border text-text-dim'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${stageState === 'active' ? 'text-accent-cyan animate-pulse' : ''}`} />
              <span className="truncate text-[11px]">{stage.label}</span>
            </div>
          );
        })}
      </div>

      {/* Progress Bar & Details */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-text-primary">
              {status === 'COMPLETED'
                ? 'All Photos Processed & Sorted'
                : activeItem
                ? `Processing: ${activeItem.metadata.filename}`
                : 'Pipeline Idle'}
            </span>
            {activeItem && (
              <span className="text-[11px] text-text-secondary font-mono">
                ({metrics.currentProcessed} / {metrics.totalScanned})
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-[11px] text-text-secondary font-mono">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-text-dim" />
              {metrics.elapsedTimeSec}s elapsed
            </span>
            {metrics.estimatedTimeRemainingSec > 0 && status !== 'COMPLETED' && (
              <span className="flex items-center gap-1 text-accent-cyan">
                <Zap className="w-3 h-3" />
                ~{metrics.estimatedTimeRemainingSec}s remaining
              </span>
            )}
            <span className="font-bold text-accent-cyan">{percentage}%</span>
          </div>
        </div>

        {/* Bar */}
        <div className="w-full bg-base-elevated h-2 rounded-full overflow-hidden border border-base-border">
          <div
            className="bg-accent-cyan h-full transition-all duration-300 rounded-full"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};
