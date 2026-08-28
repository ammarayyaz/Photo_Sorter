import React from 'react';

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
}

export const QuickAccessFolder: React.FC<QuickAccessFolderProps> = ({
  folder,
  isActive,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`relative w-full aspect-[260/145] min-h-[135px] cursor-pointer transition-transform duration-150 group ${
        isActive ? 'scale-[1.01]' : 'hover:-translate-y-0.5'
      }`}
    >
      {/* 1. Precise Folder Silhouette SVG with Inset Margins to Prevent Edge Clipping */}
      <svg
        viewBox="-1 -1 262 147"
        className="w-full h-full absolute inset-0 transition-colors"
      >
        <path
          d="M 18,1
             L 102,1
             C 114,1 121,15 135,15
             L 242,15
             C 251,15 259,23 259,32
             L 259,127
             C 259,136 251,144 242,144
             L 18,144
             C 9,144 1,136 1,127
             L 1,18
             C 1,9 9,1 18,1 Z"
          fill={isActive ? '#1E60E6' : '#F3F6FA'}
          stroke={isActive ? '#1E60E6' : '#E2E8F0'}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>

      {/* 2. Inner Folder Content Overlay */}
      <div className="relative z-10 w-full h-full flex flex-col justify-between p-4 pt-3.5 select-none">
        {/* Top: SHARED WITH Label & Avatar Stack */}
        <div>
          <span
            className={`text-[9px] font-extrabold uppercase tracking-wider block ${
              isActive ? 'text-white/90' : 'text-slate-500'
            }`}
          >
            SHARED WITH
          </span>

          {/* Overlapping Avatar Stack */}
          <div className="flex items-center -space-x-1.5 mt-2">
            {folder.avatars.map((av, idx) => (
              <div
                key={idx}
                className={`w-7 h-7 rounded-full overflow-hidden flex items-center justify-center font-bold text-[10px] ring-2 ${
                  isActive ? 'ring-[#1E60E6] bg-white/25 text-white' : 'ring-[#F3F6FA] text-white'
                }`}
                title={av.name}
              >
                {av.avatarUrl ? (
                  <img
                    src={av.avatarUrl}
                    alt={av.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className={`${av.bg} w-full h-full flex items-center justify-center`}>
                    {av.initials}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: FOLDER Label & Folder Name */}
        <div className="mt-auto pt-1">
          <span
            className={`text-[9px] font-extrabold uppercase tracking-widest block ${
              isActive ? 'text-white/80' : 'text-slate-400'
            }`}
          >
            FOLDER
          </span>
          <div
            className={`font-bold text-xs truncate mt-0.5 ${
              isActive ? 'text-white' : 'text-[#1E60E6]'
            }`}
          >
            {folder.name}
          </div>
        </div>
      </div>
    </div>
  );
};
