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
  PipelineConfig,
  ProcessingStatus,
  ProcessedItem,
  PipelineMetrics,
  FaceCluster,
  LogEntry,
} from './engine/types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('step1-folders');

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

  useEffect(() => {
    pipelineRef.current = new PhotoPipelineController(config, (state) => {
      setStatus(state.status);
      setItems(state.items);
      setActiveItem(state.activeItem);
      setMetrics(state.metrics);
      setFaceClusters(state.faceClusters);
      setLogs(state.logs);
    });

    // Fresh startup: Do NOT auto-run. Wait for real user folder/image selection.

    return () => {
      if (pipelineRef.current) {
        pipelineRef.current.cancel();
      }
    };
  }, []);

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
  const handleAddRealItems = (newItems: ProcessedItem[], _folderName: string) => {
    const combined = [...newItems, ...items];
    setItems(combined);
    setActiveItem(newItems[0] || null);

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
  };

  const handleStart = () => {
    if (pipelineRef.current) {
      pipelineRef.current.startPipeline();
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

  const handleReset = () => {
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
    setActiveItem(null);
    setFaceClusters([]);
    setLogs([]);
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
                faceClusters={faceClusters}
                activeItem={activeItem}
                onSelectItem={(item) => setActiveItem(item)}
                onAddRealItems={handleAddRealItems}
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
