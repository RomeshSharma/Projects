/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Clock, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export default function Header({ theme, onToggleTheme }: HeaderProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  return (
    <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 px-6 py-6 gap-4 bg-[#0A0B0E]" id="app-header">
      <div className="flex items-center gap-4 group">
        <div className="w-10 h-10 bg-emerald-500 rounded-sm rotate-45 flex items-center justify-center transform transition-all duration-300 group-hover:rotate-135" id="brand-logo-container">
          <span className="text-black font-black font-heading -rotate-45 text-base">C</span>
        </div>
        <div id="brand-text-block">
          <h1 className="font-heading text-2xl font-semibold tracking-tighter text-white">
            CHRONOS
          </h1>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
            TIME OPTIMIZATION
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-6" id="live-clock-widget">
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">LIVE TIME</p>
          <p className="text-lg font-mono text-emerald-400 font-medium" id="live-widget-time">
            {timeStr}
          </p>
        </div>
        <div className="w-px h-10 bg-slate-800 hidden sm:block"></div>
        <div className="text-right hidden sm:block">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
            {now.toLocaleDateString('en-US', { weekday: 'long' })}
          </p>
          <p className="text-base text-white font-medium" id="live-widget-date">
            {now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="w-px h-10 bg-slate-800"></div>
        <button
          type="button"
          onClick={onToggleTheme}
          className="p-2 border border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-900 text-slate-400 hover:text-emerald-400 rounded-sm transition-all cursor-pointer flex items-center justify-center"
          title={theme === 'dark' ? "Switch to High-Contrast Light Mode" : "Switch to Deep Dark Mode"}
          id="theme-toggle-btn"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
}
