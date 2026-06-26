import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useProductivityHub, UnifiedItem } from "@/hooks/useProductivityHub";
import { useContextAlerts } from "@/hooks/useContextAlerts";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import {
  DocumentListLayout,
  DocumentListToolbar,
} from "@/components/documents/listing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Bell,
  Check,
  Eye,
  Clock,
  ShieldAlert,
  Info,
  CheckSquare,
  MessageCircle,
  TrendingDown,
  CheckCircle2,
  User,
  Building2,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import { pt } from "date-fns/locale";

type CategoryFilter = "all" | "alert" | "notification" | "task" | "followup" | "deal";
type SortKey = "created_at" | "severity";

const CATEGORY_CONFIG: Record<
  string,
  { icon: typeof Bell; label: string; color: string; bg: string }
> = {
  alert: { icon: ShieldAlert, label: "Alertas", color: "text-orange-500", bg: "bg-orange-500/10" },
  notification: { icon: Bell, label: "Notificações", color: "text-blue-500", bg: "bg-blue-500/10" },
  task: { icon: CheckSquare, label: "Tarefas", color: "text-emerald-500", bg: "bg-emerald-500/10" },
  followup: { icon: MessageCircle, label: "Follow-ups", color: "text-purple-500", bg: "bg-purple-500/10" },
  deal: { icon: TrendingDown, label: "Deals Parados", color: "text-red-500", bg: "bg-red-500/10" },
};

