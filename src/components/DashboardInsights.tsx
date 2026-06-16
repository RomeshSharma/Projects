/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Download, Bell, AlertCircle, FileText, Flame } from 'lucide-react';
import { CATEGORIES, CategoryKey, Activity } from '../types';
import { jsPDF } from 'jspdf';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface DashboardInsightsProps {
  activities: Activity[];
}

export default function DashboardInsights({ activities }: DashboardInsightsProps) {
  // Filter for today's activities
  const todayStr = new Date().toISOString().split('T')[0];
  const todaysActivities = activities.filter((act) => act.date === todayStr);

  // Load and sync state cleanly with localStorage keyed on current date
  const [reflection, setReflection] = useState(() => {
    return localStorage.getItem(`chronos_reflection_${todayStr}`) || '';
  });

  const [dailyGoalMins, setDailyGoalMins] = useState<number>(() => {
    const saved = localStorage.getItem('chronos_daily_goal_mins');
    return saved !== null ? parseInt(saved, 10) : 240; // Default to 4 hours (240 mins)
  });

  useEffect(() => {
    localStorage.setItem(`chronos_reflection_${todayStr}`, reflection);
  }, [reflection, todayStr]);

  useEffect(() => {
    localStorage.setItem('chronos_daily_goal_mins', String(dailyGoalMins));
  }, [dailyGoalMins]);

  // Idle Prompter Config State
  const [startPrompterEnabled, setStartPrompterEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('chronos_start_prompter_enabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [startIdleMins, setStartIdleMins] = useState<number>(() => {
    const saved = localStorage.getItem('chronos_start_idle_mins');
    return saved !== null ? parseInt(saved, 10) : 5; // Default 5 mins
  });

  const [stopPrompterEnabled, setStopPrompterEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('chronos_stop_prompter_enabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [stopActiveIdleMins, setStopActiveIdleMins] = useState<number>(() => {
    const saved = localStorage.getItem('chronos_stop_idle_mins');
    return saved !== null ? parseInt(saved, 10) : 10; // Default 10 mins
  });

  // Current notification toast state
  const [activePrompt, setActivePrompt] = useState<'start' | 'stop' | null>(null);

  // Read current active session's timerState under 'chronos_active_session_state'
  const [, setCurrentTimerState] = useState<'stopped' | 'running' | 'paused'>('stopped');

  // Keep track of the last interaction timestamp
  const [lastInteraction, setLastInteraction] = useState(Date.now());
  const [currentIdleSeconds, setCurrentIdleSeconds] = useState(0);

  // Persists to localStorage
  useEffect(() => {
    localStorage.setItem('chronos_start_prompter_enabled', String(startPrompterEnabled));
  }, [startPrompterEnabled]);

  useEffect(() => {
    localStorage.setItem('chronos_start_idle_mins', String(startIdleMins));
  }, [startIdleMins]);

  useEffect(() => {
    localStorage.setItem('chronos_stop_prompter_enabled', String(stopPrompterEnabled));
  }, [stopPrompterEnabled]);

  useEffect(() => {
    localStorage.setItem('chronos_stop_idle_mins', String(stopActiveIdleMins));
  }, [stopActiveIdleMins]);

  // Handle user activity events to reset idle timers
  useEffect(() => {
    const handleActivity = () => {
      setLastInteraction(Date.now());
    };

    // Listen to standard interaction events
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, []);

  const playNotificationChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch {
      // Browser gesture audio block
    }
  };

  // Monitor Timer State (poll from localStorage) & compute Idle Seconds
  useEffect(() => {
    const interval = setInterval(() => {
      // 1. Get current timerState
      const savedActiveState = localStorage.getItem('chronos_active_session_state');
      let timerState: 'stopped' | 'running' | 'paused' = 'stopped';
      if (savedActiveState) {
        try {
          const parsed = JSON.parse(savedActiveState);
          timerState = parsed.timerState || 'stopped';
        } catch (e) {
          // ignore
        }
      }
      setCurrentTimerState(timerState);

      // 2. Update current idle time
      const elapsedSeconds = Math.floor((Date.now() - lastInteraction) / 1000);
      setCurrentIdleSeconds(elapsedSeconds);

      // 3. Evaluate rules
      if (timerState !== 'running' && startPrompterEnabled) {
        // Not tracking!
        if (elapsedSeconds >= startIdleMins * 60 && activePrompt === null) {
          setActivePrompt('start');
          playNotificationChime();
        }
      } else if (timerState === 'running' && stopPrompterEnabled) {
        // Tracking!
        if (elapsedSeconds >= stopActiveIdleMins * 60 && activePrompt === null) {
          setActivePrompt('stop');
          playNotificationChime();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastInteraction, startPrompterEnabled, startIdleMins, stopPrompterEnabled, stopActiveIdleMins, activePrompt]);

  const triggerTestPrompt = (type: 'start' | 'stop') => {
    setActivePrompt(type);
    playNotificationChime();
  };

  const handleStartSessionFromPrompt = () => {
    window.dispatchEvent(new CustomEvent('chronos_control_timer', { detail: { action: 'start' } }));
    setActivePrompt(null);
    setLastInteraction(Date.now());
    setCurrentIdleSeconds(0);
  };

  const handleStopSessionFromPrompt = () => {
    window.dispatchEvent(new CustomEvent('chronos_control_timer', { detail: { action: 'complete' } }));
    setActivePrompt(null);
    setLastInteraction(Date.now());
    setCurrentIdleSeconds(0);
  };

  const handleDismissPrompt = () => {
    setActivePrompt(null);
    // Snooze/Reset idle interaction clock to now so it doesn't fire again immediately
    setLastInteraction(Date.now());
    setCurrentIdleSeconds(0);
  };

  // Compute total duration (in hours) for each of the last 7 days
  const getLast7Days = () => {
    const result = [];
    const baseDate = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(baseDate.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStr = d.toISOString().split('T')[0];
      result.push(dayStr);
    }
    return result;
  };

  // Group historical activities by date to find daily totals
  const activityHoursByDate: Record<string, number> = {};
  activities.forEach((act) => {
    if (!activityHoursByDate[act.date]) {
      activityHoursByDate[act.date] = 0;
    }
    activityHoursByDate[act.date] += act.duration / 3600;
  });

  // Group daily totals by weekday index (0 = Sun, 1 = Mon, etc.)
  const weekdayTotals: Record<number, number[]> = {
    0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: []
  };

  Object.entries(activityHoursByDate).forEach(([dateStr, hours]) => {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const dateObj = new Date(year, month, day);
      const weekday = dateObj.getDay();
      if (weekday >= 0 && weekday <= 6) {
        weekdayTotals[weekday].push(hours);
      }
    }
  });

  // Compute weekday averages
  const weekdayAverages: Record<number, number> = {};
  const weekdayFallbacks: Record<number, number> = {
    0: 1.0, // Sun
    1: 2.5, // Mon
    2: 3.0, // Tue
    3: 2.8, // Wed
    4: 2.5, // Thu
    5: 2.0, // Fri
    6: 1.2, // Sat
  };

  for (let i = 0; i < 7; i++) {
    const list = weekdayTotals[i];
    if (list.length > 0) {
      const sum = list.reduce((a, b) => a + b, 0);
      weekdayAverages[i] = parseFloat((sum / list.length).toFixed(1));
    } else {
      weekdayAverages[i] = weekdayFallbacks[i] || 2.0;
    }
  }

  const last7DaysData = getLast7Days().map((dateStr) => {
    const dayActs = activities.filter((act) => act.date === dateStr);
    const totalSeconds = dayActs.reduce((sum, act) => sum + act.duration, 0);
    const totalMinutes = Math.round(totalSeconds / 60);
    const totalHours = parseFloat((totalSeconds / 3600).toFixed(1));

    // Format to short representation, e.g., "Tue Jun 16" -> "Tue 16"
    const parts = dateStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const dateObj = new Date(year, month, day);

    const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    const monthLabel = monthsShort[dateObj.getMonth()] || '';
    const dayName = daysOfWeek[dateObj.getDay()] || '';
    const label = `${dayName} ${day}`;

    return {
      dateStr,
      label,
      hours: totalHours,
      minutes: totalMinutes,
      avgHours: weekdayAverages[dateObj.getDay()],
    };
  });

  // Initialize durations
  const categoryDurations: Record<CategoryKey, number> = {
    Work: 0,
    Wellness: 0,
    Leisure: 0,
    Focus: 0,
    Chores: 0,
  };

  let grandTotalSeconds = 0;
  todaysActivities.forEach((act) => {
    if (categoryDurations[act.category] !== undefined) {
      categoryDurations[act.category] += act.duration;
      grandTotalSeconds += act.duration;
    }
  });

  // Master format Helper
  const formatDuration = (totalSeconds: number) => {
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

  const radius = 45;
  const circumference = 2 * Math.PI * radius; // ~282.74
  let accumulatedPercent = 0;

  // Build slices for rendering
  const slices = (Object.keys(CATEGORIES) as CategoryKey[]).map((cat) => {
    const duration = categoryDurations[cat];
    const catData = CATEGORIES[cat];
    const percentage = grandTotalSeconds > 0 ? (duration / grandTotalSeconds) * 100 : 0;

    const segmentStroke = (percentage / 100) * circumference;
    const strokeDashoffset = circumference - (accumulatedPercent / 100 * circumference);
    
    if (duration > 0) {
      accumulatedPercent += percentage;
    }

    return {
      category: cat,
      duration,
      percentage,
      color: catData.color,
      emoji: catData.emoji,
      segmentStroke,
      strokeDashoffset,
    };
  }).filter(slice => slice.duration > 0);

  // Daily Streak calculation: consecutive days with at least one logged activity
  const currentStreak = (() => {
    if (activities.length === 0) return 0;

    const loggedDates = new Set(activities.map((act) => act.date));
    const todayStrObj = new Date().toISOString().split('T')[0];
    
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStrObj = yesterdayDate.toISOString().split('T')[0];

    // If neither today nor yesterday has any activity, streak is dead
    if (!loggedDates.has(todayStrObj) && !loggedDates.has(yesterdayStrObj)) {
      return 0;
    }

    // Determine starting date string
    const startStr = loggedDates.has(todayStrObj) ? todayStrObj : yesterdayStrObj;
    const startParts = startStr.split('-');
    const year = parseInt(startParts[0], 10);
    const month = parseInt(startParts[1], 10) - 1;
    const day = parseInt(startParts[2], 10);
    
    let currentUtcMs = Date.UTC(year, month, day);
    let streak = 0;
    const oneDayMs = 24 * 60 * 60 * 1000;

    while (true) {
      const dateObj = new Date(currentUtcMs);
      const yearStr = dateObj.getUTCFullYear();
      const monthStr = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
      const dayStr = String(dateObj.getUTCDate()).padStart(2, '0');
      const checkStr = `${yearStr}-${monthStr}-${dayStr}`;

      if (loggedDates.has(checkStr)) {
        streak++;
        currentUtcMs -= oneDayMs;
      } else {
        break;
      }
    }

    return streak;
  })();

  const handleExportBackup = () => {
    try {
      const dataStr = JSON.stringify(activities, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `chronos_backup_${new Date().toISOString().split('T')[0]}.json`;
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (e) {
      console.error('Failed to export activity logs in JSON:', e);
    }
  };

  const handleExportCSV = () => {
    try {
      const escapeCSV = (val: any) => {
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const headers = ["ID", "Date", "Classification", "Assignment", "Start Time", "End Time", "Duration (Seconds)", "Notes"];
      const rows = activities.map(act => [
        act.id,
        act.date,
        act.category,
        act.name,
        act.startTime,
        act.endTime,
        act.duration,
        act.notes || ''
      ]);

      const csvContent = [headers, ...rows].map(row => row.map(escapeCSV).join(",")).join("\n");
      const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
      const exportFileDefaultName = `chronos_backup_${new Date().toISOString().split('T')[0]}.csv`;
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (e) {
      console.error('Failed to export activity logs in CSV:', e);
    }
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Colors definitions
      const primaryColor = [15, 23, 42]; // Slate-900 (#0f172a)
      const accentColor = [16, 185, 129]; // Emerald-500 (#10b981)
      const borderClr = [226, 232, 240]; // Slate-200 (#e2e8f0)
      const textDark = [30, 41, 59]; // Slate-800
      const textLight = [100, 116, 139]; // Slate-500

      // Title & Header background block
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 40, 'F');

      // Title text over dark header
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('CHRONOS', 15, 18);

      // Subtitle
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(165, 180, 252); // indigo-300
      doc.text('DAILY FOCUS & PERFORMANCE SUMMARY', 15, 24);

      // Date on right side
      doc.setFontSize(10.5);
      doc.setTextColor(255, 255, 255);
      const reportDateLabel = new Date(todayStr).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      doc.text(reportDateLabel, 195, 18, { align: 'right' });

      // Accent border line separating logo and meta bar
      doc.setDrawColor(16, 185, 129); // emerald accent
      doc.setLineWidth(0.8);
      doc.line(15, 27, 195, 27);

      // Metadata details bar
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // Slate-400
      doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 15, 33);
      doc.text(`User: romesh@gmail.com`, 195, 33, { align: 'right' });

      // Start building visual layouts below the header
      let currentY = 52;

      // Section 1: KPI Statistics Metrics
      const kpiWidth = 56;
      const kpiHeight = 18;
      const gap = 6;

      const totalHrs = parseFloat((grandTotalSeconds / 3600).toFixed(2));
      const goalHrs = parseFloat((dailyGoalMins / 60).toFixed(2));
      const completionPct = dailyGoalMins > 0 ? Math.min(100, Math.round((grandTotalSeconds / (dailyGoalMins * 60)) * 100)) : 0;

      // KPI box 1: Total Hours
      doc.setFillColor(248, 250, 252); // slate-50
      doc.setDrawColor(borderClr[0], borderClr[1], borderClr[2]);
      doc.setLineWidth(0.25);
      doc.rect(15, currentY, kpiWidth, kpiHeight, 'FD');
      // Accent bar on the left of KPI
      doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.rect(15, currentY, 1.5, kpiHeight, 'F');
      
      doc.setTextColor(textLight[0], textLight[1], textLight[2]);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL TRACKED FOCUS', 19, currentY + 5.5);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFontSize(12.5);
      doc.text(`${totalHrs} Hrs`, 19, currentY + 12.5);

      // KPI box 2: Productivity Target
      doc.setFillColor(248, 250, 252);
      doc.rect(15 + kpiWidth + gap, currentY, kpiWidth, kpiHeight, 'FD');
      doc.setFillColor(99, 102, 241); // indigo-500
      doc.rect(15 + kpiWidth + gap, currentY, 1.5, kpiHeight, 'F');
      
      doc.setTextColor(textLight[0], textLight[1], textLight[2]);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.text('DAILY FOCUS TARGET', 15 + kpiWidth + gap + 4, currentY + 5.5);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFontSize(12.5);
      doc.text(`${goalHrs} Hrs`, 15 + kpiWidth + gap + 4, currentY + 12.5);

      // KPI box 3: Goal progress
      doc.setFillColor(248, 255, 252);
      doc.rect(15 + (kpiWidth + gap) * 2, currentY, kpiWidth, kpiHeight, 'FD');
      doc.setFillColor(245, 158, 11); // amber-500
      doc.rect(15 + (kpiWidth + gap) * 2, currentY, 1.5, kpiHeight, 'F');
      
      doc.setTextColor(textLight[0], textLight[1], textLight[2]);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.text('GOAL PROGRESS', 15 + (kpiWidth + gap) * 2 + 4, currentY + 5.5);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFontSize(12.5);
      doc.text(`${completionPct}%`, 15 + (kpiWidth + gap) * 2 + 4, currentY + 12.5);

      currentY += kpiHeight + 10;

      // Section 2: Visual Distribution representation by category
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('PERCENTAGE TIME ALLOCATION', 15, currentY);
      
      doc.setDrawColor(borderClr[0], borderClr[1], borderClr[2]);
      doc.setLineWidth(0.2);
      doc.line(15, currentY + 1.8, 195, currentY + 1.8);

      currentY += 5;

      // Horizontal stacked representation bar
      const barY = currentY;
      const barHeight = 4.5;
      let consumedX = 15;
      const totalWidth = 180;

      slices.forEach((slice) => {
        const sliceWidth = (slice.percentage / 100) * totalWidth;
        if (sliceWidth > 0) {
          let rgb = [100, 116, 139]; // Default gray fallback
          if (slice.category === 'Work') rgb = [239, 68, 68];
          else if (slice.category === 'Wellness') rgb = [16, 185, 129];
          else if (slice.category === 'Focus') rgb = [59, 130, 246];
          else if (slice.category === 'Leisure') rgb = [245, 158, 11];
          else if (slice.category === 'Chores') rgb = [139, 92, 246];

          doc.setFillColor(rgb[0], rgb[1], rgb[2]);
          doc.rect(consumedX, barY, sliceWidth, barHeight, 'F');
          consumedX += sliceWidth;
        }
      });

      // Show an elegant fallback bar if empty
      if (slices.length === 0) {
        doc.setFillColor(241, 245, 249);
        doc.rect(15, barY, totalWidth, barHeight, 'F');
      }

      currentY += barHeight + 3.5;
      
      // Category legend details list
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      let legendX = 15;

      slices.forEach((slice) => {
        let rgb = [100, 116, 139];
        if (slice.category === 'Work') rgb = [239, 68, 68];
        else if (slice.category === 'Wellness') rgb = [16, 185, 129];
        else if (slice.category === 'Focus') rgb = [59, 130, 246];
        else if (slice.category === 'Leisure') rgb = [245, 158, 11];
        else if (slice.category === 'Chores') rgb = [139, 92, 246];

        doc.setFillColor(rgb[0], rgb[1], rgb[2]);
        // Square legend dot
        doc.rect(legendX, currentY, 2.5, 2.5, 'F');
        
        doc.setTextColor(textDark[0], textDark[1], textDark[2]);
        doc.setFont('helvetica', 'bold');
        const pctStr = `${slice.percentage.toFixed(0)}%`;
        doc.text(`${slice.category} (${pctStr})`, legendX + 4, currentY + 2.2);

        legendX += 36;
        if (legendX > 185) {
          legendX = 15;
          currentY += 4.5;
        }
      });

      currentY += 10;

      // Section 3: Chronological breakdown log details
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('CHRONOLOGICAL JOURNAL DETAILS', 15, currentY);
      doc.line(15, currentY + 1.8, 195, currentY + 1.8);

      currentY += 5.5;

      // Table Header Row
      doc.setFillColor(241, 245, 249);
      doc.rect(15, currentY, 180, 6.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);

      doc.text('INTERVAL', 17, currentY + 4.5);
      doc.text('ACTIVITY & CLASSIFICATION', 48, currentY + 4.5);
      doc.text('DURATION', 115, currentY + 4.5);
      doc.text('TAGS', 138, currentY + 4.5);
      doc.text('ADDITIONAL NOTES / SUMMARY', 165, currentY + 4.5);

      currentY += 6.5;

      // Format timeline detail elements
      const sortedDayActivities = [...todaysActivities].sort((a, b) => a.startTime.localeCompare(b.startTime));

      sortedDayActivities.forEach((act, idx) => {
        // Page breaking check
        if (currentY > 265) {
          doc.addPage();
          currentY = 20;

          // Sequential header watermark
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          doc.text('CHRONOS JOURNAL REPORT — CONTINUED DETAILS', 15, currentY);
          doc.line(15, currentY + 1.8, 195, currentY + 1.8);
          currentY += 8;
        }

        // Alternating zebra backgrounds
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(15, currentY, 180, 7.5, 'F');
        }

        // light grid lines
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.15);
        doc.line(15, currentY + 7.5, 195, currentY + 7.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(textDark[0], textDark[1], textDark[2]);

        // Interval
        doc.text(`${act.startTime} — ${act.endTime}`, 17, currentY + 4.8);

        // Name & Category
        doc.setFont('helvetica', 'bold');
        const truncName = act.name.length > 25 ? `${act.name.slice(0, 23)}...` : act.name;
        doc.text(truncName, 48, currentY + 3.4);
        
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(6.5);
        doc.setTextColor(textLight[0], textLight[1], textLight[2]);
        doc.text(`[${act.category}]`, 48, currentY + 6.3);

        // Duration text
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(textDark[0], textDark[1], textDark[2]);
        doc.text(formatDuration(act.duration), 115, currentY + 4.8);

        // Tags listed beautifully
        const tagsJoined = act.tags && act.tags.length > 0 ? act.tags.map(t => `#${t}`).join(' ') : '—';
        const truncTags = tagsJoined.length > 15 ? `${tagsJoined.slice(0, 13)}...` : tagsJoined;
        doc.setTextColor(16, 185, 129); // emerald styled tags
        doc.text(truncTags, 138, currentY + 4.8);

        // Notes description
        doc.setTextColor(textLight[0], textLight[1], textLight[2]);
        const cleanNotes = act.notes || '—';
        const truncNotes = cleanNotes.length > 18 ? `${cleanNotes.slice(0, 16)}...` : cleanNotes;
        doc.text(truncNotes, 165, currentY + 4.8);

        currentY += 7.5;
      });

      // Reflection thoughts notes block
      if (reflection.trim()) {
        if (currentY > 230) {
          doc.addPage();
          currentY = 20;
        } else {
          currentY += 8;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text('DAILY FOCUS REFLECTION NOTEBOOK', 15, currentY);
        doc.line(15, currentY + 1.8, 195, currentY + 1.8);

        currentY += 5.5;
        doc.setFillColor(252, 251, 247); // warm notes block styling
        doc.setDrawColor(234, 212, 175); // soft amber stroke border
        doc.setLineWidth(0.25);

        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(51, 65, 85);
        const wrappedReflectionLines = doc.splitTextToSize(reflection.trim(), 170);
        const estimatedBlockHeight = Math.max(12, wrappedReflectionLines.length * 3.8 + 6);

        doc.rect(15, currentY, 180, estimatedBlockHeight, 'FD');
        doc.text(wrappedReflectionLines, 19, currentY + 5.5);
        currentY += estimatedBlockHeight + 10;
      }

      // Add a clean border footer at bottom
      doc.setDrawColor(borderClr[0], borderClr[1], borderClr[2]);
      doc.setLineWidth(0.2);
      doc.line(15, 280, 195, 280);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(textLight[0], textLight[1], textLight[2]);
      doc.text('Chronos Journal — Designed for high productivity and focus clarity.', 15, 284);
      doc.text('Page 1 of 1', 195, 284, { align: 'right' });

      doc.save(`chronos_daily_report_${todayStr}.pdf`);
    } catch (err) {
      console.error('Failed to export PDF format:', err);
    }
  };

  return (
    <div className="bg-[#0F1116] border border-slate-800 p-6 relative flex flex-col rounded-sm" id="insights-card">
      <div className="flex justify-between items-center pb-2 border-b border-slate-800 mb-5" id="insights-header">
        <h2 className="font-heading text-xs uppercase tracking-[0.2em] font-bold text-slate-400">
          Daily Breakdown
        </h2>
        <div className="flex items-center gap-2.5" id="insights-header-actions">
          <div className="flex items-center gap-1.5" id="export-actions-group">
            <Download className="w-3 h-3 text-slate-500" />
            <button
              type="button"
              onClick={handleExportBackup}
              disabled={activities.length === 0}
              className="text-[9px] uppercase tracking-widest font-bold text-slate-400 hover:text-emerald-400 disabled:opacity-20 disabled:pointer-events-none transition-all cursor-pointer bg-transparent border-0 p-0"
              title="Export to JSON"
              id="export-json-btn"
            >
              JSON
            </button>
            <span className="text-[9px] text-slate-700 font-mono">/</span>
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={activities.length === 0}
              className="text-[9px] uppercase tracking-widest font-bold text-slate-400 hover:text-emerald-400 disabled:opacity-20 disabled:pointer-events-none transition-all cursor-pointer bg-transparent border-0 p-0"
              title="Export to CSV"
              id="export-csv-btn"
            >
              CSV
            </button>
            <span className="text-[9px] text-slate-700 font-mono">/</span>
            <button
              type="button"
              onClick={handleExportPDF}
              disabled={todaysActivities.length === 0}
              className="text-[9px] uppercase tracking-widest font-bold text-slate-400 hover:text-emerald-400 disabled:opacity-20 disabled:pointer-events-none transition-all cursor-pointer bg-transparent border-0 p-0 flex items-center gap-0.5"
              title="Export Printable PDF Report"
              id="export-pdf-btn"
            >
              PDF
            </button>
          </div>
          <span className="text-[9px] text-slate-700 font-mono">|</span>
          <span className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">
            {todaysActivities.length} Records
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-around gap-8" id="insights-analytics-container">
        {/* SVG Donut Chart */}
        <div className="relative w-36 h-36 shrink-0" id="donut-chart-wrapper">
          <svg className="w-full h-full -rotate-90 overflow-visible" viewBox="0 0 120 120">
            {/* Background Track */}
            <circle 
              cx="60" 
              cy="60" 
              r={radius} 
              className="fill-none stroke-slate-900 stroke-[8]"
            />
            
            {/* Conditional categories slices */}
            {grandTotalSeconds > 0 ? (
              slices.map((slice) => (
                <circle
                  key={slice.category}
                  cx="60"
                  cy="60"
                  r={radius}
                  className="fill-none stroke-[8] transition-all duration-500"
                  style={{
                    stroke: slice.color,
                    strokeDasharray: `${slice.segmentStroke} ${circumference}`,
                    strokeDashoffset: slice.strokeDashoffset,
                    strokeLinecap: 'square',
                  }}
                />
              ))
            ) : (
              // Dashed ring if empty
              <circle
                cx="60"
                cy="60"
                r={radius}
                className="fill-none stroke-slate-800/30 stroke-[6]"
                style={{
                  strokeDasharray: '4 4'
                }}
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <span className="font-mono font-light text-xl text-white" id="total-duration-label">
              {formatDuration(grandTotalSeconds)}
            </span>
            <span className="text-[8px] uppercase tracking-widest font-bold text-slate-500 mt-0.5">
              Tracked Today
            </span>
          </div>
        </div>

        {/* Categories Legend list styled as Geometric progress rows */}
        <div className="flex flex-col gap-4 flex-grow w-full sm:max-w-[240px]" id="donut-chart-legend">
          {grandTotalSeconds > 0 ? (
            slices.map((slice) => (
              <div key={slice.category} className="space-y-1.5" id={`legend-item-${slice.category}`}>
                <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <span 
                      className="w-1.5 h-1.5 rounded-none shrink-0" 
                      style={{ backgroundColor: slice.color }}
                    />
                    {slice.emoji} {slice.category}
                  </span>
                  <span className="text-white font-mono">{formatDuration(slice.duration)} ({Math.round(slice.percentage)}%)</span>
                </div>
                <div className="h-1 w-full bg-slate-900 overflow-hidden rounded-none">
                  <div 
                    className="h-full transition-all duration-500" 
                    style={{ width: `${slice.percentage}%`, backgroundColor: slice.color }}
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6" id="empty-legend-notice">
              <p className="text-xs text-slate-500 uppercase tracking-wider italic">
                Awaiting productivity logs
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Daily Metrics Section: Target progress and Daily Streak */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5" id="daily-metrics-grid">
        {/* Daily Goal Tracking Section */}
        <div className="p-4 bg-slate-950 border border-slate-900 rounded-sm flex flex-col justify-between" id="daily-goal-section">
          <div>
            <div className="flex justify-between items-center mb-2.5">
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] uppercase tracking-widest text-[#10b981] font-bold font-heading">
                  Daily Focus Target
                </span>
                <span className="text-xs text-white font-medium">
                  {dailyGoalMins > 0 ? Math.min(100, Math.round(((grandTotalSeconds / 60) / dailyGoalMins) * 100)) : 0}% Achieved <span className="text-slate-500 font-light">({formatDuration(grandTotalSeconds)} / {formatDuration(dailyGoalMins * 60)})</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5" id="daily-goal-controls">
                <label htmlFor="daily-goal-input" className="text-[9px] uppercase tracking-widest font-mono text-slate-500">Goal:</label>
                <input
                  type="number"
                  id="daily-goal-input"
                  min="1"
                  max="1440"
                  value={dailyGoalMins}
                  onChange={(e) => setDailyGoalMins(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 bg-slate-900 border border-slate-800 rounded-sm text-center py-1 text-xs text-emerald-400 font-mono outline-none focus:border-emerald-500"
                />
                <span className="text-[9px] uppercase tracking-wider font-mono text-slate-600">min</span>
              </div>
            </div>
            <div className="h-1.5 w-full bg-slate-900 overflow-hidden rounded-none relative">
              <div 
                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500 ease-out" 
                style={{ width: `${dailyGoalMins > 0 ? Math.min(100, Math.round(((grandTotalSeconds / 60) / dailyGoalMins) * 100)) : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Daily Streak Section */}
        <div className="p-4 bg-slate-950 border border-slate-900 rounded-sm flex flex-col justify-between" id="daily-streak-section">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] uppercase tracking-widest text-[#10b981] font-bold font-heading">
                Daily Streak
              </span>
              <div className="flex items-center gap-2 mt-1">
                <div className={`p-1.5 rounded-sm ${currentStreak > 0 ? 'bg-orange-500/10 text-orange-400 border border-orange-500/22' : 'bg-slate-900 text-slate-600 border border-slate-800/60'}`}>
                  <Flame className={`w-4 h-4 ${currentStreak > 0 ? 'animate-pulse text-orange-500' : 'text-slate-600'}`} />
                </div>
                <span className="text-lg font-mono font-bold text-white tracking-tight" id="streak-counter-value">
                  {currentStreak} {currentStreak === 1 ? 'Day' : 'Days'}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[8px] uppercase tracking-widest font-mono text-slate-500 block">Status</span>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${todaysActivities.length > 0 ? 'text-emerald-400' : currentStreak > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`}>
                {todaysActivities.length > 0 ? 'Logged Today' : currentStreak > 0 ? 'Streak Pending' : 'No Streak'}
              </span>
            </div>
          </div>
          <div className="mt-3 text-[10px] text-slate-500 border-t border-slate-900/40 pt-2 font-sans leading-relaxed">
            {todaysActivities.length > 0 ? (
              <span className="text-emerald-400/90">Streak is active! Great job staying focused today.</span>
            ) : currentStreak > 0 ? (
              <span className="text-amber-400/95 font-medium">Log an activity today to maintain your consecutive streak!</span>
            ) : (
              <span className="text-slate-500">Start tracking or log an activity today to begin your streak!</span>
            )}
          </div>
        </div>
      </div>

      {/* 7-Day Activity History Line Chart */}
      <div className="mt-5 p-4 bg-slate-950 border border-slate-900 rounded-sm" id="7-day-history-section">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-[9px] uppercase tracking-widest text-[#10b981] font-bold font-heading">
            7-Day Activity History (Hours)
          </h3>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[8.5px] uppercase font-mono text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Current
            </span>
            <span className="flex items-center gap-1 text-[8.5px] uppercase font-mono text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
              Avg Trend
            </span>
          </div>
        </div>
        <div className="h-44 w-full cursor-crosshair" id="history-chart-wrapper">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={last7DaysData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="label" 
                stroke="#475569" 
                fontSize={8} 
                fontFamily="monospace"
                tickLine={false}
              />
              <YAxis 
                stroke="#475569" 
                fontSize={8} 
                fontFamily="monospace"
                tickLine={false}
                axisLine={false}
                unit="h"
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const diff = parseFloat((data.hours - data.avgHours).toFixed(1));
                    const isImproved = diff >= 0;
                    return (
                      <div className="bg-slate-950 border border-slate-800 p-3 text-[10px] font-mono rounded-sm shadow-2xl flex flex-col gap-1 w-44" id="insights-chart-tooltip">
                        <p className="text-slate-500 uppercase tracking-wider font-bold text-[8.5px] border-b border-slate-900/60 pb-1 mb-1">{data.dateStr}</p>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Current Week:</span>
                          <span className="text-emerald-400 font-bold">{data.hours}h</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Historical Avg:</span>
                          <span className="text-indigo-400 font-bold">{data.avgHours}h</span>
                        </div>
                        <div className="border-t border-slate-900 pt-1 mt-1 flex justify-between items-center text-[9px]">
                          <span className="text-slate-500">Net Delta:</span>
                          <span className={`${isImproved ? 'text-emerald-400' : 'text-rose-400'} font-bold`}>
                            {isImproved ? `+${diff}` : diff}h
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line 
                type="monotone" 
                dataKey="hours" 
                stroke="#10b981" 
                strokeWidth={2}
                dot={{ r: 3, stroke: '#10b981', strokeWidth: 1, fill: '#0a0d12' }}
                activeDot={{ r: 5, stroke: '#10b981', strokeWidth: 2, fill: '#10b981' }}
              />
              <Line 
                type="monotone" 
                dataKey="avgHours" 
                stroke="#6366f1" 
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 2, stroke: '#6366f1', strokeWidth: 1, fill: '#0a0d12' }}
                activeDot={{ r: 4, stroke: '#6366f1', strokeWidth: 1, fill: '#6366f1' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Brand weekly insight box at the bottom */}
      <div className="mt-5 p-4 bg-slate-950 border border-slate-900 rounded-sm">
        <p className="text-[9px] uppercase tracking-widest text-[#10b981] font-bold mb-1 font-heading">
          Weekly Rhythm Insight
        </p>
        <p className="text-xs leading-relaxed text-slate-400 font-sans font-light">
          {grandTotalSeconds > 0 
            ? `Consistency is stable. You have allocated a dominant portion of your daylight focus to ${slices.sort((a,b)=>b.duration-a.duration)[0]?.category} goals. Maintain this momentum.` 
            : "No sessions recorded today yet. Start the real-time tracker or log past activities to synthesize focus intelligence parameters."}
        </p>
      </div>

      {/* Idle Prompter Configuration panel */}
      <div className="mt-5 p-4 bg-slate-950 border border-slate-900 rounded-sm" id="idle-settings-section">
        <div className="flex items-center gap-2 mb-3.5 pb-2 border-b border-slate-900/60">
          <Bell className="w-3.5 h-3.5 text-slate-500" />
          <h3 className="text-[9px] uppercase tracking-widest font-bold text-[#10b981] font-heading">
            Idle Prompters & Presence Analytics
          </h3>
          <span className="text-[9px] font-mono text-slate-500 select-none ml-auto">
            Device Sleep Drift: <span className="text-emerald-400 font-bold">{currentIdleSeconds}s</span>
          </span>
        </div>

        <div className="flex flex-col gap-3">
          
          {/* Prompter 1: Start Reminder */}
          <div className="flex flex-col gap-2 p-2.5 bg-slate-900/40 border border-slate-900/25 rounded-sm" id="prompter-start-cfg">
            <div className="flex items-center justify-between">
              <label htmlFor="start-prompter-toggle" className="flex flex-col select-none cursor-pointer">
                <span className="text-xs text-white font-medium">No-Active-Timer Alert</span>
                <span className="text-[9px] text-slate-500 font-light mt-0.5">Prompt to record when active on device but tracker is idle</span>
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => triggerTestPrompt('start')}
                  className="text-[8px] uppercase tracking-widest font-mono text-slate-500 hover:text-emerald-400 bg-slate-950 px-2 py-0.5 rounded-sm border border-slate-800 transition-colors cursor-pointer"
                  title="Test Start Alert"
                >
                  Test
                </button>
                <div 
                  id="start-prompter-toggle"
                  onClick={() => setStartPrompterEnabled(!startPrompterEnabled)}
                  className={`w-7 h-4 rounded-full p-0.5 cursor-pointer transition-colors duration-200 ease-in-out ${startPrompterEnabled ? 'bg-emerald-500' : 'bg-slate-800'}`}
                >
                  <div className={`w-3 h-3 rounded-full bg-white transition-transform duration-200 ease-in-out transform ${startPrompterEnabled ? 'translate-x-3' : 'translate-x-0'}`} />
                </div>
              </div>
            </div>
            {startPrompterEnabled && (
              <div className="flex items-center gap-2 mt-1 border-t border-slate-900/60 pt-2" id="start-prompter-mins-control">
                <span className="text-[9px] text-slate-400 select-none">Prompt after:</span>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={startIdleMins}
                  onChange={(e) => setStartIdleMins(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-12 bg-slate-950 border border-slate-900 rounded-sm text-center py-0.5 text-xs text-emerald-400 font-mono outline-none focus:border-emerald-500"
                />
                <span className="text-[9.5px] text-slate-500 font-mono">mins idle</span>
              </div>
            )}
          </div>

          {/* Prompter 2: Stop Active Idle Reminder */}
          <div className="flex flex-col gap-2 p-2.5 bg-slate-900/40 border border-slate-900/25 rounded-sm" id="prompter-stop-cfg">
            <div className="flex items-center justify-between">
              <label htmlFor="stop-prompter-toggle" className="flex flex-col select-none cursor-pointer">
                <span className="text-xs text-white font-medium">Away-From-Device Alert</span>
                <span className="text-[9px] text-slate-500 font-light mt-0.5">Prompt to stop timer if no keyboard or mouse movement is detected</span>
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => triggerTestPrompt('stop')}
                  className="text-[8px] uppercase tracking-widest font-mono text-slate-500 hover:text-emerald-400 bg-slate-950 px-2 py-0.5 rounded-sm border border-slate-800 transition-colors cursor-pointer"
                  title="Test Stop Alert"
                >
                  Test
                </button>
                <div 
                  id="stop-prompter-toggle"
                  onClick={() => setStopPrompterEnabled(!stopPrompterEnabled)}
                  className={`w-7 h-4 rounded-full p-0.5 cursor-pointer transition-colors duration-200 ease-in-out ${stopPrompterEnabled ? 'bg-emerald-500' : 'bg-slate-800'}`}
                >
                  <div className={`w-3 h-3 rounded-full bg-white transition-transform duration-200 ease-in-out transform ${stopPrompterEnabled ? 'translate-x-3' : 'translate-x-0'}`} />
                </div>
              </div>
            </div>
            {stopPrompterEnabled && (
              <div className="flex items-center gap-2 mt-1 border-t border-slate-900/60 pt-2" id="stop-prompter-mins-control">
                <span className="text-[9px] text-slate-400 select-none">Prompt after:</span>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={stopActiveIdleMins}
                  onChange={(e) => setStopActiveIdleMins(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-12 bg-slate-950 border border-slate-900 rounded-sm text-center py-0.5 text-xs text-emerald-400 font-mono outline-none focus:border-emerald-500"
                />
                <span className="text-[9.5px] text-slate-500 font-mono">mins idle</span>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Floating Active Prompter Toast Overlay */}
      {activePrompt && (
        <div 
          className="fixed bottom-6 right-6 z-50 max-w-sm bg-slate-950 border border-emerald-500/40 p-4 rounded-sm shadow-2xl flex flex-col gap-3 animate-fade-in"
          style={{ boxShadow: '0 20px 25px -5px rgba(0,0,0,0.85), 0 10px 10px -5px rgba(0,0,0,0.75)' }}
          id="idle-prompter-toast"
        >
          <div className="flex gap-2.5 items-start">
            <div className="p-1 text-emerald-400 bg-emerald-500/10 rounded-sm shrink-0">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#10b981]">
                {activePrompt === 'start' ? 'Active Device Reminder' : 'Idle Timer Check'}
              </span>
              <p className="text-xs text-slate-300 leading-normal">
                {activePrompt === 'start' 
                  ? `You are using your device but haven't started an active tracking session in the last ${startIdleMins} minutes.`
                  : `A focus session is running, but no interaction has been detected for ${stopActiveIdleMins} minutes. Save current progress?`}
              </p>
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-1">
            <button
              type="button"
              onClick={handleDismissPrompt}
              className="text-[9px] uppercase tracking-wider font-bold text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-sm cursor-pointer transition-all"
            >
              Dismiss
            </button>
            {activePrompt === 'start' ? (
              <button
                type="button"
                onClick={handleStartSessionFromPrompt}
                className="text-[9px] uppercase tracking-wider font-bold bg-[#10b981] hover:bg-[#059669] text-black px-3 py-1.5 rounded-sm cursor-pointer transition-all"
              >
                Start Session
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStopSessionFromPrompt}
                className="text-[9px] uppercase tracking-wider font-bold bg-[#be123c] hover:bg-[#9f1239] text-white px-3 py-1.5 rounded-sm cursor-pointer transition-all"
              >
                Stop & Save
              </button>
            )}
          </div>
        </div>
      )}

      {/* Daily Reflection Section */}
      <div className="mt-5 pt-5 border-t border-slate-900 flex flex-col gap-2" id="daily-reflection-section">
        <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold font-heading" htmlFor="dailySummary">
          Daily Summary & Reflection
        </label>
        <textarea
          id="dailySummary"
          placeholder="Jot down notes, learnings, or a synthesis of today's achievements..."
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          rows={3}
          className="bg-slate-950 border border-slate-800 rounded-sm px-4 py-3 text-xs text-white placeholder-slate-600 outline-none transition-all focus:border-emerald-500 resize-none font-sans"
        />
      </div>
    </div>
  );
}
