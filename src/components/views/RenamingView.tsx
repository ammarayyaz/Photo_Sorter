import React, { useState, useMemo } from 'react';
import {
  FileSignature,
  ArrowRight,
  Sparkles,
  RotateCcw,
  Check,
  Search,
  FolderOpen,
  Sliders,
  CheckCircle2
} from 'lucide-react';
import { ProcessedItem } from '../../engine/types';

interface RenamingViewProps {
  items: ProcessedItem[];
  folders?: Array<{
    id: string;
    name: string;
    isSorted: boolean;
    date: string;
    items: ProcessedItem[];
  }>;
  onUpdateItems: (items: ProcessedItem[]) => void;
  onContinueToOutput: () => void;
}

const PREFIX_VARIATIONS = [
  'DSC', 'DSG', 'DSH', 'DSJ', 'DSK', 'DSL', 'DSM', 
  'DSN', 'DSP', 'DSR', 'DST', 'DSU', 'DSV', 'DSW', 'DSX', 'DSY', 'DSZ'
];

export function getDefaultPrefixForFolderIndex(index: number): string {
  if (index < PREFIX_VARIATIONS.length) {
    return PREFIX_VARIATIONS[index];
  }
  return `DS${String.fromCharCode(65 + (index % 26))}${Math.floor(index / 26) + 1}`;
}

