"use client";

import { useState, useEffect } from "react";
import { FaMagnifyingGlass, FaUserGroup, FaCode } from "react-icons/fa6";

interface MyClass {
  id: string;
  name: string;
  code: string;
  description: string | null;
  role: string;
  ownerName: string;
  memberCount: number;
  createdAt: string;
}

interface SearchResult {
  id: string;
  name: string;
  code: string;
  description: string | null;
  ownerName: string;
  memberCount: number;
}

export default function ClassesPage() {
  const [myClasses, setMyClasses] = useState<MyClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/classes")
      .then((r) => r.json())
      .then((data) => {
        if (data.classes) setMyClasses(data.classes);
        if (data.error) setError(data.error);
      })
      .catch(() => setError("Failed to load your classes"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = search.trim();
    if (!q) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setSearching(true);
      fetch(`/api/classes/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((data) => {
          if (data.classes) setResults(data.classes);
          if (data.error) setError(data.error);
        })
        .catch(() => setError("Search failed"))
        .finally(() => setSearching(false));
    }, 300);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [search]);

  const handleJoin = async (cls: SearchResult) => {
    setJoiningId(cls.id);
    setError("");
    try {
      const res = await fetch(`/api/classes/${encodeURIComponent(cls.id)}/join`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to join class");
        return;
      }
      const joined: MyClass = {
        id: data.class.id,
        name: data.class.name,
        code: data.class.code,
        description: data.class.description,
        role: data.class.role,
        ownerName: cls.ownerName,
        memberCount: cls.memberCount + 1,
        createdAt: new Date().toISOString(),
      };
      setMyClasses((prev) => [joined, ...prev]);
      setResults((prev) => prev.filter((r) => r.id !== cls.id));
      setSearch("");
    } catch {
      setError("Failed to join class");
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <div>
      <div className="mb-6 rounded-xl border border-gray-200 bg-surface p-4 shadow-sm sm:p-5">
        <h1 className="text-lg font-bold text-deep sm:text-xl">Your Classes</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Classes you have joined appear here. Search for a class name or code to find and join new ones.
        </p>
      </div>

      <div className="mb-5">
        <div className="relative">
          <FaMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for classes by name or code..."
            className="w-full rounded-lg border border-gray-300 bg-surface py-2 pl-9 pr-4 text-sm text-ink outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
          />
        </div>

        {search.trim() !== "" && (
          <div className="mt-3">
            {searching ? (
              <div className="py-6 text-center text-sm text-ink-muted">Searching...</div>
            ) : results.length === 0 ? (
              <div className="py-6 text-center text-sm text-ink-muted">No classes found.</div>
            ) : (
              <div className="space-y-2">
                {results.map((cls) => (
                  <div
                    key={cls.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-surface p-3 sm:p-3.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-deep">{cls.name}</p>
                      <p className="text-[11px] text-ink-muted">
                        {cls.ownerName} &middot; {cls.memberCount} member{cls.memberCount === 1 ? "" : "s"} &middot;{" "}
                        <span className="inline-flex items-center gap-1 font-medium text-gold">
                          <FaCode /> {cls.code}
                        </span>
                      </p>
                      {cls.description && (
                        <p className="mt-1 line-clamp-1 text-xs text-ink-muted">{cls.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleJoin(cls)}
                      disabled={joiningId === cls.id}
                      className="shrink-0 rounded-lg bg-gold px-3 py-1.5 text-xs font-medium text-deep transition-colors hover:bg-gold-light disabled:opacity-60"
                    >
                      {joiningId === cls.id ? "Joining..." : "Join"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-4">
        <h2 className="text-base font-bold text-deep">My Classes</h2>
      </div>

      {loading ? (
        <div className="mt-10 flex justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-deep" />
        </div>
      ) : myClasses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-surface px-6 py-10 text-center">
          <FaUserGroup className="mx-auto mb-3 text-2xl text-ink-muted" />
          <p className="text-sm font-medium text-deep">You haven&apos;t joined any classes yet</p>
          <p className="mt-1 text-xs text-ink-muted">
            Search above to find your class, or ask your teacher for the class code.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {myClasses.map((cls) => (
            <div
              key={cls.id}
              className="flex flex-col rounded-xl border border-gray-200 bg-surface p-4 shadow-sm transition-all hover:border-gold/40 hover:shadow-md"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold text-deep">{cls.name}</p>
                <span className="shrink-0 rounded-full bg-gold/10 px-2 py-0.5 text-[11px] font-medium text-gold">
                  {cls.role === "owner" ? "Owner" : "Member"}
                </span>
              </div>
              {cls.description && (
                <p className="line-clamp-2 text-xs text-ink-muted">{cls.description}</p>
              )}
              <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 text-[11px] text-ink-muted">
                <span className="inline-flex items-center gap-1.5">
                  <FaUserGroup /> {cls.memberCount} member{cls.memberCount === 1 ? "" : "s"}
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium text-gold">
                  <FaCode /> {cls.code}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
