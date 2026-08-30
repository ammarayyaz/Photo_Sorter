import React, { useState, useEffect, useRef } from 'react';
import { Sidebar, ActiveTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { RightInfoPanel } from './components/layout/RightInfoPanel';
import { FoldersView } from './components/views/FoldersView';
import { CullingSeparationView } from './components/views/CullingSeparationView';
import { StraightenAndToneView } from './components/views/StraightenAndToneView';
import { RenamingView } from './components/views/RenamingView';
import { OutputGalleryView } from './components/views/OutputGalleryView';
import { FaceClustersView } from './components/views/FaceClustersView';
import { SettingsView } from './components/views/SettingsView';
import { PhotoPipelineController } from './engine/pipeline';
import { ThemeProvider } from './context/ThemeContext';
import {
  saveSessionState,
  loadSessionState,
  clearSessionState,
  getOriginalFileBlob
} from './engine/storageManager';
import {
  PipelineConfig,
  ProcessingStatus,
  ProcessedItem,
  PipelineMetrics,
  FaceCluster,
  LogEntry,
} from './engine/types';

export const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('step1-folders');
  const [currentFolderName, setCurrentFolderName] = useState<string>('');
  const [folders, setFolders] = useState<
    Array<{
      id: string;
      name: string;
      isSorted: boolean;
      date: string;
      items: ProcessedItem[];
    }>
  >([]);

  const [config, setConfig] = useState<PipelineConfig>(() => ({
    sourceDirectory: 'D:/Photos',
    destinationDirectory: 'D:/Photos/Organized_Output',
    geminiApiKey: typeof window !== 'undefined' ? (localStorage.getItem('luminasort_gemini_key') || '') : '',
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
  }));

  const [status, setStatus] = useState<ProcessingStatus>('IDLE');
  const [isInspectorCollapsed, setIsInspectorCollapsed] = useState<boolean>(true);
  const [cullingSubTab, setCullingSubTab] = useState<'all' | 'kept' | 'archived' | 'top_picks'>('all');
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

      if (state.status === 'COMPLETED') {
        setFolders((prev) =>
          prev.map((f) => ({
            ...f,
            isSorted: true,
          }))
        );
      }
    });

    const initPersistence = async () => {
      const saved = await loadSessionState();
      if (saved && saved.items && saved.items.length > 0) {
        // Re-hydrate any expired blob URLs from IndexedDB blob store
        const rehydratedItems: ProcessedItem[] = await Promise.all(
          saved.items.map(async (item: ProcessedItem): Promise<ProcessedItem> => {
            const originalBlob = await getOriginalFileBlob(item.metadata.id);
            let freshBlobUrl = '';
            if (originalBlob) {
              freshBlobUrl = URL.createObjectURL(originalBlob);
            }

            let validThumb = item.thumbnailUrl;
            if (!validThumb || validThumb.startsWith('blob:')) {
              validThumb = freshBlobUrl || item.thumbnailUrl;
            }

            let validTransformed = item.transformedThumbnailUrl;
            if (!validTransformed || validTransformed.startsWith('blob:')) {
              validTransformed = freshBlobUrl || item.transformedThumbnailUrl || validThumb;
            }

            return {
              ...item,
              originalFile: originalBlob || undefined,
              originalFileUrl: freshBlobUrl || item.originalFileUrl,
              thumbnailUrl: validThumb,
              transformedThumbnailUrl: validTransformed,
            };
          })
        );

        setItems(rehydratedItems);
        if (saved.folders) {
          // Clean up any duplicates in saved session
          const uniqueFolders: typeof saved.folders = [];
          const seen = new Set<string>();
          for (const f of saved.folders) {
            const key = `${f.id}_${f.name}`;
            if (!seen.has(key)) {
              seen.add(key);
              uniqueFolders.push(f);
            }
          }
          setFolders(uniqueFolders);
        }
        if (saved.metrics) setMetrics(saved.metrics);
        if (saved.currentFolderName && saved.items && saved.items.length > 0) {
          setCurrentFolderName(saved.currentFolderName);
        } else {
          setCurrentFolderName('');
        }
        if (saved.activeTab) setActiveTab(saved.activeTab as ActiveTab);
        if (saved.config) setConfig(saved.config);
        if (rehydratedItems.length > 0) setActiveItem(rehydratedItems[0]);

        if (pipelineRef.current) {
          pipelineRef.current.setItems(rehydratedItems);
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
      if (newConfig.geminiApiKey !== undefined) {
        try {
          localStorage.setItem('luminasort_gemini_key', newConfig.geminiApiKey.trim());
        } catch {}
      }
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
    // Deduplicate items
    const existingIds = new Set(items.map((i) => i.metadata.id));
    const uniqueNew = newItems.filter((i) => !existingIds.has(i.metadata.id));
    const combined = uniqueNew.length > 0 ? [...uniqueNew, ...items] : (items.length > 0 ? items : newItems);

    setItems(combined);
    setActiveItem(uniqueNew[0] || combined[0] || null);
    setCurrentFolderName(folderName || 'Imported Photos');

    if (newFolderObj) {
      setFolders((prev) => {
        const exists = prev.some((f) => f.id === newFolderObj.id || f.name === newFolderObj.name);
        if (exists) {
          return prev.map((f) => {
            if (f.id === newFolderObj.id || f.name === newFolderObj.name) {
              const currentItemIds = new Set(f.items.map((it) => it.metadata.id));
              const fresh = newFolderObj.items.filter((it: ProcessedItem) => !currentItemIds.has(it.metadata.id));
              return {
                ...f,
                items: [...fresh, ...f.items],
              };
            }
            return f;
          });
        }
        return [newFolderObj, ...prev];
      });
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
    if (updatedItems.length === 0) {
      setCurrentFolderName('');
    }

    const under = updatedItems.filter((i) => i.lightroom.exposureState === 'UNDER_EXPOSED').length;
    const over = updatedItems.filter((i) => i.lightroom.exposureState === 'OVER_EXPOSED').length;
    const blur = updatedItems.filter((i) => i.blurClassification.isBlur).length;

    setMetrics((prev) => ({
      ...prev,
      totalScanned: updatedItems.length,
      underexposedCount: under,
      overexposedCount: over,
      defocusBlurCount: blur,
    }));

    if (pipelineRef.current) {
      pipelineRef.current.setItems(updatedItems);
    }
  };

  // Delete individual or bulk selected images
  const handleDeleteImages = (imageIds: string[]) => {
    const deleteSet = new Set(imageIds);
    const updatedItems = items.filter((i) => !deleteSet.has(i.metadata.id));

    const updatedFolders = folders.map((f) => ({
      ...f,
      items: f.items.filter((i) => !deleteSet.has(i.metadata.id)),
    }));

    setItems(updatedItems);
    setFolders(updatedFolders);
    if (activeItem && deleteSet.has(activeItem.metadata.id)) {
      setActiveItem(updatedItems[0] || null);
    }
    if (updatedItems.length === 0) {
      setCurrentFolderName('');
    }

    const under = updatedItems.filter((i) => i.lightroom.exposureState === 'UNDER_EXPOSED').length;
    const over = updatedItems.filter((i) => i.lightroom.exposureState === 'OVER_EXPOSED').length;
    const blur = updatedItems.filter((i) => i.blurClassification.isBlur).length;

    setMetrics((prev) => ({
      ...prev,
      totalScanned: updatedItems.length,
      underexposedCount: under,
      overexposedCount: over,
      defocusBlurCount: blur,
    }));

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
    setCurrentFolderName('');
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

  const handleBulkToggleArchive = (itemIds: string[], archive: boolean) => {
    const idSet = new Set(itemIds);
    setItems((prev) =>
      prev.map((i) => {
        if (idSet.has(i.metadata.id)) {
          return {
            ...i,
            isArchived: archive,
            isBurstWinner: !archive,
            blurClassification: {
              ...i.blurClassification,
              isArchived: archive,
              reason: archive ? 'Manually moved to _archive' : 'Manually restored to Kept Winner',
            },
          };
        }
        return i;
      })
    );
    if (pipelineRef.current) {
      itemIds.forEach((id) => {
        const it = items.find((i) => i.metadata.id === id);
        if (it && it.isArchived !== archive) {
          pipelineRef.current?.toggleArchiveState(id);
        }
      });
    }
  };

  const handleRenameFaceCluster = (clusterId: string, newName: string) => {
    if (pipelineRef.current) {
      pipelineRef.current.renameFaceCluster(clusterId, newName);
    }
  };

  return (
    <div className="w-screen h-screen m-0 p-0 bg-[#F8F9FA] dark:bg-[#000000] flex overflow-hidden font-sans transition-colors duration-200">
      {/* Full viewport Edge-to-Edge Container without shadows */}
      <div className="flex w-full h-full overflow-hidden bg-[#F8F9FA] dark:bg-[#000000] transition-colors duration-200">
        {/* Column 1: Left Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          status={status}
          metrics={metrics}
          items={items}
          cullingSubTab={cullingSubTab}
          onSelectCullingSubTab={(sub) => setCullingSubTab(sub)}
          onAddRealItems={handleAddRealItems}
        />

        {/* Column 2: Center Content Area */}
        <main className="flex-1 flex flex-col min-w-0 p-4 overflow-hidden bg-[#F8F9FA] dark:bg-[#000000] transition-colors duration-200">
          <Header
            activeTab={activeTab}
            status={status}
            folderName={currentFolderName}
            hasGeminiKey={config.geminiApiKey.trim().length > 0}
            isInspectorCollapsed={isInspectorCollapsed}
            onToggleInspector={() => setIsInspectorCollapsed((prev) => !prev)}
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
                onToggleArchiveBulk={handleBulkToggleArchive}
                onContinueToStraighten={() => setActiveTab('step3-enhancement')}
                onGoToIngest={() => setActiveTab('step1-folders')}
                geminiApiKey={config.geminiApiKey}
                onChangeConfig={handleConfigChange}
                onUpdateItems={(updated) => setItems(updated)}
                activeSubTab={cullingSubTab}
                onChangeSubTab={(sub) => setCullingSubTab(sub)}
              />
            )}

            {/* Step 3: Straighten & Lightroom Tone Tuning */}
            {activeTab === 'step3-enhancement' && (
              <StraightenAndToneView
                items={items}
                metrics={metrics}
                geminiApiKey={config.geminiApiKey}
                onContinueToOutput={() => setActiveTab('step4-renaming')}
                onUpdateItems={(updated) => {
                  setItems(updated);
                  const straightened = updated.filter((i) => i.geometry && i.geometry.requiresCorrection).length;
                  const under = updated.filter((i) => i.lightroom?.exposureState === 'UNDER_EXPOSED').length;
                  const over = updated.filter((i) => i.lightroom?.exposureState === 'OVER_EXPOSED').length;
                  setMetrics((prev) => ({
                    ...prev,
                    imagesStraightened: straightened,
                    underexposedCount: under,
                    overexposedCount: over,
                  }));
                }}
              />
            )}

            {/* Step 4: Batch Image Renaming */}
            {activeTab === 'step4-renaming' && (
              <RenamingView
                items={items}
                folders={folders}
                onUpdateItems={(updated) => setItems(updated)}
                onContinueToOutput={() => setActiveTab('step5-output')}
              />
            )}

            {/* Step 5: Final Output Gallery & Hierarchy Review */}
            {activeTab === 'step5-output' && (
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
          items={items}
          isCollapsed={isInspectorCollapsed}
          onToggleCollapse={() => setIsInspectorCollapsed((prev) => !prev)}
        />
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;
