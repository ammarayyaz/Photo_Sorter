import React from 'react';
import { Play, Trash2, Image as ImageIcon } from 'lucide-react';

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
      className={`relative w-full max-w-[400px] aspect-[280/180] min-h-[160px] max-h-[220px] cursor-pointer transition-all duration-200 group select-none ${
        isSelected ? 'scale-[1.02]' : 'hover:-translate-y-1'
      }`}
    >
      {/* 1. BACK FOLDER SILHOUETTE */}
      <svg
        viewBox="0 0 280 180"
        className="w-full h-full absolute inset-0 transition-colors"
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
          className={`transition-colors ${
            isSelected
              ? 'fill-[#FFEDE5] dark:fill-[#B83300] stroke-[#D83C00] dark:stroke-[#FF8C61]'
              : 'fill-[#F3F4F6] dark:fill-[#D83C00] stroke-[#E5E7EB] dark:stroke-[#B83300]'
          }`}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>

      {/* 2. INSERTED DOCUMENT / PHOTO PREVIEWS */}
      <div className="absolute top-[20px] left-[24px] right-[24px] h-[75px] flex items-end justify-center pointer-events-none z-10">
        {/* Left Paper Sheet */}
        <div className="w-[72px] h-[55px] bg-[#FAF8FD] dark:bg-[#1E1E1E] rounded-t-xl border border-[#E5E7EB] dark:border-[#3F3F46] transform -rotate-6 -translate-x-4 transition-transform duration-200 group-hover:-translate-y-2.5 group-hover:-rotate-8 p-2 flex flex-col gap-1.5 shadow-none">
          <div className="w-8 h-1 bg-[#9CA3AF] rounded-full" />
          <div className="w-11 h-1 bg-[#9CA3AF]/50 rounded-full" />
        </div>

        {/* Center Main Paper Sheet */}
        <div className="w-[90px] h-[70px] bg-white dark:bg-[#27272A] rounded-t-2xl border border-[#E5E7EB] dark:border-[#3F3F46] transform translate-y-0 transition-transform duration-200 group-hover:-translate-y-3 z-10 p-2.5 flex flex-col gap-1.5 shadow-none">
          <div className="flex items-center justify-between">
            <div className="w-8 h-1.5 bg-[#D83C00] rounded-full" />
            <ImageIcon className="w-3 h-3 text-[#D83C00]" />
          </div>
          <div className="w-14 h-1.5 bg-[#9CA3AF]/40 rounded-full mt-1" />
          <div className="w-10 h-1 bg-[#9CA3AF]/20 rounded-full" />
        </div>

        {/* Right Paper Sheet */}
        <div className="w-[72px] h-[52px] bg-[#FAF8FD] dark:bg-[#1E1E1E] rounded-t-xl border border-[#E5E7EB] dark:border-[#3F3F46] transform rotate-6 translate-x-4 transition-transform duration-200 group-hover:-translate-y-2.5 group-hover:rotate-8 p-2 flex flex-col gap-1.5 shadow-none">
          <div className="w-9 h-1 bg-[#9CA3AF] rounded-full" />
          <div className="w-6 h-1 bg-[#9CA3AF]/50 rounded-full" />
        </div>
      </div>

      {/* 3. FLUSH FRONT POCKET FLAP */}
      <svg
        viewBox="0 0 280 180"
        className="w-full h-full absolute inset-0 z-20 pointer-events-none transition-colors"
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
          className={`transition-colors ${
            isSelected
              ? 'fill-[#FFFFFF] dark:fill-[#9E2B00] stroke-[#D83C00] dark:stroke-[#FF8C61]'
              : 'fill-[#FFFFFF] dark:fill-[#C53700] stroke-[#E5E7EB] dark:stroke-[#B83300]'
          }`}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>

      {/* 4. FRONT POCKET CONTENT & CONTROLS */}
      <div className="absolute left-[12px] right-[12px] bottom-[8px] top-[66px] z-30 flex flex-col justify-between p-3 select-none">
        {/* Top Info Bar */}
        <div className="flex items-center justify-between">
          <span className="text-2xs font-mono tabular-nums text-[#111827] dark:text-white font-bold bg-black/10 dark:bg-black/40 px-2 py-0.5 rounded-md border border-black/10 dark:border-white/20">
            {folder.photoCount} files
          </span>

          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="Delete this folder"
              className="p-1 rounded-lg hover:bg-red-600/30 text-[#9CA3AF] dark:text-white/70 hover:text-red-500 dark:hover:text-white transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Bottom Details & Sort Button */}
        <div className="flex items-end justify-between pt-1">
          <div className="flex flex-col">
            <span className="font-heading text-2xs font-extrabold uppercase tracking-widest text-[#9CA3AF] dark:text-white/70">
              FOLDER
            </span>
            <span className="font-heading font-bold text-xs text-[#111827] dark:text-white truncate max-w-[140px]">
              {folder.name}
            </span>
            <span className="font-mono tabular-nums text-2xs text-[#6B7280] dark:text-white/80">
              {folder.size} • {folder.rawFormats}
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onSortClick) onSortClick();
            }}
            title="Auto-Sort and Enhance this folder"
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#D83C00] hover:bg-[#B83300] dark:bg-white dark:hover:bg-slate-100 text-white dark:text-[#D83C00] font-heading font-bold text-2xs tracking-wide transition-all active:scale-95 cursor-pointer shadow-none"
          >
            <Play className="w-2.5 h-2.5 fill-current" />
            <span>Sort</span>
          </button>
        </div>
      </div>
    </div>
  );
};
