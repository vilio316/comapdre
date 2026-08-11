"use client";

import { createContext, useContext, useCallback, useState, useRef, useEffect } from "react";

export type NotificationType = "success" | "error" | "info" | "loading";

export interface NotificationAction {
  label: string;
  href: string;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  action?: NotificationAction;
}

export interface HistoryNotification extends Notification {
  read: boolean;
  createdAt: number;
}

interface NotificationContextValue {
  notifications: Notification[];
  history: HistoryNotification[];
  unreadCount: number;
  addNotification: (notif: Omit<Notification, "id">) => string;
  removeNotification: (id: string) => void;
  success: (title: string, message?: string) => string;
  error: (title: string, message?: string) => string;
  info: (title: string, message?: string) => string;
  requestSystemNotifications: () => Promise<NotificationPermission>;
  notifySystem: (title: string, body?: string, url?: string) => void;
  markAsRead: (id: string) => void;
  markAllRead: () => void;
  clearHistory: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}

const HISTORY_KEY = "compadre:notification-history";
const HISTORY_MAX = 100;

function loadHistory(): HistoryNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [history, setHistory] = useState<HistoryNotification[]>(loadHistory);
  const counterRef = useRef(0);

  useEffect(() => {
    try {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
      // storage unavailable
    }
  }, [history]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const addNotification = useCallback(
    (notif: Omit<Notification, "id">) => {
      counterRef.current++;
      const id = `notif-${counterRef.current}`;
      const notification: Notification = { ...notif, id };
      setNotifications((prev) => [...prev, notification]);
      if (notif.type !== "loading") {
        setHistory((prev) =>
          [{ ...notification, read: false, createdAt: Date.now() }, ...prev].slice(0, HISTORY_MAX),
        );
      }
      if (notif.duration !== 0) {
        const ms = notif.duration ?? (notif.type === "error" ? 6000 : 4000);
        setTimeout(() => removeNotification(id), ms);
      }
      return id;
    },
    [removeNotification],
  );

  const markAsRead = useCallback((id: string) => {
    setHistory((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllRead = useCallback(() => {
    setHistory((prev) => prev.map((n) => (n.read ? n : { ...n, read: true })));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const success = useCallback(
    (title: string, message?: string) => addNotification({ type: "success", title, message }),
    [addNotification],
  );

  const error = useCallback(
    (title: string, message?: string) => addNotification({ type: "error", title, message }),
    [addNotification],
  );

  const info = useCallback(
    (title: string, message?: string) => addNotification({ type: "info", title, message }),
    [addNotification],
  );

  const requestSystemNotifications = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "denied" as NotificationPermission;
    }
    return Notification.requestPermission();
  }, []);

  const notifySystem = useCallback((title: string, body?: string, url?: string) => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const notification = new Notification(title, { body });
    if (url) {
      notification.onclick = () => {
        window.focus();
        window.location.href = url;
        notification.close();
      };
    }
  }, []);

  const unreadCount = history.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        history,
        unreadCount,
        addNotification,
        removeNotification,
        success,
        error,
        info,
        requestSystemNotifications,
        notifySystem,
        markAsRead,
        markAllRead,
        clearHistory,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
