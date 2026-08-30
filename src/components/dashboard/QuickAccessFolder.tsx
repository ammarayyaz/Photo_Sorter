import React from 'react';
import { Trash2, Folder } from 'lucide-react';

export interface FolderData {
  id: string;
  name: string;
  photoCount: number;
  size: string;
  date: string;
  avatars: {
    name: string;
    avatarUrl: string;
    initials: string;
    bg: string;
  }[];
}

interface QuickAccessFolderProps {
  folder: FolderData;
  isActive: boolean;
  onClick: () => void;
  onDelete?: () => void;
}

export const QuickAccessFolder: React.FC<QuickAccessFolderProps> = ({
  folder,
  isActive,
  onClick,
  onDelete,
}) => {
  return (
    <div
      onClick={onClick}
      className={`relative w-full max-w-[400px] aspect-[280/160] min-h-[145px] max-h-[220px] cursor-pointer transition-all duration-200 group select-none ${
        isActive ? 'scale-[1.02]' : 'hover:-translate-y-1'
      }`}
    >
      {/* 1. Precise Folder Silhouette SVG */}
      <svg
        viewBox="0 0 280 160"
        className="w-full h-full absolute inset-0 transition-colors"
      >
        <path
          d="M 18,2
             H 95
             C 106,2 112,18 124,18
             H 262
             C 272,18 278,24 278,34
             V 144
             C 278,154 272,158 262,158
             H 18
             C 8,158 2,154 2,144
             V 18
             C 2,8 8,2 18,2 Z"
          className={`transition-colors ${
            isActive
              ? 'fill-[#B83300] dark:fill-[#B83300] stroke-[#D83C00] dark:stroke-[#FF8C61]'
              : 'fill-[#F9FAFB] dark:fill-[#D83C00] stroke-[#E5E7EB] dark:stroke-[#B83300]'
          }`}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>

      {/* 2. Inner Folder Content Overlay */}
      <div className="relative z-10 w-full h-full flex flex-col justify-between p-4 pt-3.5 select-none">
        {/* Top: Photo Count & Delete Action */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                isActive
                  ? 'bg-white/20 text-white'
                  : 'bg-[#D83C00]/15 dark:bg-black/30 text-[#D83C00] dark:text-white'
              }`}
            >
              <Folder className="w-3.5 h-3.5" />
            </div>
            <span
              className={`font-mono tabular-nums text-2xs font-semibold ${
                isActive ? 'text-white/80' : 'text-[#4B5563] dark:text-white/90'
              }`}
            >
              {folder.size}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className={`font-mono tabular-nums text-2xs font-bold px-2 py-0.5 rounded-md ${
                isActive
                  ? 'bg-black/30 text-white'
                  : 'bg-[#D83C00]/15 dark:bg-black/40 text-[#D83C00] dark:text-white border dark:border-white/20'
              }`}
            >
              {folder.photoCount} photos
            </span>

            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                title="Delete this folder"
                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                  isActive
                    ? 'hover:bg-white/20 text-white/80 hover:text-white'
                    : 'hover:bg-red-600/20 text-[#9CA3AF] dark:text-white/80 hover:text-red-400 dark:hover:text-white'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Bottom: Folder Name */}
        <div className="mt-auto pt-1">
          <div
            className={`font-heading font-bold text-xs truncate ${
              isActive ? 'text-white' : 'text-[#111827] dark:text-white'
            }`}
          >
            {folder.name}
          </div>
        </div>
      </div>
    </div>
  );
};
