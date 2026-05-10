import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MessageSquare,
  Inbox as InboxIcon,
  AlertTriangle,
  Clock,
  Search,
  ExternalLink,
  UserCircle2,
  Loader2,
  Settings2,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  useWhatsAppInbox,
  useWhatsAppInboxKpis,
  useWhatsAppSlaSettings,
  classifySla,
  type WhatsAppInboxFilters,
} from "@/hooks/useWhatsAppInbox";
import { AssignConversationButton } from "@/components/team-inbox/AssignConversationButton";
import { WhatsAppSlaSettingsCard } from "@/components/whatsapp-pro/WhatsAppSlaSettingsCard";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

function formatMinutes(min: number) {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h${m}m` : `${h}h`;
}

function SlaBadge({ state, minutes }: { state: string; minutes: number }) {
  if (state === "na") return <span className="text-xs text-muted-foreground">—</span>;
  if (state === "breached")
    return (
      <Badge variant="destructive" className="text-[10px] gap-1">
        <AlertTriangle className="h-3 w-3" /> {formatMinutes(minutes)}
      </Badge>
    );
  if (state === "warning")
    return (
      <Badge className="text-[10px] gap-1 bg-amber-500 hover:bg-amber-500">
        <Clock className="h-3 w-3" /> {formatMinutes(minutes)}
      </Badge>
    );
  return (
    <Badge className="text-[10px] gap-1 bg-emerald-500 hover:bg-emerald-500">
      <Clock className="h-3 w-3" /> {formatMinutes(minutes)}
    </Badge>
  );
}

export default function WhatsAppInboxPage() {
  const [filters, setFilters] = useState<WhatsAppInboxFilters>({
    status: "open",
    assigned: "any",
    slaState: "all",
    search: "",
  });
  const [showSettings, setShowSettings] = useState(false);

  const { data: convs, isLoading } = useWhatsAppInbox(filters);
  const { data: settings } = useWhatsAppSlaSettings();
  const kpis = useWhatsAppInboxKpis();

  const filtered = useMemo(() => {
    if (!convs) return [];
    if (filters.slaState === "all") return convs;
    return convs.filter((c) => classifySla(c, settings).state === filters.slaState);
  }, [convs, filters.slaState, settings]);

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-[1400px]">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <InboxIcon className="h-6 w-6 text-primary" />
              Inbox WhatsApp Pro
            </h1>
            <p className="text-sm text-muted-foreground">
              Triagem unificada com SLA e atribuição a operadores.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={showSettings ? "default" : "outline"}
              size="sm"
              onClick={() => setShowSettings((s) => !s)}
              className="gap-1.5"
            >
              <Settings2 className="h-3.5 w-3.5" />
              SLA & Auto-Assign
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link to="/dashboard/inbox?channel=whatsapp">
                <MessageSquare className="h-3.5 w-3.5" />
                Abrir Inbox completa
              </Link>
            </Button>
          </div>
        </div>

        {showSettings && <WhatsAppSlaSettingsCard />}

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Abertas", value: kpis.total, icon: InboxIcon, color: "text-primary" },
            { label: "Não atribuídas", value: kpis.unassigned, icon: UserCircle2, color: "text-amber-500" },
            { label: "Não lidas", value: kpis.unread, icon: MessageSquare, color: "text-blue-500" },
            { label: "SLA em risco", value: kpis.warning, icon: Clock, color: "text-amber-500" },
            { label: "SLA quebrado", value: kpis.breached, icon: AlertTriangle, color: "text-destructive" },
          ].map((k) => (
            <Card key={k.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <k.icon className={`h-3.5 w-3.5 ${k.color}`} />
                  {k.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{k.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex flex-col md:flex-row gap-3 md:items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Procurar por nome, telefone ou mensagem…"
                  className="pl-9"
                  value={filters.search || ""}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                />
              </div>
              <Select
                value={filters.assigned}
                onValueChange={(v: any) => setFilters((f) => ({ ...f, assigned: v }))}
              >
                <SelectTrigger className="w-full md:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Todas atribuições</SelectItem>
                  <SelectItem value="unassigned">Não atribuídas</SelectItem>
                </SelectContent>
              </Select>
              <Tabs
                value={filters.status as string}
                onValueChange={(v) => setFilters((f) => ({ ...f, status: v as any }))}
              >
                <TabsList>
                  <TabsTrigger value="open">Abertas</TabsTrigger>
                  <TabsTrigger value="pending">Pendentes</TabsTrigger>
                  <TabsTrigger value="closed">Fechadas</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <Tabs
              value={filters.slaState as string}
              onValueChange={(v) => setFilters((f) => ({ ...f, slaState: v as any }))}
            >
              <TabsList>
                <TabsTrigger value="all">Todos os SLAs</TabsTrigger>
                <TabsTrigger value="ok">Dentro do SLA</TabsTrigger>
                <TabsTrigger value="warning">Em risco</TabsTrigger>
                <TabsTrigger value="breached">Quebrado</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-16 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                Sem conversas WhatsApp para os filtros selecionados.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contacto</TableHead>
                    <TableHead className="hidden md:table-cell">Última mensagem</TableHead>
                    <TableHead>Aguarda</TableHead>
                    <TableHead>SLA</TableHead>
                    <TableHead>Operador</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => {
                    const sla = classifySla(c, settings);
                    const name =
                      c.contact?.name ||
                      c.lead?.name ||
                      c.contact?.phone ||
                      c.lead?.phone ||
                      "Sem nome";
                    const phone = c.contact?.phone || c.lead?.phone || "";
                    const waitingLabel = c.last_message_at
                      ? formatDistanceToNow(new Date(c.last_message_at), {
                          addSuffix: false,
                          locale: pt,
                        })
                      : "—";
                    return (
                      <TableRow key={c.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm flex items-center gap-1.5">
                              {name}
                              {c.unread_count > 0 && (
                                <Badge className="text-[9px] h-4 px-1.5">{c.unread_count}</Badge>
                              )}
                            </span>
                            {phone && (
                              <span className="text-[11px] text-muted-foreground">{phone}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell max-w-[300px]">
                          <p className="text-xs text-muted-foreground truncate">
                            {c.last_message_preview || "—"}
                          </p>
                          {c.ai_intent && (
                            <Badge variant="outline" className="text-[9px] mt-1">
                              {c.ai_intent}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs">{waitingLabel}</span>
                        </TableCell>
                        <TableCell>
                          <SlaBadge state={sla.state} minutes={sla.minutesWaiting} />
                        </TableCell>
                        <TableCell>
                          {c.assignee ? (
                            <div className="flex items-center gap-1.5">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={c.assignee.avatar_url ?? undefined} />
                                <AvatarFallback className="text-[9px]">
                                  {(c.assignee.full_name || "?").slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs truncate max-w-[120px]">
                                {c.assignee.full_name || "Sem nome"}
                              </span>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">Não atribuída</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <AssignConversationButton
                              conversationId={c.id}
                              currentAssigneeId={c.assigned_to}
                              variant="icon"
                            />
                            <Button asChild variant="ghost" size="icon" className="h-8 w-8" title="Abrir">
                              <Link to={`/dashboard/inbox?c=${c.id}`}>
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
