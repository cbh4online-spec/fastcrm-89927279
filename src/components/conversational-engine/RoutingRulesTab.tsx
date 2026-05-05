import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Plus, Pencil, Trash2, Route, Tag, ArrowRight, Loader2 } from "lucide-react";
import {
  useConversationRoutingRules,
  useCreateRoutingRule,
  useUpdateRoutingRule,
  useDeleteRoutingRule,
  type ConversationRoutingRule,
  type AssignmentStrategy,
} from "@/hooks/useConversationRoutingRules";
import { useAgentMembers } from "@/hooks/useWorkspaceMembers";

const INTENT_OPTIONS = ["sales", "support", "question", "follow_up", "complaint", "other"];
const PRIORITY_OPTIONS = ["high", "medium", "low"];
const SENTIMENT_OPTIONS = ["positive", "neutral", "negative"];
const CHANNEL_OPTIONS = ["whatsapp", "email", "sms", "instagram", "facebook", "messenger", "live_chat", "web_widget"];

const STRATEGY_LABELS: Record<AssignmentStrategy, string> = {
  specific_user: "Utilizador específico",
  round_robin: "Round-robin",
  least_busy: "Menos ocupado",
  commercial_profile: "Perfil comercial",
};

interface FormState {
  id?: string;
  name: string;
  description: string;
  priority: number;
  is_active: boolean;
  match_intents: string[];
  match_priorities: string[];
  match_sentiments: string[];
  match_tags: string[];
  match_channels: string[];
  min_value: number | null;
  assignment_strategy: AssignmentStrategy;
  assign_to_user_id: string | null;
  assign_to_user_ids: string[];
  assign_to_profile: string | null;
  add_tags: string[];
  set_priority: string | null;
  notify_user: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  priority: 100,
  is_active: true,
  match_intents: [],
  match_priorities: [],
  match_sentiments: [],
  match_tags: [],
  match_channels: [],
  min_value: null,
  assignment_strategy: "round_robin",
  assign_to_user_id: null,
  assign_to_user_ids: [],
  assign_to_profile: null,
  add_tags: [],
  set_priority: null,
  notify_user: false,
};

function MultiToggle({ value, onChange, options, ariaLabel }: { value: string[]; onChange: (v: string[]) => void; options: string[]; ariaLabel: string; }) {
  const toggle = (opt: string) => {
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  };
  return (
    <div className="flex flex-wrap gap-1.5" aria-label={ariaLabel}>
      {options.map((o) => (
        <Badge
          key={o}
          variant={value.includes(o) ? "default" : "outline"}
          className="cursor-pointer capitalize"
          onClick={() => toggle(o)}
        >
          {o}
        </Badge>
      ))}
    </div>
  );
}

function TagListInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder: string; }) {
  const [input, setInput] = useState("");
  const add = () => {
    const t = input.trim();
    if (!t || value.includes(t)) { setInput(""); return; }
    onChange([...value, t]);
    setInput("");
  };
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder}
        />
        <Button type="button" variant="outline" onClick={add}>Adicionar</Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {value.map((t) => (
          <Badge key={t} variant="secondary" className="cursor-pointer" onClick={() => onChange(value.filter((v) => v !== t))}>
            {t} ✕
          </Badge>
        ))}
      </div>
    </div>
  );
}

