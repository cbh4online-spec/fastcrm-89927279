import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { Bot, Plus, Pencil, Trash2, CheckCircle2, AlertCircle, Loader2, Activity, Clock, MessageCircle, ArrowUpRight } from "lucide-react";
import {
  useWhatsAppBotRules,
  useWhatsAppBotRuleLogs,
  useUpsertWhatsAppBotRule,
  useDeleteWhatsAppBotRule,
  useToggleWhatsAppBotRule,
  type WhatsAppBotRule,
  type BotRuleInput,
} from "@/hooks/useWhatsAppBotRules";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

const DEFAULT: BotRuleInput = {
  name: "",
  description: null,
  is_active: true,
  priority: 100,
  match_type: "contains",
  case_sensitive: false,
  keywords: [],
  reply_text: "",
  reply_media_url: null,
  reply_media_mime_type: null,
  attach_product_id: null,
  send_once_per_conversation: false,
  cooldown_minutes: 0,
  handoff_to_human: false,
  handoff_assign_to_user_id: null,
  respect_working_hours: false,
  working_hours_start: "09:00",
  working_hours_end: "18:00",
  working_days: [1, 2, 3, 4, 5],
};

const DAYS = [
  { value: 1, label: "Seg" }, { value: 2, label: "Ter" }, { value: 3, label: "Qua" },
  { value: 4, label: "Qui" }, { value: 5, label: "Sex" }, { value: 6, label: "Sáb" }, { value: 7, label: "Dom" },
];

