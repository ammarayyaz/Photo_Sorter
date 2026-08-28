import React from 'react';
import {
  Sparkles,
  Layers,
  CheckCircle2,
  Users,
  Compass,
  Archive
} from 'lucide-react';
import { PipelineMetrics } from '../../engine/types';

interface FolderCardGridProps {
  metrics: PipelineMetrics;
  activeBatchName: string;
}

export const FolderCardGrid: React.FC<FolderCardGridProps> = ({
  metrics,
  activeBatchName,
}) => {
  const cards = [
    {
      id: 'raw',
      title: 'RAW Originals',
      subtitle: 'Uncompressed high dynamic range camera frames',
      metric: `${metrics.totalScanned > 0 ? metrics.totalScanned : 482} photos`,
      size: '14.8 GB',
      icon: <Layers className="w-4 h-4 text-slate-700" />,
      isActive: false,
    },
    {
      id: 'active',
      title: activeBatchName || 'Active Sort Batch',
      subtitle: 'Real-time horizon leveling & Laplacian culling',
      metric: `${metrics.currentProcessed} / ${metrics.totalScanned > 0 ? metrics.totalScanned : 482} processed`,
      size: '180.2 MB',
      icon: <Sparkles className="w-4 h-4 text-white" />,
      isActive: true,
    },
    {
      id: 'enhanced',
      title: 'Enhanced Best Frames',
      subtitle: 'Leveled 0.0° & Inscribed aspect auto-cropped',
      metric: `${metrics.currentProcessed > 0 ? metrics.currentProcessed - metrics.framesCulled : 386} photos`,
      size: '1.2 GB',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
      isActive: false,
    },
    {
      id: 'culls',
      title: 'Burst Rejections',
      subtitle: 'Sub-optimal closed eyes or blurry burst dupes',
      metric: `${metrics.framesCulled > 0 ? metrics.framesCulled : 96} archived`,
      size: '490 MB',
      icon: <Archive className="w-4 h-4 text-rose-500" />,
      isActive: false,
    },
    {
      id: 'faces',
      title: 'Face Clusters',
      subtitle: '512-D local embedding DBSCAN groups',
      metric: `${metrics.distinctPeopleCount > 0 ? metrics.distinctPeopleCount : 14} individuals`,
      size: '28.4 MB',
      icon: <Users className="w-4 h-4 text-blue-600" />,
      isActive: false,
    },
    {
      id: 'occasions',
      title: 'AI Occasion Tags',
      subtitle: 'Gemini 2.5 Flash Vision scene classifications',
      metric: `${metrics.occasionsIdentified > 0 ? metrics.occasionsIdentified : 5} scene events`,
      size: '12.6 MB',
      icon: <Compass className="w-4 h-4 text-indigo-600" />,
      isActive: false,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map((card) => {
        if (card.isActive) {
          return (
            <div
              key={card.id}
              className="relative bg-[#1E60E6] text-white rounded-2xl p-4 flex flex-col justify-between border border-[#1E60E6] select-none"
            >
              <div className="flex flex-col gap-2">
                <div className="bg-blue-50/20 text-white border border-white/20 rounded-xl p-2 text-[11px] font-mono leading-tight backdrop-blur-sm">
                  {card.subtitle}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
                    {card.icon}
                  </div>
                  <span className="font-extrabold text-xs tracking-tight text-white">
                    {card.title}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 mt-auto border-t border-white/20 text-[11px] font-mono text-white/90">
                <span>{card.metric}</span>
                <span className="font-bold">{card.size}</span>
              </div>
            </div>
          );
        }

        return (
          <div
            key={card.id}
            className="relative bg-[#F8FAFC] text-slate-800 rounded-2xl p-4 flex flex-col justify-between border border-slate-200 hover:bg-slate-100/80 transition-colors select-none"
          >
            <div className="flex flex-col gap-2">
              <div className="bg-white border border-slate-200/80 rounded-xl p-2 text-[11px] font-mono text-slate-500 leading-tight">
                {card.subtitle}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                  {card.icon}
                </div>
                <span className="font-bold text-xs tracking-tight text-slate-900">
                  {card.title}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 mt-auto border-t border-slate-200/60 text-[11px] font-mono text-slate-400">
              <span>{card.metric}</span>
              <span className="font-bold text-slate-600">{card.size}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
