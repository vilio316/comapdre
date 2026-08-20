import { Skeleton } from "@/app/components/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto px-3 py-6 sm:py-8 sm:px-4">
      <Skeleton className="h-7 w-52" />
      <Skeleton className="mt-2 h-4 w-80" />

      <div className="mt-5 flex w-fit gap-1 rounded-lg border border-gray-200 bg-surface p-1">
        <Skeleton className="h-8 w-20 rounded-md" />
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>

      <div className="mt-6 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <Skeleton className="h-4 w-52" />
              <Skeleton className="mt-2 h-3 w-40" />
            </div>
            <Skeleton className="h-8 w-32 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}