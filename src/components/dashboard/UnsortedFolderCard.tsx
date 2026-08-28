import React from 'react';
import { Play, Sparkles, Trash2, Image as ImageIcon } from 'lucide-react';

export interface UnsortedFolderData {
  id: string;
  name: string;
  photoCount: number;
  size: string;
  date: string;
  rawFormats: string;
}

interface UnsortedFolderCardProps {
  folder: UnsortedFolderData;
  isSelected: boolean;
  onClick: () => void;
  onSortClick?: () => void;
  onDelete?: () => void;
}

export const UnsortedFolderCard: React.FC<UnsortedFolderCardProps> = ({
  folder,
  isSelected,
  onClick,
  onSortClick,
  onDelete,
}) => {
  return (
    <div
      onClick={onClick}
      className={`relative w-full aspect-[280/180] min-h-[170px] cursor-pointer transition-all duration-200 group select-none ${
        isSelected ? 'scale-[1.02]' : 'hover:-translate-y-1'
      }`}
    >
      {/* ========================================================================= */}
      {/* 1. BACK FOLDER SILHOUETTE (Precision Apple-grade SVG) */}
      {/* ========================================================================= */}
      <svg
        viewBox="0 0 280 180"
        className="w-full h-full absolute inset-0 filter"
      >
        <path
          d="M 18,2
             H 95
             C 106,2 112,18 124,18
             H 262
             C 272,18 278,24 278,34
             V 162
             C 278,172 272,178 262,178
             H 18
             C 8,178 2,172 2,162
             V 18
             C 2,8 8,2 18,2 Z"
          fill={isSelected ? '#0F172A' : '#0B0F19'}
          stroke={isSelected ? '#1E60E6' : '#1E293B'}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>

      {/* ========================================================================= */}
      {/* 2. INSERTED DOCUMENT / PHOTO PREVIEWS (Peeking out smoothly) */}
      {/* ========================================================================= */}
      <div className="absolute top-[20px] left-[24px] right-[24px] h-[75px] flex items-end justify-center pointer-events-none z-10">
        {/* Left Paper Sheet */}
        <div className="w-[72px] h-[55px] bg-slate-200/90 rounded-t-xl border border-slate-300 transform -rotate-6 -translate-x-4 transition-transform duration-200 group-hover:-translate-y-2.5 group-hover:-rotate-8 p-2 flex flex-col gap-1.5 shadow-sm">
          <div className="w-8 h-1 bg-slate-400/60 rounded-full" />
          <div className="w-11 h-1 bg-slate-400/30 rounded-full" />
        </div>

        {/* Center Main Paper Sheet */}
        <div className="w-[90px] h-[70px] bg-white rounded-t-2xl border border-slate-200 transform translate-y-0 transition-transform duration-200 group-hover:-translate-y-3 z-10 p-2.5 flex flex-col gap-1.5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-8 h-1.5 bg-blue-500/80 rounded-full" />
            <ImageIcon className="w-3 h-3 text-slate-400" />
          </div>
          <div className="w-14 h-1.5 bg-slate-200 rounded-full mt-1" />
          <div className="w-10 h-1 bg-slate-100 rounded-full" />
        </div>

        {/* Right Paper Sheet */}
        <div className="w-[72px] h-[52px] bg-slate-100 rounded-t-xl border border-slate-200 transform rotate-6 translate-x-4 transition-transform duration-200 group-hover:-translate-y-2.5 group-hover:rotate-8 p-2 flex flex-col gap-1.5 shadow-sm">
          <div className="w-9 h-1 bg-slate-300 rounded-full" />
          <div className="w-6 h-1 bg-slate-200 rounded-full" />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. FLUSH FRONT POCKET FLAP (100% Aligned with Back Plate) */}
      {/* ========================================================================= */}
      <svg
        viewBox="0 0 280 180"
        className="w-full h-full absolute inset-0 z-20 pointer-events-none"
      >
        <path
          d="M 2,62
             C 80,62 100,56 140,56
             C 180,56 200,62 278,62
             V 162
             C 278,172 272,178 262,178
             H 18
             C 8,178 2,172 2,162
             Z"
          fill={isSelected ? '#111827' : '#0E1420'}
          stroke={isSelected ? '#1E60E6' : '#1F2937'}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>

      {/* ========================================================================= */}
      {/* 4. FRONT POCKET CONTENT & CONTROLS */}
      {/* ========================================================================= */}
      <div className="absolute left-[12px] right-[12px] bottom-[8px] top-[66px] z-30 flex flex-col justify-between p-3 select-none">
        {/* Top Info Bar */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider text-blue-400 bg-blue-950/80 border border-blue-800/40 px-2 py-0.5 rounded-full">
            <Sparkles className="w-2.5 h-2.5" />
            UNSORTED RAW
          </span>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-slate-300 font-medium bg-slate-800/60 px-2 py-0.5 rounded-md border border-slate-700/50">
              {folder.photoCount} files
            </span>

            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                title="Delete this folder"
                className="p-1 rounded-lg hover:bg-rose-900/60 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Bottom Details & Sort Button */}
        <div className="flex items-end justify-between pt-1">
          <div className="flex flex-col">
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">
              FOLDER
            </span>
            <span className="font-bold text-xs text-white truncate max-w-[140px]">
              {folder.name}
            </span>
            <span className="text-[9px] font-mono text-slate-400">
              {folder.size} • {folder.rawFormats}
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onSortClick) onSortClick();
            }}
            title="Auto-Sort and Enhance this folder"
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#1E60E6] hover:bg-blue-500 text-white text-[10px] font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
          >
            <Play className="w-2.5 h-2.5 fill-current" />
            <span>Sort</span>
          </button>
        </div>
      </div>
    </div>
  );
};
