"use client";

import { useState, useEffect, useCallback } from "react";import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { FaUserGroup } from "react-icons/fa6";

interface MyClass {
  id: string;
  name: string;
  role: string;
}

interface ClassSelectorProps {
  onActiveChange?: (cls: { id: string; role: string } | null) => void;
  className?: string;
}

export default function ClassSelector({
  onActiveChange,
  className,
}: ClassSelectorProps) {
  const { useSession } = authClient;
  const { data } = useSession();
  const [classes, setClasses] = useState<MyClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string>("");
  const [error, setError] = useState("");

  const activeOrganizationId = (
    data?.session as { activeOrganizationId?: string } | undefined
  )?.activeOrganizationId;

  useEffect(() => {
    let cancelled = false;
    fetch("/api/classes")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.classes) {
          setClasses(data.classes);
          const preferred =
            activeOrganizationId &&
            data.classes.some((c: MyClass) => c.id === activeOrganizationId)
              ? activeOrganizationId
              : data.classes[0]?.id;
          if (preferred) setActiveId(preferred);
        }
        if (data.error) setError(data.error);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load classes");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeOrganizationId]);

  useEffect(() => {
    const active = classes.find((c) => c.id === activeId) ?? null;
    if (onActiveChange) onActiveChange(active);
  }, [activeId, classes, onActiveChange]);

  const changeClass = useCallback(
    async (id: string) => {
      setActiveId(id);
      try {
        await authClient.organization.setActive({ organizationId: id });
      } catch (err) {
        console.error("Failed to switch class:", err);
      }
    },
    [],
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-ink-muted">
        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-gold" />
        Loading classes...
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-surface px-3 py-2 text-xs text-ink-muted">
        <FaUserGroup />
        <span>No classes yet.</span>
        <Link
          href="/dashboard/classes"
          className="font-medium text-gold hover:underline"
        >
          Create or join one
        </Link>
      </div>
    );
  }

  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-ink-muted">
        Active class
      </label>
      <select
        value={activeId}
        onChange={(e) => changeClass(e.target.value)}
        aria-label="Active class"
        className="w-full rounded-lg border border-gray-300 bg-surface px-3 py-2 text-sm outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
      >
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
