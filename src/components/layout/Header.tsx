import React from 'react';
import {
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Share2,
  SlidersHorizontal
} from 'lucide-react';
import { ActiveTab } from './Sidebar';
import { ProcessingStatus } from '../../engine/types';

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
  const getTabBreadcrumb = () => {
    switch (activeTab) {
      case 'step1-folders':
        return 'Step 1: Ingest & Browse Folders';
      case 'step2-culling':
        return 'Step 2: Blur & Motion Culling (_archive)';
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
    <header className="flex items-center justify-between pb-4 select-none">
      {/* 1. Left Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
          <span className="text-blue-600 font-bold">{getTabBreadcrumb()}</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-900 font-bold truncate max-w-[200px]">
            {folderName}
          </span>
        </div>
      </div>

      {/* 2. Top Right Control Actions */}
      <div className="flex items-center gap-2">
        {/* Manage Button */}
        <button
          onClick={() => alert('Batch Configuration & Destination Explorer')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
          <span>Manage</span>
        </button>

        {/* Share Button */}
        <button
          onClick={() => alert('Share Album with Detected Face Contacts')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors"
        >
          <Share2 className="w-3.5 h-3.5 text-slate-500" />
          <span>Share</span>
        </button>

        {/* Primary Action Button */}
        {status === 'IDLE' && (
          <button
            onClick={onStart}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-colors active:scale-98"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Run 4-Step Pipeline</span>
          </button>
        )}

        {isRunning && (
          <button
            onClick={onPause}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors"
          >
            <Pause className="w-3.5 h-3.5 fill-current" />
            <span>Pause</span>
          </button>
        )}

        {status === 'PAUSED' && (
          <button
            onClick={onResume}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Resume</span>
          </button>
        )}

        {status === 'COMPLETED' && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Pipeline Complete</span>
          </div>
        )}

        {/* Reset Trigger */}
        <button
          onClick={onReset}
          className="p-1.5 rounded-xl hover:bg-slate-100 border border-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
          title="Reset Pipeline State"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
