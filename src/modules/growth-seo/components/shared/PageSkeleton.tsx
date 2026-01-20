import { Skeleton } from '@/components/ui/skeleton';

interface PageSkeletonProps {
  variant?: 'list' | 'detail' | 'comparison';
}

export function PageSkeleton({ variant = 'detail' }: PageSkeletonProps) {
  if (variant === 'list') {
    return (
      <div className="container py-8">
        <Skeleton className="h-10 w-64 mb-4" />
        <Skeleton className="h-6 w-96 mb-8" />
        
        <div className="flex gap-4 mb-8">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-40" />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'comparison') {
    return (
      <div className="container py-8">
        <Skeleton className="h-8 w-32 mb-4" />
        <Skeleton className="h-12 w-3/4 mb-4" />
        <Skeleton className="h-6 w-1/2 mb-8" />
        
        <Skeleton className="h-64 w-full rounded-lg mb-8" />
        
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    );
  }

  // Detail variant (default)
  return (
    <div className="container py-8">
      <Skeleton className="h-6 w-48 mb-6" />
      
      <div className="grid lg:grid-cols-[1fr_300px] gap-8">
        <div>
          <Skeleton className="h-12 w-3/4 mb-4" />
          <Skeleton className="h-24 w-full rounded-lg mb-8" />
          
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-8 w-48 mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-5/6 mb-2" />
                <Skeleton className="h-4 w-4/6" />
              </div>
            ))}
          </div>
        </div>
        
        <div className="space-y-6">
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
