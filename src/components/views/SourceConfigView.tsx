import React from 'react';
import {
  FolderInput,
  Sliders,
  Sparkles,
  Play
} from 'lucide-react';
import { PipelineConfig } from '../../engine/types';

interface SourceConfigViewProps {
  config: PipelineConfig;
  onChangeConfig: (newConfig: Partial<PipelineConfig>) => void;
  onStart: () => void;
}

export const SourceConfigView: React.FC<SourceConfigViewProps> = ({
  config,
  onChangeConfig,
  onStart,
}) => {
  return (
    <div className="flex flex-col gap-4 max-w-4xl overflow-y-auto pr-2 pb-6 select-none">
      {/* Directory I/O Card (Clean Flat 1px Border) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <FolderInput className="w-4 h-4 text-blue-600" />
            <span>Storage &amp; Path Targets</span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">I/O Configuration</span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          {/* Source Input */}
          <div className="flex flex-col gap-1.5">
            <span className="text-slate-700 font-semibold">Source Photo Directory (RAW/Images)</span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={config.sourceDirectory}
                onChange={(e) => onChangeConfig({ sourceDirectory: e.target.value })}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono outline-none focus:border-blue-500 focus:bg-white"
                placeholder="D:/DCIM/100CANON"
              />
              <button
                onClick={() => {
                  const p = prompt('Enter Source Directory Path:', config.sourceDirectory);
                  if (p) onChangeConfig({ sourceDirectory: p });
                }}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors"
              >
                Browse
              </button>
            </div>
          </div>

          {/* Destination Output */}
          <div className="flex flex-col gap-1.5">
            <span className="text-slate-700 font-semibold">Organized Output Directory Root</span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={config.destinationDirectory}
                onChange={(e) => onChangeConfig({ destinationDirectory: e.target.value })}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono outline-none focus:border-blue-500 focus:bg-white"
                placeholder="D:/Photos/Organized"
              />
              <button
                onClick={() => {
                  const p = prompt('Enter Destination Output Root:', config.destinationDirectory);
                  if (p) onChangeConfig({ destinationDirectory: p });
                }}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors"
              >
                Browse
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Horizon Leveling & Smart Inscribed Crop Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Sliders className="w-4 h-4 text-blue-600" />
            <span>Horizon Leveling &amp; Auto-Straighten</span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.autoStraighten}
              onChange={(e) => onChangeConfig({ autoStraighten: e.target.checked })}
              className="accent-blue-600 w-4 h-4 rounded cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-800">Enabled</span>
          </label>
        </div>

        <div className="flex flex-col gap-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-700 font-semibold">Minimum Angle Threshold Gate</span>
            <span className="font-mono text-blue-600 font-bold">≥ {config.straightenThresholdDeg}°</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="2.0"
            step="0.1"
            value={config.straightenThresholdDeg}
            onChange={(e) => onChangeConfig({ straightenThresholdDeg: parseFloat(e.target.value) })}
            className="accent-blue-600 w-full cursor-pointer"
          />
          <p className="text-[11px] text-slate-400">
            Angles under {config.straightenThresholdDeg}° bypass rotation to preserve original sensor sharpness.
          </p>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-slate-700 font-semibold">Inscribed Rectangle Auto-Crop</span>
              <span className="text-[11px] text-slate-400">
                Guarantees zero black corner margins while preserving original sensor aspect ratio.
              </span>
            </div>
            <input
              type="checkbox"
              checked={config.inscribedAutoCrop}
              onChange={(e) => onChangeConfig({ inscribedAutoCrop: e.target.checked })}
              className="accent-blue-600 w-4 h-4 rounded cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Burst Culling & Best-Frame Selector */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Burst Grouping &amp; Quality Scoring</span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.cullBursts}
              onChange={(e) => onChangeConfig({ cullBursts: e.target.checked })}
              className="accent-blue-600 w-4 h-4 rounded cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-800">Enabled</span>
          </label>
        </div>

        <div className="flex flex-col gap-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-700 font-semibold">Burst Time Window Threshold</span>
            <span className="font-mono text-blue-600 font-bold">Δt ≤ {config.burstTimeWindowSec}s</span>
          </div>
          <input
            type="range"
            min="1.0"
            max="10.0"
            step="0.5"
            value={config.burstTimeWindowSec}
            onChange={(e) => onChangeConfig({ burstTimeWindowSec: parseFloat(e.target.value) })}
            className="accent-blue-600 w-full cursor-pointer"
          />

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-slate-700 font-semibold">Archive Lower-Scoring Frames to `_archive/`</span>
              <span className="text-[11px] text-slate-400">
                Preserves all duplicate shots safely in `_archive/` with non-destructive guarantees.
              </span>
            </div>
            <input
              type="checkbox"
              checked={config.archiveRejectedBursts}
              onChange={(e) => onChangeConfig({ archiveRejectedBursts: e.target.checked })}
              className="accent-blue-600 w-4 h-4 rounded cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Start Button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={onStart}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors active:scale-98"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Save &amp; Start Pipeline</span>
        </button>
      </div>
    </div>
  );
};
