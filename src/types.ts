/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Activity {
  id: string;
  name: string;
  category: CategoryKey;
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:MM (24h)
  endTime: string;    // HH:MM (24h)
  duration: number;   // duration in seconds
  notes?: string;
  tags?: string[];
}

export type CategoryKey = 'Work' | 'Wellness' | 'Leisure' | 'Focus' | 'Chores';

export interface CategoryConfig {
  emoji: string;
  color: string;
  bgHex: string;
  textHex: string;
}

export const CATEGORIES: Record<CategoryKey, CategoryConfig> = {
  Work: { emoji: '💼', color: '#a855f7', bgHex: 'rgba(168, 85, 247, 0.12)', textHex: '#a855f7' },
  Wellness: { emoji: '🌱', color: '#10b981', bgHex: 'rgba(16, 185, 129, 0.12)', textHex: '#10b981' },
  Leisure: { emoji: '🎮', color: '#f59e0b', bgHex: 'rgba(245, 158, 11, 0.12)', textHex: '#f59e0b' },
  Focus: { emoji: '🧠', color: '#06b6d4', bgHex: 'rgba(6, 182, 212, 0.12)', textHex: '#06b6d4' },
  Chores: { emoji: '🧹', color: '#f43f5e', bgHex: 'rgba(244, 63, 94, 0.12)', textHex: '#f43f5e' }
};
