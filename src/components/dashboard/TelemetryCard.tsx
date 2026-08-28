import React from 'react';
import { LucideIcon } from 'lucide-react';

interface TelemetryCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  highlight?: boolean;
}

export const TelemetryCard: React.FC<TelemetryCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  highlight = false,
}) => {
  return (
    <div
      className={`p-3.5 rounded-xl border transition-all ${
        highlight
          ? 'bg-base-surface border-accent-border shadow-sm'
          : 'bg-base-surface border-base-border'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-text-secondary uppercase tracking-wider">
          {title}
        </span>
        <div
          className={`p-1.5 rounded-lg ${
            highlight ? 'bg-accent-subtle text-accent-cyan' : 'bg-base-elevated text-text-dim'
          }`}
        >
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>

      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-xl font-bold font-mono text-text-primary tracking-tight">
          {value}
        </span>
      </div>

      <div className="text-[11px] text-text-dim mt-0.5">{subtitle}</div>
    </div>
  );
};
