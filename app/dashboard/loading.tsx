import {
  Skeleton,
  SkeletonCircle,
  SkeletonClassCard,
} from "@/app/components/skeleton";

export default function Loading() {
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-surface p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-3">
          <SkeletonCircle className="h-10 w-10 sm:h-12 sm:w-12" />
          <div>
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-2 h-3 w-52" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-28 rounded-2xl" />
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonClassCard key={i} />
        ))}
      </div>
    </div>
  );
}