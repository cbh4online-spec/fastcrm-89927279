import { Skeleton } from "@/components/ui/skeleton";

interface DashboardHeaderProps {
  greeting: string;
  dayStatus: string;
  isLoading: boolean;
}

export function DashboardHeader({ greeting, dayStatus, isLoading }: DashboardHeaderProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-72" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">{greeting}</h1>
      <p className="text-muted-foreground">{dayStatus}</p>
    </div>
  );
}
