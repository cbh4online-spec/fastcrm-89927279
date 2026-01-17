import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

// ============================================
// LOADING STATE - Semantic Loading Indicators
// ============================================

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

const spinnerSizes = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

export function LoadingSpinner({ size = "md", className, label }: LoadingSpinnerProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Loader2 className={cn("animate-spin text-primary", spinnerSizes[size])} />
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
    </div>
  );
}

// Full Page Loading
interface PageLoadingProps {
  message?: string;
}

export function PageLoading({ message = "A carregar..." }: PageLoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
      <LoadingSpinner size="lg" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}

// Card Skeleton
interface CardSkeletonProps {
  showAvatar?: boolean;
  showBadge?: boolean;
  lines?: number;
  className?: string;
}

export function CardSkeleton({ showAvatar = true, showBadge = true, lines = 2, className }: CardSkeletonProps) {
  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-start gap-4">
        {showAvatar && <Skeleton className="h-10 w-10 rounded-full" />}
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-[60%]" />
          <Skeleton className="h-3 w-[40%]" />
        </div>
        {showBadge && <Skeleton className="h-5 w-16 rounded-full" />}
      </CardHeader>
      <CardContent className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

// Table Row Skeleton
interface TableRowSkeletonProps {
  columns: number;
  className?: string;
}

export function TableRowSkeleton({ columns, className }: TableRowSkeletonProps) {
  return (
    <tr className={cn("border-b", className)}>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

// Table Skeleton
interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  className?: string;
}

export function TableSkeleton({ rows = 5, columns = 4, showHeader = true, className }: TableSkeletonProps) {
  return (
    <div className={cn("rounded-md border", className)}>
      <table className="w-full">
        {showHeader && (
          <thead className="bg-muted/50">
            <tr>
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="px-4 py-3 text-left">
                  <Skeleton className="h-4 w-20" />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRowSkeleton key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// KPI Card Skeleton
export function KPICardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-2" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  );
}

// KPI Grid Skeleton
interface KPIGridSkeletonProps {
  count?: number;
  className?: string;
}

export function KPIGridSkeleton({ count = 4, className }: KPIGridSkeletonProps) {
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <KPICardSkeleton key={i} />
      ))}
    </div>
  );
}

// List Skeleton
interface ListSkeletonProps {
  count?: number;
  showAvatar?: boolean;
  className?: string;
}

export function ListSkeleton({ count = 5, showAvatar = true, className }: ListSkeletonProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
          {showAvatar && <Skeleton className="h-10 w-10 rounded-full" />}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-[50%]" />
            <Skeleton className="h-3 w-[30%]" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Kanban Column Skeleton
export function KanbanColumnSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("w-80 flex-shrink-0", className)}>
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-8 rounded-full" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <CardSkeleton key={i} showAvatar={false} lines={1} />
        ))}
      </div>
    </div>
  );
}

// Export all for convenience
export const LoadingStates = {
  Spinner: LoadingSpinner,
  Page: PageLoading,
  Card: CardSkeleton,
  Table: TableSkeleton,
  TableRow: TableRowSkeleton,
  KPICard: KPICardSkeleton,
  KPIGrid: KPIGridSkeleton,
  List: ListSkeleton,
  KanbanColumn: KanbanColumnSkeleton,
};
