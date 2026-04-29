import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Edit2, Sparkles, Target, ArrowLeft, Check, X, ArrowUp, ArrowDown } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const MODULES = [
  "crm-contacts", "crm-opportunities", "crm-managers", "products",
  "email-marketing", "inbox", "marketplace", "lives", "knowledge-base",
];
const LANGS = ["pt", "en", "es", "fr"];
const TIERS = [
  { value: "welcome", label: "🎓 Boas-vindas" },
  { value: "intermediate", label: "🚀 Intermédio" },
  { value: "advanced", label: "⚡ Avançado" },
];

export default function ModulePresentationsAdminPage() {
  const [moduleSlug, setModuleSlug] = useState("crm-contacts");
  const [lang, setLang] = useState("pt");
  const queryClient = useQueryClient();

  const presentationsQuery = useQuery({
    queryKey: ["admin-presentations", moduleSlug, lang],
    queryFn: async () => {
      const { data } = await supabase
        .from("module_presentations" as any)
        .select("*")
        .eq("module_slug", moduleSlug)
        .eq("lang", lang)
        .order("tier");
      return (data as any[]) ?? [];
    },
  });

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <Link to="/dashboard/super-admin/module-onboarding" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
              <ArrowLeft className="w-3 h-3" /> Slides legacy
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">Apresentações e Quizzes</h1>
            <p className="text-muted-foreground mt-1">
              Gere as apresentações por tier (boas-vindas, intermédio, avançado), quizzes e XP de cada módulo.
            </p>
          </div>
        </div>

        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Módulo</Label>
              <Select value={moduleSlug} onValueChange={setModuleSlug}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODULES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Língua</Label>
              <Select value={lang} onValueChange={setLang}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANGS.map((l) => <SelectItem key={l} value={l}>{l.toUpperCase()}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        <div className="grid gap-4">
          {TIERS.map((tier) => {
            const existing = (presentationsQuery.data ?? []).find((p) => p.tier === tier.value);
            return (
              <PresentationCard
                key={tier.value}
                tier={tier.value as any}
                tierLabel={tier.label}
                moduleSlug={moduleSlug}
                lang={lang}
                presentation={existing}
                onChanged={() => queryClient.invalidateQueries({ queryKey: ["admin-presentations"] })}
              />
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}

// ============ Presentation Card ============
function PresentationCard({
  tier, tierLabel, moduleSlug, lang, presentation, onChanged,
}: {
  tier: "welcome" | "intermediate" | "advanced";
  tierLabel: string;
  moduleSlug: string;
  lang: string;
  presentation: any;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-[240px]">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold">{tierLabel}</h3>
            {presentation && (
              <>
                <Badge variant={presentation.is_active ? "default" : "secondary"}>
                  {presentation.is_active ? "Ativa" : "Inativa"}
                </Badge>
                <Badge variant="outline">+{presentation.xp_reward} XP</Badge>
                <Badge variant="outline">≥{presentation.min_score_percent}%</Badge>
                {presentation.unlock_after_days > 0 && (
                  <Badge variant="outline">Desbloq. {presentation.unlock_after_days}d</Badge>
                )}
              </>
            )}
          </div>
          {presentation ? (
            <>
              <p className="font-medium">{presentation.title}</p>
              {presentation.description && (
                <p className="text-sm text-muted-foreground mt-1">{presentation.description}</p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Ainda não criada para este módulo/língua.</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                {presentation ? <><Edit2 className="w-3.5 h-3.5 mr-1" /> Editar</> : <><Plus className="w-3.5 h-3.5 mr-1" /> Criar</>}
              </Button>
            </DialogTrigger>
            <PresentationEditor
              tier={tier}
              moduleSlug={moduleSlug}
              lang={lang}
              presentation={presentation}
              onSaved={() => { setOpen(false); onChanged(); }}
            />
          </Dialog>
          {presentation && (
            <QuizManagerButton presentation={presentation} onChanged={onChanged} />
          )}
        </div>
      </div>
    </Card>
  );
}

// ============ Presentation Editor ============
function PresentationEditor({
  tier, moduleSlug, lang, presentation, onSaved,
}: {
  tier: "welcome" | "intermediate" | "advanced";
  moduleSlug: string;
  lang: string;
  presentation: any;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title: presentation?.title ?? "",
    description: presentation?.description ?? "",
    unlock_after_days: presentation?.unlock_after_days ?? (tier === "welcome" ? 0 : tier === "intermediate" ? 7 : 30),
    min_score_percent: presentation?.min_score_percent ?? 70,
    xp_reward: presentation?.xp_reward ?? (tier === "welcome" ? 50 : tier === "intermediate" ? 100 : 200),
    allow_live_mode: presentation?.allow_live_mode ?? true,
    is_active: presentation?.is_active ?? true,
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, module_slug: moduleSlug, lang, tier };
      if (presentation?.id) {
        const { error } = await supabase.from("module_presentations" as any).update(payload).eq("id", presentation.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("module_presentations" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Apresentação guardada"); onSaved(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{presentation ? "Editar" : "Criar"} apresentação · {tier}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <div>
          <Label>Título</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <Label>Descrição</Label>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>XP recompensa</Label>
            <Input type="number" value={form.xp_reward} onChange={(e) => setForm({ ...form, xp_reward: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Score mínimo (%)</Label>
            <Input type="number" min={0} max={100} value={form.min_score_percent} onChange={(e) => setForm({ ...form, min_score_percent: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Desbloq. após (dias)</Label>
            <Input type="number" min={0} value={form.unlock_after_days} onChange={(e) => setForm({ ...form, unlock_after_days: Number(e.target.value) })} />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Switch checked={form.allow_live_mode} onCheckedChange={(v) => setForm({ ...form, allow_live_mode: v })} />
            <Label>Permitir modo "Apresentação ao vivo"</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            <Label>Ativa</Label>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Os slides desta apresentação são geridos no editor de slides legacy (botão "Slides legacy" no topo).
          Liga cada slide a esta apresentação via o campo <code>presentation_id</code>.
        </p>
      </div>
      <DialogFooter>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>Guardar</Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ============ Quiz Manager ============
function QuizManagerButton({ presentation, onChanged }: { presentation: any; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const quizzesQuery = useQuery({
    queryKey: ["admin-quizzes", presentation.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("module_quizzes" as any)
        .select("*")
        .eq("presentation_id", presentation.id)
        .order("order_index");
      return (data as any[]) ?? [];
    },
    enabled: open,
  });

  const addQuestion = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("module_quizzes" as any).insert({
        presentation_id: presentation.id,
        question: "Nova pergunta",
        options: ["Opção A", "Opção B", "Opção C", "Opção D"],
        correct_option_index: 0,
        order_index: (quizzesQuery.data?.length ?? 0),
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-quizzes", presentation.id] }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Target className="w-3.5 h-3.5 mr-1" />
          Quiz ({quizzesQuery.data?.length ?? "..."})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quiz · {presentation.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {(quizzesQuery.data ?? []).length >= 7 && (
            <p className="text-xs text-amber-600">Recomendado: máximo 7 perguntas por quiz.</p>
          )}
          {(quizzesQuery.data ?? []).map((q, i) => (
            <QuestionEditor key={q.id} question={q} index={i} onChanged={() => {
              queryClient.invalidateQueries({ queryKey: ["admin-quizzes", presentation.id] });
              onChanged();
            }} />
          ))}
          <Button variant="outline" onClick={() => addQuestion.mutate()} disabled={addQuestion.isPending}>
            <Plus className="w-4 h-4 mr-1" /> Adicionar pergunta
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function QuestionEditor({ question, index, onChanged }: { question: any; index: number; onChanged: () => void }) {
  const [q, setQ] = useState({
    question: question.question,
    options: Array.isArray(question.options) ? question.options : [],
    correct_option_index: question.correct_option_index,
    explanation: question.explanation ?? "",
    is_active: question.is_active,
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("module_quizzes" as any).update(q).eq("id", question.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Pergunta guardada"); onChanged(); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("module_quizzes" as any).delete().eq("id", question.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Pergunta removida"); onChanged(); },
  });

  const setOption = (i: number, val: string) => {
    const next = [...q.options];
    next[i] = val;
    setQ({ ...q, options: next });
  };
  const addOption = () => setQ({ ...q, options: [...q.options, "Nova opção"] });
  const removeOption = (i: number) => {
    const next = q.options.filter((_, idx) => idx !== i);
    setQ({
      ...q,
      options: next,
      correct_option_index: Math.min(q.correct_option_index, next.length - 1),
    });
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground mt-2">P{index + 1}</span>
        <div className="flex-1">
          <Textarea value={q.question} onChange={(e) => setQ({ ...q, question: e.target.value })} rows={2} placeholder="Pergunta..." />
        </div>
        <Button variant="ghost" size="icon" onClick={() => remove.mutate()}>
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </div>

      <div className="space-y-2 pl-7">
        {q.options.map((opt: string, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <button
              onClick={() => setQ({ ...q, correct_option_index: i })}
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                q.correct_option_index === i ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground/30"
              }`}
              title="Marcar como correta"
            >
              {q.correct_option_index === i && <Check className="w-3.5 h-3.5" />}
            </button>
            <Input value={opt} onChange={(e) => setOption(i, e.target.value)} />
            <Button variant="ghost" size="icon" onClick={() => removeOption(i)} disabled={q.options.length <= 2}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={addOption}>
          <Plus className="w-3 h-3 mr-1" /> Adicionar opção
        </Button>
      </div>

      <Textarea
        placeholder="Explicação (opcional, mostrada após responder)"
        value={q.explanation}
        onChange={(e) => setQ({ ...q, explanation: e.target.value })}
        rows={2}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Switch checked={q.is_active} onCheckedChange={(v) => setQ({ ...q, is_active: v })} />
          <Label>Ativa</Label>
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending} size="sm">
          <Sparkles className="w-3.5 h-3.5 mr-1" /> Guardar
        </Button>
      </div>
    </Card>
  );
}
