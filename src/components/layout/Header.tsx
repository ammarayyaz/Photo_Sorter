import React from 'react';
import {
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Sun,
  Moon
} from 'lucide-react';
import { ActiveTab } from './Sidebar';
import { ProcessingStatus } from '../../engine/types';
import { useTheme } from '../../context/ThemeContext';

interface HeaderProps {
  activeTab: ActiveTab;
  status: ProcessingStatus;
  hasGeminiKey: boolean;
  folderName?: string;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  status,
  folderName = 'All Uploaded Photos',
  hasGeminiKey: _hasGeminiKey,
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
      case 'step4-output':
        return 'Step 4: Final Output Gallery & Review';
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
    <header className="flex items-center justify-between pb-4 select-none bg-transparent">
      {/* 1. Left Breadcrumb Navigation (Typography Rule 2 & 4: Clear Hierarchy & Alignment) */}
      <div className="flex items-center gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="font-heading text-[#F94500] font-bold tracking-tight">{getTabBreadcrumb()}</span>
          <ChevronRight className="w-3.5 h-3.5 text-[#BCACCE]" />
          <span className="font-heading text-[#23003F] dark:text-[#FFFDB4] font-bold tracking-tight truncate max-w-[240px]">
            {folderName}
          </span>
        </div>
      </div>

      {/* 2. Top Right Control Actions (Typography Rule 7: High-Impact Clear CTAs) */}
      <div className="flex items-center gap-2">
        {/* Light / Dark Mode Toggle Button */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#23003F] hover:bg-[#F3EFF9] dark:hover:bg-[#320857] border border-[#E7E0EE] dark:border-[#4C177D] font-heading text-xs font-bold text-[#23003F] dark:text-[#FFFDB4] transition-colors cursor-pointer"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-3.5 h-3.5 text-[#FFFDB4]" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-[#23003F]" />
              <span>Dark Mode</span>
            </>
          )}
        </button>

        {/* Primary Action CTA Button */}
        {status === 'IDLE' && (
          <button
            onClick={onStart}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#F94500] hover:bg-[#D83C00] text-white font-heading font-bold text-xs tracking-wide transition-all active:scale-98 cursor-pointer shadow-sm"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Run 4-Step Pipeline</span>
          </button>
        )}

        {isRunning && (
          <button
            onClick={onPause}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-heading font-bold text-xs transition-colors cursor-pointer"
          >
            <Pause className="w-3.5 h-3.5 fill-current" />
            <span>Pause</span>
          </button>
        )}

        {status === 'PAUSED' && (
          <button
            onClick={onResume}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#F94500] hover:bg-[#D83C00] text-white font-heading font-bold text-xs transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Resume</span>
          </button>
        )}

        {status === 'COMPLETED' && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFFDB4]/30 dark:bg-[#FFFDB4]/10 text-[#23003F] dark:text-[#FFFDB4] border border-[#FFFDB4] font-heading font-bold text-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#F94500]" />
            <span>Pipeline Complete</span>
          </div>
        )}

        {/* Reset Trigger */}
        <button
          onClick={onReset}
          className="p-1.5 rounded-xl bg-white dark:bg-[#23003F] hover:bg-slate-100 dark:hover:bg-[#320857] border border-[#E7E0EE] dark:border-[#4C177D] text-[#BCACCE] hover:text-[#23003F] dark:hover:text-[#FFFDB4] transition-colors cursor-pointer"
          title="Reset Pipeline State"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
