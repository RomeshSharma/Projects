/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import Header from './components/Header';
import ActiveSessionTracker from './components/ActiveSessionTracker';
import ManualActivityLog from './components/ManualActivityLog';
import DashboardInsights from './components/DashboardInsights';
import ActivitiesTimeline from './components/ActivitiesTimeline';
import { Activity } from './types';

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('chronos_theme');
    return (saved as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('chronos_theme', theme);
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Sync state cleanly with localStorage
  const [activities, setActivities] = useState<Activity[]>(() => {
    const stored = localStorage.getItem('chronos_activities');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse stored activities', e);
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('chronos_activities', JSON.stringify(activities));
  }, [activities]);

  const handleAddActivity = (newAct: Activity) => {
    setActivities((prev) => [newAct, ...prev]);
  };

  const handleDeleteActivity = (id: string) => {
    setActivities((prev) => prev.filter((act) => act.id !== id));
  };

  const handleUpdateActivity = (updatedAct: Activity) => {
    setActivities((prev) => prev.map((act) => (act.id === updatedAct.id ? updatedAct : act)));
  };

  const handleClearAll = () => {
    setActivities([]);
  };

  return (
    <div className="relative min-h-screen flex flex-col selection:bg-emerald-500 selection:text-black bg-[#0A0B0E]" id="chronos-app-root">
      {/* Main viewport constraints */}
      <div className="app-container flex-grow max-w-[1280px] mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-8">
        
        {/* Core dynamic clock & branding header */}
        <Header theme={theme} onToggleTheme={handleToggleTheme} />

        {/* Master dual column grid responsive layout */}
        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start flex-grow">
          
          {/* Left Column: Active Tracking stopwatch & manual entries */}
          <section className="flex flex-col gap-8 w-full" id="left-tracking-column">
            
            <ActiveSessionTracker onAddActivity={handleAddActivity} />
            
            <ManualActivityLog onAddActivity={handleAddActivity} />
            
          </section>

          {/* Right Column: Donut chart visualizer insights & logged timeline feeds */}
          <section className="flex flex-col gap-8 w-full lg:sticky lg:top-8" id="right-charts-column">
            
            <DashboardInsights activities={activities} />
            
            <ActivitiesTimeline 
              activities={activities}
              onDeleteActivity={handleDeleteActivity}
              onClearAll={handleClearAll}
              onUpdateActivity={handleUpdateActivity}
            />

          </section>
          
        </main>

        {/* Compliant metadata layout footer */}
        <footer className="text-center text-slate-600 text-[9px] uppercase font-bold tracking-[0.25em] mt-10 pt-6 border-t border-slate-900">
          <p>© 2026 Chronos • Engineered for Precision Daylight Analytics.</p>
        </footer>
      </div>
    </div>
  );
}
