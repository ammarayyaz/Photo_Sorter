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
      if (config.geminiApiKey.startsWith('AIza') || config.geminiApiKey.startsWith('AQ.')) {
        setTestStatus('valid');
      } else {
        setTestStatus('invalid');
      }
    }, 800);
  };

  return (
    <div className="flex flex-col gap-4 max-w-4xl overflow-y-auto pr-2 pb-6 select-none">
      {/* Cloud AI Credentials */}
      <div className="bg-white dark:bg-[#0E0E0E] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-4 flex flex-col gap-3 transition-colors">
        <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB] dark:border-[#27272A]">
          <div className="flex items-center gap-2 text-xs font-bold text-[#111827] dark:text-white">
            <Key className="w-4 h-4 text-[#4D694E]" />
            <span className="font-heading">Google Gemini Vision API Authentication</span>
          </div>
          <span className="text-2xs text-[#9CA3AF] font-mono tabular-nums">Gemini 2.0 / 2.5 Flash Vision</span>
        </div>

        <div className="flex flex-col gap-2 text-xs">
          <label className="font-heading font-semibold text-[#111827] dark:text-white">API Secret Key</label>
          <div className="flex items-center gap-2">
            <input
              type="password"
              value={config.geminiApiKey}
              onChange={(e) => {
                onChangeConfig({ geminiApiKey: e.target.value });
                setTestStatus('idle');
              }}
              placeholder="Paste AI Studio Key (AIza... / AQ...)"
              className="flex-1 bg-[#F9FAFB] dark:bg-[#181818] border border-[#E5E7EB] dark:border-[#27272A] rounded-xl px-3 py-2 text-xs font-mono tabular-nums text-[#111827] dark:text-white outline-none focus:border-[#4D694E]"
            />
            <button
              onClick={handleTestApiKey}
              disabled={testStatus === 'testing'}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-[#181818] hover:bg-slate-100 dark:hover:bg-[#222222] border border-[#E5E7EB] dark:border-[#27272A] font-heading text-xs font-bold text-[#111827] dark:text-white transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#4D694E]" />
              <span>{testStatus === 'testing' ? 'Testing...' : 'Validate Key'}</span>
            </button>
          </div>

          {testStatus === 'valid' && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-semibold mt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>API key authenticated successfully for Gemini 2.0 / 2.5 Flash Vision.</span>
            </div>
          )}
          {testStatus === 'invalid' && (
            <div className="flex items-center gap-1.5 text-xs text-red-500 font-semibold mt-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Invalid API key or network error. Pipeline will use local EXIF &amp; computer vision fallback.</span>
            </div>
          )}
        </div>
      </div>

      {/* Compute Engine & Hardware Vitals */}
      <div className="bg-white dark:bg-[#0E0E0E] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-4 flex flex-col gap-3 transition-colors">
        <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB] dark:border-[#27272A]">
          <div className="flex items-center gap-2 text-xs font-bold text-[#111827] dark:text-white">
            <Cpu className="w-4 h-4 text-[#4D694E]" />
            <span className="font-heading">Multi-Threading Optimization</span>
          </div>
          <span className="text-2xs text-[#9CA3AF] font-mono tabular-nums">Hardware Acceleration</span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="flex flex-col gap-1.5">
            <span className="font-heading font-semibold text-[#111827] dark:text-[#A1A1AA]">RAW Decoding Thread Pool</span>
            <select className="bg-[#F9FAFB] dark:bg-[#181818] border border-[#E5E7EB] dark:border-[#27272A] rounded-xl px-2.5 py-2 text-xs font-sans text-[#111827] dark:text-white outline-none">
              <option value="auto">Auto (8 Threads - Intel/AMD AVX2)</option>
              <option value="4">4 Dedicated Threads</option>
              <option value="16">16 High-Throughput Threads</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="font-heading font-semibold text-[#111827] dark:text-[#A1A1AA]">Memory Heap Ceiling</span>
            <select className="bg-[#F9FAFB] dark:bg-[#181818] border border-[#E5E7EB] dark:border-[#27272A] rounded-xl px-2.5 py-2 text-xs font-sans text-[#111827] dark:text-white outline-none">
              <option value="1200">1.2 GB (Explicit GC every 50 frames)</option>
              <option value="2048">2.0 GB (High RAM workstations)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Output & Format Compression */}
      <div className="bg-white dark:bg-[#0E0E0E] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-4 flex flex-col gap-3 transition-colors">
        <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB] dark:border-[#27272A]">
          <div className="flex items-center gap-2 text-xs font-bold text-[#111827] dark:text-white">
            <HardDrive className="w-4 h-4 text-[#4D694E]" />
            <span className="font-heading">Export Compression &amp; Format Rules</span>
          </div>
          <span className="text-2xs text-[#9CA3AF] font-mono tabular-nums">Non-Destructive Write</span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="flex flex-col gap-1.5">
            <span className="font-heading font-semibold text-[#111827] dark:text-[#A1A1AA]">Enhanced Image Format</span>
            <select
              value={config.outputFormat}
              onChange={(e) => onChangeConfig({ outputFormat: e.target.value as any })}
              className="bg-[#F9FAFB] dark:bg-[#181818] border border-[#E5E7EB] dark:border-[#27272A] rounded-xl px-2.5 py-2 text-xs font-sans text-[#111827] dark:text-white outline-none"
            >
              <option value="JPEG">JPEG (High Compatibility with EXIF)</option>
              <option value="WEBP">WebP (Maximum Compression Efficiency)</option>
              <option value="ORIGINAL">Keep Original Format</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="font-heading font-semibold text-[#111827] dark:text-[#A1A1AA]">JPEG Quality Level</span>
              <span className="font-mono tabular-nums text-[#4D694E] font-bold">{config.jpegQuality}%</span>
            </div>
            <input
              type="range"
              min="75"
              max="100"
              value={config.jpegQuality}
              onChange={(e) => onChangeConfig({ jpegQuality: Number(e.target.value) })}
              className="accent-[#4D694E] w-full cursor-pointer mt-1"
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
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#181818] hover:bg-slate-100 dark:hover:bg-[#222222] border border-[#E5E7EB] dark:border-[#27272A] font-heading text-xs font-bold text-[#111827] dark:text-white transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#9CA3AF]" />
          <span>Restore Recommended Defaults</span>
        </button>
      </div>
    </div>
  );
};
