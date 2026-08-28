import React, { useRef, useEffect } from 'react';
import {
  Terminal,
  RotateCcw
} from 'lucide-react';
import { LogEntry } from '../../engine/types';

interface EventLogStreamProps {
  logs: LogEntry[];
}

export const EventLogStream: React.FC<EventLogStreamProps> = ({ logs }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="h-full bg-white border border-slate-200 rounded-2xl p-3 flex flex-col gap-2 font-mono text-xs select-none">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-1.5 text-slate-800 font-bold text-[11px]">
          <Terminal className="w-3.5 h-3.5 text-blue-600" />
          <span>Activity Log Stream</span>
        </div>
        <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
          {logs.length} events
        </span>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto pr-1 flex flex-col gap-1 text-[10px] leading-relaxed max-h-[300px]"
      >
        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-4">
            <span>Start the sorting pipeline to observe real-time operations.</span>
          </div>
        ) : (
          logs.map((log) => {
            let color = 'text-slate-600';
            if (log.level === 'SUCCESS') color = 'text-emerald-600 font-semibold';
            if (log.level === 'WARN') color = 'text-amber-600 font-semibold';
            if (log.level === 'ERROR') color = 'text-rose-600 font-semibold';

            return (
              <div
                key={log.id}
                className="flex items-start gap-1.5 hover:bg-slate-50 p-1 rounded transition-colors"
              >
                <span className="text-slate-400 text-[9px] flex-shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className="text-blue-500 font-bold flex-shrink-0">[{log.level}]</span>
                <span className={`${color} break-all flex-1`}>{log.message}</span>
              </div>
            );
          })
        )}
      </div>

      {logs.length > 0 && (
        <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
          <span>Engine: Python 3.11 Sidecar (Radon + EXIF)</span>
          <RotateCcw className="w-3 h-3 text-slate-300" />
        </div>
      )}
    </div>
  );
};
