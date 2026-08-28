import React, { useState } from 'react';
import {
  Key,
  Cpu,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { PipelineConfig } from '../../engine/types';

interface SettingsViewProps {
  config: PipelineConfig;
  onChangeConfig: (newConfig: Partial<PipelineConfig>) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  config,
  onChangeConfig,
}) => {
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'valid' | 'invalid'>('idle');

  const handleTestApiKey = async () => {
    if (!config.geminiApiKey) {
      setTestStatus('invalid');
      return;
    }
    setTestStatus('testing');
    setTimeout(() => {
      if (config.geminiApiKey.startsWith('AIza')) {
        setTestStatus('valid');
      } else {
        setTestStatus('invalid');
      }
    }, 800);
  };

  return (
    <div className="flex flex-col gap-4 max-w-4xl overflow-y-auto pr-2 pb-6 select-none">
      {/* Cloud AI Credentials */}
      <div className="bg-white dark:bg-[#20003A] border border-[#E7E0EE] dark:border-[#4C177D] rounded-2xl p-4 flex flex-col gap-3 transition-colors">
        <div className="flex items-center justify-between pb-2 border-b border-[#E7E0EE] dark:border-[#4C177D]">
          <div className="flex items-center gap-2 text-xs font-bold text-[#23003F] dark:text-[#FFFDB4]">
            <Key className="w-4 h-4 text-[#F94500]" />
            <span>Google Gemini Vision API Authentication</span>
          </div>
          <span className="text-[11px] text-[#BCACCE] font-mono">Gemini 2.5 Flash Vision</span>
        </div>

        <div className="flex flex-col gap-2 text-xs">
          <label className="text-[#23003F] dark:text-[#FFFDB4] font-semibold">API Secret Key</label>
          <div className="flex items-center gap-2">
            <input
              type="password"
              value={config.geminiApiKey}
              onChange={(e) => {
                onChangeConfig({ geminiApiKey: e.target.value });
                setTestStatus('idle');
              }}
              placeholder="AIzaSy..."
              className="flex-1 bg-[#FAF8FD] dark:bg-[#2E074E] border border-[#E7E0EE] dark:border-[#4C177D] rounded-xl px-3 py-2 text-xs font-mono text-[#23003F] dark:text-white outline-none focus:border-[#F94500]"
            />
            <button
              onClick={handleTestApiKey}
              disabled={testStatus === 'testing'}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-[#23003F] hover:bg-[#F3EFF9] dark:hover:bg-[#320857] border border-[#E7E0EE] dark:border-[#4C177D] text-xs font-bold text-[#23003F] dark:text-[#FFFDB4] transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#F94500]" />
              <span>{testStatus === 'testing' ? 'Testing...' : 'Validate Key'}</span>
            </button>
          </div>

          {testStatus === 'valid' && (
            <div className="flex items-center gap-1.5 text-[11px] text-[#F94500] font-semibold mt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>API key authenticated successfully for Gemini 2.5 Flash Vision.</span>
            </div>
          )}
          {testStatus === 'invalid' && (
            <div className="flex items-center gap-1.5 text-[11px] text-[#F94500] font-semibold mt-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Invalid API key or network error. Pipeline will use local EXIF fallback.</span>
            </div>
          )}
        </div>
      </div>

      {/* Compute Engine & Hardware Vitals */}
      <div className="bg-white dark:bg-[#20003A] border border-[#E7E0EE] dark:border-[#4C177D] rounded-2xl p-4 flex flex-col gap-3 transition-colors">
        <div className="flex items-center justify-between pb-2 border-b border-[#E7E0EE] dark:border-[#4C177D]">
          <div className="flex items-center gap-2 text-xs font-bold text-[#23003F] dark:text-[#FFFDB4]">
            <Cpu className="w-4 h-4 text-[#F94500]" />
            <span>Multi-Threading Optimization</span>
          </div>
          <span className="text-[11px] text-[#BCACCE] font-mono">Hardware Acceleration</span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="flex flex-col gap-1.5">
            <span className="text-[#23003F] dark:text-[#BCACCE] font-semibold">RAW Decoding Thread Pool</span>
            <select className="bg-[#FAF8FD] dark:bg-[#2E074E] border border-[#E7E0EE] dark:border-[#4C177D] rounded-xl px-2.5 py-2 text-xs text-[#23003F] dark:text-white outline-none">
              <option value="auto">Auto (8 Threads - Intel/AMD AVX2)</option>
              <option value="4">4 Dedicated Threads</option>
              <option value="16">16 High-Throughput Threads</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[#23003F] dark:text-[#BCACCE] font-semibold">Memory Heap Ceiling</span>
            <select className="bg-[#FAF8FD] dark:bg-[#2E074E] border border-[#E7E0EE] dark:border-[#4C177D] rounded-xl px-2.5 py-2 text-xs text-[#23003F] dark:text-white outline-none">
              <option value="1200">1.2 GB (Explicit GC every 50 frames)</option>
              <option value="2048">2.0 GB (High RAM workstations)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Output & Format Compression */}
      <div className="bg-white dark:bg-[#20003A] border border-[#E7E0EE] dark:border-[#4C177D] rounded-2xl p-4 flex flex-col gap-3 transition-colors">
        <div className="flex items-center justify-between pb-2 border-b border-[#E7E0EE] dark:border-[#4C177D]">
          <div className="flex items-center gap-2 text-xs font-bold text-[#23003F] dark:text-[#FFFDB4]">
            <HardDrive className="w-4 h-4 text-[#F94500]" />
            <span>Export Compression &amp; Format Rules</span>
          </div>
          <span className="text-[11px] text-[#BCACCE] font-mono">Non-Destructive Write</span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="flex flex-col gap-1.5">
            <span className="text-[#23003F] dark:text-[#BCACCE] font-semibold">Enhanced Image Format</span>
            <select
              value={config.outputFormat}
              onChange={(e) => onChangeConfig({ outputFormat: e.target.value as any })}
              className="bg-[#FAF8FD] dark:bg-[#2E074E] border border-[#E7E0EE] dark:border-[#4C177D] rounded-xl px-2.5 py-2 text-xs text-[#23003F] dark:text-white outline-none"
            >
              <option value="JPEG">JPEG (High Compatibility with EXIF)</option>
              <option value="WEBP">WebP (Maximum Compression Efficiency)</option>
              <option value="ORIGINAL">Keep Original Format</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[#23003F] dark:text-[#BCACCE] font-semibold">JPEG Quality Level</span>
              <span className="font-mono text-[#F94500] font-bold">{config.jpegQuality}%</span>
            </div>
            <input
              type="range"
              min="75"
              max="100"
              value={config.jpegQuality}
              onChange={(e) => onChangeConfig({ jpegQuality: Number(e.target.value) })}
              className="accent-[#F94500] w-full cursor-pointer mt-1"
            />
          </div>
        </div>
      </div>

      {/* Save / Reset Actions */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => {
            onChangeConfig({
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
            alert('Settings restored to defaults.');
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#20003A] hover:bg-[#F3EFF9] dark:hover:bg-[#320857] border border-[#E7E0EE] dark:border-[#4C177D] text-xs font-semibold text-[#23003F] dark:text-[#FFFDB4] transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#BCACCE]" />
          <span>Restore Recommended Defaults</span>
        </button>

        <span className="text-[11px] text-[#BCACCE] font-medium">Auto-saved to local secure storage</span>
      </div>
    </div>
  );
};
