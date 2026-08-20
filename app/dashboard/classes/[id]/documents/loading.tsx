import { Skeleton, SkeletonDocRow } from "@/app/components/skeleton";

export default function Loading() {
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-1.5 h-3 w-64" />
        </div>
        <Skeleton className="h-10 w-24 rounded-lg" />
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row">
        <Skeleton className="h-11 w-full rounded-lg sm:max-w-64 sm:flex-1" />
        <Skeleton className="h-11 w-full rounded-lg sm:w-40" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonDocRow key={i} />
        ))}
      </div>
    </div>
  );
}