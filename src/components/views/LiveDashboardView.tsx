import React, { useState } from 'react';
import {
  Search,
  Filter,
  Table as TableIcon,
  Eye,
  FileImage,
  MoreHorizontal,
  Compass
} from 'lucide-react';
import { FolderCardGrid } from '../dashboard/FolderCardGrid';
import { ComparisonViewer } from '../dashboard/ComparisonViewer';
import { EventLogStream } from '../dashboard/EventLogStream';
import {
  ProcessingStatus,
  PipelineMetrics,
  ProcessedItem,
  LogEntry,
} from '../../engine/types';

interface LiveDashboardViewProps {
  status: ProcessingStatus;
  metrics: PipelineMetrics;
  items: ProcessedItem[];
  activeItem: ProcessedItem | null;
  logs: LogEntry[];
}

export const LiveDashboardView: React.FC<LiveDashboardViewProps> = ({
  metrics,
  items,
  activeItem,
  logs,
}) => {
  const [viewMode, setViewMode] = useState<'split' | 'table'>('split');
  const [searchQuery, setSearchQuery] = useState<string>('');

  return (
    <div className="flex flex-col gap-3.5 h-full overflow-y-auto pr-1 pb-6 select-none">
      {/* 1. Search Bar with Filter Pill Button */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search photos, RAWs, occasions, or tags..."
            className="w-full bg-transparent text-xs text-slate-900 placeholder:text-slate-400 outline-none"
          />
        </div>

        <button className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 transition-colors">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <span>Filter</span>
        </button>

        {/* View Switcher */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-2xl border border-slate-200">
          <button
            onClick={() => setViewMode('split')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'split'
                ? 'bg-white text-slate-900'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Live Split</span>
          </button>

          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'table'
                ? 'bg-white text-slate-900'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>All Files</span>
          </button>
        </div>
      </div>

      {/* 2. Folder Cards Grid */}
      <FolderCardGrid
        metrics={metrics}
        activeBatchName="Active Sort Batch"
      />

      {/* 3. Main Center Workspace */}
      {viewMode === 'split' ? (
        <div className="grid grid-cols-3 gap-3 flex-1 min-h-[300px]">
          <div className="col-span-2 min-h-0">
            <ComparisonViewer activeItem={activeItem} />
          </div>
          <div className="col-span-1 min-h-0">
            <EventLogStream logs={logs} />
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-900">All Files in Batch</span>
            <span className="text-[11px] text-slate-400 font-mono">
              {items.length} Files Discovered
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100 font-semibold text-[11px]">
                  <th className="pb-2 pl-1">NAME</th>
                  <th className="pb-2">FACES / OWNERS</th>
                  <th className="pb-2">HORIZON LEVEL</th>
                  <th className="pb-2">OCCASION</th>
                  <th className="pb-2">FILE SIZE</th>
                  <th className="pb-2 pr-1 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {items.slice(0, 10).map((item) => (
                  <tr key={item.metadata.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 pl-1 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 border border-blue-100">
                        <FileImage className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-semibold text-slate-900 truncate max-w-[170px]">
                        {item.metadata.filename}
                      </span>
                    </td>

                    <td className="py-2.5">
                      <div className="flex items-center -space-x-1">
                        {item.faces.length > 0 ? (
                          item.faces.map((_f, idx) => (
                            <div
                              key={idx}
                              className="w-5 h-5 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center border border-white"
                            >
                              {idx + 1}
                            </div>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono">None</span>
                        )}
                      </div>
                    </td>

                    <td className="py-2.5">
                      <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-semibold border border-blue-100">
                        <Compass className="w-3 h-3" />
                        {item.geometry.detectedAngleDeg}°
                      </span>
                    </td>

                    <td className="py-2.5">
                      <span className="text-[10px] font-bold text-slate-600 px-2 py-0.5 rounded-full bg-slate-100">
                        {item.occasion?.occasion || 'General'}
                      </span>
                    </td>

                    <td className="py-2.5 font-mono text-[11px] text-slate-500">
                      {(item.metadata.fileSize / 1000000).toFixed(1)} MB
                    </td>

                    <td className="py-2.5 pr-1 text-right">
                      <button className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
