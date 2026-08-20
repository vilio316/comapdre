import { Skeleton } from "@/app/components/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto px-3 py-6 sm:py-8 sm:px-4">
      <Skeleton className="mb-2 h-3.5 w-20" />
      <Skeleton className="h-7 w-56" />
      <Skeleton className="mt-2 h-4 w-72" />

      <div className="mt-6 space-y-4 sm:space-y-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-200 bg-surface p-4 sm:p-5"
          >
            <Skeleton className="h-4 w-3/4" />
            <div className="mt-3 space-y-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton
                  key={j}
                  className="flex h-10 w-full items-center rounded-lg border border-gray-200 px-3 sm:px-4"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}