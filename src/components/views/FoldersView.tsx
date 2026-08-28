import React, { useState, useMemo, useEffect } from 'react';
import {
  UploadCloud,
  FolderPlus,
  FileImage,
  Sparkles,
  Trash2,
  FolderCheck,
  FolderClock,
  FolderOpen,
  CheckSquare,
  Square,
  X,
  Search,
  Play,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { ProcessedItem, PipelineConfig, PipelineMetrics, FaceCluster } from '../../engine/types';
import { QuickAccessFolder, FolderData } from '../dashboard/QuickAccessFolder';
import { UnsortedFolderCard, UnsortedFolderData } from '../dashboard/UnsortedFolderCard';
import { analyzeRealImageFile } from '../../engine/realImageProcessor';
import { MinimalPhotoCalendar } from '../dashboard/MinimalPhotoCalendar';
import { getOriginalFileBlob } from '../../engine/storageManager';

interface FoldersViewProps {
  initialSubTab?: 'sorted' | 'unsorted';
  metrics?: PipelineMetrics;
  config?: PipelineConfig;
  items: ProcessedItem[];
  folders?: Array<{
    id: string;
    name: string;
    isSorted: boolean;
    date: string;
    items: ProcessedItem[];
  }>;
  setFolders?: React.Dispatch<React.SetStateAction<Array<{
    id: string;
    name: string;
    isSorted: boolean;
    date: string;
    items: ProcessedItem[];
  }>>>;
  faceClusters?: FaceCluster[];
  activeItem?: ProcessedItem | null;
  onSelectItem?: (item: ProcessedItem) => void;
  onAddRealItems?: (newItems: ProcessedItem[], folderName: string, newFolderObj?: any) => void;
  onDeleteFolder?: (folderId: string) => void;
  onDeleteImages?: (imageIds: string[]) => void;
  onChangeConfig: (newConfig: Partial<PipelineConfig>) => void;
  onStartPipeline: () => void;
}

export const FoldersView: React.FC<FoldersViewProps> = ({
  initialSubTab = 'unsorted',
  items: _items,
  folders = [],
  setFolders: _setFolders,
  faceClusters: _faceClusters = [],
  activeItem: _activeItem,
  onSelectItem,
  onAddRealItems,
  onDeleteFolder,
  onDeleteImages,
  onChangeConfig,
  onStartPipeline,
}) => {
  const [subTab, setSubTab] = useState<'sorted' | 'unsorted'>(initialSubTab);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  // Full-Screen Dedicated Folder Page State
  const [openedFolderId, setOpenedFolderId] = useState<string | null>(null);
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Full-Quality Lightbox Modal State
  const [lightboxItem, setLightboxItem] = useState<ProcessedItem | null>(null);
  const [fullResUrl, setFullResUrl] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState<number>(1);

  // Deduplicate and fallback folder structure
  const effectiveFolders = useMemo(() => {
    if (folders.length > 0) {
      // Deduplicate by ID and Name
      const unique: typeof folders = [];
      const seen = new Set<string>();
      for (const f of folders) {
        const key = `${f.id}_${f.name}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(f);
        }
      }
      return unique;
    }
    if (_items.length > 0) {
      return [
        {
          id: 'default_uploaded_photos',
          name: 'All Uploaded Photos',
          isSorted: false,
          date: new Date().toLocaleDateString(),
          items: _items,
        },
      ];
    }
    return [];
  }, [folders, _items]);

  // Handle Real Files Ingestion from Drag & Drop or Input
  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setIsAnalyzing(true);

    const filesArray = Array.from(fileList);
    const firstRel = filesArray[0]?.webkitRelativePath;
    let detectedFolderName = 'My_Uploaded_Photos';
    if (firstRel && firstRel.includes('/')) {
      detectedFolderName = firstRel.split('/')[0];
    } else {
      detectedFolderName = `Imported_Batch_${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).replace(':', '_')}`;
    }

    const processedRealItems: ProcessedItem[] = [];
    for (let i = 0; i < filesArray.length; i++) {
      const realItem = await analyzeRealImageFile(filesArray[i], i);
      processedRealItems.push(realItem);
    }

    const newFolderId = `f_${Date.now()}`;
    const newFolder = {
      id: newFolderId,
      name: detectedFolderName,
      isSorted: false,
      date: new Date().toLocaleDateString(),
      items: processedRealItems,
    };

    setSubTab('unsorted');

    if (onAddRealItems) {
      onAddRealItems(processedRealItems, detectedFolderName, newFolder);
    }

    if (onSelectItem && processedRealItems.length > 0) {
      onSelectItem(processedRealItems[0]);
    }

    onChangeConfig({ sourceDirectory: `D:/Photos/${detectedFolderName}` });
    setIsAnalyzing(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  const sortedFoldersList: FolderData[] = effectiveFolders
    .filter((f) => f.isSorted)
    .map((f) => {
      const totalBytes = f.items.reduce((sum, item) => sum + item.metadata.fileSize, 0);
      const totalMb = (totalBytes / 1000000).toFixed(1);
      return {
        id: f.id,
        name: f.name,
        photoCount: f.items.length,
        size: `${totalMb} MB`,
        date: f.date,
        avatars: [],
      };
    });

  const unsortedFoldersList: UnsortedFolderData[] = effectiveFolders
    .filter((f) => !f.isSorted)
    .map((f) => {
      const totalBytes = f.items.reduce((sum, item) => sum + item.metadata.fileSize, 0);
      const totalMb = (totalBytes / 1000000).toFixed(1);
      return {
        id: f.id,
        name: f.name,
        photoCount: f.items.length,
        size: `${totalMb} MB`,
        date: f.date,
        rawFormats: 'RAW / JPEG / HEIC',
      };
    });

  const currentTabFolders = subTab === 'unsorted' ? unsortedFoldersList : sortedFoldersList;

  // Find currently opened full-screen folder
  const openedFolder = effectiveFolders.find((f) => f.id === openedFolderId);

  const openedFolderVisibleItems = useMemo(() => {
    if (!openedFolder) return [];
    return openedFolder.items.filter((item) => {
      const matchesSearch = searchTerm
        ? item.metadata.filename.toLowerCase().includes(searchTerm.toLowerCase())
        : true;
      return matchesSearch;
    });
  }, [openedFolder, searchTerm]);

  const isAllSelected =
    openedFolderVisibleItems.length > 0 &&
    selectedImageIds.size === openedFolderVisibleItems.length;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedImageIds(new Set());
    } else {
      setSelectedImageIds(new Set(openedFolderVisibleItems.map((i) => i.metadata.id)));
    }
  };

  const handleToggleImageSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedImageIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteSelectedImages = () => {
    if (selectedImageIds.size === 0) return;
    if (onDeleteImages) {
      onDeleteImages(Array.from(selectedImageIds));
    }
    setSelectedImageIds(new Set());
  };

  const handleDeleteSingle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDeleteImages) {
      onDeleteImages([id]);
    }
    setSelectedImageIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // 1. Keyboard Navigation & Escape Key Support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxItem) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setLightboxItem(null);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          const currentIndex = openedFolderVisibleItems.findIndex(
            (i) => i.metadata.id === lightboxItem.metadata.id
          );
          if (currentIndex !== -1 && currentIndex < openedFolderVisibleItems.length - 1) {
            setLightboxItem(openedFolderVisibleItems[currentIndex + 1]);
          }
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          const currentIndex = openedFolderVisibleItems.findIndex(
            (i) => i.metadata.id === lightboxItem.metadata.id
          );
          if (currentIndex > 0) {
            setLightboxItem(openedFolderVisibleItems[currentIndex - 1]);
          }
        }
      } else if (openedFolderId) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setOpenedFolderId(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxItem, openedFolderId, openedFolderVisibleItems]);

  // 2. Load original full-resolution blob when opening lightbox
  useEffect(() => {
    if (!lightboxItem) {
      if (fullResUrl && fullResUrl.startsWith('blob:')) {
        URL.revokeObjectURL(fullResUrl);
      }
      setFullResUrl(null);
      setZoomScale(1);
      return;
    }

    let isMounted = true;
    setZoomScale(1);

    const loadFullRes = async () => {
      const blob = await getOriginalFileBlob(lightboxItem.metadata.id);
      if (isMounted) {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setFullResUrl(url);
        } else {
          setFullResUrl(lightboxItem.thumbnailUrl);
        }
      }
    };

    loadFullRes();

    return () => {
      isMounted = false;
    };
  }, [lightboxItem]);

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pr-1 pb-6 select-none">
      {/* 1. Top Sub-Tab Switcher & Upload Button */}
      <div className="flex items-center justify-between bg-[#FAF8FD] dark:bg-[#20003A] border border-[#E7E0EE] dark:border-[#4C177D] rounded-2xl p-1.5 transition-colors">
        <div className="flex items-center gap-1">
          {/* Unsorted Folders Tab */}
          <button
            onClick={() => setSubTab('unsorted')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-heading text-xs font-bold transition-colors cursor-pointer ${
              subTab === 'unsorted'
                ? 'bg-white dark:bg-[#2F0850] text-[#23003F] dark:text-[#FFFDB4] border border-[#E7E0EE] dark:border-[#5B228E]'
                : 'text-[#5A476E] dark:text-[#BCACCE] hover:text-[#23003F] dark:hover:text-white'
            }`}
          >
            <FolderClock className="w-4 h-4 text-[#F94500]" />
            <span>Unsorted Folders</span>
            <span className="text-2xs px-2 py-0.5 rounded-full font-mono font-bold tabular-nums bg-[#F94500]/15 text-[#F94500]">
              {unsortedFoldersList.length} Pending
            </span>
          </button>

          {/* Sorted Folders Tab */}
          <button
            onClick={() => setSubTab('sorted')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-heading text-xs font-bold transition-colors cursor-pointer ${
              subTab === 'sorted'
                ? 'bg-white dark:bg-[#2F0850] text-[#23003F] dark:text-[#FFFDB4] border border-[#E7E0EE] dark:border-[#5B228E]'
                : 'text-[#5A476E] dark:text-[#BCACCE] hover:text-[#23003F] dark:hover:text-white'
            }`}
          >
            <FolderCheck className="w-4 h-4 text-[#BCACCE]" />
            <span>Sorted Folders</span>
            <span className="text-2xs px-2 py-0.5 rounded-full font-mono font-bold tabular-nums bg-[#FFFDB4] text-[#23003F]">
              {sortedFoldersList.length}
            </span>
          </button>
        </div>

        {/* Real File Upload Actions (Rule 7: Strong CTAs) */}
        <div className="flex items-center gap-2 mr-1">
          <label className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#23003F] hover:bg-[#F3EFF9] dark:hover:bg-[#320857] border border-[#E7E0EE] dark:border-[#4C177D] text-[#23003F] dark:text-[#FFFDB4] font-heading text-xs font-bold cursor-pointer transition-colors">
            <FolderPlus className="w-3.5 h-3.5 text-[#F94500]" />
            <span>Select Folder</span>
            <input
              type="file"
              // @ts-ignore
              webkitdirectory=""
              directory=""
              multiple
              className="hidden"
              onChange={(e) => handleFilesSelected(e.target.files)}
            />
          </label>

          <label className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#F94500] hover:bg-[#D83C00] text-white font-heading text-xs font-bold tracking-wide cursor-pointer transition-all active:scale-98 shadow-sm">
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload Images</span>
            <input
              type="file"
              multiple
              accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff,.tif,.svg,.avif,.heic,.heif,.cr2,.cr3,.nef,.nrw,.arw,.srf,.sr2,.dng,.orf,.rw2,.pef,.ptx,.raf,.raw"
              className="hidden"
              onChange={(e) => handleFilesSelected(e.target.files)}
            />
          </label>
        </div>
      </div>

      {/* Analyzing Banner */}
      {isAnalyzing && (
        <div className="bg-[#FFFDB4]/20 dark:bg-[#23003F] border border-[#FFFDB4] rounded-2xl p-3 flex items-center justify-between text-xs text-[#23003F] dark:text-[#FFFDB4] font-semibold animate-pulse">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#F94500] animate-spin" />
            <span className="font-heading font-semibold">Analyzing image pixels, luminance, and sharpness...</span>
          </div>
          <span className="font-mono tabular-nums text-2xs bg-[#F94500] text-white px-2 py-0.5 rounded font-bold">
            Reading Canvas
          </span>
        </div>
      )}

      {/* 2. Top Hero Section: Drag & Drop Zone (Left) + Minimal Calendar (Right) */}
      <div className="grid grid-cols-3 gap-3.5 items-stretch">
        {/* Left: Drag & Drop Zone (2 Columns wide) */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`col-span-2 relative rounded-2xl border-2 border-dashed p-5 transition-colors flex flex-col items-center justify-center text-center cursor-pointer ${
            isDragging
              ? 'border-[#F94500] bg-[#F94500]/10'
              : 'border-[#BCACCE]/40 dark:border-[#5B228E] bg-[#FAF8FD] dark:bg-[#20003A] hover:bg-[#F3EFF9] dark:hover:bg-[#2A0548]'
          }`}
        >
          <div className="w-10 h-10 rounded-2xl bg-white dark:bg-[#23003F] border border-[#E7E0EE] dark:border-[#4C177D] flex items-center justify-center text-[#F94500] mb-1.5 shadow-sm">
            <UploadCloud className="w-5 h-5 animate-bounce" />
          </div>

          <h2 className="font-heading text-sm font-bold text-[#23003F] dark:text-[#FFFDB4] tracking-tight">
            Drag &amp; drop photo folders or images here
          </h2>
          <p className="font-sans text-xs text-[#5A476E] dark:text-[#BCACCE] mt-1 max-w-md leading-relaxed">
            Select your real camera folders or raw image files. LuminaSort automatically groups and tags photos by capture date on the calendar.
          </p>

          <div className="flex items-center gap-2 mt-3">
            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#23003F] border border-[#E7E0EE] dark:border-[#4C177D] hover:bg-[#F3EFF9] text-[#23003F] dark:text-[#FFFDB4] font-heading text-xs font-bold cursor-pointer transition-colors">
              <FolderPlus className="w-3.5 h-3.5 text-[#F94500]" />
              <span>Select Folder</span>
              <input
                type="file"
                // @ts-ignore
                webkitdirectory=""
                directory=""
                multiple
                className="hidden"
                onChange={(e) => handleFilesSelected(e.target.files)}
              />
            </label>

            <label className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#F94500] hover:bg-[#D83C00] text-white font-heading text-xs font-bold tracking-wide cursor-pointer transition-all active:scale-98 shadow-sm">
              <FileImage className="w-3.5 h-3.5" />
              <span>Choose Images</span>
              <input
                type="file"
                multiple
                accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff,.tif,.svg,.avif,.heic,.heif,.cr2,.cr3,.nef,.nrw,.arw,.srf,.sr2,.dng,.orf,.rw2,.pef,.ptx,.raf,.raw"
                className="hidden"
                onChange={(e) => handleFilesSelected(e.target.files)}
              />
            </label>
          </div>
        </div>

        {/* Right: Minimal Photo Calendar (1 Column wide) */}
        <div className="col-span-1">
          <MinimalPhotoCalendar
            items={_items}
            selectedDate={selectedCalendarDate}
            onSelectDate={(d) => setSelectedCalendarDate(d)}
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. FOLDERS OVERVIEW GRID (Clean, no images below) */}
      {/* ========================================================================= */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-2xs font-extrabold uppercase tracking-wider text-[#23003F] dark:text-[#FFFDB4]">
              {subTab === 'unsorted' ? 'UNSORTED FOLDERS' : 'ALL SORTED FOLDERS'}
            </h2>
            <span className="text-2xs px-2 py-0.5 rounded-full font-bold bg-[#23003F] dark:bg-[#FFFDB4] text-white dark:text-[#23003F] font-mono tabular-nums">
              {currentTabFolders.length} Folders
            </span>
          </div>
          <span className="font-sans text-xs text-[#5A476E] dark:text-[#BCACCE] font-medium">
            Click any folder to open its edge-to-edge gallery
          </span>
        </div>

        {subTab === 'unsorted' ? (
          unsortedFoldersList.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
              {unsortedFoldersList.map((folder) => (
                <UnsortedFolderCard
                  key={folder.id}
                  folder={folder}
                  isSelected={openedFolderId === folder.id}
                  onClick={() => {
                    setOpenedFolderId(folder.id);
                    setSelectedImageIds(new Set());
                    const fObj = effectiveFolders.find((f) => f.id === folder.id);
                    if (fObj && fObj.items.length > 0 && onSelectItem) {
                      onSelectItem(fObj.items[0]);
                    }
                    onChangeConfig({ sourceDirectory: `D:/Photos/${folder.name}` });
                  }}
                  onDelete={() => {
                    if (onDeleteFolder) onDeleteFolder(folder.id);
                  }}
                  onSortClick={() => {
                    onStartPipeline();
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-[#20003A] border border-[#E7E0EE] dark:border-[#4C177D] rounded-2xl p-8 text-center flex flex-col items-center gap-2 text-[#BCACCE]">
              <FolderOpen className="w-8 h-8 text-[#BCACCE]" />
              <p className="font-heading text-xs font-bold text-[#23003F] dark:text-[#FFFDB4]">No unsorted folders yet</p>
              <p className="font-sans text-xs text-[#5A476E] dark:text-[#BCACCE]">
                Drop a folder above or click "Select Folder" to load your real photos.
              </p>
            </div>
          )
        ) : (
          sortedFoldersList.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
              {sortedFoldersList.map((folder) => (
                <QuickAccessFolder
                  key={folder.id}
                  folder={folder}
                  isActive={openedFolderId === folder.id}
                  onClick={() => {
                    setOpenedFolderId(folder.id);
                    setSelectedImageIds(new Set());
                    const fObj = effectiveFolders.find((f) => f.id === folder.id);
                    if (fObj && fObj.items.length > 0 && onSelectItem) {
                      onSelectItem(fObj.items[0]);
                    }
                    onChangeConfig({ sourceDirectory: `D:/Photos/${folder.name}` });
                  }}
                  onDelete={() => {
                    if (onDeleteFolder) onDeleteFolder(folder.id);
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-[#20003A] border border-[#E7E0EE] dark:border-[#4C177D] rounded-2xl p-8 text-center flex flex-col items-center gap-2 text-[#BCACCE]">
              <FolderCheck className="w-8 h-8 text-[#BCACCE]" />
              <p className="font-heading text-xs font-bold text-[#23003F] dark:text-[#FFFDB4]">No sorted folders yet</p>
              <p className="font-sans text-xs text-[#5A476E] dark:text-[#BCACCE]">
                Run the pipeline on your unsorted folders to generate sorted collections.
              </p>
            </div>
          )
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. DEDICATED FULLSCREEN EDGE-TO-EDGE FOLDER PAGE (NO BORDERS, ZERO GAP) */}
      {/* ========================================================================= */}
      {openedFolder && (
        <div className="fixed inset-0 z-[9999] bg-black text-white flex flex-col w-screen h-screen m-0 p-0 overflow-hidden select-none animate-in fade-in duration-150">
          {/* Top Clean Full-Screen Header Bar */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 bg-[#120022] flex-shrink-0 z-20">
            {/* Left: Folder Name & Count */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#F94500]/15 text-[#F94500] border border-[#F94500]/30 flex items-center justify-center font-bold">
                <FolderOpen className="w-4.5 h-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-heading text-sm font-extrabold text-[#FFFDB4] tracking-tight">
                    {openedFolder.name}
                  </h1>
                  <span className="text-2xs px-2 py-0.5 rounded-full bg-[#FFFDB4] text-[#23003F] font-mono tabular-nums font-bold">
                    {openedFolder.items.length} Photos
                  </span>
                </div>
                <p className="font-mono tabular-nums text-2xs text-[#BCACCE] mt-0.5">
                  {(
                    openedFolder.items.reduce((s, i) => s + i.metadata.fileSize, 0) / 1000000
                  ).toFixed(1)}{' '}
                  MB Total Folder Size
                </p>
              </div>
            </div>

            {/* Middle: Quick Search */}
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs w-64">
              <Search className="w-4 h-4 text-[#BCACCE]" />
              <input
                type="text"
                placeholder="Search images in folder..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent font-sans text-xs text-white placeholder:text-[#BCACCE] outline-none w-full"
              />
            </div>

            {/* Right: Actions & Close Cross Button */}
            <div className="flex items-center gap-2.5">
              {/* Select All Checkbox */}
              <button
                onClick={handleToggleSelectAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-[#FFFDB4] font-heading text-xs font-bold transition-colors cursor-pointer"
              >
                {isAllSelected ? (
                  <CheckSquare className="w-4 h-4 text-[#F94500]" />
                ) : (
                  <Square className="w-4 h-4 text-[#BCACCE]" />
                )}
                <span>{isAllSelected ? 'Deselect All' : 'Select All'}</span>
              </button>

              {/* Delete Selected (X) Photos */}
              {selectedImageIds.size > 0 && (
                <button
                  onClick={handleDeleteSelectedImages}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#F94500] hover:bg-[#D83C00] text-white font-heading text-xs font-bold tracking-wide transition-all cursor-pointer active:scale-95 shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Selected ({selectedImageIds.size})</span>
                </button>
              )}

              {/* Start Sorting Trigger */}
              <button
                onClick={() => {
                  setOpenedFolderId(null);
                  onStartPipeline();
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#F94500] hover:bg-[#D83C00] text-white font-heading text-xs font-bold tracking-wide transition-all cursor-pointer active:scale-95 shadow-sm"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Auto-Sorting</span>
              </button>

              {/* Close Cross Button */}
              <button
                onClick={() => setOpenedFolderId(null)}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-[#FFFDB4] flex items-center justify-center transition-colors cursor-pointer ml-1"
                title="Close Fullscreen View (Esc)"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>

          {/* Fullscreen Edge-to-Edge Photo Grid (NO BORDERS, ZERO GAP, FLUSH EDGE-TO-EDGE) */}
          <div className="flex-1 overflow-y-auto p-0 m-0 bg-black">
            {openedFolderVisibleItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-[#BCACCE] gap-2 p-8">
                <FileImage className="w-12 h-12 text-[#BCACCE]" />
                <p className="font-heading text-sm font-bold text-[#FFFDB4]">No images in this folder</p>
                <p className="font-sans text-xs text-[#BCACCE]">All photos were deleted or none match your search.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-0 p-0 m-0 w-full">
                {openedFolderVisibleItems.map((item) => {
                  const isChecked = selectedImageIds.has(item.metadata.id);

                  return (
                    <div
                      key={item.metadata.id}
                      onClick={() => {
                        setLightboxItem(item);
                        if (onSelectItem) onSelectItem(item);
                      }}
                      className={`relative group aspect-[4/3] w-full overflow-hidden cursor-pointer bg-neutral-900 select-none border-0 ${
                        isChecked
                          ? 'ring-4 ring-inset ring-[#F94500] z-10'
                          : ''
                      }`}
                    >
                      {/* Flush Edge-to-Edge Image */}
                      <img
                        src={item.thumbnailUrl}
                        alt={item.metadata.filename}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />

                      {/* Selection Tint when Checked */}
                      {isChecked && <div className="absolute inset-0 bg-[#F94500]/20 pointer-events-none" />}

                      {/* Top Left Selection Checkbox Overlay */}
                      <button
                        onClick={(e) => handleToggleImageSelection(item.metadata.id, e)}
                        className={`absolute top-2 left-2 z-10 p-1.5 rounded-lg bg-black/60 hover:bg-black text-white backdrop-blur-md transition-opacity cursor-pointer ${
                          isChecked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}
                        title={isChecked ? 'Deselect image' : 'Select image for deletion'}
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-[#F94500]" />
                        ) : (
                          <Square className="w-4 h-4 text-white" />
                        )}
                      </button>

                      {/* Top Right Delete Button Overlay */}
                      <button
                        onClick={(e) => handleDeleteSingle(item.metadata.id, e)}
                        className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-black/60 hover:bg-[#F94500] text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="Delete this image"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Bottom Gradient Metadata Bar on Hover */}
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2 pt-6 flex items-center justify-between text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                        <div className="flex flex-col min-w-0 pr-1">
                          <span className="font-heading font-bold text-xs truncate max-w-[140px] text-white">
                            {item.metadata.filename}
                          </span>
                          <span className="font-mono tabular-nums text-2xs text-[#BCACCE]">
                            {(item.metadata.fileSize / 1000000).toFixed(1)} MB • {item.metadata.dimensions.width}×{item.metadata.dimensions.height}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="bg-black/60 text-[#FFFDB4] px-1.5 py-0.5 rounded text-2xs font-mono">
                            Lum {item.lightroom.meanLuminance}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. FULL-QUALITY LIGHTBOX MODAL WITH ESCAPE & ARROWS NAVIGATION */}
      {/* ========================================================================= */}
      {lightboxItem && (
        <div
          onClick={() => setLightboxItem(null)}
          className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-md flex flex-col justify-between w-screen h-screen m-0 p-0 overflow-hidden select-none animate-in fade-in duration-150"
        >
          {/* Top Floating Control Bar */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-between px-6 py-3 bg-black/70 border-b border-white/10 backdrop-blur-md flex-shrink-0 z-30"
          >
            {/* Left: Info */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#F94500]/20 text-[#F94500] border border-[#F94500]/40 flex items-center justify-center font-bold">
                <FileImage className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-heading font-extrabold text-sm text-white tracking-tight">
                    {lightboxItem.metadata.filename}
                  </span>
                  <span className="text-2xs px-2 py-0.5 rounded-full bg-[#FFFDB4] text-[#23003F] font-mono tabular-nums font-bold">
                    {(lightboxItem.metadata.fileSize / 1000000).toFixed(2)} MB
                  </span>
                </div>
                <p className="font-mono tabular-nums text-2xs text-[#BCACCE] mt-0.5">
                  {lightboxItem.metadata.dimensions.width} × {lightboxItem.metadata.dimensions.height} px • Sharpness: {lightboxItem.quality.laplacianSharpness.toFixed(0)} • Luminance: {lightboxItem.lightroom.meanLuminance}
                </p>
              </div>
            </div>

            {/* Center: Image Counter */}
            <div className="font-mono text-xs text-[#BCACCE]">
              {openedFolderVisibleItems.findIndex((i) => i.metadata.id === lightboxItem.metadata.id) + 1} / {openedFolderVisibleItems.length}
            </div>

            {/* Right: Controls & Prominent Close Cross Button */}
            <div className="flex items-center gap-2">
              {/* Zoom Controls */}
              <button
                onClick={() => setZoomScale((s) => Math.min(3, s + 0.25))}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Zoom In (+)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoomScale((s) => Math.max(0.5, s - 0.25))}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Zoom Out (-)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              {zoomScale !== 1 && (
                <button
                  onClick={() => setZoomScale(1)}
                  className="px-2 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-mono text-white transition-colors cursor-pointer"
                  title="Reset Zoom"
                >
                  {Math.round(zoomScale * 100)}%
                </button>
              )}

              {/* Toggle Selection */}
              <button
                onClick={(e) => handleToggleImageSelection(lightboxItem.metadata.id, e)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-colors cursor-pointer font-heading text-xs font-bold ${
                  selectedImageIds.has(lightboxItem.metadata.id)
                    ? 'border-[#F94500] bg-[#F94500] text-white'
                    : 'border-white/20 bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                {selectedImageIds.has(lightboxItem.metadata.id) ? (
                  <CheckSquare className="w-3.5 h-3.5" />
                ) : (
                  <Square className="w-3.5 h-3.5" />
                )}
                <span>{selectedImageIds.has(lightboxItem.metadata.id) ? 'Selected' : 'Select'}</span>
              </button>

              {/* Delete */}
              <button
                onClick={(e) => {
                  handleDeleteSingle(lightboxItem.metadata.id, e);
                  const nextIndex = openedFolderVisibleItems.findIndex((i) => i.metadata.id === lightboxItem.metadata.id);
                  if (openedFolderVisibleItems.length > 1) {
                    const nextItem = openedFolderVisibleItems[nextIndex + 1] || openedFolderVisibleItems[nextIndex - 1];
                    setLightboxItem(nextItem || null);
                  } else {
                    setLightboxItem(null);
                  }
                }}
                className="p-2 rounded-xl bg-white/10 hover:bg-[#F94500] text-white transition-colors cursor-pointer ml-1"
                title="Delete Image"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              {/* Close Button (X) */}
              <button
                onClick={() => setLightboxItem(null)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#F94500] hover:bg-[#D83C00] text-white font-heading text-xs font-bold transition-all cursor-pointer ml-2 shadow-lg"
                title="Close Full Preview (Esc)"
              >
                <X className="w-4 h-4" />
                <span>Close (Esc)</span>
              </button>
            </div>
          </div>

          {/* Center Stage Full-Quality Image View */}
          <div
            onClick={() => setLightboxItem(null)}
            className="flex-1 relative flex items-center justify-center overflow-hidden p-4"
          >
            {/* Previous Arrow Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                const currentIndex = openedFolderVisibleItems.findIndex((i) => i.metadata.id === lightboxItem.metadata.id);
                if (currentIndex > 0) {
                  setLightboxItem(openedFolderVisibleItems[currentIndex - 1]);
                }
              }}
              disabled={openedFolderVisibleItems.findIndex((i) => i.metadata.id === lightboxItem.metadata.id) <= 0}
              className="absolute left-6 z-30 p-3 rounded-full bg-black/60 hover:bg-black text-white border border-white/20 disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer backdrop-blur-sm"
              title="Previous Photo (←)"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Main Full-Quality Image */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-full max-h-full flex items-center justify-center overflow-hidden"
              style={{ transform: `scale(${zoomScale})`, transition: 'transform 0.15s ease' }}
            >
              <img
                src={fullResUrl || lightboxItem.thumbnailUrl}
                alt={lightboxItem.metadata.filename}
                className="max-w-[90vw] max-h-[82vh] object-contain rounded-md shadow-2xl"
              />
            </div>

            {/* Next Arrow Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                const currentIndex = openedFolderVisibleItems.findIndex((i) => i.metadata.id === lightboxItem.metadata.id);
                if (currentIndex < openedFolderVisibleItems.length - 1) {
                  setLightboxItem(openedFolderVisibleItems[currentIndex + 1]);
                }
              }}
              disabled={openedFolderVisibleItems.findIndex((i) => i.metadata.id === lightboxItem.metadata.id) >= openedFolderVisibleItems.length - 1}
              className="absolute right-6 z-30 p-3 rounded-full bg-black/60 hover:bg-black text-white border border-white/20 disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer backdrop-blur-sm"
              title="Next Photo (→)"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Bottom Bar: Quality & Lightroom parameters */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="px-6 py-2 bg-black/70 border-t border-white/10 backdrop-blur-md flex items-center justify-between text-xs text-[#BCACCE] z-30"
          >
            <div className="flex items-center gap-4 font-mono text-2xs">
              <span>ISO / Lum: <strong className="text-white">{lightboxItem.lightroom.meanLuminance}</strong></span>
              <span>Sharpness: <strong className="text-[#FFFDB4]">{lightboxItem.quality.laplacianSharpness.toFixed(1)}</strong></span>
              <span>Exposure: <strong className="text-white">{lightboxItem.lightroom.exposureState}</strong></span>
              {lightboxItem.lightroom.contrast !== 0 && (
                <span>Contrast: {lightboxItem.lightroom.contrast > 0 ? `+${lightboxItem.lightroom.contrast}` : lightboxItem.lightroom.contrast}</span>
              )}
            </div>
            <span className="text-2xs text-[#BCACCE]/70">
              Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-white">Esc</kbd> to close • Use <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-white">←</kbd> <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-white">→</kbd> to browse
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
