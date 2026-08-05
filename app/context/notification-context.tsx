"use client";

import { createContext, useContext, useCallback, useState, useRef } from "react";

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

interface NotificationContextValue {
  notifications: Notification[];
  addNotification: (notif: Omit<Notification, "id">) => string;
  removeNotification: (id: string) => void;
  success: (title: string, message?: string) => string;
  error: (title: string, message?: string) => string;
  info: (title: string, message?: string) => string;
  requestSystemNotifications: () => Promise<NotificationPermission>;
  notifySystem: (title: string, body?: string, url?: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const counterRef = useRef(0);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const addNotification = useCallback(
    (notif: Omit<Notification, "id">) => {
      counterRef.current++;
      const id = `notif-${counterRef.current}`;
      const notification: Notification = { ...notif, id };
      setNotifications((prev) => [...prev, notification]);
      if (notif.duration !== 0) {
        const ms = notif.duration ?? (notif.type === "error" ? 6000 : 4000);
        setTimeout(() => removeNotification(id), ms);
      }
      return id;
    },
    [removeNotification],
  );

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

  return (
    <NotificationContext.Provider
      value={{ notifications, addNotification, removeNotification, success, error, info, requestSystemNotifications, notifySystem }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
