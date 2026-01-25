import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface NexusTableSkeletonProps {
  rows?: number;
  cols?: number;
  showHeader?: boolean;
  className?: string;
}

export function NexusTableSkeleton({
  rows = 5,
  cols = 5,
  showHeader = true,
  className,
}: NexusTableSkeletonProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {showHeader && (
        <div className="flex items-center gap-4 pb-3 border-b border-border/50">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
      )}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4 py-2">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <Skeleton 
              key={colIndex} 
              className={cn(
                "h-4 flex-1",
                colIndex === 0 && "w-8 flex-none"
              )} 
            />
          ))}
        </div>
      ))}
    </div>
  );
}

interface NexusCardSkeletonProps {
  showIcon?: boolean;
  showChart?: boolean;
  className?: string;
}

export function NexusCardSkeleton({
  showIcon = true,
  showChart = true,
  className,
}: NexusCardSkeletonProps) {
  return (
    <div className={cn(
      "p-5 rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm space-y-4",
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          {showIcon && <Skeleton className="h-10 w-10 rounded-xl" />}
          <Skeleton className="h-4 w-24" />
        </div>
        {showChart && <Skeleton className="h-12 w-24 rounded" />}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}

interface NexusListSkeletonProps {
  items?: number;
  showAvatar?: boolean;
  showBadge?: boolean;
  className?: string;
}

export function NexusListSkeleton({
  items = 5,
  showAvatar = true,
  showBadge = false,
  className,
}: NexusListSkeletonProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2.5">
          {showAvatar && <Skeleton className="h-9 w-9 rounded-full" />}
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3 w-40" />
          </div>
          {showBadge && <Skeleton className="h-5 w-12 rounded-full" />}
        </div>
      ))}
    </div>
  );
}
