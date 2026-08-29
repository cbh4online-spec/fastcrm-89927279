/**
 * Centro de comunicações — atividade de contacto 1:1 do workspace.
 * Apenas leitura: rascunhos/eventos, tentativas e supressões reais. Sem conteúdo fabricado.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Ban, History, Inbox, Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useOutreachActivityEvents, useOutreachWorkspaceAttempts, useOutreachWorkspaceSuppressions,
} from "../hooks/useOutreachActivity";
import type { OutreachEntityType } from "../types";

const EVENT_LABELS: Record<string, string> = {
  draft_created: "Rascunho criado",
  draft_updated: "Rascunho actualizado",
  reviewed: "Rascunho revisto",
  assisted_send: "Envio assistido",
  blocked: "Bloqueado",
  stopped: "Paragem registada",
};

const OUTCOME_LABELS: Record<string, string> = {
  blocked: "Bloqueado",
  simulated: "Simulado (não enviado)",
  sent: "Enviado",
  error: "Erro",
};

const SUPPRESSION_LABELS: Record<string, string> = {
  opt_out: "Opt-out",
  blocked: "Bloqueado",
  replied: "Respondeu",
  manual: "Paragem manual",
};

const ENTITY_PATH: Record<OutreachEntityType, string> = {
  company: "/dashboard/companies",
  contact: "/dashboard/contacts",
  lead: "/dashboard/leads",
};

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-dashed py-10 text-center">
      <Inbox className="h-6 w-6 text-muted-foreground" aria-hidden />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

export default function OutreachActivityCenterPage() {
  const navigate = useNavigate();
  const [entityType, setEntityType] = useState<OutreachEntityType | "all">("all");
  const [channel, setChannel] = useState<string>("all");
  const [eventType, setEventType] = useState<string>("all");

  const events = useOutreachActivityEvents({ entityType, channel, eventType });
  const attempts = useOutreachWorkspaceAttempts();
  const suppressions = useOutreachWorkspaceSuppressions();

  const open = (type: OutreachEntityType, id: string) => navigate(`${ENTITY_PATH[type]}/${id}`);

  return (
    <DashboardLayout>
      <div className="space-y-4 p-4 sm:p-6">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold">Centro de comunicações</h1>
          <p className="text-sm text-muted-foreground">
            Histórico do contacto 1:1 validado: rascunhos, tentativas preparadas, respostas e paragens.
          </p>
        </header>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filtros</CardTitle>
            <CardDescription>Filtre por tipo de registo e canal.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor="f-entity">Entidade</Label>
              <Select value={entityType} onValueChange={(v) => setEntityType(v as OutreachEntityType | "all")}>
                <SelectTrigger id="f-entity"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="company">Empresas</SelectItem>
                  <SelectItem value="contact">Contactos</SelectItem>
                  <SelectItem value="lead">Leads</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor="f-channel">Canal</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger id="f-channel"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="social">Redes sociais</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor="f-state">Estado</Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger id="f-state"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="draft_created">Rascunho criado</SelectItem>
                  <SelectItem value="reviewed">Revisto</SelectItem>
                  <SelectItem value="assisted_send">Envio assistido</SelectItem>
                  <SelectItem value="stopped">Paragem</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="events">
          <TabsList>
            <TabsTrigger value="events">Atividade</TabsTrigger>
            <TabsTrigger value="attempts">Tentativas</TabsTrigger>
            <TabsTrigger value="stops">Paragens</TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="pt-4">
            {events.isLoading ? (
              <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> A carregar…
              </p>
            ) : events.isError ? (
              <p className="text-sm text-destructive">Não foi possível carregar a atividade.</p>
            ) : (events.data ?? []).length === 0 ? (
              <EmptyState text="Sem atividade registada com estes filtros." />
            ) : (
              <div className="space-y-2">
                {(events.data ?? []).map((ev) => (
                  <div key={ev.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs">
                    <span className="flex items-center gap-2">
                      <History className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                      {EVENT_LABELS[ev.event_type] ?? ev.event_type}
                      {ev.channel ? <Badge variant="secondary">{ev.channel}</Badge> : null}
                      {ev.reason ? <span className="text-muted-foreground">· {ev.reason}</span> : null}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="text-muted-foreground">{new Date(ev.created_at).toLocaleString("pt-PT")}</span>
                      <Button size="sm" variant="ghost" onClick={() => open(ev.entity_type, ev.entity_id)}>
                        Abrir ficha
                      </Button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="attempts" className="pt-4">
            {attempts.isLoading ? (
              <p className="text-sm text-muted-foreground">A carregar…</p>
            ) : (attempts.data ?? []).length === 0 ? (
              <EmptyState text="Ainda não foram preparadas tentativas neste workspace." />
            ) : (
              <div className="space-y-2">
                {(attempts.data ?? []).map((a) => (
                  <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs">
                    <span className="flex items-center gap-2">
                      <Activity className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                      {OUTCOME_LABELS[a.outcome] ?? a.outcome}
                      {a.blocked_reason ? <span className="text-muted-foreground">· {a.blocked_reason}</span> : null}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="text-muted-foreground">{new Date(a.created_at).toLocaleString("pt-PT")}</span>
                      <Button size="sm" variant="ghost" onClick={() => open(a.entity_type, a.entity_id)}>
                        Abrir ficha
                      </Button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="stops" className="pt-4">
            {suppressions.isLoading ? (
              <p className="text-sm text-muted-foreground">A carregar…</p>
            ) : (suppressions.data ?? []).length === 0 ? (
              <EmptyState text="Sem paragens registadas — nenhum opt-out, bloqueio ou resposta." />
            ) : (
              <div className="space-y-2">
                {(suppressions.data ?? []).map((s) => (
                  <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs">
                    <span className="flex items-center gap-2">
                      <Ban className="h-3.5 w-3.5 text-destructive" aria-hidden />
                      {SUPPRESSION_LABELS[s.reason] ?? s.reason}
                      {s.channel ? <Badge variant="secondary">{s.channel}</Badge> : null}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="text-muted-foreground">{new Date(s.created_at).toLocaleString("pt-PT")}</span>
                      <Button size="sm" variant="ghost" onClick={() => open(s.entity_type, s.entity_id)}>
                        Abrir ficha
                      </Button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
