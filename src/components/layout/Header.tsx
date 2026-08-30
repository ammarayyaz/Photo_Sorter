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

interface HeaderProps {
  activeTab: ActiveTab;
  status: ProcessingStatus;
  hasGeminiKey: boolean;
  folderName?: string;
  isInspectorCollapsed?: boolean;
  onToggleInspector?: () => void;
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
    <header className="flex items-center justify-between pb-3 select-none bg-transparent">
      {/* 1. Left Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="font-heading text-[#D83C00] font-bold tracking-tight">{getTabBreadcrumb()}</span>
          {folderName && folderName.trim().length > 0 && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-[#9CA3AF] dark:text-[#71717A]" />
              <span className="font-heading text-[#111827] dark:text-white font-bold tracking-tight truncate max-w-[240px]">
                {folderName}
              </span>
            </>
          )}
        </div>
      </div>

      {/* 2. Top Right Control Actions */}
      <div className="flex items-center gap-2">
        {/* Info Inspector Toggle Button */}
        {onToggleInspector && (
          <button
            onClick={onToggleInspector}
            className={`p-1.5 rounded-xl border transition-colors cursor-pointer shadow-none ${
              !isInspectorCollapsed
                ? 'bg-[#D83C00]/15 text-[#D83C00] border-[#D83C00]/30'
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
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#121212] hover:bg-slate-100 dark:hover:bg-[#1E1E1E] border border-[#E5E7EB] dark:border-[#27272A] font-heading text-xs font-bold text-[#111827] dark:text-white transition-colors cursor-pointer shadow-none"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-3.5 h-3.5 text-[#D83C00]" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-[#111827]" />
              <span>Dark Mode</span>
            </>
          )}
        </button>

        {/* Primary Action CTA Button */}
        {status === 'IDLE' && (
          <button
            onClick={onStart}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#D83C00] hover:bg-[#B83300] text-white font-heading font-bold text-xs tracking-wide transition-all active:scale-98 cursor-pointer shadow-none"
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
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#D83C00] hover:bg-[#B83300] text-white font-heading font-bold text-xs transition-colors cursor-pointer shadow-none"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Resume</span>
          </button>
        )}

        {status === 'COMPLETED' && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#D83C00]/15 dark:bg-[#D83C00]/20 text-[#D83C00] dark:text-[#FF8C61] border border-[#D83C00]/30 font-heading font-bold text-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#D83C00]" />
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
