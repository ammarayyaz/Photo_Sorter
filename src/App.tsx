import React, { useState, useEffect, useRef } from 'react';
import { Sidebar, ActiveTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { RightInfoPanel } from './components/layout/RightInfoPanel';
import { FoldersView } from './components/views/FoldersView';
import { CullingSeparationView } from './components/views/CullingSeparationView';
import { StraightenAndToneView } from './components/views/StraightenAndToneView';
import { OutputGalleryView } from './components/views/OutputGalleryView';
import { FaceClustersView } from './components/views/FaceClustersView';
import { SettingsView } from './components/views/SettingsView';
import { PhotoPipelineController } from './engine/pipeline';
import {
  saveSessionState,
  loadSessionState,
  clearSessionState
} from './engine/storageManager';
import {
  PipelineConfig,
  ProcessingStatus,
  ProcessedItem,
  PipelineMetrics,
  FaceCluster,
  LogEntry,
} from './engine/types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('step1-folders');
  const [currentFolderName, setCurrentFolderName] = useState<string>('My Uploaded Photos');
  const [folders, setFolders] = useState<
    Array<{
      id: string;
      name: string;
      isSorted: boolean;
      date: string;
      items: ProcessedItem[];
    }>
  >([]);

  const [config, setConfig] = useState<PipelineConfig>({
    sourceDirectory: 'D:/Photos',
    destinationDirectory: 'D:/Photos/Organized_Output',
    geminiApiKey: '',
    autoStraighten: true,
    straightenThresholdDeg: 0.5,
    inscribedAutoCrop: true,
    cullBursts: true,
    burstTimeWindowSec: 3.0,
    archiveRejectedBursts: true,
    clusterFaces: true,
    faceClusteringSensitivity: 0.38,
    outputFormat: 'JPEG',
    jpegQuality: 92,
  });

  const [status, setStatus] = useState<ProcessingStatus>('IDLE');
  const [items, setItems] = useState<ProcessedItem[]>([]);
  const [activeItem, setActiveItem] = useState<ProcessedItem | null>(null);
  const [faceClusters, setFaceClusters] = useState<FaceCluster[]>([]);
  const [, setLogs] = useState<LogEntry[]>([]);
  const [metrics, setMetrics] = useState<PipelineMetrics>({
    totalScanned: 0,
    currentProcessed: 0,
    burstGroupsIdentified: 0,
    framesCulled: 0,
    imagesStraightened: 0,
    avgRotationAppliedDeg: 0,
    facesDiscovered: 0,
    distinctPeopleCount: 0,
    occasionsIdentified: 0,
    processingSpeedFps: 0,
    elapsedTimeSec: 0,
    estimatedTimeRemainingSec: 0,
    systemMemoryMb: 128,
    underexposedCount: 0,
    overexposedCount: 0,
    motionBlurCount: 0,
    defocusBlurCount: 0,
  });

  const pipelineRef = useRef<PhotoPipelineController | null>(null);

  // 1. Restore persistent session from IndexedDB on startup
  useEffect(() => {
    pipelineRef.current = new PhotoPipelineController(config, (state) => {
      setStatus(state.status);
      setItems(state.items);
      setActiveItem(state.activeItem);
      setMetrics(state.metrics);
      setFaceClusters(state.faceClusters);
      setLogs(state.logs);
    });

    const initPersistence = async () => {
      const saved = await loadSessionState();
      if (saved && saved.items && saved.items.length > 0) {
        setItems(saved.items);
        if (saved.folders) setFolders(saved.folders);
        if (saved.metrics) setMetrics(saved.metrics);
        if (saved.currentFolderName) setCurrentFolderName(saved.currentFolderName);
        if (saved.activeTab) setActiveTab(saved.activeTab as ActiveTab);
        if (saved.config) setConfig(saved.config);
        if (saved.items.length > 0) setActiveItem(saved.items[0]);

        if (pipelineRef.current) {
          pipelineRef.current.setItems(saved.items);
        }
      }
    };

    initPersistence();

    return () => {
      if (pipelineRef.current) {
        pipelineRef.current.cancel();
      }
    };
  }, []);

  // 2. Auto-save session state whenever items, folders, metrics or tabs change
  useEffect(() => {
    if (items.length > 0 || folders.length > 0) {
      saveSessionState({
        items,
        folders,
        metrics,
        activeTab,
        currentFolderName,
        config,
      });
    }
  }, [items, folders, metrics, activeTab, currentFolderName, config]);

  const handleConfigChange = (newConfig: Partial<PipelineConfig>) => {
    setConfig((prev) => {
      const updated = { ...prev, ...newConfig };
      if (pipelineRef.current) {
        pipelineRef.current.updateConfig(updated);
      }
      return updated;
    });
  };

  // When real user files are uploaded/dropped
  const handleAddRealItems = (
    newItems: ProcessedItem[],
    folderName: string,
    newFolderObj?: any
  ) => {
    const combined = [...newItems, ...items];
    setItems(combined);
    setActiveItem(newItems[0] || null);
    setCurrentFolderName(folderName || 'Imported Photos');

    if (newFolderObj) {
      setFolders((prev) => [newFolderObj, ...prev]);
    }

    const under = combined.filter((i) => i.lightroom.exposureState === 'UNDER_EXPOSED').length;
    const over = combined.filter((i) => i.lightroom.exposureState === 'OVER_EXPOSED').length;
    const blur = combined.filter((i) => i.blurClassification.isBlur).length;

    setMetrics((prev) => ({
      ...prev,
      totalScanned: combined.length,
      underexposedCount: under,
      overexposedCount: over,
      defocusBlurCount: blur,
    }));

    if (pipelineRef.current) {
      pipelineRef.current.setItems(combined);
    }
  };

  // Delete an entire folder and its contents
  const handleDeleteFolder = (folderId: string) => {
    const targetFolder = folders.find((f) => f.id === folderId);
    const targetImageIds = new Set(targetFolder ? targetFolder.items.map((i) => i.metadata.id) : []);

    const updatedFolders = folders.filter((f) => f.id !== folderId);
    const updatedItems = items.filter((i) => !targetImageIds.has(i.metadata.id));

    setFolders(updatedFolders);
    setItems(updatedItems);
    if (activeItem && targetImageIds.has(activeItem.metadata.id)) {
      setActiveItem(updatedItems[0] || null);
    }
    const nextFolderName = updatedFolders[0]?.name || 'All Uploaded Photos';
    setCurrentFolderName(nextFolderName);

    const under = updatedItems.filter((i) => i.lightroom.exposureState === 'UNDER_EXPOSED').length;
    const over = updatedItems.filter((i) => i.lightroom.exposureState === 'OVER_EXPOSED').length;
    const blur = updatedItems.filter((i) => i.blurClassification.isBlur).length;

    const nextMetrics = {
      ...metrics,
      totalScanned: updatedItems.length,
      underexposedCount: under,
      overexposedCount: over,
      defocusBlurCount: blur,
    };
    setMetrics(nextMetrics);

    if (updatedItems.length === 0 && updatedFolders.length === 0) {
      clearSessionState();
    } else {
      saveSessionState({
        items: updatedItems,
        folders: updatedFolders,
        metrics: nextMetrics,
        activeTab,
        currentFolderName: nextFolderName,
        config,
      });
    }

    if (pipelineRef.current) {
      pipelineRef.current.setItems(updatedItems);
    }
  };

  // Delete individual or bulk selected images
  const handleDeleteImages = (imageIds: string[]) => {
    const deleteSet = new Set(imageIds);
    const updatedItems = items.filter((i) => !deleteSet.has(i.metadata.id));

    const updatedFolders = folders
      .map((f) => ({
        ...f,
        items: f.items.filter((i) => !deleteSet.has(i.metadata.id)),
      }))
      .filter((f) => f.items.length > 0);

    setItems(updatedItems);
    setFolders(updatedFolders);
    if (activeItem && deleteSet.has(activeItem.metadata.id)) {
      setActiveItem(updatedItems[0] || null);
    }
    const nextFolderName = updatedFolders[0]?.name || 'All Uploaded Photos';
    setCurrentFolderName(nextFolderName);

    const under = updatedItems.filter((i) => i.lightroom.exposureState === 'UNDER_EXPOSED').length;
    const over = updatedItems.filter((i) => i.lightroom.exposureState === 'OVER_EXPOSED').length;
    const blur = updatedItems.filter((i) => i.blurClassification.isBlur).length;

    const nextMetrics = {
      ...metrics,
      totalScanned: updatedItems.length,
      underexposedCount: under,
      overexposedCount: over,
      defocusBlurCount: blur,
    };
    setMetrics(nextMetrics);

    if (updatedItems.length === 0 && updatedFolders.length === 0) {
      clearSessionState();
    } else {
      saveSessionState({
        items: updatedItems,
        folders: updatedFolders,
        metrics: nextMetrics,
        activeTab,
        currentFolderName: nextFolderName,
        config,
      });
    }

    if (pipelineRef.current) {
      pipelineRef.current.setItems(updatedItems);
    }
  };

  const handleStart = () => {
    if (pipelineRef.current) {
      pipelineRef.current.startPipeline(items);
    }
  };

  const handlePause = () => {
    if (pipelineRef.current) {
      pipelineRef.current.pause();
    }
  };

  const handleResume = () => {
    if (pipelineRef.current) {
      pipelineRef.current.resume();
    }
  };

  const handleReset = async () => {
    await clearSessionState();
    if (pipelineRef.current) {
      pipelineRef.current.cancel();
      pipelineRef.current = new PhotoPipelineController(config, (state) => {
        setStatus(state.status);
        setItems(state.items);
        setActiveItem(state.activeItem);
        setMetrics(state.metrics);
        setFaceClusters(state.faceClusters);
        setLogs(state.logs);
      });
    }
    setStatus('IDLE');
    setItems([]);
    setFolders([]);
    setActiveItem(null);
    setFaceClusters([]);
    setLogs([]);
    setCurrentFolderName('All Uploaded Photos');
    setMetrics({
      totalScanned: 0,
      currentProcessed: 0,
      burstGroupsIdentified: 0,
      framesCulled: 0,
      imagesStraightened: 0,
      avgRotationAppliedDeg: 0,
      facesDiscovered: 0,
      distinctPeopleCount: 0,
      occasionsIdentified: 0,
      processingSpeedFps: 0,
      elapsedTimeSec: 0,
      estimatedTimeRemainingSec: 0,
      systemMemoryMb: 128,
      underexposedCount: 0,
      overexposedCount: 0,
      motionBlurCount: 0,
      defocusBlurCount: 0,
    });
  };

  const handleToggleArchive = (itemId: string) => {
    if (pipelineRef.current) {
      pipelineRef.current.toggleArchiveState(itemId);
    } else {
      setItems((prev) =>
        prev.map((i) => {
          if (i.metadata.id === itemId) {
            const nextArchived = !i.isArchived;
            return {
              ...i,
              isArchived: nextArchived,
              isBurstWinner: !nextArchived,
              blurClassification: {
                ...i.blurClassification,
                isArchived: nextArchived,
              },
            };
          }
          return i;
        })
      );
    }
  };

  const handleRenameFaceCluster = (clusterId: string, newName: string) => {
    if (pipelineRef.current) {
      pipelineRef.current.renameFaceCluster(clusterId, newName);
    }
  };

  return (
    <div className="w-screen h-screen m-0 p-0 bg-white flex overflow-hidden font-sans">
      {/* Full viewport Edge-to-Edge Container without shadows */}
      <div className="flex w-full h-full overflow-hidden bg-white">
        {/* Column 1: Left Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          status={status}
          metrics={metrics}
          items={items}
        />

        {/* Column 2: Center Content Area */}
        <main className="flex-1 flex flex-col min-w-0 p-5 overflow-hidden bg-white">
          <Header
            activeTab={activeTab}
            status={status}
            folderName={currentFolderName}
            hasGeminiKey={config.geminiApiKey.trim().length > 0}
            onStart={handleStart}
            onPause={handlePause}
            onResume={handleResume}
            onReset={handleReset}
          />

          <div className="flex-1 min-h-0 overflow-hidden">
            {/* Step 1: Ingest & Browse Folders */}
            {activeTab === 'step1-folders' && (
              <FoldersView
                initialSubTab="unsorted"
                metrics={metrics}
                items={items}
                folders={folders}
                setFolders={setFolders}
                faceClusters={faceClusters}
                activeItem={activeItem}
                onSelectItem={(item) => setActiveItem(item)}
                onAddRealItems={handleAddRealItems}
                onDeleteFolder={handleDeleteFolder}
                onDeleteImages={handleDeleteImages}
                config={config}
                onChangeConfig={handleConfigChange}
                onStartPipeline={() => {
                  handleStart();
                  setActiveTab('step2-culling');
                }}
              />
            )}

            {/* Step 2: Blur & Motion Culling (Archive Separation) */}
            {activeTab === 'step2-culling' && (
              <CullingSeparationView
                items={items}
                metrics={metrics}
                onToggleArchive={handleToggleArchive}
                onContinueToStraighten={() => setActiveTab('step3-enhancement')}
                onGoToIngest={() => setActiveTab('step1-folders')}
              />
            )}

            {/* Step 3: Straighten & Lightroom Tone Tuning */}
            {activeTab === 'step3-enhancement' && (
              <StraightenAndToneView
                items={items}
                metrics={metrics}
                onContinueToOutput={() => setActiveTab('step4-output')}
              />
            )}

            {/* Step 4: Final Output Gallery & Hierarchy Review */}
            {activeTab === 'step4-output' && (
              <OutputGalleryView
                items={items}
                metrics={metrics}
                faceClusters={faceClusters}
                destinationDirectory={config.destinationDirectory}
              />
            )}

            {/* Shared With Me / Face Clusters */}
            {activeTab === 'faces' && (
              <FaceClustersView
                faceClusters={faceClusters}
                onRenameCluster={handleRenameFaceCluster}
              />
            )}

            {/* Backups & Settings */}
            {activeTab === 'settings' && (
              <SettingsView
                config={config}
                onChangeConfig={handleConfigChange}
              />
            )}
          </div>
        </main>

        {/* Column 3: Right Info Inspector Panel */}
        <RightInfoPanel
          activeItem={activeItem}
          metrics={metrics}
          faceClusters={faceClusters}
        />
      </div>
    </div>
  );
};

export default App;
