import React from 'react';
import { motion } from 'framer-motion';
import {
  FolderOpen,
  Eye,
  Compass,
  FileSignature,
  Download,
  Check
} from 'lucide-react';
import { ActiveTab } from './Sidebar';

interface StepProgressRibbonProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  itemsCount: number;
}

const STEPS = [
  { id: 'step1-folders' as ActiveTab, number: 1, label: 'Ingest', icon: FolderOpen },
  { id: 'step2-culling' as ActiveTab, number: 2, label: 'Culling', icon: Eye },
  { id: 'step3-enhancement' as ActiveTab, number: 3, label: 'Straighten', icon: Compass },
  { id: 'step4-renaming' as ActiveTab, number: 4, label: 'Rename', icon: FileSignature },
  { id: 'step5-output' as ActiveTab, number: 5, label: 'Output', icon: Download },
];

export const StepProgressRibbon: React.FC<StepProgressRibbonProps> = ({
  activeTab,
  onSelectTab,
}) => {
  const currentStepIndex = STEPS.findIndex((s) => s.id === activeTab);
  const isStepMode = currentStepIndex >= 0;

  if (!isStepMode) return null;

  return (
    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#121212] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-1 px-2 select-none">
      {STEPS.map((step, index) => {
        const Icon = step.icon;
        const isActive = step.id === activeTab;
        const isPast = index < currentStepIndex;

        return (
          <React.Fragment key={step.id}>
            {/* Step Button */}
            <button
              onClick={() => onSelectTab(step.id)}
              className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-heading font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#D83C00] text-white shadow-sm'
                  : isPast
                  ? 'bg-slate-200 dark:bg-[#1E1E1E] text-[#111827] dark:text-white hover:bg-slate-300 dark:hover:bg-[#282828]'
                  : 'text-[#9CA3AF] hover:text-[#111827] dark:hover:text-white'
              }`}
            >
              {/* Step indicator node */}
              <div
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isActive
                    ? 'bg-white text-[#D83C00]'
                    : isPast
                    ? 'bg-emerald-500 text-white'
                    : 'bg-[#9CA3AF]/30 text-[#9CA3AF]'
                }`}
              >
                {isPast ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : step.number}
              </div>

              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-2xs tracking-tight">{step.label}</span>

              {/* Active animated bottom glow indicator */}
              {isActive && (
                <motion.div
                  layoutId="step-ribbon-active"
                  className="absolute inset-0 rounded-xl border border-white/30 pointer-events-none"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </button>

            {/* Connecting Step Line */}
            {index < STEPS.length - 1 && (
              <div className="w-3 h-0.5 relative rounded-full overflow-hidden bg-[#E5E7EB] dark:bg-[#27272A]">
                <div
                  className={`h-full transition-all duration-300 ${
                    index < currentStepIndex ? 'bg-emerald-500 w-full' : 'w-0'
                  }`}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
