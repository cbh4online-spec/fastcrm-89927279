import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useProductivityHub, UnifiedItem } from '@/hooks/useProductivityHub';
import { useContextAlerts } from '@/hooks/useContextAlerts';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Loader2, Bell, Check, Eye, Clock, ShieldAlert, Info,
  CheckSquare, MessageCircle, TrendingDown, ExternalLink,
  CheckCircle2, Inbox, LayoutList, Columns3, User, Building2,
  Pencil, Calendar, ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

type CategoryFilter = 'all' | 'alert' | 'notification' | 'task' | 'followup' | 'deal';
type ViewMode = 'list' | 'kanban';

const CATEGORY_CONFIG: Record<string, { icon: typeof Bell; label: string; color: string; bg: string }> = {
  alert: { icon: ShieldAlert, label: 'Alertas', color: 'text-orange-500', bg: 'bg-orange-500/10' },
  notification: { icon: Bell, label: 'Notificações', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  task: { icon: CheckSquare, label: 'Tarefas', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  followup: { icon: MessageCircle, label: 'Follow-ups', color: 'text-purple-500', bg: 'bg-purple-500/10' },
  deal: { icon: TrendingDown, label: 'Deals Parados', color: 'text-red-500', bg: 'bg-red-500/10' },
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'border-destructive/40 bg-destructive/5',
  warning: 'border-yellow-500/30 bg-yellow-500/5',
  info: 'border-border/50 bg-card/50',
  success: 'border-green-500/30 bg-green-500/5',
};

const SEVERITY_BADGE: Record<string, string> = {
  critical: 'bg-destructive/10 text-destructive border-destructive/20',
  warning: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  info: 'bg-muted text-muted-foreground border-border',
  success: 'bg-green-500/10 text-green-600 border-green-500/20',
};

const KANBAN_COLUMNS: { key: string; label: string; color: string }[] = [
  { key: 'critical', label: 'Crítico', color: 'border-t-destructive' },
  { key: 'warning', label: 'Atenção', color: 'border-t-yellow-500' },
  { key: 'info', label: 'Informativo', color: 'border-t-blue-500' },
  { key: 'success', label: 'Concluído', color: 'border-t-green-500' },
];

function ItemCard({ item, onAction, navigate }: { item: UnifiedItem; onAction: (item: UnifiedItem, action: string) => void; navigate: (url: string) => void }) {
  const catCfg = CATEGORY_CONFIG[item.category];
  const CatIcon = catCfg?.icon ?? Info;
  const isOverdueTask = item.category === 'task' && item.due_at && new Date(item.due_at) < new Date();

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-all hover:shadow-sm group",
        SEVERITY_COLORS[item.severity]
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-lg shrink-0 mt-0.5", catCfg?.bg)}>
          <CatIcon className={cn("h-4 w-4", catCfg?.color)} />
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <p
              className={cn(
                "text-sm font-medium leading-snug",
                item.actionUrl && "cursor-pointer hover:underline"
              )}
              onClick={() => item.actionUrl && navigate(item.actionUrl)}
            >
              {item.title}
            </p>
            <Badge
              variant="outline"
              className={cn("text-[9px] px-1.5 shrink-0", SEVERITY_BADGE[item.severity])}
            >
              {item.severity === 'critical' ? 'Crítico' : item.severity === 'warning' ? 'Atenção' : 'Info'}
            </Badge>
          </div>

          {item.message && (
            <p className="text-xs text-muted-foreground line-clamp-2">{item.message}</p>
          )}

          {/* Rich metadata for tasks */}
          {item.category === 'task' && (
            <div className="flex items-center gap-3 flex-wrap">
              {item.related_name && (
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/60 rounded-md px-1.5 py-0.5">
                  {item.related_type === 'company' ? <Building2 className="h-3 w-3" /> : <User className="h-3 w-3" />}
                  {item.related_name}
                </span>
              )}
              {item.assigned_name && (
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/60 rounded-md px-1.5 py-0.5">
                  <User className="h-3 w-3" />
                  {item.assigned_name}
                </span>
              )}
              {item.priority && (
                <Badge variant="outline" className={cn("text-[9px] px-1.5",
                  item.priority === 'high' ? 'border-destructive/30 text-destructive' :
                  item.priority === 'medium' ? 'border-yellow-500/30 text-yellow-600' :
                  'border-border text-muted-foreground'
                )}>
                  {item.priority === 'high' ? 'Alta' : item.priority === 'medium' ? 'Média' : 'Baixa'}
                </Badge>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
            <Badge variant="outline" className="text-[9px] px-1.5 font-normal">
              {catCfg?.label}
            </Badge>
            <span>
              {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: pt })}
            </span>
            {item.due_at && (
              <span className={cn("inline-flex items-center gap-0.5", isOverdueTask && 'text-destructive font-medium')}>
                <Calendar className="h-3 w-3" />
                {isOverdueTask ? 'Atrasada: ' : 'Prazo: '}
                {format(new Date(item.due_at), 'dd/MM HH:mm')}
              </span>
            )}
          </div>
        </div>

        {/* Actions — always visible on mobile, hover on desktop */}
        <div className="flex items-center gap-1 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          {item.actionUrl && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => navigate(item.actionUrl!)}
              title="Abrir"
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
          {item.category === 'task' && item.actionUrl && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => navigate(item.actionUrl!)}
              title="Editar"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {item.status === 'unread' && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => onAction(item, 'read')}
              title="Marcar como lido"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
          )}
          {item.source_table === 'context_alerts' && item.status !== 'resolved' && (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => onAction(item, 'snooze')}
                title="Adiar 24h"
              >
                <Clock className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => onAction(item, 'resolve')}
                title="Resolver"
              >
                <Check className="h-3.5 w-3.5 text-green-500" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function KanbanView({ items, onAction, navigate }: { items: UnifiedItem[]; onAction: (item: UnifiedItem, action: string) => void; navigate: (url: string) => void }) {
  const columns = useMemo(() => {
    return KANBAN_COLUMNS.map(col => ({
      ...col,
      items: items.filter(i => i.severity === col.key),
    }));
  }, [items]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {columns.map(col => (
        <div key={col.key} className={cn("rounded-xl border-t-4 bg-card/50 border border-border/50", col.color)}>
          <div className="p-3 border-b border-border/30">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{col.label}</h3>
              <Badge variant="secondary" className="text-xs">{col.items.length}</Badge>
            </div>
          </div>
          <ScrollArea className="h-[calc(100vh-380px)]">
            <div className="p-2 space-y-2">
              {col.items.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">Sem itens</p>
              ) : (
                col.items.map(item => (
                  <ItemCard key={`${item.source_table}-${item.id}`} item={item} onAction={onAction} navigate={navigate} />
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      ))}
    </div>
  );
}

export default function AlertsPage() {
  const { data: items, isLoading } = useProductivityHub();
  const { markRead, resolve, snooze } = useContextAlerts();
  const { markAsRead, markAllAsRead } = useAdminNotifications();
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [view, setView] = useState<ViewMode>('list');
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    if (!items) return [];
    if (category === 'all') return items;
    return items.filter(i => i.category === category);
  }, [items, category]);

  const counts = useMemo(() => {
    if (!items) return {} as Record<string, number>;
    const c: Record<string, number> = { all: items.length };
    items.forEach(i => { c[i.category] = (c[i.category] || 0) + 1; });
    return c;
  }, [items]);

  const criticalCount = items?.filter(i => i.severity === 'critical').length ?? 0;

  const handleAction = (item: UnifiedItem, action: string) => {
    if (action === 'navigate' && item.actionUrl) {
      navigate(item.actionUrl);
      return;
    }
    if (item.source_table === 'context_alerts') {
      if (action === 'read') markRead.mutate(item.id);
      if (action === 'resolve') resolve.mutate(item.id);
      if (action === 'snooze') snooze.mutate({ alertId: item.id, hours: 24 });
    }
    if (item.source_table === 'admin_notifications' && action === 'read') {
      markAsRead.mutate(item.id);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] mx-auto space-y-5 p-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10">
                <Inbox className="h-6 w-6 text-primary" />
              </div>
              Centro de Ação
            </h1>
            <p className="text-sm text-muted-foreground">
              Tudo o que precisa de atenção num só lugar
            </p>
          </div>
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <Badge variant="destructive" className="gap-1 text-xs">
                <ShieldAlert className="h-3 w-3" />
                {criticalCount} crítico{criticalCount > 1 ? 's' : ''}
              </Badge>
            )}
            {/* View toggle */}
            <div className="flex items-center border rounded-lg p-0.5 bg-muted/30">
              <Button
                size="icon"
                variant={view === 'list' ? 'default' : 'ghost'}
                className="h-7 w-7"
                onClick={() => setView('list')}
                title="Lista"
              >
                <LayoutList className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant={view === 'kanban' ? 'default' : 'ghost'}
                className="h-7 w-7"
                onClick={() => setView('kanban')}
                title="Kanban"
              >
                <Columns3 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => markAllAsRead.mutate()}
              className="text-xs"
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Marcar tudo lido
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => {
            const count = counts[key] || 0;
            const Icon = cfg.icon;
            return (
              <Card
                key={key}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md border",
                  category === key ? 'ring-2 ring-primary/50 border-primary/30' : 'border-border/50'
                )}
                onClick={() => setCategory(category === key ? 'all' : key as CategoryFilter)}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg shrink-0", cfg.bg)}>
                    <Icon className={cn("h-4 w-4", cfg.color)} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-bold leading-none">{count}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{cfg.label}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <CheckCircle2 className="h-16 w-16 text-green-500/30 mx-auto" />
            <p className="font-semibold text-lg text-muted-foreground">Tudo em ordem!</p>
            <p className="text-sm text-muted-foreground/70">
              {category === 'all' ? 'Sem itens pendentes.' : `Sem ${CATEGORY_CONFIG[category]?.label?.toLowerCase() ?? 'itens'} pendentes.`}
            </p>
          </div>
        ) : view === 'kanban' ? (
          <KanbanView items={filtered} onAction={handleAction} navigate={navigate} />
        ) : (
          <ScrollArea className="h-[calc(100vh-340px)]">
            <div className="space-y-2 pr-3">
              {filtered.map(item => (
                <ItemCard
                  key={`${item.source_table}-${item.id}`}
                  item={item}
                  onAction={handleAction}
                  navigate={navigate}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </DashboardLayout>
  );
}