export const RenamingView: React.FC<RenamingViewProps> = ({
  items,
  folders = [],
  onUpdateItems,
  onContinueToOutput,
}) => {
  const [search, setSearch] = useState<string>('');
  const [paddingDigits, setPaddingDigits] = useState<number>(2);
  const [separator, setSeparator] = useState<string>('_');
  const [appliedStatus, setAppliedStatus] = useState<boolean>(false);

  // Group items by folder
  const folderGroups = useMemo(() => {
    if (folders.length > 0) {
      return folders.map((f, idx) => ({
        folderId: f.id,
        folderName: f.name,
        defaultPrefix: getDefaultPrefixForFolderIndex(idx),
        items: f.items,
      }));
    }

    // Fallback if no structured folders: group all into 1 batch
    return [
      {
        folderId: 'default_batch',
        folderName: 'All Photos',
        defaultPrefix: 'DSC',
        items: items,
      },
    ];
  }, [folders, items]);

  // Custom prefix overrides state per folder
  const [customPrefixes, setCustomPrefixes] = useState<Record<string, string>>({});

  // Compute renamed preview for each item
  const previewMap = useMemo(() => {
    const map = new Map<string, { original: string; renamed: string; prefix: string; index: number; folderName: string }>();

    folderGroups.forEach((group, fIdx) => {
      const activePrefix = customPrefixes[group.folderId] || group.defaultPrefix || getDefaultPrefixForFolderIndex(fIdx);
      
      group.items.forEach((item, itemIdx) => {
        const orig = item.metadata.originalFilename || item.metadata.filename;
        const lastDot = orig.lastIndexOf('.');
        const ext = lastDot !== -1 ? orig.slice(lastDot) : '.JPG';
        
        const numStr = String(itemIdx + 1).padStart(paddingDigits, '0');
        const renamed = `${activePrefix}${separator}${numStr}${ext}`;

        map.set(item.metadata.id, {
          original: orig,
          renamed,
          prefix: activePrefix,
          index: itemIdx + 1,
          folderName: group.folderName,
        });
      });
    });

    // Handle any items not covered in folderGroups
    items.forEach((item, idx) => {
      if (!map.has(item.metadata.id)) {
        const orig = item.metadata.originalFilename || item.metadata.filename;
        const lastDot = orig.lastIndexOf('.');
        const ext = lastDot !== -1 ? orig.slice(lastDot) : '.JPG';
        const numStr = String(idx + 1).padStart(paddingDigits, '0');
        const renamed = `DSC${separator}${numStr}${ext}`;
        map.set(item.metadata.id, {
          original: orig,
          renamed,
          prefix: 'DSC',
          index: idx + 1,
          folderName: 'Imported Photos',
        });
      }
    });

    return map;
  }, [folderGroups, customPrefixes, items, paddingDigits, separator]);

  const [appliedItemIds, setAppliedItemIds] = useState<Set<string>>(new Set());
  const [appliedFolderIds, setAppliedFolderIds] = useState<Set<string>>(new Set());

  // Commit renaming to all items
  const handleApplyRenaming = () => {
    const updated = items.map((item) => {
      const preview = previewMap.get(item.metadata.id);
      if (!preview) return item;

      const originalFilename = item.metadata.originalFilename || item.metadata.filename;
      return {
        ...item,
        metadata: {
          ...item.metadata,
          originalFilename,
          filename: preview.renamed,
        },
      };
    });

    onUpdateItems(updated);
    setAppliedStatus(true);
    setTimeout(() => setAppliedStatus(false), 3000);
  };

  // Commit renaming to a single item
  const handleApplySingleRename = (itemId: string) => {
    const preview = previewMap.get(itemId);
    if (!preview) return;

    const updated = items.map((item) => {
      if (item.metadata.id === itemId) {
        const originalFilename = item.metadata.originalFilename || item.metadata.filename;
        return {
          ...item,
          metadata: {
            ...item.metadata,
            originalFilename,
            filename: preview.renamed,
          },
        };
      }
      return item;
    });

    onUpdateItems(updated);
    setAppliedItemIds((prev) => new Set(prev).add(itemId));
    setTimeout(() => {
      setAppliedItemIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }, 2500);
  };

  // Commit renaming to all items in a single folder
  const handleApplyFolderRename = (folderId: string) => {
    const targetGroup = folderGroups.find((g) => g.folderId === folderId);
    if (!targetGroup) return;

    const targetItemIds = new Set(targetGroup.items.map((i) => i.metadata.id));
    const updated = items.map((item) => {
      if (targetItemIds.has(item.metadata.id)) {
        const preview = previewMap.get(item.metadata.id);
        if (!preview) return item;
        const originalFilename = item.metadata.originalFilename || item.metadata.filename;
        return {
          ...item,
          metadata: {
            ...item.metadata,
            originalFilename,
            filename: preview.renamed,
          },
        };
      }
      return item;
    });

    onUpdateItems(updated);
    setAppliedFolderIds((prev) => new Set(prev).add(folderId));
    setTimeout(() => {
      setAppliedFolderIds((prev) => {
        const next = new Set(prev);
        next.delete(folderId);
        return next;
      });
    }, 2500);
  };

  // Revert renaming back to original filenames
  const handleRevertRenaming = () => {
    const updated = items.map((item) => {
      if (item.metadata.originalFilename) {
        return {
          ...item,
          metadata: {
            ...item.metadata,
            filename: item.metadata.originalFilename,
          },
        };
      }
      return item;
    });

    onUpdateItems(updated);
    setCustomPrefixes({});
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const preview = previewMap.get(item.metadata.id);
      const matchSearch = search
        ? item.metadata.filename.toLowerCase().includes(search.toLowerCase()) ||
          (preview && preview.renamed.toLowerCase().includes(search.toLowerCase()))
        : true;
      return matchSearch;
    });
  }, [items, previewMap, search]);

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pr-1 pb-6 select-none">
      {/* 1. Header Banner */}
      <div className="bg-white dark:bg-[#0E0E0E] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-4 flex items-center justify-between transition-colors shadow-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#D83C00]/15 text-[#D83C00] border border-[#D83C00]/30 flex items-center justify-center font-bold">
            <FileSignature className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-heading text-xs font-bold text-[#111827] dark:text-white">
              Step 4: Batch Image Renaming
            </h2>
            <p className="font-sans text-xs text-[#4B5563] dark:text-[#A1A1AA] mt-0.5">
              Renames images starting with <span className="text-[#D83C00] font-bold">DSC_01</span> and varies the prefix letter for each folder (<span className="text-[#D83C00] font-bold">DSG</span>, <span className="text-[#D83C00] font-bold">DSH</span>...).
            </p>
          </div>
        </div>

        <button
          onClick={onContinueToOutput}
          disabled={items.length === 0}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-white font-heading font-bold text-xs tracking-wide transition-all ${
            items.length > 0
              ? 'bg-[#D83C00] hover:bg-[#B83300] active:scale-98 cursor-pointer shadow-none'
              : 'bg-slate-300 dark:bg-slate-800 cursor-not-allowed opacity-70'
          }`}
        >
          <span>Proceed to Step 5: Final Output</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2. Renaming Controls Bar */}
      <div className="bg-[#F9FAFB] dark:bg-[#0E0E0E] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-none">
        {/* Left: Quick Format Options */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white dark:bg-[#181818] px-3 py-1.5 rounded-xl border border-[#E5E7EB] dark:border-[#27272A] text-xs">
            <Sliders className="w-3.5 h-3.5 text-[#D83C00]" />
            <span className="font-heading font-bold text-[#111827] dark:text-white">Digits:</span>
            <select
              value={paddingDigits}
              onChange={(e) => setPaddingDigits(Number(e.target.value))}
              className="bg-transparent font-mono text-xs font-bold text-[#D83C00] outline-none cursor-pointer"
            >
              <option value={2} className="dark:bg-[#181818] text-[#111827] dark:text-white">2 Digits (01, 02...)</option>
              <option value={3} className="dark:bg-[#181818] text-[#111827] dark:text-white">3 Digits (001, 002...)</option>
              <option value={4} className="dark:bg-[#181818] text-[#111827] dark:text-white">4 Digits (0001, 0002...)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-white dark:bg-[#181818] px-3 py-1.5 rounded-xl border border-[#E5E7EB] dark:border-[#27272A] text-xs">
            <span className="font-heading font-bold text-[#111827] dark:text-white">Separator:</span>
            <select
              value={separator}
              onChange={(e) => setSeparator(e.target.value)}
              className="bg-transparent font-mono text-xs font-bold text-[#D83C00] outline-none cursor-pointer"
            >
              <option value="_" className="dark:bg-[#181818] text-[#111827] dark:text-white">Underscore (_)</option>
              <option value="-" className="dark:bg-[#181818] text-[#111827] dark:text-white">Hyphen (-)</option>
              <option value="" className="dark:bg-[#181818] text-[#111827] dark:text-white">None (DSC01)</option>
            </select>
          </div>
        </div>

        {/* Right: Apply & Revert Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRevertRenaming}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#181818] hover:bg-slate-100 dark:hover:bg-[#222222] border border-[#E5E7EB] dark:border-[#27272A] text-[#111827] dark:text-white font-heading text-xs font-bold transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#9CA3AF]" />
            <span>Reset to Original</span>
          </button>

          <button
            onClick={handleApplyRenaming}
            disabled={items.length === 0}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl font-heading text-xs font-bold tracking-wide transition-all shadow-none ${
              appliedStatus
                ? 'bg-emerald-600 text-white'
                : 'bg-[#D83C00] hover:bg-[#B83300] text-white active:scale-95 cursor-pointer'
            }`}
          >
            {appliedStatus ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Names Applied!</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Apply Batch Renaming ({items.length})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3. Folder Prefix Customization Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {folderGroups.map((group, fIdx) => {
          const currentPrefix = customPrefixes[group.folderId] || group.defaultPrefix || getDefaultPrefixForFolderIndex(fIdx);

          return (
            <div
              key={group.folderId}
              className="bg-white dark:bg-[#0E0E0E] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-3 flex flex-col justify-between gap-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                  <FolderOpen className="w-4 h-4 text-[#D83C00] flex-shrink-0" />
                  <span className="font-heading font-bold text-xs text-[#111827] dark:text-white truncate">
                    {group.folderName}
                  </span>
                </div>
                <span className="text-2xs font-mono tabular-nums text-[#9CA3AF] bg-slate-100 dark:bg-[#181818] px-1.5 py-0.5 rounded">
                  {group.items.length} files
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#E5E7EB] dark:border-[#27272A]">
                <span className="font-sans text-xs text-[#4B5563] dark:text-[#A1A1AA] font-semibold">
                  Prefix:
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={currentPrefix}
                    maxLength={6}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                      setCustomPrefixes((prev) => ({
                        ...prev,
                        [group.folderId]: val,
                      }));
                    }}
                    className="bg-[#F9FAFB] dark:bg-[#181818] border border-[#D83C00]/40 rounded-lg px-2 py-0.5 font-mono text-xs font-bold text-[#D83C00] text-center w-16 outline-none focus:border-[#D83C00]"
                  />
                  <button
                    onClick={() => handleApplyFolderRename(group.folderId)}
                    className="px-2 py-1 rounded-lg bg-[#D83C00] hover:bg-[#B83300] text-white text-[10px] font-heading font-bold cursor-pointer transition-all active:scale-95 shadow-none"
                    title="Apply this prefix to all photos in this folder"
                  >
                    {appliedFolderIds.has(group.folderId) ? '✓ Applied' : 'Apply'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Search Filter & Items Overview Header */}
      <div className="flex items-center justify-between bg-white dark:bg-[#0E0E0E] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#D83C00]" />
          <span className="font-heading text-xs font-bold text-[#111827] dark:text-white">
            Renaming Preview List ({filteredItems.length} Photos)
          </span>
        </div>

        <div className="flex items-center gap-2 bg-[#F9FAFB] dark:bg-[#181818] border border-[#E5E7EB] dark:border-[#27272A] rounded-xl px-2.5 py-1 text-xs">
          <Search className="w-3.5 h-3.5 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Search filenames..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent font-sans text-xs text-[#111827] dark:text-white placeholder:text-[#9CA3AF] outline-none w-44"
          />
        </div>
      </div>

      {/* 5. Preview Table / Grid */}
      {items.length === 0 ? (
        <div className="bg-white dark:bg-[#0E0E0E] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3">
          <FolderOpen className="w-8 h-8 text-[#9CA3AF]" />
          <h3 className="font-heading text-xs font-bold text-[#111827] dark:text-white">No photos loaded for renaming</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map((item) => {
            const preview = previewMap.get(item.metadata.id);
            const isArchived = item.isArchived;
            const isSingleApplied = appliedItemIds.has(item.metadata.id);

            return (
              <div
                key={item.metadata.id}
                className="bg-white dark:bg-[#111111] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl overflow-hidden flex flex-col justify-between"
              >
                {/* 1. Unobscured Clean Photo (No Blur · No Glow) */}
                <div className="relative aspect-[4/3] w-full bg-slate-100 dark:bg-[#000000] overflow-hidden">
                  <img
                    src={item.transformedThumbnailUrl || item.thumbnailUrl}
                    alt={item.metadata.filename}
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.src !== item.thumbnailUrl && item.thumbnailUrl) {
                        target.src = item.thumbnailUrl;
                      }
                    }}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />

                  {/* Top Bar Badges */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                    <span className="px-2 py-0.5 rounded-md text-2xs font-mono font-bold bg-black/80 text-white pointer-events-auto">
                      #{preview?.index}
                    </span>
                    {isArchived && (
                      <span className="px-2 py-0.5 rounded-md text-2xs font-heading font-extrabold uppercase tracking-wider bg-red-600 text-white pointer-events-auto">
                        _archive
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Crisp Info Section BELOW Photo (No Blur · Zero Glow) */}
                <div className="p-3.5 flex flex-col gap-2 bg-white dark:bg-[#111111]">
                  {/* Original Filename (Strikethrough) + File Size */}
                  <div className="flex items-center justify-between text-2xs font-mono tabular-nums text-[#4B5563] dark:text-[#A1A1AA]">
                    <span className="truncate max-w-[170px] line-through">
                      {preview?.original}
                    </span>
                    <span>{(item.metadata.fileSize / 1000000).toFixed(2)} MB</span>
                  </div>

                  {/* New Renamed Filename Highlight Row */}
                  <div className="flex items-center justify-between pt-1 border-t border-[#E5E7EB] dark:border-[#222222]">
                    <div className="flex items-center gap-1.5 truncate">
                      <FileSignature className="w-3.5 h-3.5 text-[#D83C00] flex-shrink-0" />
                      <span className="font-mono text-xs font-extrabold text-[#D83C00] truncate">
                        {preview?.renamed}
                      </span>
                    </div>
                    <button
                      onClick={() => handleApplySingleRename(item.metadata.id)}
                      className="px-2.5 py-1 rounded-lg bg-[#D83C00] hover:bg-[#B83300] text-white text-[10px] font-heading font-bold ml-2 transition-colors cursor-pointer shadow-none flex-shrink-0"
                      title="Apply this new name to this photo"
                    >
                      {isSingleApplied ? '✓ Done' : 'Apply'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
