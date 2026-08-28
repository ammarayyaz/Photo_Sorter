import React, { useState, useMemo } from 'react';
import {
  UploadCloud,
  FolderPlus,
  FileImage,
  Sparkles,
  Trash2,
  Play,
  FolderCheck,
  FolderClock,
  FolderOpen,
  CheckSquare,
  Square,
  LayoutGrid,
  List,
  Search
} from 'lucide-react';
import { ProcessedItem, PipelineConfig, PipelineMetrics, FaceCluster } from '../../engine/types';
import { QuickAccessFolder, FolderData } from '../dashboard/QuickAccessFolder';
import { UnsortedFolderCard, UnsortedFolderData } from '../dashboard/UnsortedFolderCard';
import { analyzeRealImageFile } from '../../engine/realImageProcessor';
import { MinimalPhotoCalendar } from '../dashboard/MinimalPhotoCalendar';

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
  setFolders,
  faceClusters: _faceClusters = [],
  activeItem,
  onSelectItem,
  onAddRealItems,
  onDeleteFolder,
  onDeleteImages,
  onChangeConfig,
  onStartPipeline,
}) => {
  const [subTab, setSubTab] = useState<'sorted' | 'unsorted'>(initialSubTab);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());

  // Ensure there is always a folder structure even if images were uploaded without a folder
  const effectiveFolders = useMemo(() => {
    if (folders.length > 0) return folders;
    if (_items.length > 0) {
      return [
        {
          id: 'default_all_uploaded',
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
    // Determine folder name from webkitRelativePath or use batch timestamp
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

    if (setFolders) {
      setFolders((prev) => [newFolder, ...prev]);
    }
    setSelectedFolderId(newFolderId);
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

  // Pick selected folder or fallback to first folder
  const currentTabFolders = subTab === 'unsorted' ? unsortedFoldersList : sortedFoldersList;
  const currentTabFolderId = selectedFolderId || (currentTabFolders[0]?.id ?? '');
  const selectedFolderObj = effectiveFolders.find((f) => f.id === currentTabFolderId) || effectiveFolders[0];

  const currentFolderVisibleItems = useMemo(() => {
    if (!selectedFolderObj) return [];
    return selectedFolderObj.items.filter((item) => {
      const matchesDate = selectedCalendarDate
        ? item.metadata.timestamp.startsWith(selectedCalendarDate)
        : true;
      const matchesSearch = searchTerm
        ? item.metadata.filename.toLowerCase().includes(searchTerm.toLowerCase())
        : true;
      return matchesDate && matchesSearch;
    });
  }, [selectedFolderObj, selectedCalendarDate, searchTerm]);

  const handleToggleSelectAllImages = () => {
    if (selectedImageIds.size === currentFolderVisibleItems.length && currentFolderVisibleItems.length > 0) {
      setSelectedImageIds(new Set());
    } else {
      setSelectedImageIds(new Set(currentFolderVisibleItems.map((i) => i.metadata.id)));
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

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pr-1 pb-6 select-none">
      {/* 1. Top Sub-Tab Switcher & Upload Button */}
      <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl p-1.5">
        <div className="flex items-center gap-1">
          {/* Unsorted Folders Tab */}
          <button
            onClick={() => {
              setSubTab('unsorted');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              subTab === 'unsorted'
                ? 'bg-white text-slate-900 border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderClock className="w-4 h-4 text-amber-500" />
            <span>Unsorted Folders</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-amber-100 text-amber-800">
              {unsortedFoldersList.length} Pending
            </span>
          </button>

          {/* Sorted Folders Tab */}
          <button
            onClick={() => {
              setSubTab('sorted');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              subTab === 'sorted'
                ? 'bg-white text-[#1E60E6] border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderCheck className="w-4 h-4 text-[#1E60E6]" />
            <span>Sorted Folders</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-blue-100 text-[#1E60E6]">
              {sortedFoldersList.length}
            </span>
          </button>
        </div>

        {/* Real File Upload Actions */}
        <div className="flex items-center gap-2 mr-1">
          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-colors">
            <FolderPlus className="w-3.5 h-3.5 text-[#1E60E6]" />
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

          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1E60E6] hover:bg-blue-700 text-white text-xs font-bold cursor-pointer transition-colors">
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
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 flex items-center justify-between text-xs text-blue-900 font-semibold animate-pulse">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600 animate-spin" />
            <span>Analyzing real image pixels, luminance, and sharpness...</span>
          </div>
          <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-blue-200">
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
              ? 'border-[#1E60E6] bg-blue-50/80'
              : 'border-slate-300 bg-slate-50/50 hover:bg-slate-100/50 hover:border-blue-400'
          }`}
        >
          <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-[#1E60E6] mb-1.5">
            <UploadCloud className="w-5 h-5 animate-bounce" />
          </div>

          <h2 className="text-xs font-bold text-slate-800 tracking-tight">
            Drag &amp; drop photo folders or images here
          </h2>
          <p className="text-[10px] text-slate-400 mt-0.5 max-w-sm">
            Select your real camera folders or raw image files. LuminaSort automatically groups and tags photos by capture date on the calendar.
          </p>

          <div className="flex items-center gap-2 mt-2.5">
            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer transition-colors">
              <FolderPlus className="w-3.5 h-3.5 text-[#1E60E6]" />
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

            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1E60E6] hover:bg-blue-700 text-white text-xs font-bold cursor-pointer transition-colors">
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
      {/* FOLDERS GRID SECTION (Unsorted or Sorted) */}
      {/* ========================================================================= */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
              {subTab === 'unsorted' ? 'UNSORTED FOLDERS' : 'ALL SORTED FOLDERS'}
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-900 text-white font-mono">
              {currentTabFolders.length} Folders
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Click any folder to open and inspect all images inside it
          </span>
        </div>

        {subTab === 'unsorted' ? (
          unsortedFoldersList.length > 0 ? (
            <div className="grid grid-cols-3 gap-4">
              {unsortedFoldersList.map((folder) => (
                <UnsortedFolderCard
                  key={folder.id}
                  folder={folder}
                  isSelected={selectedFolderObj?.id === folder.id}
                  onClick={() => {
                    setSelectedFolderId(folder.id);
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
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center flex flex-col items-center gap-2 text-slate-400">
              <FolderOpen className="w-8 h-8 text-slate-300" />
              <p className="text-xs font-medium text-slate-600">No unsorted folders yet</p>
              <p className="text-[10px] text-slate-400">
                Drop a folder above or click "Select Folder" to load your real photos.
              </p>
            </div>
          )
        ) : (
          sortedFoldersList.length > 0 ? (
            <div className="grid grid-cols-3 gap-3.5">
              {sortedFoldersList.map((folder) => (
                <QuickAccessFolder
                  key={folder.id}
                  folder={folder}
                  isActive={selectedFolderObj?.id === folder.id}
                  onClick={() => {
                    setSelectedFolderId(folder.id);
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
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center flex flex-col items-center gap-2 text-slate-400">
              <FolderCheck className="w-8 h-8 text-slate-300" />
              <p className="text-xs font-medium text-slate-600">No sorted folders yet</p>
              <p className="text-[10px] text-slate-400">
                Run the pipeline on your unsorted folders to generate sorted collections.
              </p>
            </div>
          )
        )}
      </div>

      {/* ========================================================================= */}
      {/* PROMINENT OPEN FOLDER EXPLORER (Shows images inside clicked folder) */}
      {/* ========================================================================= */}
      {selectedFolderObj && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-3 mt-1">
          {/* Header Bar for Open Folder */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1E60E6] border border-blue-200 flex items-center justify-center font-bold">
                <FolderOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-xs text-slate-900">
                    {selectedFolderObj.name}
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-[#1E60E6] font-mono font-bold">
                    Active Folder
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  {selectedFolderObj.items.length} Real Photos •{' '}
                  {(
                    selectedFolderObj.items.reduce(
                      (sum, i) => sum + i.metadata.fileSize,
                      0
                    ) / 1000000
                  ).toFixed(1)}{' '}
                  MB Total Size
                </p>
              </div>
            </div>

            {/* Folder Actions & View Switcher */}
            <div className="flex items-center gap-2">
              {/* Search Inside Folder */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter images..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-transparent text-xs text-slate-900 placeholder:text-slate-400 outline-none w-28"
                />
              </div>

              {/* View Mode Toggle (Grid vs Table) */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-white text-[#1E60E6] font-bold shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="Grid Preview"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === 'table'
                      ? 'bg-white text-[#1E60E6] font-bold shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="Table Details"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Delete Selected Photos Button */}
              {selectedImageIds.size > 0 && (
                <button
                  onClick={handleDeleteSelectedImages}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold transition-colors active:scale-98 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Selected ({selectedImageIds.size})</span>
                </button>
              )}

              {/* Delete Entire Current Folder Button */}
              {onDeleteFolder && selectedFolderObj.id !== 'default_all_uploaded' && (
                <button
                  onClick={() => onDeleteFolder(selectedFolderObj.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-600 text-xs font-bold transition-colors cursor-pointer"
                  title="Delete this entire folder and all its images"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Folder</span>
                </button>
              )}

              <button
                onClick={onStartPipeline}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1E60E6] hover:bg-blue-700 text-white font-bold text-xs transition-colors active:scale-98 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Auto-Sorting &amp; Leveling</span>
              </button>
            </div>
          </div>

          {/* Calendar Date Filter Active Bar */}
          {selectedCalendarDate && (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl text-xs text-[#1E60E6] font-medium">
              <div className="flex items-center gap-1.5">
                <span className="font-bold">Filtering by Date:</span>
                <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-blue-200">
                  {selectedCalendarDate}
                </span>
                <span>
                  ({currentFolderVisibleItems.length} photos match)
                </span>
              </div>
              <button
                onClick={() => setSelectedCalendarDate(null)}
                className="text-[11px] font-bold text-blue-700 hover:text-blue-900 underline cursor-pointer"
              >
                Clear Date Filter
              </button>
            </div>
          )}

          {/* MODE A: GRID THUMBNAIL GALLERY VIEW */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-4 gap-3">
              {currentFolderVisibleItems.map((item) => {
                const isSelectedRow = activeItem?.metadata.id === item.metadata.id;
                const isChecked = selectedImageIds.has(item.metadata.id);

                return (
                  <div
                    key={item.metadata.id}
                    onClick={() => onSelectItem && onSelectItem(item)}
                    className={`relative rounded-2xl border p-2.5 flex flex-col justify-between transition-colors cursor-pointer ${
                      isChecked
                        ? 'border-blue-500 bg-blue-50/50'
                        : isSelectedRow
                        ? 'border-[#1E60E6] bg-slate-50'
                        : 'border-slate-200 hover:border-blue-300 bg-white'
                    }`}
                  >
                    {/* Thumbnail Image Container */}
                    <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-900 border border-slate-100">
                      <img
                        src={item.thumbnailUrl}
                        alt={item.metadata.filename}
                        className="w-full h-full object-cover"
                      />

                      {/* Checkbox Trigger Top Left */}
                      <button
                        onClick={(e) => handleToggleImageSelection(item.metadata.id, e)}
                        className="absolute top-2 left-2 z-10 p-1 rounded-lg bg-black/60 hover:bg-black text-white backdrop-blur-sm transition-colors"
                        title={isChecked ? 'Deselect image' : 'Select image'}
                      >
                        {isChecked ? (
                          <CheckSquare className="w-3.5 h-3.5 text-[#1E60E6]" />
                        ) : (
                          <Square className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* 1-Click Delete Button Top Right */}
                      <button
                        onClick={(e) => handleDeleteSingle(item.metadata.id, e)}
                        className="absolute top-2 right-2 z-10 p-1 rounded-lg bg-black/60 hover:bg-rose-600 text-white backdrop-blur-sm transition-colors"
                        title="Delete image"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Sharpness Bottom Overlay */}
                      <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between bg-black/75 backdrop-blur-sm text-white px-2 py-0.5 rounded-lg text-[9px] font-mono z-10">
                        <span>Sharp: {item.quality.laplacianSharpness.toFixed(1)}</span>
                        <span className="text-blue-300">Lum {item.lightroom.meanLuminance}</span>
                      </div>
                    </div>

                    {/* Metadata Strip */}
                    <div className="flex flex-col gap-0.5 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[11px] text-slate-900 truncate max-w-[140px]">
                          {item.metadata.filename}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400">
                          {(item.metadata.fileSize / 1000000).toFixed(1)} MB
                        </span>
                      </div>
                      <span className="text-[9px] font-mono text-slate-400 truncate">
                        {item.metadata.dimensions.width} × {item.metadata.dimensions.height} px
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* MODE B: TABLE LIST VIEW */}
          {viewMode === 'table' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100 font-semibold text-[11px]">
                    <th className="pb-2 pl-1 w-8">
                      <button
                        onClick={handleToggleSelectAllImages}
                        className="flex items-center justify-center text-slate-400 hover:text-blue-600"
                        title={selectedImageIds.size === currentFolderVisibleItems.length ? 'Deselect all' : 'Select all'}
                      >
                        {selectedImageIds.size > 0 && selectedImageIds.size === currentFolderVisibleItems.length ? (
                          <CheckSquare className="w-4 h-4 text-[#1E60E6]" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="pb-2 pl-1">FILENAME</th>
                    <th className="pb-2">DIMENSIONS</th>
                    <th className="pb-2">LUMINANCE</th>
                    <th className="pb-2">SHARPNESS</th>
                    <th className="pb-2">FILE SIZE</th>
                    <th className="pb-2 pr-1 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {currentFolderVisibleItems.map((item) => {
                    const isSelectedRow = activeItem?.metadata.id === item.metadata.id;
                    const isChecked = selectedImageIds.has(item.metadata.id);

                    return (
                      <tr
                        key={item.metadata.id}
                        onClick={() => onSelectItem && onSelectItem(item)}
                        className={`cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-blue-50/80 font-bold text-blue-900'
                            : isSelectedRow
                            ? 'bg-slate-50 font-bold text-slate-900'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-2.5 pl-1" onClick={(e) => handleToggleImageSelection(item.metadata.id, e)}>
                          <button className="flex items-center justify-center text-slate-400 hover:text-blue-600">
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-[#1E60E6]" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        <td className="py-2.5 pl-1 flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg overflow-hidden bg-slate-900 flex-shrink-0 border border-slate-200">
                            <img
                              src={item.thumbnailUrl}
                              alt={item.metadata.filename}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <span className="truncate max-w-[160px] text-slate-900 font-medium">
                            {item.metadata.filename}
                          </span>
                        </td>

                        <td className="py-2.5 font-mono text-[11px] text-slate-500">
                          {item.metadata.dimensions.width} × {item.metadata.dimensions.height}
                        </td>

                        <td className="py-2.5 font-mono text-[11px]">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                            {item.lightroom.meanLuminance}
                          </span>
                        </td>

                        <td className="py-2.5 font-mono text-[11px]">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-100">
                            {item.quality.laplacianSharpness.toFixed(1)}
                          </span>
                        </td>

                        <td className="py-2.5 font-mono text-[11px] text-slate-500">
                          {(item.metadata.fileSize / 1000000).toFixed(2)} MB
                        </td>

                        <td className="py-2.5 pr-1 text-right">
                          <button
                            onClick={(e) => handleDeleteSingle(item.metadata.id, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete this image"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
