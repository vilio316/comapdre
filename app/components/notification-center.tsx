"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNotifications } from "@/app/context/notification-context";
import { FaBell } from "react-icons/fa6";

const iconMap: Record<string, string> = {
  success: "✓",
  error: "✕",
  info: "ℹ",
  loading: "◌",
};

const colorMap: Record<string, string> = {
  success: "text-green-600",
  error: "text-red-600",
  info: "text-blue-600",
  loading: "text-gray-400",
};

function formatTime(ts: number): string {
  if (!ts) return "";
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function NotificationCenter() {
  const { history, unreadCount, markAllRead, markAsRead, clearHistory } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-md p-1.5 text-blue-light transition-colors hover:bg-deep-light hover:text-gold-light"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <FaBell />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-gray-200 bg-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2.5">
            <p className="text-sm font-semibold text-deep">Notifications</p>
            {history.length > 0 && (
              <div className="flex items-center gap-3">
                <button
                  onClick={markAllRead}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  Mark all read
                </button>
                <button
                  onClick={clearHistory}
                  className="text-xs font-medium text-ink-muted hover:text-deep"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {history.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-medium text-deep">
                No notifications yet
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                Status updates from OCR, MCQ, and Compile will appear here.
              </p>
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {history.map((n) => (
                <li
                  key={n.id}
                  className={`border-b border-gray-100 last:border-b-0 ${
                    n.read ? "bg-surface" : "bg-muted/60"
                  }`}
                >
                  <div className="flex items-start gap-3 px-3 py-2.5">
                    <span
                      className={`mt-0.5 text-sm font-bold ${colorMap[n.type]}`}
                    >
                      {iconMap[n.type]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-deep">{n.title}</p>
                      {n.message && (
                        <p className="mt-0.5 text-xs text-ink-muted">
                          {n.message}
                        </p>
                      )}
                      <p className="mt-0.5 text-[10px] text-ink-muted">
                        {formatTime(n.createdAt)}
                      </p>
                      {n.action && (
                        <Link
                          href={n.action.href}
                          onClick={() => markAsRead(n.id)}
                          className="mt-1 inline-block text-xs font-medium text-blue-600 underline hover:text-blue-700"
                        >
                          {n.action.label}
                        </Link>
                      )}
                    </div>
                    {!n.read && (
                      <button
                        onClick={() => markAsRead(n.id)}
                        className="shrink-0 text-ink-muted transition-colors hover:text-deep"
                        aria-label={`Mark ${n.title} as read`}
                      >
                        <svg
                          className="h-3.5 w-3.5"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <circle cx="12" cy="12" r="5" />
                        </svg>
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
