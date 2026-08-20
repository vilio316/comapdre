import { Skeleton } from "@/app/components/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col pb-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Skeleton className="mb-1 h-3.5 w-14" />
          <Skeleton className="h-6 w-64" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-32 rounded-lg" />
        </div>
      </div>

      <div className="flex-1 overflow-hidden rounded-xl border border-gray-200 bg-surface shadow-sm">
        <div className="flex h-[80vh] w-full items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-deep" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </div>
    </div>
  );
}