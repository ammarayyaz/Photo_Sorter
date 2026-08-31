import React from 'react';
import {
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Sun,
  Moon,
  Info
} from 'lucide-react';
import { ActiveTab } from './Sidebar';
import { ProcessingStatus } from '../../engine/types';
import { useTheme } from '../../context/ThemeContext';

import { StepProgressRibbon } from './StepProgressRibbon';

interface HeaderProps {
  activeTab: ActiveTab;
  status: ProcessingStatus;
  hasGeminiKey: boolean;
  folderName?: string;
  isInspectorCollapsed?: boolean;
  onToggleInspector?: () => void;
  onSelectTab?: (tab: ActiveTab) => void;
  itemsCount?: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  status,
  folderName = '',
  hasGeminiKey: _hasGeminiKey,
  isInspectorCollapsed,
  onToggleInspector,
  onSelectTab,
  itemsCount = 0,
  onStart,
  onPause,
  onResume,
  onReset,
}) => {
  const { theme, toggleTheme } = useTheme();

  const getTabBreadcrumb = () => {
    switch (activeTab) {
      case 'step1-folders':
        return 'Step 1: Ingest & Browse Folders';
      case 'step2-culling':
        return 'Step 2: Eye & Motion Culling (_archive)';
      case 'step3-enhancement':
        return 'Step 3: Horizon Leveling & Lightroom Tone';
      case 'step4-renaming':
        return 'Step 4: Batch Image Renaming';
      case 'step5-output':
        return 'Step 5: Final Output Gallery & Review';
      case 'faces':
        return 'Shared With Me (Face Clusters)';
      case 'settings':
        return 'Backups & Preferences';
    }
  };

  const isRunning =
    status !== 'IDLE' &&
    status !== 'PAUSED' &&
    status !== 'COMPLETED' &&
    status !== 'ERROR';

  return (
    <header className="flex items-center justify-between pb-3 select-none bg-transparent gap-3">
      {/* 1. Left Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="font-heading text-[#4D694E] font-bold tracking-tight">{getTabBreadcrumb()}</span>
          {folderName && folderName.trim().length > 0 && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-[#9CA3AF] dark:text-[#71717A]" />
              <span className="font-heading text-[#111827] dark:text-white font-bold tracking-tight truncate max-w-[180px]">
                {folderName}
              </span>
            </>
          )}
        </div>
      </div>

      {/* 2. Interactive Step-by-Step Progress Ribbon */}
      {onSelectTab && (
        <StepProgressRibbon
          activeTab={activeTab}
          onSelectTab={onSelectTab}
          itemsCount={itemsCount}
        />
      )}

      {/* 3. Top Right Control Actions */}
      <div className="flex items-center gap-2">
        {/* Info Inspector Toggle Button */}
        {onToggleInspector && (
          <button
            onClick={onToggleInspector}
            className={`p-1.5 rounded-xl border transition-colors cursor-pointer shadow-none ${
              !isInspectorCollapsed
                ? 'bg-[#4D694E]/15 text-[#4D694E] border-[#4D694E]/30'
                : 'bg-white dark:bg-[#121212] hover:bg-slate-100 dark:hover:bg-[#1E1E1E] border-[#E5E7EB] dark:border-[#27272A] text-[#9CA3AF]'
            }`}
            title={isInspectorCollapsed ? 'Expand Info Inspector' : 'Collapse Info Inspector'}
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Light / Dark Mode Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-xl bg-white dark:bg-[#121212] hover:bg-slate-100 dark:hover:bg-[#1E1E1E] border border-[#E5E7EB] dark:border-[#27272A] text-[#111827] dark:text-white transition-colors cursor-pointer shadow-none"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? (
            <Sun className="w-3.5 h-3.5 text-[#4D694E]" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-[#4B5563]" />
          )}
        </button>

        {/* Primary Action CTA Button */}
        {status === 'IDLE' && (
          <button
            onClick={onStart}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#4D694E] hover:bg-[#3C533D] text-white font-heading font-bold text-xs tracking-wide transition-all active:scale-98 cursor-pointer shadow-none"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Run 5-Step Pipeline</span>
          </button>
        )}

        {isRunning && (
          <button
            onClick={onPause}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-heading font-bold text-xs transition-colors cursor-pointer shadow-none"
          >
            <Pause className="w-3.5 h-3.5 fill-current" />
            <span>Pause</span>
          </button>
        )}

        {status === 'PAUSED' && (
          <button
            onClick={onResume}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#4D694E] hover:bg-[#3C533D] text-white font-heading font-bold text-xs transition-colors cursor-pointer shadow-none"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Resume</span>
          </button>
        )}

        {status === 'COMPLETED' && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#4D694E]/15 dark:bg-[#4D694E]/20 text-[#4D694E] dark:text-[#FF8C61] border border-[#4D694E]/30 font-heading font-bold text-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#4D694E]" />
            <span>Complete</span>
          </div>
        )}

        {/* Reset Trigger */}
        <button
          onClick={onReset}
          className="p-1.5 rounded-xl bg-white dark:bg-[#121212] hover:bg-slate-100 dark:hover:bg-[#1E1E1E] border border-[#E5E7EB] dark:border-[#27272A] text-[#9CA3AF] hover:text-[#111827] dark:hover:text-white transition-colors cursor-pointer shadow-none"
          title="Reset Pipeline State"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