export default function WhatsAppBotRulesPage() {
  const navigate = useNavigate();
  const { data: rules = [], isLoading } = useWhatsAppBotRules();
  const { data: logs = [] } = useWhatsAppBotRuleLogs();
  const upsertMut = useUpsertWhatsAppBotRule();
  const deleteMut = useDeleteWhatsAppBotRule();
  const toggleMut = useToggleWhatsAppBotRule();

  const [editing, setEditing] = useState<WhatsAppBotRule | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<BotRuleInput>(DEFAULT);
  const [keywordsInput, setKeywordsInput] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const active = rules.filter((r) => r.is_active).length;
    const totalMatches = rules.reduce((s, r) => s + (r.match_count ?? 0), 0);
    const last24h = logs.filter((l) => new Date(l.created_at).getTime() > Date.now() - 86400000).length;
    return { active, total: rules.length, totalMatches, last24h };
  }, [rules, logs]);

  const openCreate = () => {
    setEditing(null);
    setForm(DEFAULT);
    setKeywordsInput("");
    setDialogOpen(true);
  };

  const openEdit = (r: WhatsAppBotRule) => {
    setEditing(r);
    setForm({
      name: r.name,
      description: r.description,
      is_active: r.is_active,
      priority: r.priority,
      match_type: r.match_type,
      case_sensitive: r.case_sensitive,
      keywords: r.keywords ?? [],
      reply_text: r.reply_text ?? "",
      reply_media_url: r.reply_media_url,
      reply_media_mime_type: r.reply_media_mime_type,
      attach_product_id: r.attach_product_id,
      send_once_per_conversation: r.send_once_per_conversation,
      cooldown_minutes: r.cooldown_minutes,
      handoff_to_human: r.handoff_to_human,
      handoff_assign_to_user_id: r.handoff_assign_to_user_id,
      respect_working_hours: r.respect_working_hours,
      working_hours_start: r.working_hours_start ?? "09:00",
      working_hours_end: r.working_hours_end ?? "18:00",
      working_days: r.working_days ?? [1, 2, 3, 4, 5],
    });
    setKeywordsInput((r.keywords ?? []).join(", "));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const keywords = keywordsInput
      .split(/[,;\n]/)
      .map((k) => k.trim())
      .filter(Boolean);
    if (!form.name.trim() || keywords.length === 0) {
      return;
    }
    await upsertMut.mutateAsync({
      ...form,
      keywords,
      ...(editing ? { id: editing.id } : {}),
    });
    setDialogOpen(false);
  };

  const toggleDay = (d: number) => {
    setForm((f) => ({
      ...f,
      working_days: f.working_days.includes(d)
        ? f.working_days.filter((x) => x !== d)
        : [...f.working_days, d].sort(),
    }));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6 max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Bot className="h-7 w-7 text-primary" /> Bot WhatsApp — Auto-reply por palavras-chave
            </h1>
            <p className="text-muted-foreground mt-1">
              Responda automaticamente a mensagens recebidas com base em palavras-chave. Verificado a cada minuto.
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Nova Regra
          </Button>
        </header>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Regras totais</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Ativas</p><p className="text-2xl font-bold text-emerald-600">{stats.active}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Disparos (24h)</p><p className="text-2xl font-bold">{stats.last24h}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Disparos totais</p><p className="text-2xl font-bold">{stats.totalMatches}</p></CardContent></Card>
        </div>

        <Tabs defaultValue="rules">
          <TabsList>
            <TabsTrigger value="rules">Regras</TabsTrigger>
            <TabsTrigger value="logs"><Activity className="h-3.5 w-3.5 mr-1" />Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className="space-y-3 mt-4">
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : rules.length === 0 ? (
              <Card><CardContent className="text-center py-12 text-muted-foreground">
                <Bot className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>Nenhuma regra criada.</p>
                <Button variant="outline" className="mt-4" onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Criar primeira regra</Button>
              </CardContent></Card>
            ) : (
              rules.map((r) => (
                <Card key={r.id}>
                  <CardContent className="p-4 flex items-start gap-4">
                    <div className="pt-1">
                      <Switch
                        checked={r.is_active}
                        onCheckedChange={(v) => toggleMut.mutate({ id: r.id, is_active: v })}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{r.name}</p>
                        <Badge variant="outline" className="text-xs">Prio {r.priority}</Badge>
                        <Badge variant="secondary" className="text-xs">{r.match_type}</Badge>
                        {r.handoff_to_human && <Badge variant="default" className="text-xs">Handoff</Badge>}
                        {r.respect_working_hours && <Badge variant="outline" className="text-xs"><Clock className="h-3 w-3 mr-1" />Horário</Badge>}
                        {r.match_count > 0 && <Badge variant="outline" className="text-xs">{r.match_count} disparos</Badge>}
                      </div>
                      {r.description && <p className="text-xs text-muted-foreground mt-1">{r.description}</p>}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(r.keywords ?? []).slice(0, 8).map((k) => (
                          <Badge key={k} variant="secondary" className="text-xs font-mono">{k}</Badge>
                        ))}
                        {r.keywords.length > 8 && <Badge variant="outline" className="text-xs">+{r.keywords.length - 8}</Badge>}
                      </div>
                      {r.reply_text && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2 italic">↳ "{r.reply_text}"</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(r.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="logs" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Últimos disparos</CardTitle></CardHeader>
              <CardContent>
                {logs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Sem disparos registados ainda.</p>
                ) : (
                  <ul className="divide-y text-sm">
                    {logs.map((l) => {
                      const rule = rules.find((r) => r.id === l.rule_id);
                      return (
                        <li key={l.id} className="py-2.5 flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{rule?.name ?? "(regra removida)"}</span>
                              <Badge variant="secondary" className="text-xs font-mono">{l.matched_keyword}</Badge>
                              {l.reply_sent ? (
                                <Badge variant="default" className="text-xs bg-emerald-500 hover:bg-emerald-600"><CheckCircle2 className="h-3 w-3 mr-0.5" />Resposta</Badge>
                              ) : (
                                <Badge variant="destructive" className="text-xs"><AlertCircle className="h-3 w-3 mr-0.5" />Falha</Badge>
                              )}
                              {l.handoff_triggered && <Badge variant="outline" className="text-xs">Handoff</Badge>}
                            </div>
                            {l.message_excerpt && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">"{l.message_excerpt}"</p>}
                            {l.error && <p className="text-xs text-destructive mt-1">{l.error}</p>}
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {formatDistanceToNow(new Date(l.created_at), { addSuffix: true, locale: pt })}
                            </p>
                          </div>
                          {l.conversation_id && (
                            <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => navigate(`/dashboard/inbox?conversation=${l.conversation_id}`)} title="Abrir conversa">
                              <MessageCircle className="h-3.5 w-3.5" />
                              <ArrowUpRight className="h-3 w-3" />
                            </Button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Editor */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Regra" : "Nova Regra"}</DialogTitle>
              <DialogDescription>Defina palavras-chave e a resposta automática.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input id="name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="FAQ — Preços" maxLength={120} />
                </div>
                <div>
                  <Label htmlFor="priority">Prioridade</Label>
                  <Input id="priority" type="number" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) || 100 }))} />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Descrição (interna)</Label>
                <Input id="description" value={form.description ?? ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} maxLength={200} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Tipo de correspondência</Label>
                  <Select value={form.match_type} onValueChange={(v: any) => setForm((f) => ({ ...f, match_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contains">Contém</SelectItem>
                      <SelectItem value="exact">Igual a</SelectItem>
                      <SelectItem value="starts_with">Começa por</SelectItem>
                      <SelectItem value="regex">Expressão regular</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Switch checked={form.case_sensitive} onCheckedChange={(v) => setForm((f) => ({ ...f, case_sensitive: v }))} />
                    <span className="text-sm">Sensível a maiúsculas</span>
                  </label>
                </div>
              </div>

              <div>
                <Label htmlFor="keywords">Palavras-chave * (separar por vírgula ou nova linha)</Label>
                <Textarea id="keywords" value={keywordsInput} onChange={(e) => setKeywordsInput(e.target.value)} placeholder="preço, preços, quanto custa" rows={2} />
              </div>

              <div>
                <Label htmlFor="reply_text">Resposta automática</Label>
                <Textarea id="reply_text" value={form.reply_text ?? ""} onChange={(e) => setForm((f) => ({ ...f, reply_text: e.target.value }))} placeholder="Olá! Os nossos preços começam em..." rows={4} maxLength={4000} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="media">URL de média (opcional)</Label>
                  <Input id="media" value={form.reply_media_url ?? ""} onChange={(e) => setForm((f) => ({ ...f, reply_media_url: e.target.value || null }))} placeholder="https://..." />
                </div>
                <div>
                  <Label htmlFor="cooldown">Cooldown (min)</Label>
                  <Input id="cooldown" type="number" min={0} value={form.cooldown_minutes} onChange={(e) => setForm((f) => ({ ...f, cooldown_minutes: Math.max(0, Number(e.target.value) || 0) }))} />
                </div>
              </div>

              <div className="space-y-2 rounded-lg border p-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm">Enviar apenas uma vez por conversa</span>
                  <Switch checked={form.send_once_per_conversation} onCheckedChange={(v) => setForm((f) => ({ ...f, send_once_per_conversation: v }))} />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm">Transferir para humano (handoff)</span>
                  <Switch checked={form.handoff_to_human} onCheckedChange={(v) => setForm((f) => ({ ...f, handoff_to_human: v }))} />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm">Respeitar horário de funcionamento</span>
                  <Switch checked={form.respect_working_hours} onCheckedChange={(v) => setForm((f) => ({ ...f, respect_working_hours: v }))} />
                </label>
              </div>

              {form.respect_working_hours && (
                <div className="rounded-lg border p-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Início</Label>
                      <Input type="time" value={form.working_hours_start ?? "09:00"} onChange={(e) => setForm((f) => ({ ...f, working_hours_start: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Fim</Label>
                      <Input type="time" value={form.working_hours_end ?? "18:00"} onChange={(e) => setForm((f) => ({ ...f, working_hours_end: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <Label>Dias úteis</Label>
                    <div className="flex gap-1 mt-1">
                      {DAYS.map((d) => (
                        <Button
                          key={d.value}
                          type="button"
                          variant={form.working_days.includes(d.value) ? "default" : "outline"}
                          size="sm"
                          className="h-8 w-12"
                          onClick={() => toggleDay(d.value)}
                        >{d.label}</Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={upsertMut.isPending}>
                {upsertMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editing ? "Guardar" : "Criar regra"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar regra?</AlertDialogTitle>
              <AlertDialogDescription>Os logs associados também serão eliminados.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => { if (deleteId) { await deleteMut.mutateAsync(deleteId); setDeleteId(null); } }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >Eliminar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
