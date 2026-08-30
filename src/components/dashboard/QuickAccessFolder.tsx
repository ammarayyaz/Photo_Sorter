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
          fill={isActive ? '#D83C00' : 'currentColor'}
          className={isActive ? '' : 'text-[#F9FAFB] dark:text-[#111827]'}
          stroke={isActive ? '#D83C00' : '#E5E7EB dark:#27272A'}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>

      {/* 2. Inner Folder Content Overlay */}
      <div className="relative z-10 w-full h-full flex flex-col justify-between p-4 pt-3.5 select-none">
        {/* Top: ORGANIZED FOLDER Label & Delete Action */}
        <div className="flex items-center justify-between">
          <span
            className={`font-heading text-2xs font-extrabold uppercase tracking-wider block ${
              isActive ? 'text-white/90' : 'text-[#4B5563] dark:text-[#A1A1AA]'
            }`}
          >
            ORGANIZED FOLDER
          </span>

          <div className="flex items-center gap-1.5">
            <span
              className={`font-mono tabular-nums text-2xs font-bold px-2 py-0.5 rounded-md ${
                isActive ? 'bg-black/30 text-white' : 'bg-[#D83C00]/15 text-[#D83C00] dark:text-[#FF8C61]'
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
                    : 'hover:bg-red-600/20 text-[#9CA3AF] hover:text-red-400'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Middle: Icon / Size */}
        <div className="flex items-center gap-2 mt-1">
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs ${
              isActive ? 'bg-white/20 text-white' : 'bg-[#D83C00]/15 text-[#D83C00]'
            }`}
          >
            <Folder className="w-3.5 h-3.5" />
          </div>
          <span
            className={`font-mono tabular-nums text-2xs font-semibold ${
              isActive ? 'text-white/80' : 'text-[#4B5563] dark:text-[#A1A1AA]'
            }`}
          >
            {folder.size}
          </span>
        </div>

        {/* Bottom: FOLDER Label & Folder Name */}
        <div className="mt-auto pt-1">
          <span
            className={`font-heading text-2xs font-extrabold uppercase tracking-widest block ${
              isActive ? 'text-white/80' : 'text-[#9CA3AF] dark:text-[#71717A]'
            }`}
          >
            FOLDER
          </span>
          <div
            className={`font-heading font-bold text-xs truncate mt-0.5 ${
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
