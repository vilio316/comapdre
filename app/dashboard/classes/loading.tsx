import { Skeleton, SkeletonClassCard } from "@/app/components/skeleton";

export default function Loading() {
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-surface p-4 shadow-sm sm:p-5">
        <div>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="mt-2 h-3 w-72" />
        </div>
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>

      <div className="relative mb-5">
        <Skeleton className="h-13 w-full rounded-lg" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonClassCard key={i} />
        ))}
      </div>
    </div>
  );
}