import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CivicAlert {
  id: string;
  type: 'bill_status' | 'deadline' | 'campaign' | 'event_reminder';
  title: string;
  description: string;
  url: string;
  timestamp: Date;
  read: boolean;
}

export interface CivicPlayerState {
  isExpanded: boolean;
  activeTab: 'now' | 'myBills' | 'calendar' | 'alerts' | 'impact';
  unreadCount: number;
  latestHeadline: string | null;
  temperature: 'cool' | 'warm' | 'hot';
  alerts: CivicAlert[];
  toggleExpand: () => void;
  setActiveTab: (tab: CivicPlayerState['activeTab']) => void;
  addAlert: (alert: CivicAlert) => void;
  markAlertRead: (alertId: string) => void;
  setLatestHeadline: (headline: string) => void;
  setTemperature: (temp: CivicPlayerState['temperature']) => void;
  resetUnreadCount: () => void;
}

export const useCivicPlayerStore = create<CivicPlayerState>()(
  persist(
    (set, get) => ({
      isExpanded: false,
      activeTab: 'now',
      unreadCount: 0,
      latestHeadline: null,
      temperature: 'cool',
      alerts: [],
      toggleExpand: () => set((state) => ({ isExpanded: !state.isExpanded })),
      setActiveTab: (tab) => set({ activeTab: tab }),
      addAlert: (alert) => set((state) => ({
        alerts: [alert, ...state.alerts].slice(0, 50),
        unreadCount: state.unreadCount + (alert.read ? 0 : 1),
      })),
      markAlertRead: (alertId) => set((state) => ({
        alerts: state.alerts.map(a => a.id === alertId ? { ...a, read: true } : a),
        unreadCount: Math.max(0, state.unreadCount - 1),
      })),
      setLatestHeadline: (headline) => set({ latestHeadline: headline }),
      setTemperature: (temp) => set({ temperature: temp }),
      resetUnreadCount: () => set({ unreadCount: 0 }),
    }),
    { name: 'civic-player-storage' }
  )
);
