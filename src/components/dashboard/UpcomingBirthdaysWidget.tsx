import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Cake, User, Building2, Target } from "lucide-react";
import { useUpcomingBirthdays } from "@/hooks/useUpcomingBirthdays";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

const ENTITY_CONFIG = {
  contact: { label: "Contacto", icon: User, route: "/dashboard/contacts" },
  lead: { label: "Lead", icon: Target, route: "/dashboard/leads" },
  company: { label: "Empresa", icon: Building2, route: "/dashboard/companies" },
} as const;

export function UpcomingBirthdaysWidget() {
  const { data: birthdays, isLoading } = useUpcomingBirthdays(30);
  const navigate = useNavigate();

  const initials = (name: string) =>
    name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Cake className="h-4 w-4 text-primary" />
          Próximos Aniversários
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 pt-0">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))
        ) : !birthdays?.length ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            Sem aniversários nos próximos 30 dias
          </p>
        ) : (
          birthdays.slice(0, 6).map((b) => {
            const cfg = ENTITY_CONFIG[b.entityType];
            const isToday = b.daysUntil === 0;
            return (
              <button
                key={`${b.entityType}-${b.entityId}`}
                onClick={() => navigate(`${cfg.route}/${b.entityId}`)}
                className="flex items-center gap-3 w-full py-2 px-1 rounded-md hover:bg-accent transition-colors text-left"
              >
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-primary">{initials(b.name)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{b.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(b.birthDate), "d MMM", { locale: pt })}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {cfg.label}
                  </Badge>
                  {isToday ? (
                    <Badge className="text-[10px] px-1.5 py-0 bg-green-500/15 text-green-700 border-green-200 hover:bg-green-500/15">
                      🎂 Hoje
                    </Badge>
                  ) : (
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {b.daysUntil}d
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
