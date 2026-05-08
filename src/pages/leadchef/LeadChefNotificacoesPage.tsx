import { useState, useEffect } from "react";
import { Loader2, Bell, BellRing, Snowflake, Clock, Save, History, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { LeadChefMobileShell } from "@/components/leadchef/LeadChefMobileShell";
import { LeadChefPushSettingsCard } from "@/components/leadchef/LeadChefPushSettingsCard";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  useLeadChefNotificationPrefs,
  useLeadChefPushHistory,
  type LeadChefNotificationPrefs,
} from "@/hooks/leadchef/useLeadChefNotifications";

export default function LeadChefNotificacoesPage() {
  return (
    <LeadChefMobileShell title="Notificações" subtitle="Lembretes, alertas e histórico." showFab={false}>
      <Content />
    </LeadChefMobileShell>
  );
}

function Content() {
  const { prefs, isLoading, save, isSaving } = useLeadChefNotificationPrefs();
  const history = useLeadChefPushHistory(30);
  const [draft, setDraft] = useState<LeadChefNotificationPrefs | null>(null);

  useEffect(() => {
    if (prefs && !draft) setDraft(prefs);
  }, [prefs, draft]);

  if (isLoading || !draft) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  const set = <K extends keyof LeadChefNotificationPrefs>(k: K, v: LeadChefNotificationPrefs[K]) =>
    setDraft({ ...draft, [k]: v });

  return (
    <>
      <LeadChefPushSettingsCard />

      <section className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <BellRing className="h-4 w-4 text-emerald-600" />
          <h2 className="text-sm font-semibold text-slate-900">Lembretes de próxima ação</h2>
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="rna" className="text-xs text-slate-700">Ativar lembretes</Label>
          <Switch id="rna" checked={draft.remind_next_actions}
            onCheckedChange={(v) => set("remind_next_actions", v)} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <Label className="text-xs text-slate-700 flex-1">Antecedência (minutos)</Label>
          <Input type="number" min={5} max={1440} className="w-24 h-8 text-xs"
            value={draft.remind_window_minutes}
            onChange={(e) => set("remind_window_minutes", Math.max(5, parseInt(e.target.value || "30", 10)))} />
        </div>
      </section>

      <section className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Snowflake className="h-4 w-4 text-sky-600" />
          <h2 className="text-sm font-semibold text-slate-900">Alertas de leads frios</h2>
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="acl" className="text-xs text-slate-700">Ativar alertas</Label>
          <Switch id="acl" checked={draft.alert_cold_leads}
            onCheckedChange={(v) => set("alert_cold_leads", v)} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <Label className="text-xs text-slate-700 flex-1">Sem interação há (dias)</Label>
          <Input type="number" min={1} max={90} className="w-24 h-8 text-xs"
            value={draft.cold_lead_inactive_days}
            onChange={(e) => set("cold_lead_inactive_days", Math.max(1, parseInt(e.target.value || "7", 10)))} />
        </div>
      </section>

      <section className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900">Horas silenciosas (UTC)</h2>
        </div>
        <p className="text-[11px] text-slate-500">Não enviar notificações entre estas horas. Deixa vazio para desativar.</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-slate-700">Início</Label>
            <Input type="number" min={0} max={23} className="h-8 text-xs"
              value={draft.quiet_hours_start ?? ""}
              onChange={(e) => set("quiet_hours_start", e.target.value === "" ? null : parseInt(e.target.value, 10))} />
          </div>
          <div>
            <Label className="text-xs text-slate-700">Fim</Label>
            <Input type="number" min={0} max={23} className="h-8 text-xs"
              value={draft.quiet_hours_end ?? ""}
              onChange={(e) => set("quiet_hours_end", e.target.value === "" ? null : parseInt(e.target.value, 10))} />
          </div>
        </div>
      </section>

      <Button onClick={() => save(draft)} disabled={isSaving} className="w-full bg-emerald-600 hover:bg-emerald-700">
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
        Guardar preferências
      </Button>

      <section className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <History className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900">Histórico recente</h2>
        </div>
        {history.isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-slate-400" /></div>
        ) : !history.data?.length ? (
          <p className="text-xs text-slate-500 py-4 text-center">Sem notificações enviadas ainda.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {history.data.map((n) => {
              const Icon = n.status === "sent" ? CheckCircle2 : n.status === "failed" ? XCircle : AlertCircle;
              const tone = n.status === "sent" ? "text-emerald-600" : n.status === "failed" ? "text-rose-600" : "text-amber-600";
              const date = new Date(n.scheduled_at).toLocaleString("pt-PT", {
                day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
              });
              return (
                <li key={n.id} className="py-2.5 flex gap-2.5">
                  <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${tone}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-slate-900 truncate">{n.title}</p>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{n.status}</Badge>
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-2">{n.body}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{date}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="rounded-2xl bg-emerald-50/60 border border-emerald-200 p-3">
        <div className="flex items-center gap-2 mb-1">
          <Bell className="h-3.5 w-3.5 text-emerald-700" />
          <p className="text-xs font-semibold text-emerald-900">Como funciona</p>
        </div>
        <p className="text-[11px] text-emerald-900/80 leading-relaxed">
          Um agendador corre a cada 5 min e cria avisos para próximas ações dentro da janela definida e para leads sem interação acima do limite. As notificações são entregues no telemóvel quando ativas neste dispositivo.
        </p>
      </div>
    </>
  );
}
