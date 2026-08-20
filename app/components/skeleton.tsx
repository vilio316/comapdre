interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-lg bg-gray-100 ${className ?? ""}`}
    />
  );
}

export function SkeletonCircle({ className }: SkeletonProps) {
  return <Skeleton className={`rounded-full ${className ?? ""}`} />;
}

export function SkeletonClassCard({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`h-45 flex flex-col rounded-xl border border-gray-200 bg-surface p-4 shadow-sm md:h-70 ${className ?? ""}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-4 w-14 rounded-full" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="mt-1.5 h-3 w-4/6" />
      <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  );
}

export function SkeletonToolCard({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`rounded-xl border border-gray-200 bg-surface p-4 shadow-sm ${className ?? ""}`}
    >
      <Skeleton className="mb-2 h-6 w-6" />
      <Skeleton className="h-3.5 w-2/3" />
      <Skeleton className="mt-1.5 h-3 w-3/4" />
    </div>
  );
}

export function SkeletonDocRow({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`flex items-center gap-3 rounded-xl border border-gray-200 bg-surface p-3 sm:gap-4 sm:p-4 ${className ?? ""}`}
    >
      <Skeleton className="h-9 w-9 shrink-0 rounded-lg sm:h-10 sm:w-10" />
      <div className="min-w-0 flex-1">
        <Skeleton className="h-3.5 w-3/5" />
        <Skeleton className="mt-1.5 h-3 w-2/5" />
      </div>
      <div className="hidden gap-1 sm:flex">
        <Skeleton className="h-5 w-12 rounded-full" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
      <Skeleton className="h-7 w-14 rounded-lg" />
      <Skeleton className="h-7 w-7 rounded-md" />
    </div>
  );
}

export function SkeletonMemberRow({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`flex items-center justify-between gap-3 rounded-lg border border-gray-100 p-3 ${className ?? ""}`}
    >
      <div className="min-w-0 flex-1">
        <Skeleton className="h-3.5 w-2/5" />
        <Skeleton className="mt-1.5 h-3 w-3/5" />
      </div>
      <Skeleton className="h-5 w-16 rounded-full" />
    </div>
  );
}