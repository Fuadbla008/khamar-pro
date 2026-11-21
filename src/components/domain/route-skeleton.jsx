import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "cn";

function SkeletonRows({ count, className }) {
  return Array.from({ length: count }, (_, index) => (
    <Skeleton key={index} className={cn("h-14 rounded-card", className)} />
  ));
}

/**
 * Shared instant-loading UI for App Router route segments.
 * All visible copy is Bengali; decorative blocks are aria-hidden skeletons.
 */
export function RouteSkeleton({
  title = "খামার",
  description = "তথ্য লোড হচ্ছে…",
  variant = "list",
  rows = 5,
  className,
}) {
  return (
    <main
      role="status"
      aria-live="polite"
      aria-label="তথ্য লোড হচ্ছে"
      className={cn(
        "mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-10",
        className
      )}
    >
      <div aria-hidden className="space-y-2">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-input" />
          <h1 className="animate-pulse text-2xl font-bold tracking-tight text-muted-foreground">
            {title}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {variant === "dashboard" ? (
        <div aria-hidden className="space-y-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: Math.min(rows, 4) }, (_, index) => (
              <Skeleton key={index} className="h-24 rounded-card" />
            ))}
          </div>
          <Skeleton className="h-52 rounded-card" />
          <Skeleton className="h-64 rounded-card" />
        </div>
      ) : null}

      {variant === "list" ? (
        <div aria-hidden className="space-y-3">
          <Skeleton className="h-11 rounded-input" />
          <SkeletonRows count={rows} />
        </div>
      ) : null}

      {variant === "settings" ? (
        <div aria-hidden className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: Math.min(rows, 5) }, (_, index) => (
              <Skeleton key={index} className="h-10 w-28 rounded-pill" />
            ))}
          </div>
          <Skeleton className="h-80 rounded-card" />
        </div>
      ) : null}

      {variant === "charts" ? (
        <div aria-hidden className="space-y-3">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Skeleton className="h-56 rounded-card" />
            <Skeleton className="h-56 rounded-card" />
          </div>
          <Skeleton className="h-64 rounded-card" />
        </div>
      ) : null}

      {variant === "detail" ? (
        <div aria-hidden className="space-y-3">
          <Skeleton className="h-40 rounded-card" />
          <SkeletonRows count={Math.min(rows, 3)} />
        </div>
      ) : null}
    </main>
  );
}
