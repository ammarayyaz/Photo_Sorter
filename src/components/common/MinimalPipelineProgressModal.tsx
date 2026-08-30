import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, Sparkles } from 'lucide-react';
import { ProcessingStatus, ProcessedItem } from '../../engine/types';

interface MinimalPipelineProgressModalProps {
  status: ProcessingStatus;
  activeItem: ProcessedItem | null;
  currentProcessed: number;
  totalScanned: number;
  onDismiss?: () => void;
}

interface StepDef {
  stepNumber: number;
  label: string;
  sublabel: string;
  activeStatuses: ProcessingStatus[];
  completedStatuses: ProcessingStatus[];
}

const PIPELINE_STEPS: StepDef[] = [
  {
    stepNumber: 1,
    label: 'Ingest & Metadata Extraction',
    sublabel: 'Reading EXIF, dimensions & luminance',
    activeStatuses: ['INGESTING'],
    completedStatuses: ['BURST_CULLING', 'GEOMETRY_LEVELING', 'FACE_CLUSTERING', 'OCCASION_TAGGING', 'ORGANIZING', 'COMPLETED'],
  },
  {
    stepNumber: 2,
    label: 'Eye & Motion Culling',
    sublabel: 'Separating blinks & blur into _archive/',
    activeStatuses: ['BURST_CULLING'],
    completedStatuses: ['GEOMETRY_LEVELING', 'FACE_CLUSTERING', 'OCCASION_TAGGING', 'ORGANIZING', 'COMPLETED'],
  },
  {
    stepNumber: 3,
    label: 'Horizon Straightening & Tone',
    sublabel: 'Leveling Dutch tilt & Lightroom curve',
    activeStatuses: ['GEOMETRY_LEVELING'],
    completedStatuses: ['FACE_CLUSTERING', 'OCCASION_TAGGING', 'ORGANIZING', 'COMPLETED'],
  },
  {
    stepNumber: 4,
    label: 'Batch Pattern Renaming',
    sublabel: 'Applying sequential camera naming',
    activeStatuses: ['FACE_CLUSTERING', 'OCCASION_TAGGING'],
    completedStatuses: ['ORGANIZING', 'COMPLETED'],
  },
  {
    stepNumber: 5,
    label: 'Output Packaging & Organization',
    sublabel: 'Generating master folders & report',
    activeStatuses: ['ORGANIZING'],
    completedStatuses: ['COMPLETED'],
  },
];

export const MinimalPipelineProgressModal: React.FC<MinimalPipelineProgressModalProps> = ({
  status,
  activeItem,
  currentProcessed,
  totalScanned,
}) => {
  const [isVisible, setIsVisible] = React.useState<boolean>(false);

  React.useEffect(() => {
    const isRunning =
      status === 'INGESTING' ||
      status === 'BURST_CULLING' ||
      status === 'GEOMETRY_LEVELING' ||
      status === 'FACE_CLUSTERING' ||
      status === 'OCCASION_TAGGING' ||
      status === 'ORGANIZING';

    if (isRunning) {
      setIsVisible(true);
    } else if (status === 'COMPLETED') {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 1800);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [status]);

  if (!isVisible) {
    return null;
  }

  // Calculate current active step index (0 to 4)
  let currentActiveIndex = 0;
  if (status === 'INGESTING') currentActiveIndex = 0;
  else if (status === 'BURST_CULLING') currentActiveIndex = 1;
  else if (status === 'GEOMETRY_LEVELING') currentActiveIndex = 2;
  else if (status === 'FACE_CLUSTERING' || status === 'OCCASION_TAGGING') currentActiveIndex = 3;
  else if (status === 'ORGANIZING') currentActiveIndex = 4;
  else if (status === 'COMPLETED') currentActiveIndex = 5;

  const progressPercent = Math.min(
    100,
    Math.round(((currentActiveIndex + (totalScanned > 0 ? currentProcessed / totalScanned : 0)) / 5) * 100)
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#111111] border border-[#E5E7EB] dark:border-[#27272A] shadow-2xl p-5 flex flex-col gap-4 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#D83C00]/15 text-[#D83C00] border border-[#D83C00]/30 flex items-center justify-center">
                {status === 'COMPLETED' ? (
                  <Check className="w-4 h-4 text-emerald-500 stroke-[3]" />
                ) : (
                  <Sparkles className="w-4 h-4 text-[#D83C00]" />
                )}
              </div>
              <div>
                <h3 className="font-heading text-xs font-bold text-[#111827] dark:text-white">
                  {status === 'COMPLETED' ? 'Pipeline Complete' : 'Processing Pipeline'}
                </h3>
                <p className="font-mono text-[11px] text-[#9CA3AF] tabular-nums truncate max-w-[200px]">
                  {activeItem ? activeItem.metadata.filename : `Step ${Math.min(5, currentActiveIndex + 1)} of 5`}
                </p>
              </div>
            </div>

            <span className="font-mono text-xs font-bold text-[#D83C00] tabular-nums">
              {status === 'COMPLETED' ? '100%' : `${progressPercent}%`}
            </span>
          </div>

          {/* Minimal Step-by-Step List with Strikethrough & Small Ticks */}
          <div className="flex flex-col gap-2 pt-1 border-t border-[#E5E7EB] dark:border-[#222222]">
            {PIPELINE_STEPS.map((step) => {
              const isCompleted = step.completedStatuses.includes(status);
              const isActive = step.activeStatuses.includes(status);

              return (
                <div
                  key={step.stepNumber}
                  className={`flex items-center justify-between py-1.5 px-2.5 rounded-xl transition-colors ${
                    isActive
                      ? 'bg-[#D83C00]/10 dark:bg-[#D83C00]/15 border border-[#D83C00]/30'
                      : 'bg-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Small Tick in front of Step */}
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${
                        isCompleted
                          ? 'bg-emerald-500 text-white'
                          : isActive
                          ? 'bg-[#D83C00] text-white'
                          : 'bg-slate-200 dark:bg-[#222222] text-[#9CA3AF]'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      ) : isActive ? (
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      ) : (
                        step.stepNumber
                      )}
                    </div>

                    {/* Step Name with Strikethrough when done */}
                    <div className="min-w-0">
                      <span
                        className={`text-xs font-heading font-bold transition-all ${
                          isCompleted
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : isActive
                            ? 'text-[#111827] dark:text-white'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  </div>

                  {/* Status Indicator Pill */}
                  <div className="flex-shrink-0 ml-2">
                    {isCompleted ? (
                      <span className="flex items-center gap-0.5 text-[10px] font-mono font-bold text-emerald-500">
                        <Check className="w-3 h-3 stroke-[2.5]" />
                        <span>Done</span>
                      </span>
                    ) : isActive ? (
                      <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-[#D83C00]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#D83C00] animate-ping" />
                        <span>Running</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-600">
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Minimal Bottom Progress Track */}
          <div className="w-full bg-[#E5E7EB] dark:bg-[#222222] h-1.5 rounded-full overflow-hidden">
            <motion.div
              className="bg-[#D83C00] h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
