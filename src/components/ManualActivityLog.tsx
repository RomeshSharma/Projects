/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, FormEvent } from 'react';
import { CalendarPlus, Tag, X } from 'lucide-react';
import { CATEGORIES, CategoryKey, Activity } from '../types';

interface ManualActivityLogProps {
  onAddActivity: (activity: Activity) => void;
}

export default function ManualActivityLog({ onAddActivity }: ManualActivityLogProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<CategoryKey>('Work');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Auto-set initial date/times on mount
  useEffect(() => {
    initializeFormTimes();
  }, []);

  const initializeFormTimes = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    setDate(todayStr);

    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    
    // Set end time to current hour/minute
    const endStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    
    // Set start time to one hour ago
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const startStr = `${pad(oneHourAgo.getHours())}:${pad(oneHourAgo.getMinutes())}`;

    setStartTime(startStr);
    setEndTime(endStr);
  };

  const handleAddTag = () => {
    const cleanTag = tagInput.trim().replace(/#/g, '');
    if (cleanTag && !tags.includes(cleanTag)) {
      setTags([...tags, cleanTag]);
    }
    setTagInput('');
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleRemoveTag = (indexToRemove: number) => {
    setTags(tags.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Please specify an activity name.');
      return;
    }
    if (!startTime || !endTime) {
      setErrorMsg('Please enter both start and end times.');
      return;
    }

    // Parse times to calculate difference in minutes
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    
    let durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    
    // Handle overnight log boundaries (e.g. 23:00 to 01:30 next day)
    if (durationMinutes < 0) {
      durationMinutes += 24 * 60;
    }

    if (durationMinutes === 0) {
      setErrorMsg('Start time and End time cannot be identical.');
      return;
    }

    const durationSeconds = durationMinutes * 60;

    const logged: Activity = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
      name: name.trim(),
      category,
      date,
      startTime,
      endTime,
      duration: durationSeconds,
      notes: notes.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
    };

    onAddActivity(logged);

    // Reset inputs
    setName('');
    setNotes('');
    setTags([]);
    setTagInput('');
    initializeFormTimes();
  };

  return (
    <div className="bg-[#0F1116] border border-slate-800 p-6 relative flex flex-col rounded-sm" id="manual-log-card">
      <div className="flex justify-between items-center pb-2 border-b border-slate-800 mb-5" id="manual-log-header">
        <h2 className="font-heading text-xs uppercase tracking-[0.2em] font-bold text-slate-400">
          Log Past Activity
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 font-sans" id="manual-log-form">
        <div className="flex flex-col gap-1.5" id="manual-name-group">
          <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold font-heading" htmlFor="manualName">
            Activity Name
          </label>
          <input
            id="manualName"
            type="text"
            placeholder="e.g., Frontend Integration Sync"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="bg-slate-950 border border-slate-800 rounded-sm px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition-all focus:border-emerald-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4" id="manual-row-1">
          <div className="flex flex-col gap-1.5" id="manual-category-group">
            <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold font-heading" htmlFor="manualCategory">
              Classification
            </label>
            <select
              id="manualCategory"
              value={category}
              onChange={(e) => setCategory(e.target.value as CategoryKey)}
              className="bg-slate-950 border border-slate-800 rounded-sm px-4 py-3 text-sm text-white outline-none transition-all focus:border-emerald-500"
            >
              {(Object.keys(CATEGORIES) as CategoryKey[]).map((catKey) => (
                <option key={catKey} value={catKey} className="bg-slate-900">
                  {CATEGORIES[catKey].emoji} {catKey.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5" id="manual-date-group">
            <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold font-heading" htmlFor="manualDate">
              Date
            </label>
            <input
              id="manualDate"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="bg-slate-950 border border-slate-800 rounded-sm px-4 py-3 text-sm text-slate-300 outline-none transition-all focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4" id="manual-row-2">
          <div className="flex flex-col gap-1.5" id="manual-start-group">
            <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold font-heading" htmlFor="manualStart">
              Start Time
            </label>
            <input
              id="manualStart"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
              className="bg-slate-950 border border-slate-800 rounded-sm px-4 py-3 text-sm text-slate-300 outline-none transition-all focus:border-emerald-500"
            />
          </div>

          <div className="flex flex-col gap-1.5" id="manual-end-group">
            <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold font-heading" htmlFor="manualEnd">
              End Time
            </label>
            <input
              id="manualEnd"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
              className="bg-slate-950 border border-slate-800 rounded-sm px-4 py-3 text-sm text-slate-300 outline-none transition-all focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5" id="manual-notes-group">
          <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold font-heading" htmlFor="manualNotes">
            Session Documentation <span className="text-slate-600 font-normal">(Optional)</span>
          </label>
          <textarea
            id="manualNotes"
            placeholder="Document accomplishments or notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="bg-slate-950 border border-slate-800 rounded-sm px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition-all focus:border-emerald-500 resize-none"
          />
        </div>

        <div className="flex flex-col gap-1.5" id="manual-tags-group">
          <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold font-heading" htmlFor="manualTagsInput">
            Activity Tags <span className="text-slate-600 font-normal">(Optional — Press Enter or comma to add)</span>
          </label>
          <div className="flex gap-2">
            <div className="relative flex-grow">
              <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-650 pointer-events-none" />
              <input
                id="manualTagsInput"
                type="text"
                placeholder="e.g., refactor, sync"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                className="w-full bg-slate-950 border border-slate-800 rounded-sm pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition-all focus:border-emerald-500"
              />
            </div>
            <button
              type="button"
              onClick={handleAddTag}
              className="px-4 bg-slate-900 border border-slate-800 hover:border-emerald-500 hover:text-emerald-400 text-slate-400 text-xs font-mono font-bold uppercase tracking-wider rounded-sm transition-all cursor-pointer"
            >
              Add
            </button>
          </div>

          {/* Render Tag Chips */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1.5" id="manual-tags-chips">
              {tags.map((tag, idx) => (
                <span
                  key={`${tag}-${idx}`}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono font-semibold uppercase"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(idx)}
                    className="text-slate-500 hover:text-rose-400 transition-colors focus:outline-none"
                    title="Remove tag"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {errorMsg && (
          <p className="text-xs text-rose-400 font-mono bg-rose-500/10 border border-rose-500/20 rounded-sm px-3 py-2 mt-1">
            {errorMsg}
          </p>
        )}

        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 font-heading font-bold text-xs bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white py-4 px-4 rounded-sm uppercase tracking-widest transition-all duration-150 cursor-pointer mt-2"
          id="btn-manual-submit"
        >
          <CalendarPlus className="w-4 h-4 text-emerald-400" />
          <span>Log Activity</span>
        </button>
      </form>
    </div>
  );
}
