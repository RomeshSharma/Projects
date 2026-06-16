/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, CheckSquare, Sparkles, Volume2, VolumeX, AlertCircle } from 'lucide-react';
import { CATEGORIES, CategoryKey, Activity } from '../types';

interface ActiveSessionTrackerProps {
  onAddActivity: (activity: Activity) => void;
}

export default function ActiveSessionTracker({ onAddActivity }: ActiveSessionTrackerProps) {
  const [taskName, setTaskName] = useState('');
  const [category, setCategory] = useState<CategoryKey>('Work');
  const [notes, setNotes] = useState('');
  
  // Auditory tactile feedback preference optionally saved in localStorage
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('chronos_sound_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    localStorage.setItem('chronos_sound_enabled', String(soundEnabled));
  }, [soundEnabled]);

  // Subtle acoustic audio synthesizer using standard Web Audio API
  const playTactileSound = (type: 'start' | 'stop') => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      if (type === 'start') {
        // High-quality warm positive synthesis chime
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.04);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        
        // Next clean interval (E5) shortly after to represent start/play action
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.06); 
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      } else {
        // Calm resolution synthesizer drop for pausing/completion
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(392.00, ctx.currentTime + 0.2); // G4
        
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.04);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch (e) {
      console.warn('Audio synthesis could not play due to browser user-gesture restrictions.', e);
    }
  };

  // Timer states
  const [timerState, setTimerState] = useState<'stopped' | 'running' | 'paused'>('stopped');
  const [timerSeconds, setTimerSeconds] = useState(0);

  // Inactivity tracking states
  const [showInactivityResumePrompt, setShowInactivityResumePrompt] = useState(false);
  const wasAutoPausedRef = useRef<boolean>(false);

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Load active session from localStorage if user was tracking before a crash/reload
  useEffect(() => {
    const savedActiveState = localStorage.getItem('chronos_active_session_state');
    if (savedActiveState) {
      try {
        const parsed = JSON.parse(savedActiveState);
        setTaskName(parsed.taskName || '');
        setCategory(parsed.category || 'Work');
        setNotes(parsed.notes || '');
        setTimerState(parsed.timerState || 'stopped');
        
        if (parsed.timerState === 'running') {
          // If was running, calculate elapsed time since start
          const elapsed = Math.floor((Date.now() - parsed.startStamp) / 1000);
          setTimerSeconds(elapsed > 0 ? elapsed : 0);
          startTimeRef.current = parsed.startStamp;
          
          // Re-establish timer interval
          const interval = setInterval(() => {
            const currentElapsed = Math.floor((Date.now() - parsed.startStamp) / 1000);
            setTimerSeconds(currentElapsed > 0 ? currentElapsed : 0);
          }, 1000);
          timerIntervalRef.current = interval;
        } else if (parsed.timerState === 'paused') {
          setTimerSeconds(parsed.timerSeconds || 0);
        }
      } catch (err) {
        console.error('Failed to parse saved active session', err);
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  // Save active tracking state to localStorage on modification to survive refreshes
  const saveActiveTrackingToStorage = (
    state: 'stopped' | 'running' | 'paused',
    seconds: number,
    startStamp: number | null
  ) => {
    if (state === 'stopped') {
      localStorage.removeItem('chronos_active_session_state');
    } else {
      localStorage.setItem(
        'chronos_active_session_state',
        JSON.stringify({
          taskName,
          category,
          notes,
          timerState: state,
          timerSeconds: seconds,
          startStamp,
        })
      );
    }
  };

  // Keep saved state updated when input inputs change
  useEffect(() => {
    if (timerState !== 'stopped') {
      saveActiveTrackingToStorage(timerState, timerSeconds, startTimeRef.current);
    }
  }, [taskName, category, notes, timerState, timerSeconds]);

  const handleStart = () => {
    if (timerState === 'running') return;

    let startStamp = startTimeRef.current;
    if (timerState === 'stopped') {
      startStamp = Date.now();
      startTimeRef.current = startStamp;
      setTimerSeconds(0);
    } else {
      // resumed from paused: need to slide the start stamp forward to exclude paused duration
      startStamp = Date.now() - (timerSeconds * 1000);
      startTimeRef.current = startStamp;
    }

    setTimerState('running');
    saveActiveTrackingToStorage('running', timerSeconds, startStamp);
    playTactileSound('start');

    timerIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - (startStamp as number)) / 1000);
      setTimerSeconds(elapsed > 0 ? elapsed : 0);
    }, 1000);
  };

  const handlePause = () => {
    if (timerState !== 'running') return;

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    setTimerState('paused');
    saveActiveTrackingToStorage('paused', timerSeconds, startTimeRef.current);
    playTactileSound('stop');
  };

  const handleComplete = () => {
    if (timerState === 'stopped') return;

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    playTactileSound('stop');

    // Capture logs
    const nameToLog = taskName.trim() || 'Active Session';
    const endTime = new Date();
    // Reconstruct start time using actual active seconds
    const startTime = new Date(endTime.getTime() - (timerSeconds * 1000));

    const pad = (n: number) => n.toString().padStart(2, '0');
    const formatTimeHHMM = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

    const newActivity: Activity = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
      name: nameToLog,
      category,
      date: endTime.toISOString().split('T')[0],
      startTime: formatTimeHHMM(startTime),
      endTime: formatTimeHHMM(endTime),
      duration: timerSeconds,
      notes: notes.trim() || undefined,
    };

    onAddActivity(newActivity);

    // Reset layout
    setTimerState('stopped');
    setTimerSeconds(0);
    startTimeRef.current = null;
    setTaskName('');
    setNotes('');
    
    // Clear storage key
    localStorage.removeItem('chronos_active_session_state');
  };

  // Listen for programmatic timer control triggers from other components (such as Idle prompts)
  const handlersRef = useRef({ handleStart, handlePause, handleComplete });
  handlersRef.current = { handleStart, handlePause, handleComplete };

  const timerStateRef = useRef(timerState);
  useEffect(() => {
    timerStateRef.current = timerState;
  }, [timerState]);

  // Handle Tab Inactivity detection (Visibility API)
  useEffect(() => {
    const wasAuto = localStorage.getItem('chronos_was_autopaused_by_inactivity') === 'true';
    if (wasAuto) {
      setShowInactivityResumePrompt(true);
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (timerStateRef.current === 'running') {
          handlersRef.current.handlePause();
          wasAutoPausedRef.current = true;
          localStorage.setItem('chronos_was_autopaused_by_inactivity', 'true');
        }
      } else if (document.visibilityState === 'visible') {
        const wasAutoPaused = localStorage.getItem('chronos_was_autopaused_by_inactivity') === 'true' || wasAutoPausedRef.current;
        if (wasAutoPaused) {
          setShowInactivityResumePrompt(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const handleControlEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ action: 'start' | 'pause' | 'complete' }>;
      if (!customEvent || !customEvent.detail) return;
      const { action } = customEvent.detail;
      if (action === 'start') {
        handlersRef.current.handleStart();
      } else if (action === 'pause') {
        handlersRef.current.handlePause();
      } else if (action === 'complete') {
        handlersRef.current.handleComplete();
      }
    };

    window.addEventListener('chronos_control_timer', handleControlEvent);
    return () => {
      window.removeEventListener('chronos_control_timer', handleControlEvent);
    };
  }, []);

  // Helper format for duration
  const formatStopwatch = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600).toString().padStart(2, '0');
    const mins = Math.floor((totalSecs % 3600) / 60).toString().padStart(2, '0');
    const secs = (totalSecs % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  // Calculation for the circular ring sweep (represents 0-60 secs sweep)
  const radius = 85;
  const circumference = 2 * Math.PI * radius; // ~534.07
  const progressPercent = (timerSeconds % 60) / 60;
  const strokeDashoffset = timerState === 'stopped' 
    ? circumference 
    : circumference - (progressPercent * circumference);

  const activeColor = CATEGORIES[category]?.color || '#6366f1';

  return (
    <div className="bg-[#0F1116] border border-slate-800 p-6 relative flex flex-col gap-6 rounded-sm" id="active-session-card">
      <div className="flex justify-between items-center pb-2 border-b border-slate-800" id="active-session-header">
        <div className="flex items-center gap-3">
          <h2 className="font-heading text-xs uppercase tracking-[0.2em] font-bold text-slate-400">
            Active Tracker
          </h2>
          <button
            type="button"
            onClick={() => setSoundEnabled(prev => !prev)}
            className="text-slate-500 hover:text-emerald-400 p-1 rounded-sm transition-colors cursor-pointer bg-transparent border-0 flex items-center justify-center"
            title={soundEnabled ? "Mute audio feedback" : "Unmute audio feedback"}
            id="toggle-audio-cues-btn"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-slate-700" />}
          </button>
        </div>
        {timerState === 'running' && (
          <span className="text-[10px] uppercase font-bold tracking-widest bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2.5 py-0.5 rounded-sm" id="active-badge">
            Active
          </span>
        )}
        {timerState === 'paused' && (
          <span className="text-[10px] uppercase font-bold tracking-widest bg-slate-800 text-slate-400 border border-slate-700 px-2.5 py-0.5 rounded-sm animate-pulse" id="paused-badge">
            Paused
          </span>
        )}
        {timerState === 'stopped' && (
          <span className="text-[10px] uppercase font-bold tracking-widest bg-slate-900 text-slate-500 border border-slate-800 px-2.5 py-0.5 rounded-sm" id="idle-badge">
            Ready
          </span>
        )}
      </div>

      <div className="flex justify-center items-center py-4" id="stopwatch-ring-area">
        <div className="relative w-48 h-48 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 overflow-visible" viewBox="0 0 200 200">
            <circle 
              className="stroke-slate-800 fill-none" 
              cx="100" 
              cy="100" 
              r={radius} 
              strokeWidth="5"
            />
            <circle 
              className="fill-none transition-all duration-300"
              cx="100"
              cy="100"
              r={radius}
              strokeWidth="5"
              stroke={activeColor === '#6366f1' ? '#10b981' : activeColor}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="square"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="font-mono font-light text-5xl text-white tracking-tighter">
              {timerState === 'stopped' ? '00:00' : formatStopwatch(timerSeconds).substring(3)}
            </span>
            <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mt-2">
              {timerState === 'stopped' ? 'Remaining' : category}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4" id="active-session-inputs">
        <div className="flex flex-col gap-1.5" id="task-group">
          <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold font-heading" htmlFor="taskName">
            Active Assignment
          </label>
          <input
            id="taskName"
            type="text"
            placeholder="e.g., Deep Work: Chronos UI"
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            disabled={timerState !== 'stopped'}
            className="bg-slate-950 border border-slate-800 rounded-sm px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition-all focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" id="category-and-date-info">
          <div className="flex flex-col gap-1.5" id="category-group">
            <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold font-heading" htmlFor="categorySelect">
              Classification
            </label>
            <select
              id="categorySelect"
              value={category}
              onChange={(e) => setCategory(e.target.value as CategoryKey)}
              disabled={timerState !== 'stopped'}
              className="bg-slate-950 border border-slate-800 rounded-sm px-4 py-3 text-sm text-white outline-none transition-all focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {(Object.keys(CATEGORIES) as CategoryKey[]).map((catKey) => (
                <option key={catKey} value={catKey} className="bg-slate-900 text-white">
                  {CATEGORIES[catKey].emoji} {catKey.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 justify-end" id="helper-visual-glow">
            <div 
              style={{ borderColor: activeColor === '#6366f1' ? '#10b981' : activeColor }}
              className="border bg-slate-900/40 rounded-sm px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2.5 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
              <span>
                Theme: {category}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5" id="notes-group">
          <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold font-heading" htmlFor="sessionNotes">
            Session Documentation <span className="text-slate-600 font-normal">(Optional)</span>
          </label>
          <textarea
            id="sessionNotes"
            placeholder="Document accomplishments, milestones, or current focus blockages..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={timerState !== 'stopped'}
            rows={2}
            className="bg-slate-950 border border-slate-800 rounded-sm px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition-all focus:border-emerald-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 pt-2" id="stopwatch-action-buttons">
        <button
          type="button"
          onClick={handleStart}
          disabled={timerState === 'running'}
          className="flex items-center justify-center gap-2 font-heading font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-black py-4 px-3 rounded-sm uppercase tracking-widest transition-all duration-150 disabled:opacity-20 disabled:pointer-events-none cursor-pointer"
          id="btn-active-start"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Start</span>
        </button>

        <button
          type="button"
          onClick={handlePause}
          disabled={timerState !== 'running'}
          className="flex items-center justify-center gap-2 font-heading font-bold text-xs bg-slate-800 hover:bg-slate-700 text-white py-4 px-3 rounded-sm uppercase tracking-widest transition-all duration-150 disabled:opacity-20 disabled:pointer-events-none cursor-pointer"
          id="btn-active-pause"
        >
          <Pause className="w-3.5 h-3.5 fill-current" />
          <span>Pause</span>
        </button>

        <button
          type="button"
          onClick={handleComplete}
          disabled={timerState === 'stopped'}
          className="flex items-center justify-center gap-2 font-heading font-bold text-xs bg-slate-800 border border-slate-700 hover:bg-slate-700 text-emerald-400 py-4 px-3 rounded-sm uppercase tracking-widest transition-all duration-150 disabled:opacity-20 disabled:pointer-events-none cursor-pointer"
          id="btn-active-complete"
        >
          <CheckSquare className="w-3.5 h-3.5 border-current" />
          <span>Finish</span>
        </button>
      </div>

      {showInactivityResumePrompt && (
        <div 
          className="absolute inset-0 z-50 bg-[#0F1116]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center rounded-sm animate-fade-in"
          id="inactivity-resume-prompt"
        >
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 text-amber-400 animate-pulse">
            <AlertCircle className="w-5 h-5" />
          </div>
          <h3 className="font-heading font-bold text-xs text-white tracking-[0.2em] uppercase mb-2">
            Session Auto-Paused
          </h3>
          <p className="text-xs text-slate-450 max-w-[240px] leading-relaxed mb-6 font-sans">
            We detected tab inactivity and automatically paused your track to protect your metrics. Ready to resume?
          </p>
          <div className="flex flex-col gap-2 w-full max-w-[200px]">
            <button
              type="button"
              onClick={() => {
                setShowInactivityResumePrompt(false);
                wasAutoPausedRef.current = false;
                localStorage.removeItem('chronos_was_autopaused_by_inactivity');
                handlersRef.current.handleStart();
              }}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-3 px-4 rounded-sm text-[10px] font-heading font-bold uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-emerald-500/10"
              id="btn-inactivity-resume"
            >
              Resume Session
            </button>
            <button
              type="button"
              onClick={() => {
                setShowInactivityResumePrompt(false);
                wasAutoPausedRef.current = false;
                localStorage.removeItem('chronos_was_autopaused_by_inactivity');
              }}
              className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white py-3 px-4 rounded-sm text-[10px] font-heading font-bold uppercase tracking-widest transition-all cursor-pointer"
              id="btn-inactivity-stay-paused"
            >
              Keep Paused
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
