import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, getDay, isSameMonth } from "date-fns";
import { pt } from "date-fns/locale";
import { useBlogArticles } from "@/hooks/useBlogAdmin";
import type { SEOEntity, EntityStatus } from "@/modules/growth-seo/types";

const statusColors: Record<EntityStatus, string> = {
  draft: "bg-yellow-500",
  published: "bg-green-500",
  archived: "bg-muted-foreground",
};

const statusLabels: Record<EntityStatus, string> = {
  draft: "Rascunho",
  published: "Publicado",
  archived: "Arquivado",
};

interface BlogCalendarProps {
  onEdit: (article: SEOEntity) => void;
}

export default function BlogCalendar({ onEdit }: BlogCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Fetch all blog articles (no pagination for calendar)
  const { data, isLoading } = useBlogArticles({}, { page: 1, pageSize: 200 });
  const articles = data?.articles || [];

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad start of month to align to Monday
  const startDow = (getDay(monthStart) + 6) % 7; // Monday = 0
  const paddedDays = Array.from({ length: startDow }, (_, i) => {
    const d = new Date(monthStart);
    d.setDate(d.getDate() - (startDow - i));
    return d;
  }).concat(days);

  // Group articles by date
  const articlesByDate = useMemo(() => {
    const map = new Map<string, SEOEntity[]>();
    articles.forEach((a) => {
      const dateStr = a.published_at || a.created_at;
      if (!dateStr) return;
      const key = format(new Date(dateStr), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    });
    return map;
  }, [articles]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const weekDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  return (
    <div className="space-y-4">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={() => setCurrentMonth((m) => subMonths(m, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold text-foreground capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: pt })}
        </h3>
        <Button variant="outline" size="icon" onClick={() => setCurrentMonth((m) => addMonths(m, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-sm">
        {(["draft", "published", "archived"] as EntityStatus[]).map((s) => (
          <div key={s} className="flex items-center gap-1.5">
            <div className={`h-3 w-3 rounded-full ${statusColors[s]}`} />
            <span className="text-muted-foreground">{statusLabels[s]}</span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">
            {d}
          </div>
        ))}
        {paddedDays.map((day, idx) => {
          const key = format(day, "yyyy-MM-dd");
          const dayArticles = articlesByDate.get(key) || [];
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, new Date());

          return (
            <Card
              key={idx}
              className={`min-h-[80px] p-1.5 ${
                !isCurrentMonth ? "opacity-40" : ""
              } ${isToday ? "ring-2 ring-primary" : ""}`}
            >
              <div className="text-xs font-medium text-muted-foreground mb-1">
                {format(day, "d")}
              </div>
              <div className="space-y-0.5">
                {dayArticles.slice(0, 3).map((a) => (
                  <button
                    key={a.id}
                    onClick={() => onEdit(a)}
                    className="w-full text-left"
                  >
                    <div className="flex items-center gap-1 text-[10px] leading-tight">
                      <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${statusColors[a.status]}`} />
                      <span className="truncate text-foreground">{a.title}</span>
                    </div>
                  </button>
                ))}
                {dayArticles.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{dayArticles.length - 3} mais
                  </span>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