export function RoutingRulesTab() {
  const { data: rules = [], isLoading } = useConversationRoutingRules();
  const { data: agents = [] } = useAgentMembers();
  const createMut = useCreateRoutingRule();
  const updateMut = useUpdateRoutingRule();
  const deleteMut = useDeleteRoutingRule();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const openNew = () => { setForm(EMPTY_FORM); setOpen(true); };
  const openEdit = (r: ConversationRoutingRule) => {
    setForm({
      id: r.id,
      name: r.name,
      description: r.description ?? "",
      priority: r.priority,
      is_active: r.is_active,
      match_intents: r.match_intents ?? [],
      match_priorities: r.match_priorities ?? [],
      match_sentiments: r.match_sentiments ?? [],
      match_tags: r.match_tags ?? [],
      match_channels: r.match_channels ?? [],
      min_value: r.min_value,
      assignment_strategy: r.assignment_strategy,
      assign_to_user_id: r.assign_to_user_id,
      assign_to_user_ids: r.assign_to_user_ids ?? [],
      assign_to_profile: r.assign_to_profile,
      add_tags: r.add_tags ?? [],
      set_priority: r.set_priority,
      notify_user: r.notify_user,
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.name.trim()) return;
    const payload = { ...form, name: form.name.trim() };
    if (form.id) {
      await updateMut.mutateAsync({ id: form.id, ...payload });
    } else {
      await createMut.mutateAsync(payload);
    }
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Route className="h-5 w-5 text-primary" />
              Roteamento Automático de Conversas
            </CardTitle>
            <CardDescription>
              Quando uma conversa é classificada pela IA (intent, prioridade, tags), estas regras escolhem o agente certo automaticamente.
            </CardDescription>
          </div>
          <Button onClick={openNew} className="gap-2">
            <Plus className="h-4 w-4" /> Nova Regra
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : rules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <Route className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Sem regras de roteamento.</p>
              <p className="text-xs mt-1">Crie a primeira para começar a atribuir conversas automaticamente.</p>
            </div>
          ) : rules.map((r) => (
            <div key={r.id} className="flex items-start justify-between gap-4 rounded-lg border p-4 hover:bg-muted/40 transition">
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{r.name}</span>
                  <Badge variant="outline">Prio {r.priority}</Badge>
                  {!r.is_active && <Badge variant="secondary">Inativa</Badge>}
                </div>
                {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                  <div className="flex flex-wrap gap-1">
                    {r.match_intents?.map((i) => <Badge key={i} variant="secondary" className="text-[10px] capitalize">{i}</Badge>)}
                    {r.match_priorities?.map((i) => <Badge key={i} variant="secondary" className="text-[10px] capitalize">{i}</Badge>)}
                    {r.match_tags?.map((i) => <Badge key={i} variant="secondary" className="text-[10px]"><Tag className="h-2.5 w-2.5 mr-1" />{i}</Badge>)}
                    {r.match_channels?.map((i) => <Badge key={i} variant="secondary" className="text-[10px]">{i}</Badge>)}
                  </div>
                  <ArrowRight className="h-3 w-3" />
                  <span className="font-medium">{STRATEGY_LABELS[r.assignment_strategy]}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Switch
                  checked={r.is_active}
                  onCheckedChange={(v) => updateMut.mutate({ id: r.id, is_active: v })}
                  aria-label="Ativar regra"
                />
                <Button variant="ghost" size="icon" onClick={() => openEdit(r)} aria-label="Editar">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Remover a regra "${r.name}"?`)) deleteMut.mutate(r.id); }} aria-label="Remover">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{form.id ? "Editar regra" : "Nova regra de roteamento"}</SheetTitle>
            <SheetDescription>
              Quando todas as condições corresponderem, a conversa é atribuída segundo a estratégia selecionada.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label>Nome*</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Vendas alta prioridade" />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Prioridade da regra</Label>
                <Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })} />
                <p className="text-xs text-muted-foreground">Mais alta = avaliada primeiro.</p>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label>Ativa</Label>
                  <div className="pt-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /></div>
                </div>
              </div>
            </div>

            <div className="border-t pt-4 space-y-4">
              <h4 className="font-medium text-sm">Condições (todas combinadas com E)</h4>

              <div className="space-y-2">
                <Label className="text-xs">Intent</Label>
                <MultiToggle value={form.match_intents} onChange={(v) => setForm({ ...form, match_intents: v })} options={INTENT_OPTIONS} ariaLabel="Intents" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Prioridade IA</Label>
                <MultiToggle value={form.match_priorities} onChange={(v) => setForm({ ...form, match_priorities: v })} options={PRIORITY_OPTIONS} ariaLabel="Prioridade" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Sentimento</Label>
                <MultiToggle value={form.match_sentiments} onChange={(v) => setForm({ ...form, match_sentiments: v })} options={SENTIMENT_OPTIONS} ariaLabel="Sentimento" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Canal</Label>
                <MultiToggle value={form.match_channels} onChange={(v) => setForm({ ...form, match_channels: v })} options={CHANNEL_OPTIONS} ariaLabel="Canal" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Tags presentes (qualquer uma)</Label>
                <TagListInput value={form.match_tags} onChange={(v) => setForm({ ...form, match_tags: v })} placeholder="Ex.: vip, premium" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Valor mínimo estimado (€)</Label>
                <Input
                  type="number"
                  value={form.min_value ?? ""}
                  onChange={(e) => setForm({ ...form, min_value: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="Sem mínimo"
                />
              </div>
            </div>

            <div className="border-t pt-4 space-y-4">
              <h4 className="font-medium text-sm">Atribuição</h4>
              <div className="space-y-2">
                <Label>Estratégia</Label>
                <Select value={form.assignment_strategy} onValueChange={(v) => setForm({ ...form, assignment_strategy: v as AssignmentStrategy })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STRATEGY_LABELS).map(([k, label]) => (
                      <SelectItem key={k} value={k}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {form.assignment_strategy === "specific_user" && (
                <div className="space-y-2">
                  <Label>Atribuir a</Label>
                  <Select value={form.assign_to_user_id ?? ""} onValueChange={(v) => setForm({ ...form, assign_to_user_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecionar agente" /></SelectTrigger>
                    <SelectContent>
                      {agents.map((a) => (
                        <SelectItem key={a.user_id} value={a.user_id}>
                          {a.profile?.full_name || a.profile?.email || a.user_id.slice(0, 8)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(form.assignment_strategy === "round_robin" || form.assignment_strategy === "least_busy") && (
                <div className="space-y-2">
                  <Label>Pool de agentes</Label>
                  <div className="flex flex-wrap gap-1.5 rounded-md border p-2 max-h-40 overflow-y-auto">
                    {agents.length === 0 && <span className="text-xs text-muted-foreground">Sem agentes disponíveis.</span>}
                    {agents.map((a) => {
                      const sel = form.assign_to_user_ids.includes(a.user_id);
                      return (
                        <Badge
                          key={a.user_id}
                          variant={sel ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => setForm({
                            ...form,
                            assign_to_user_ids: sel
                              ? form.assign_to_user_ids.filter((id) => id !== a.user_id)
                              : [...form.assign_to_user_ids, a.user_id],
                          })}
                        >
                          {a.profile?.full_name || a.profile?.email || a.user_id.slice(0, 6)}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}

              {form.assignment_strategy === "commercial_profile" && (
                <div className="space-y-2">
                  <Label>Perfil comercial</Label>
                  <Input
                    value={form.assign_to_profile ?? ""}
                    onChange={(e) => setForm({ ...form, assign_to_profile: e.target.value || null })}
                    placeholder="Ex.: sdr, account_manager"
                  />
                  <p className="text-xs text-muted-foreground">Atribui ao primeiro membro com este perfil comercial.</p>
                </div>
              )}
            </div>

            <div className="border-t pt-4 space-y-4">
              <h4 className="font-medium text-sm">Efeitos adicionais</h4>
              <div className="space-y-2">
                <Label className="text-xs">Adicionar tags à conversa</Label>
                <TagListInput value={form.add_tags} onChange={(v) => setForm({ ...form, add_tags: v })} placeholder="Ex.: prioritário" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Forçar prioridade</Label>
                <Select value={form.set_priority ?? "none"} onValueChange={(v) => setForm({ ...form, set_priority: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não alterar</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="low">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label>Notificar agente</Label>
                <Switch checked={form.notify_user} onCheckedChange={(v) => setForm({ ...form, notify_user: v })} />
              </div>
            </div>
          </div>

          <SheetFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={!form.name.trim() || createMut.isPending || updateMut.isPending}>
              {(createMut.isPending || updateMut.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {form.id ? "Guardar" : "Criar regra"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
