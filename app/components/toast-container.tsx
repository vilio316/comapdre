"use client";

import Link from "next/link";
import { useNotifications } from "@/app/context/notification-context";

const iconMap: Record<string, string> = {
  success: "✓",
  error: "✕",
  info: "ℹ",
  loading: "◌",
};

const borderMap: Record<string, string> = {
  success: "border-green-600",
  error: "border-red-600",
  info: "border-blue-600",
  loading: "border-gray-400",
};

export function ToastContainer() {
  const { notifications, removeNotification } = useNotifications();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed right-4 left-4 sm:left-auto bottom-8 z-50 flex max-w-sm flex-col gap-2 pointer-events-none">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`pointer-events-auto flex items-start gap-3 rounded-lg border-l-4 bg-surface p-4 shadow-lg backdrop-blur-sm transition-all duration-300 ${borderMap[n.type]}`}
        >
          <span className="mt-0.5 text-sm font-bold text-ink">
            {iconMap[n.type]}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-deep">{n.title}</p>
            {n.message && (
              <p className="mt-0.5 text-xs text-ink-muted">{n.message}</p>
            )}
            {n.action && (
              <Link
                href={n.action.href}
                className="mt-1 inline-block text-xs font-medium text-blue-600 hover:text-blue-700 underline"
              >
                {n.action.label}
              </Link>
            )}
          </div>
          <button
            onClick={() => removeNotification(n.id)}
            className="shrink-0 text-ink-muted transition-colors hover:text-deep"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
