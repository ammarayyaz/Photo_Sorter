import React, { useState } from 'react';
import {
  UploadCloud,
  FolderPlus,
  FileImage,
  Sparkles,
  MoreHorizontal,
  Play,
  FolderCheck,
  FolderClock,
  FolderOpen
} from 'lucide-react';
import { ProcessedItem, PipelineConfig, PipelineMetrics, FaceCluster } from '../../engine/types';
import { QuickAccessFolder, FolderData } from '../dashboard/QuickAccessFolder';
import { UnsortedFolderCard, UnsortedFolderData } from '../dashboard/UnsortedFolderCard';
import { analyzeRealImageFile } from '../../engine/realImageProcessor';

interface FoldersViewProps {
  initialSubTab?: 'sorted' | 'unsorted';
  metrics?: PipelineMetrics;
  config?: PipelineConfig;
  items: ProcessedItem[];
  faceClusters?: FaceCluster[];
  activeItem?: ProcessedItem | null;
  onSelectItem?: (item: ProcessedItem) => void;
  onAddRealItems?: (newItems: ProcessedItem[], folderName: string) => void;
  onChangeConfig: (newConfig: Partial<PipelineConfig>) => void;
  onStartPipeline: () => void;
}

export const FoldersView: React.FC<FoldersViewProps> = ({
  initialSubTab = 'unsorted',
  items: _items,
  faceClusters: _faceClusters = [],
  activeItem,
  onSelectItem,
  onAddRealItems,
  onChangeConfig,
  onStartPipeline,
}) => {
  const [subTab, setSubTab] = useState<'sorted' | 'unsorted'>(initialSubTab);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // Real folders state (Empty by default until user uploads)
  const [folders, setFolders] = useState<
    Array<{
      id: string;
      name: string;
      isSorted: boolean;
      date: string;
      items: ProcessedItem[];
    }>
  >([]);

  const [selectedFolderId, setSelectedFolderId] = useState<string>('');

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

    setFolders((prev) => [newFolder, ...prev]);
    setSelectedFolderId(newFolderId);
    setSubTab('unsorted');

    if (onAddRealItems) {
      onAddRealItems(processedRealItems, detectedFolderName);
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

  const sortedFoldersList: FolderData[] = folders
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

  const unsortedFoldersList: UnsortedFolderData[] = folders
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

  const selectedFolderObj = folders.find((f) => f.id === selectedFolderId) || folders[0];

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

      {/* 2. Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative rounded-2xl border-2 border-dashed p-6 transition-colors flex flex-col items-center justify-center text-center cursor-pointer ${
          isDragging
            ? 'border-[#1E60E6] bg-blue-50/80'
            : 'border-slate-300 bg-slate-50/50 hover:bg-slate-100/50 hover:border-blue-400'
        }`}
      >
        <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-[#1E60E6] mb-2">
          <UploadCloud className="w-6 h-6 animate-bounce" />
        </div>

        <h2 className="text-xs font-bold text-slate-800 tracking-tight">
          Drag and drop photo folders or images from your computer here
        </h2>
        <p className="text-[11px] text-slate-400 mt-0.5 max-w-md">
          Select your real camera folders or raw image files. LuminaSort reads real pixel data and extracts luminance, blur, and horizon levels.
        </p>

        <div className="flex items-center gap-2 mt-3">
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

      {/* ========================================================================= */}
      {/* UNSORTED FOLDERS TAB */}
      {/* ========================================================================= */}
      {subTab === 'unsorted' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                  UNSORTED FOLDERS
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-900 text-white font-mono">
                  {unsortedFoldersList.length} Folders
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                Click on any folder to inspect its real properties
              </span>
            </div>

            {unsortedFoldersList.length > 0 ? (
              <div className="grid grid-cols-3 gap-4">
                {unsortedFoldersList.map((folder) => (
                  <UnsortedFolderCard
                    key={folder.id}
                    folder={folder}
                    isSelected={selectedFolderId === folder.id}
                    onClick={() => {
                      setSelectedFolderId(folder.id);
                      const fObj = folders.find((f) => f.id === folder.id);
                      if (fObj && fObj.items.length > 0 && onSelectItem) {
                        onSelectItem(fObj.items[0]);
                      }
                      onChangeConfig({ sourceDirectory: `D:/Photos/${folder.name}` });
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
            )}
          </div>

          {/* Files Preview in Selected Folder */}
          {selectedFolderObj && selectedFolderObj.items.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center font-bold">
                    <FolderClock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-slate-900">
                      {selectedFolderObj.name}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {selectedFolderObj.items.length} Real Photos •{' '}
                      {(
                        selectedFolderObj.items.reduce(
                          (sum, i) => sum + i.metadata.fileSize,
                          0
                        ) / 1000000
                      ).toFixed(1)}{' '}
                      MB
                    </p>
                  </div>
                </div>

                <button
                  onClick={onStartPipeline}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1E60E6] hover:bg-blue-700 text-white font-bold text-xs transition-colors active:scale-98"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Auto-Sorting &amp; Leveling</span>
                </button>
              </div>

              {/* Real Files Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100 font-semibold text-[11px]">
                      <th className="pb-2 pl-1">FILENAME</th>
                      <th className="pb-2">DIMENSIONS</th>
                      <th className="pb-2">LUMINANCE</th>
                      <th className="pb-2">SHARPNESS</th>
                      <th className="pb-2">FILE SIZE</th>
                      <th className="pb-2 pr-1 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {selectedFolderObj.items.map((item) => {
                      const isSelected = activeItem?.metadata.id === item.metadata.id;
                      return (
                        <tr
                          key={item.metadata.id}
                          onClick={() => onSelectItem && onSelectItem(item)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-blue-50/70 font-bold text-blue-900' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-2.5 pl-1 flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg overflow-hidden bg-slate-900 flex-shrink-0 border border-slate-200">
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
                            <button className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SORTED FOLDERS TAB */}
      {/* ========================================================================= */}
      {subTab === 'sorted' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                ALL SORTED FOLDERS
              </h2>
              <span className="text-[11px] text-slate-400 font-medium">
                {sortedFoldersList.length} Organized Collections
              </span>
            </div>

            {sortedFoldersList.length > 0 ? (
              <div className="grid grid-cols-3 gap-3.5">
                {sortedFoldersList.map((folder) => (
                  <QuickAccessFolder
                    key={folder.id}
                    folder={folder}
                    isActive={selectedFolderId === folder.id}
                    onClick={() => {
                      setSelectedFolderId(folder.id);
                      const fObj = folders.find((f) => f.id === folder.id);
                      if (fObj && fObj.items.length > 0 && onSelectItem) {
                        onSelectItem(fObj.items[0]);
                      }
                      onChangeConfig({ sourceDirectory: `D:/Photos/${folder.name}` });
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
            )}
          </div>
        </div>
      )}
    </div>
  );
};
