import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Image as ImageIcon,
  HardDrive
} from 'lucide-react';
import { ProcessedItem } from '../../engine/types';

interface MinimalPhotoCalendarProps {
  items: ProcessedItem[];
  onSelectDate?: (dateStr: string | null) => void;
  selectedDate?: string | null;
}

export const MinimalPhotoCalendar: React.FC<MinimalPhotoCalendarProps> = ({
  items,
  onSelectDate,
  selectedDate,
}) => {
  // Calendar view state (year and month 0-11)
  const [currentDate, setCurrentDate] = useState(() => {
    if (items.length > 0) {
      const firstDate = new Date(items[0].metadata.timestamp);
      if (!isNaN(firstDate.getTime())) return firstDate;
    }
    return new Date();
  });

  // State for hovered date tooltip
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Group uploaded photos by YYYY-MM-DD
  const photosByDate = useMemo(() => {
    const map = new Map<string, ProcessedItem[]>();
    items.forEach((item) => {
      const d = new Date(item.metadata.timestamp);
      if (!isNaN(d.getTime())) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const key = `${yyyy}-${mm}-${dd}`;
        const existing = map.get(key) || [];
        existing.push(item);
        map.set(key, existing);
      }
    });
    return map;
  }, [items]);

  // Calendar grid calculations
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Previous month trailing days
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const hoveredItems = hoveredDate ? photosByDate.get(hoveredDate) || [] : [];

  return (
    <div className="relative bg-white dark:bg-[#0E0E0E] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-3 flex flex-col gap-2 select-none transition-colors duration-200">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-lg bg-[#D83C00]/15 text-[#D83C00] flex items-center justify-center">
            <CalendarIcon className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="font-heading text-xs font-bold text-[#111827] dark:text-white leading-none">
              {monthNames[month]} {year}
            </h3>
          </div>
        </div>

        {/* Navigation Arrows */}
        <div className="flex items-center gap-1">
          <button
            onClick={goToToday}
            className="font-heading text-2xs font-bold px-2 py-0.5 rounded-lg text-[#9CA3AF] hover:text-[#111827] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#181818] transition-colors cursor-pointer"
          >
            Today
          </button>
          <button
            onClick={prevMonth}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#181818] text-[#9CA3AF] hover:text-[#111827] dark:hover:text-white transition-colors cursor-pointer"
            title="Previous Month"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={nextMonth}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#181818] text-[#9CA3AF] hover:text-[#111827] dark:hover:text-white transition-colors cursor-pointer"
            title="Next Month"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 text-center font-heading text-2xs font-bold text-[#9CA3AF] dark:text-[#71717A]">
        <span>Su</span>
        <span>Mo</span>
        <span>Tu</span>
        <span>We</span>
        <span>Th</span>
        <span>Fr</span>
        <span>Sa</span>
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Trailing days from previous month */}
        {Array.from({ length: firstDayOfMonth }).map((_, i) => {
          const dayNum = daysInPrevMonth - firstDayOfMonth + i + 1;
          return (
            <div
              key={`prev-${i}`}
              className="h-7 rounded-lg flex items-center justify-center text-xs font-mono tabular-nums text-[#9CA3AF]/40 dark:text-[#71717A]/40"
            >
              {dayNum}
            </div>
          );
        })}

        {/* Current month days */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const mm = String(month + 1).padStart(2, '0');
          const dd = String(dayNum).padStart(2, '0');
          const dateKey = `${year}-${mm}-${dd}`;
          const datePhotos = photosByDate.get(dateKey) || [];
          const hasPhotos = datePhotos.length > 0;
          const isSelected = selectedDate === dateKey;

          const isToday =
            new Date().getFullYear() === year &&
            new Date().getMonth() === month &&
            new Date().getDate() === dayNum;

          return (
            <div
              key={dateKey}
              onMouseEnter={(e) => {
                if (hasPhotos) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setHoveredDate(dateKey);

                  const tooltipWidth = 265;
                  let xPos = rect.right + 20;
                  if (xPos + tooltipWidth > window.innerWidth - 16) {
                    xPos = Math.max(16, rect.left - tooltipWidth - 20);
                  }

                  let yPos = rect.top - 10;
                  if (yPos + 220 > window.innerHeight) {
                    yPos = window.innerHeight - 230;
                  }

                  setMousePos({ x: xPos, y: yPos });
                }
              }}
              onMouseLeave={() => setHoveredDate(null)}
              onClick={() => {
                if (onSelectDate) {
                  onSelectDate(isSelected ? null : dateKey);
                }
              }}
              className={`relative h-7 rounded-lg flex flex-col items-center justify-center text-xs font-mono tabular-nums transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#D83C00] text-white font-bold'
                  : hasPhotos
                  ? 'bg-[#D83C00]/15 text-[#D83C00] dark:text-[#FF8C61] font-bold border border-[#D83C00]/30 hover:bg-[#D83C00]/25'
                  : isToday
                  ? 'bg-slate-100 dark:bg-[#1E1E1E] text-[#111827] dark:text-white font-bold'
                  : 'text-[#4B5563] dark:text-[#A1A1AA] hover:bg-slate-100 dark:hover:bg-[#181818]'
              }`}
            >
              <span>{dayNum}</span>

              {/* Photo Count Indicator Dot / Pill */}
              {hasPhotos && (
                <span
                  className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-mono tabular-nums font-extrabold ${
                    isSelected
                      ? 'bg-black text-[#D83C00]'
                      : 'bg-[#D83C00] text-white'
                  }`}
                >
                  {datePhotos.length > 9 ? '9+' : datePhotos.length}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating Hover Tooltip showing photo names and details */}
      {hoveredDate && hoveredItems.length > 0 && (
        <div
          className="fixed z-50 bg-[#121212] text-white rounded-xl p-3 border border-[#27272A] pointer-events-none w-64 animate-in fade-in zoom-in-95 duration-100 shadow-2xl"
          style={{
            left: `${Math.min(mousePos.x, window.innerWidth - 270)}px`,
            top: `${Math.min(mousePos.y, window.innerHeight - 240)}px`,
          }}
        >
          {/* Tooltip Header */}
          <div className="flex items-center justify-between pb-2 border-b border-[#27272A]">
            <div className="flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-[#D83C00]" />
              <span className="font-heading font-bold text-xs text-white">
                {new Date(hoveredDate + 'T00:00:00').toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
            <span className="text-2xs font-mono tabular-nums px-1.5 py-0.5 rounded bg-[#D83C00] text-white font-bold">
              {hoveredItems.length} photos
            </span>
          </div>

          {/* List of Photo Names */}
          <div className="flex flex-col gap-1.5 py-2">
            <span className="font-heading text-2xs font-extrabold uppercase tracking-wider text-[#9CA3AF]">
              Uploaded Images on this Date:
            </span>
            <div className="flex flex-col gap-1 max-h-28 overflow-y-hidden">
              {hoveredItems.slice(0, 5).map((item) => (
                <div
                  key={item.metadata.id}
                  className="flex items-center justify-between text-xs bg-[#181818] px-2 py-1 rounded-lg border border-[#27272A]"
                >
                  <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                    <ImageIcon className="w-3 h-3 text-[#D83C00] flex-shrink-0" />
                    <span className="truncate text-white font-medium">
                      {item.metadata.filename}
                    </span>
                  </div>
                  <span className="font-mono tabular-nums text-2xs text-[#9CA3AF] flex-shrink-0">
                    {(item.metadata.fileSize / 1000000).toFixed(1)} MB
                  </span>
                </div>
              ))}
              {hoveredItems.length > 5 && (
                <span className="text-2xs text-[#9CA3AF] text-center italic">
                  + {hoveredItems.length - 5} more images
                </span>
              )}
            </div>
          </div>

          {/* Tooltip Footer Total Size */}
          <div className="pt-2 border-t border-[#27272A] flex items-center justify-between text-xs font-mono tabular-nums text-[#9CA3AF]">
            <span className="flex items-center gap-1">
              <HardDrive className="w-3 h-3 text-[#9CA3AF]" />
              Total Date Size
            </span>
            <span className="text-[#D83C00] font-bold">
              {(
                hoveredItems.reduce((sum, i) => sum + i.metadata.fileSize, 0) / 1000000
              ).toFixed(2)}{' '}
              MB
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
