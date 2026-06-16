/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Trash2, CalendarX, Clock, ChevronRight, Search, Pencil } from 'lucide-react';
import { CATEGORIES, Activity } from '../types';

interface ActivitiesTimelineProps {
  activities: Activity[];
  onDeleteActivity: (id: string) => void;
  onClearAll: () => void;
  onUpdateActivity: (activity: Activity) => void;
}

export default function ActivitiesTimeline({
  activities,
  onDeleteActivity,
  onClearAll,
  onUpdateActivity,
}: ActivitiesTimelineProps) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMinutes, setEditMinutes] = useState<number>(0);

  // Date range state
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  // Filter activities dynamically based on the selected date range
  const rangeActivities = activities.filter((act) => {
    if (startDate && act.date < startDate) return false;
    if (endDate && act.date > endDate) return false;
    return true;
  });

  // Sort activities chronologically (by date first, then by start time)
  const sortedActivities = [...rangeActivities].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.startTime.localeCompare(b.startTime);
  });

  // Apply search filtering (case-insensitive check against activity name, category, or tags)
  const filteredActivities = sortedActivities.filter((act) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      act.name.toLowerCase().includes(query) ||
      act.category.toLowerCase().includes(query) ||
      (act.tags && act.tags.some((t) => t.toLowerCase().includes(query)))
    );
  });

  // Helper to format date "YYYY-MM-DD" into readable e.g., "Jun 16, 2026"
  const formatDateReadable = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const dateObj = new Date(year, month, day);
      return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return dateStr;
  };

  // Time format helper: "14:30" => "2:30 PM"
  const formatTimeAMPM = (timeStr: string) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${ampm}`;
  };

  // Duration formatting: seconds into clean "Xh Ym" or "Ym Zs"
  const formatDurationReadable = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const startEdit = (act: Activity) => {
    setEditingId(act.id);
    setEditMinutes(Math.max(1, Math.round(act.duration / 60)));
  };

  const saveEdit = (act: Activity) => {
    const newDurationSeconds = editMinutes * 60;
    
    // Calculate new end time relative to start time + editMinutes
    const [startH, startM] = act.startTime.split(':').map(Number);
    let endMinutes = startH * 60 + startM + editMinutes;
    endMinutes = endMinutes % (24 * 60);
    const endH = Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;
    const newEndTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

    onUpdateActivity({
      ...act,
      duration: newDurationSeconds,
      endTime: newEndTime,
    });
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleConfirmClear = () => {
    onClearAll();
    setShowConfirmModal(false);
  };

  return (
    <div className="bg-[#0F1116] border border-slate-800 p-6 relative flex flex-col gap-5 h-full rounded-sm" id="timeline-card">
      <div className="flex justify-between items-center pb-2 border-b border-slate-800" id="timeline-title-bar">
        <h2 className="font-heading text-xs uppercase tracking-[0.2em] font-bold text-slate-400">
          Daily Log Feeds
        </h2>
        {sortedActivities.length > 0 && (
          <button
            type="button"
            onClick={() => setShowConfirmModal(true)}
            className="text-[10px] uppercase tracking-widest font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-sm transition-all cursor-pointer"
            id="clear-all-btn"
          >
            Reset Days
          </button>
        )}
      </div>

      {/* Date Range Selector Panel */}
      <div className="p-3.5 bg-slate-950/40 border border-slate-850/30 rounded-sm flex flex-col gap-3" id="timeline-date-range-panel">
        <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center">
          <div className="flex flex-col gap-1 flex-1">
            <span className="text-[8px] uppercase tracking-widest font-bold text-slate-500">From Date</span>
            <input
              type="date"
              id="timeline-start-date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-950 border border-slate-850 rounded-sm px-2.5 py-1.5 text-xs text-white font-mono outline-none focus:border-emerald-505"
            />
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <span className="text-[8px] uppercase tracking-widest font-bold text-slate-500">To Date</span>
            <input
              type="date"
              id="timeline-end-date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-950 border border-slate-850 rounded-sm px-2.5 py-1.5 text-xs text-white font-mono outline-none focus:border-emerald-505"
            />
          </div>
        </div>
        <div className="flex gap-2 border-t border-slate-900/60 pt-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setStartDate(todayStr);
              setEndDate(todayStr);
            }}
            className={`px-3 py-1 text-[9px] uppercase tracking-wider font-mono font-bold rounded-sm border transition-all cursor-pointer flex-1 text-center ${
              startDate === todayStr && endDate === todayStr
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-950/40 border-slate-900 text-slate-500 hover:text-slate-300 hover:border-slate-800'
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => {
              const prev = new Date();
              prev.setDate(prev.getDate() - 6);
              const prevStr = prev.toISOString().split('T')[0];
              setStartDate(prevStr);
              setEndDate(todayStr);
            }}
            className={`px-3 py-1 text-[9px] uppercase tracking-wider font-mono font-bold rounded-sm border transition-all cursor-pointer flex-1 text-center ${
              startDate === new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString().split('T')[0] && endDate === todayStr
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-950/40 border-slate-900 text-slate-500 hover:text-slate-300 hover:border-slate-800'
            }`}
          >
            7 Days
          </button>
          <button
            type="button"
            onClick={() => {
              setStartDate('');
              setEndDate('');
            }}
            className={`px-3 py-1 text-[9px] uppercase tracking-wider font-mono font-bold rounded-sm border transition-all cursor-pointer flex-1 text-center ${
              !startDate && !endDate
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-950/40 border-slate-900 text-slate-500 hover:text-slate-300 hover:border-slate-800'
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {/* Text-based Search Input Filter */}
      {rangeActivities.length > 0 && (
        <div className="relative flex items-center" id="timeline-search-box">
          <Search className="absolute left-3 w-3.5 h-3.5 text-slate-600 pointer-events-none" />
          <input
            type="text"
            placeholder="FILTER BY CATEGORY OR ASSIGNMENT..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-850 rounded-sm pl-9 pr-4 py-2.5 text-[10px] font-mono tracking-wider text-white placeholder-slate-600 outline-none transition-all focus:border-emerald-500 focus:ring-0 uppercase"
            id="timeline-search-input"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 text-[9px] uppercase tracking-widest font-mono font-bold text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              title="Clear Filter"
            >
              Clear
            </button>
          )}
        </div>
      )}

      <div className="flex-grow overflow-y-auto max-h-[460px] pr-2 custom-scrollbar flex flex-col gap-4" id="timeline-items-list">
        {rangeActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20 px-4 text-slate-500" id="timeline-empty-state">
            <div className="border border-slate-850 w-12 h-12 rounded-sm flex items-center justify-center mb-4 text-slate-500 transform rotate-45 bg-slate-950">
              <CalendarX className="w-5 h-5 opacity-60 -rotate-45" />
            </div>
            <h3 className="font-heading font-bold text-xs uppercase tracking-widest text-slate-400 mb-1">
              Timeline Empty
            </h3>
            <p className="text-xs text-slate-500 max-w-[200px] leading-relaxed">
              No daily logs found for the selected timeframe. Log a new session or customize dates.
            </p>
          </div>
        ) : filteredActivities.length > 0 ? (
          filteredActivities.map((act) => {
            const catInfo = CATEGORIES[act.category];
            const activeColor = catInfo?.color || '#a855f7';
            return (
              <div
                key={act.id}
                className="group relative pl-6 border-l-2 py-1 flex items-center justify-between gap-4 border-slate-800 hover:border-emerald-500/40 transition-all duration-300"
                style={{ borderLeftColor: activeColor }}
                id={`timeline-item-${act.id}`}
              >
                {/* Connecting Node Ball */}
                <div 
                  className="absolute -left-[9px] top-3 w-4 h-4 rounded-full border-4 border-[#0F1116] transition-all group-hover:scale-110"
                  style={{ backgroundColor: activeColor }}
                  id={`timeline-node-${act.id}`}
                />

                <div className="flex flex-col gap-0.5">
                  <p className="text-[10px] font-mono text-slate-500 tracking-wide uppercase">
                    {formatDateReadable(act.date)} • {formatTimeAMPM(act.startTime)} — {formatTimeAMPM(act.endTime)}
                  </p>
                  <h4 className="font-heading font-medium text-sm text-white group-hover:text-emerald-400 transition-colors">
                    {act.name}
                  </h4>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                    <span 
                      className="px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider border mt-0.5"
                      style={{ backgroundColor: `${activeColor}10`, borderColor: `${activeColor}20`, color: activeColor }}
                    >
                      {act.category}
                    </span>
                    {act.tags && act.tags.length > 0 && act.tags.map((tag) => (
                      <span 
                        key={tag} 
                        className="px-1.5 py-0.5 rounded-sm text-[8px] bg-slate-950/40 border border-slate-800/80 text-emerald-400 font-semibold uppercase tracking-widest font-mono mt-0.5"
                      >
                        #{tag}
                      </span>
                    ))}
                    {act.notes && (
                      <span className="text-[11px] text-slate-500 font-light truncate max-w-[180px] sm:max-w-[245px] mt-0.5">
                        • {act.notes}
                      </span>
                    )}
                  </div>
                </div>

                {editingId === act.id ? (
                  <div className="flex items-center gap-1.5 shrink-0 bg-slate-900 border border-slate-800 p-1.5 rounded-sm" id={`edit-dur-container-${act.id}`}>
                    <input
                      type="number"
                      min="1"
                      max="1440"
                      value={editMinutes}
                      onChange={(e) => setEditMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-12 bg-slate-950 border border-slate-800 rounded-sm text-center py-1 text-xs text-emerald-400 font-mono outline-none focus:border-emerald-500"
                      id={`edit-dur-input-${act.id}`}
                    />
                    <span className="text-[9px] uppercase tracking-wider font-mono text-slate-500 pr-1">min</span>
                    <button
                      type="button"
                      onClick={() => saveEdit(act)}
                      className="text-[9px] bg-emerald-500 hover:bg-emerald-400 text-black px-2 py-1 rounded-sm uppercase tracking-widest font-mono font-bold transition-all cursor-pointer"
                      id={`edit-dur-save-${act.id}`}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded-sm uppercase tracking-widest font-mono font-bold transition-all cursor-pointer"
                      id={`edit-dur-cancel-${act.id}`}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 text-right shrink-0">
                    <span className="font-mono text-xs font-semibold text-emerald-400">
                      {formatDurationReadable(act.duration)}
                    </span>
                    <button
                      type="button"
                      onClick={() => startEdit(act)}
                      className="text-slate-600 hover:text-emerald-400 p-1.5 transition-all rounded-sm hover:bg-slate-950/20 cursor-pointer"
                      title="Edit duration"
                      aria-label="Edit duration"
                      id={`edit-dur-btn-${act.id}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteActivity(act.id)}
                      className="text-slate-600 hover:text-rose-400 p-1.5 transition-all rounded-sm hover:bg-rose-950/20 cursor-pointer"
                      title="Delete entry"
                      aria-label="Delete entry"
                      id={`delete-dur-btn-${act.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-20 px-4 text-slate-500" id="search-empty-state">
            <h3 className="font-heading font-bold text-xs uppercase tracking-widest text-slate-400 mb-1">
              No matching logs
            </h3>
            <p className="text-xs text-slate-500 max-w-[200px] leading-relaxed">
              No daily logs matched "{searchQuery}". Try searching for a different assignment title or category classification.
            </p>
          </div>
        )}
      </div>

      {/* Geometric Confirmation Modal representation */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xs animate-fade-in" id="confirm-modal-overlay">
          <div className="bg-[#0F1116] border border-slate-800 p-8 rounded-sm max-w-sm w-full text-center flex flex-col gap-4 animate-slide-in">
            <h3 className="font-heading font-semibold text-sm uppercase tracking-widest text-[#ef4444]">
              Purge Daily Documentations?
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed font-light">
              This will permanently clear today's day schedule markers. This action cannot be undone.
            </p>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="w-full font-heading font-bold text-[10px] bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-sm uppercase tracking-widest transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClear}
                className="w-full font-heading font-bold text-[10px] bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-sm uppercase tracking-widest transition-all cursor-pointer"
              >
                Purge All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
