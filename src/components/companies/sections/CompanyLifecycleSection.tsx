import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CompanyLifecycleSectionProps {
  status: string | null;
  onStatusChange: (status: string) => void;
}

const STATUSES = [
  { value: "prospect", label: "Prospect", color: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  { value: "customer", label: "Cliente", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  { value: "partner", label: "Parceiro", color: "bg-purple-500/10 text-purple-600 border-purple-500/30" },
  { value: "inactive", label: "Inativo", color: "bg-slate-500/10 text-slate-600 border-slate-500/30" },
];

export function CompanyLifecycleSection({ status, onStatusChange }: CompanyLifecycleSectionProps) {
  const currentIdx = STATUSES.findIndex(s => s.value === status);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Ciclo de Vida</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          {STATUSES.map((s, i) => (
            <button
              key={s.value}
              onClick={() => onStatusChange(s.value)}
              className="flex-1"
            >
              <div className="flex flex-col items-center gap-1.5">
                <div className={cn(
                  "w-full h-1.5 rounded-full transition-colors",
                  i <= currentIdx ? "bg-primary" : "bg-muted"
                )} />
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs cursor-pointer transition-colors",
                    s.value === status ? s.color : "text-muted-foreground"
                  )}
                >
                  {s.label}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
