import React from 'react';
import { Play, Sparkles } from 'lucide-react';

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
}

export const UnsortedFolderCard: React.FC<UnsortedFolderCardProps> = ({
  folder,
  isSelected,
  onClick,
  onSortClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`relative w-full aspect-[260/175] min-h-[165px] cursor-pointer transition-transform duration-150 group ${
        isSelected ? 'scale-[1.01]' : 'hover:-translate-y-0.5'
      }`}
    >
      {/* 1. Black Folder Back Shell (Safe Inset to Prevent Edge Slicing) */}
      <svg
        viewBox="-1 -1 262 177"
        className="w-full h-full absolute inset-0"
      >
        <path
          d="M 20,1
             L 100,1
             C 114,1 120,19 135,19
             L 240,19
             C 251,19 259,27 259,38
             L 259,154
             C 259,165 251,173 240,173
             L 20,173
             C 9,173 1,165 1,154
             L 1,20
             C 1,9 9,1 20,1 Z"
          fill="#0B0F19"
          stroke={isSelected ? '#2563EB' : '#1E293B'}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>

      {/* 2. Paper Document Inserts Peaking Out */}
      <div className="absolute top-[16px] left-[24px] right-[24px] h-[75px] flex items-end justify-center z-10 pointer-events-none">
        {/* Left Staggered Sheet */}
        <div className="w-[74px] h-[58px] bg-slate-200 rounded-t-xl rounded-b-sm border border-slate-300 transform -rotate-6 -translate-x-3 transition-transform group-hover:-translate-y-2 group-hover:-rotate-8 p-2 flex flex-col gap-1.5">
          <div className="w-10 h-1.5 bg-slate-400/60 rounded-full" />
          <div className="w-8 h-1 bg-slate-400/40 rounded-full" />
          <div className="w-11 h-1 bg-slate-400/40 rounded-full" />
        </div>

        {/* Center Main Sheet */}
        <div className="w-[84px] h-[72px] bg-white rounded-t-2xl rounded-b-md border border-slate-200 transform translate-y-0 transition-transform group-hover:-translate-y-3 z-10 p-2.5 flex flex-col gap-1.5">
          <div className="w-12 h-2 bg-slate-300 rounded-full" />
          <div className="w-14 h-1.5 bg-slate-200 rounded-full" />
          <div className="w-10 h-1.5 bg-slate-200 rounded-full" />
          <div className="w-12 h-1 bg-slate-100 rounded-full" />
        </div>

        {/* Right Staggered Sheet */}
        <div className="w-[72px] h-[54px] bg-slate-100 rounded-t-xl rounded-b-sm border border-slate-200 transform rotate-6 translate-x-3 transition-transform group-hover:-translate-y-2 group-hover:rotate-8 p-2 flex flex-col gap-1.5">
          <div className="w-9 h-1.5 bg-slate-300/60 rounded-full" />
          <div className="w-11 h-1 bg-slate-300/40 rounded-full" />
        </div>
      </div>

      {/* 3. Black Front Pocket Flap (Zero Shadows) */}
      <div className="absolute left-[6px] right-[6px] bottom-[6px] top-[64px] bg-[#111827] rounded-[20px] border border-white/10 p-3.5 z-20 flex flex-col justify-between select-none">
        {/* Top Info Strip */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider text-blue-400 bg-blue-950 border border-blue-800/40 px-2 py-0.5 rounded-full">
            <Sparkles className="w-2.5 h-2.5" />
            UNSORTED RAW
          </span>
          <span className="text-[10px] font-mono text-slate-400 font-medium">
            {folder.photoCount} files
          </span>
        </div>

        {/* Debossed Subtle Lines on Pocket Face */}
        <div className="flex flex-col gap-1 my-auto opacity-25 py-1">
          <div className="w-full h-[1px] bg-white/20" />
          <div className="w-full h-[1px] bg-white/15" />
          <div className="w-full h-[1px] bg-white/10" />
        </div>

        {/* Bottom Folder Name & Quick Sort Trigger */}
        <div className="flex items-end justify-between pt-1">
          <div className="flex flex-col">
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">
              FOLDER
            </span>
            <span className="font-bold text-xs text-white truncate max-w-[130px]">
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
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold transition-colors active:scale-95"
          >
            <Play className="w-2.5 h-2.5 fill-current" />
            <span>Sort</span>
          </button>
        </div>
      </div>
    </div>
  );
};
