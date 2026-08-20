import {
  Skeleton,
  SkeletonDocRow,
  SkeletonMemberRow,
  SkeletonToolCard,
} from "@/app/components/skeleton";

export default function Loading() {
  return (
    <div>
      <Skeleton className="mb-4 h-4 w-16" />

      <div className="mb-6 rounded-xl border border-gray-200 bg-surface p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="mt-2 h-3 w-72" />
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonToolCard key={i} />
        ))}
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 bg-surface p-5 shadow-sm">
        <Skeleton className="mb-3 h-4 w-24" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonDocRow key={i} />
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-surface p-5 shadow-sm">
        <Skeleton className="mb-3 h-4 w-20" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonMemberRow key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}