const SEVERITY_BADGE: Record<string, { label: string; className: string }> = {
  critical: { label: "Crítico", className: "bg-destructive/10 text-destructive border-destructive/20" },
  warning: { label: "Atenção", className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  info: { label: "Info", className: "bg-muted text-muted-foreground border-border" },
  success: { label: "Concluído", className: "bg-green-500/10 text-green-600 border-green-500/20" },
};

const SEVERITY_ORDER: Record<string, number> = { critical: 0, warning: 1, info: 2, success: 3 };

function FilterChip({
  active,
  onClick,
  icon: Icon,
  label,
  count,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  icon?: typeof Bell;
  label: string;
  count: number;
  tone?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-card text-foreground hover:border-primary/40",
      )}
    >
      {Icon && <Icon className={cn("h-3.5 w-3.5", !active && tone)} />}
      <span className="font-medium">{label}</span>
      <span
        className={cn(
          "rounded-full px-1.5 text-xs font-semibold",
          active ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function AlertRow({
  item,
  onAction,
  navigate,
}: {
  item: UnifiedItem;
  onAction: (item: UnifiedItem, action: string) => void;
  navigate: (url: string) => void;
}) {
  const catCfg = CATEGORY_CONFIG[item.category];
  const CatIcon = catCfg?.icon ?? Info;
  const sev = SEVERITY_BADGE[item.severity] ?? SEVERITY_BADGE.info;
  const isOverdueTask = item.category === "task" && item.due_at && new Date(item.due_at) < new Date();

  return (
    <div
      role="button"
      onClick={() => item.actionUrl && navigate(item.actionUrl)}
      className={cn(
        "group flex cursor-pointer items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 shadow-sm transition-colors hover:border-primary/40 hover:shadow-md",
        item.severity === "critical" && "border-destructive/30",
      )}
    >
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", catCfg?.bg)}>
        <CatIcon className={cn("h-4 w-4", catCfg?.color)} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-foreground">{item.title}</span>
          <Badge variant="outline" className={cn("h-5 shrink-0 text-[10px] font-medium", sev.className)}>
            {sev.label}
          </Badge>
        </div>
        {item.message && (
          <span className="line-clamp-1 text-xs text-muted-foreground">{item.message}</span>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground/70">{catCfg?.label}</span>
          <span>·</span>
          <span>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: pt })}</span>
          {item.related_name && (
            <>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                {item.related_type === "company" ? <Building2 className="h-3 w-3" /> : <User className="h-3 w-3" />}
                {item.related_name}
              </span>
            </>
          )}
          {item.assigned_name && (
            <>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <User className="h-3 w-3" />
                {item.assigned_name}
              </span>
            </>
          )}
          {item.due_at && (
            <>
              <span>·</span>
              <span className={cn("inline-flex items-center gap-1", isOverdueTask && "font-medium text-destructive")}>
                <Calendar className="h-3 w-3" />
                {isOverdueTask ? "Atrasada: " : "Prazo: "}
                {format(new Date(item.due_at), "dd/MM HH:mm")}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 opacity-60 transition-opacity group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
        {item.status === "unread" && (
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onAction(item, "read")} title="Marcar como lido">
            <Eye className="h-3.5 w-3.5" />
          </Button>
        )}
        {item.source_table === "context_alerts" && item.status !== "resolved" && (
          <>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onAction(item, "snooze")} title="Adiar 24h">
              <Clock className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onAction(item, "resolve")} title="Resolver">
              <Check className="h-3.5 w-3.5 text-green-600" />
            </Button>
          </>
        )}
        {item.actionUrl && (
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => navigate(item.actionUrl!)} title="Abrir">
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default function AlertsPage() {
  const { data: items, isLoading } = useProductivityHub();
  const { markRead, resolve, snooze } = useContextAlerts();
  const { markAsRead, markAllAsRead } = useAdminNotifications();
  const navigate = useNavigate();

  const [category, setCategory] = useState<CategoryFilter>("all");
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const all = items ?? [];

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: all.length };
    all.forEach((i) => {
      c[i.category] = (c[i.category] || 0) + 1;
    });
    return c;
  }, [all]);

  const filtered = useMemo(() => {
    let arr = category === "all" ? all : all.filter((i) => i.category === category);
    const q = search.trim().toLowerCase();
    if (q) {
      arr = arr.filter((i) =>
        [i.title, i.message, i.related_name, i.assigned_name]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q)),
      );
    }
    arr = [...arr].sort((a, b) => {
      let cmp = 0;
      if (sortBy === "created_at") {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortBy === "severity") {
        cmp = (SEVERITY_ORDER[a.severity] ?? 99) - (SEVERITY_ORDER[b.severity] ?? 99);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [all, category, search, sortBy, sortDir]);

  const totalCount = filtered.length;
  const pageItems = filtered.slice(page * pageSize, page * pageSize + pageSize);
  const criticalCount = all.filter((i) => i.severity === "critical").length;

  const handleAction = (item: UnifiedItem, action: string) => {
    if (item.source_table === "context_alerts") {
      if (action === "read") markRead.mutate(item.id);
      if (action === "resolve") resolve.mutate(item.id);
      if (action === "snooze") snooze.mutate({ alertId: item.id, hours: 24 });
    }
    if (item.source_table === "admin_notifications" && action === "read") {
      markAsRead.mutate(item.id);
    }
  };

  const categoryChips = (
    <>
      <FilterChip
        active={category === "all"}
        onClick={() => {
          setCategory("all");
          setPage(0);
        }}
        label="Todos"
        count={counts.all ?? 0}
      />
      {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
        <FilterChip
          key={key}
          active={category === key}
          onClick={() => {
            setCategory(key as CategoryFilter);
            setPage(0);
          }}
          icon={cfg.icon}
          label={cfg.label}
          count={counts[key] ?? 0}
          tone={cfg.color}
        />
      ))}
    </>
  );

  return (
    <DashboardLayout>
      <DocumentListLayout
        title="Alertas"
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(0);
        }}
        searchPlaceholder="Pesquisar por título, contacto ou mensagem"
        primaryAction={
          <Button
            onClick={() => markAllAsRead.mutate()}
            variant="outline"
            className="h-12 rounded-full px-5 text-sm font-semibold"
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Marcar tudo lido
          </Button>
        }
        secondaryAction={
          criticalCount > 0 ? (
            <Badge variant="destructive" className="h-8 gap-1 rounded-full px-3 text-xs">
              <ShieldAlert className="h-3 w-3" />
              {criticalCount} crítico{criticalCount > 1 ? "s" : ""}
            </Badge>
          ) : undefined
        }
        chips={categoryChips}
        toolbar={
          <DocumentListToolbar
            sortOptions={[
              { value: "created_at", label: "Data" },
              { value: "severity", label: "Severidade" },
            ]}
            sortValue={sortBy}
            onSortChange={(v) => setSortBy(v as SortKey)}
            sortDirection={sortDir}
            onToggleSortDirection={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            pageSize={pageSize}
            pageSizeOptions={[10, 25, 50, 100]}
            onPageSizeChange={(v) => {
              setPageSize(v);
              setPage(0);
            }}
            totalCount={totalCount}
            countLabel="itens"
          />
        }
      >
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : pageItems.length === 0 ? (
          <div className="space-y-3 py-16 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-green-500/40" />
            <p className="text-lg font-semibold text-muted-foreground">Tudo em ordem!</p>
            <p className="text-sm text-muted-foreground/70">
              {category === "all"
                ? "Sem itens pendentes."
                : `Sem ${CATEGORY_CONFIG[category]?.label?.toLowerCase() ?? "itens"} pendentes.`}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {pageItems.map((item) => (
              <AlertRow
                key={`${item.source_table}-${item.id}`}
                item={item}
                onAction={handleAction}
                navigate={navigate}
              />
            ))}
          </div>
        )}

        {totalCount > pageSize && (
          <div className="mt-4 flex items-center justify-end gap-2 text-sm">
            <Button
              variant="ghost"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Anterior
            </Button>
            <span className="text-muted-foreground">
              Página {page + 1} de {Math.max(1, Math.ceil(totalCount / pageSize))}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={(page + 1) * pageSize >= totalCount}
              onClick={() => setPage((p) => p + 1)}
            >
              Seguinte
            </Button>
          </div>
        )}
      </DocumentListLayout>
    </DashboardLayout>
  );
}
