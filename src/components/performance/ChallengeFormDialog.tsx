import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useCreateChallenge, useUpdateChallenge, PerformanceChallenge } from "@/hooks/usePerformanceChallenges";
import { DollarSign, CalendarCheck, TrendingUp, Handshake, Building2, Users, User, Gift, Award, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const CHALLENGE_TYPES = [
  { value: "revenue_sprint", label: "Revenue Sprint", icon: DollarSign, metric: "revenue", color: "text-green-600 bg-green-500/10 border-green-500/20" },
  { value: "meeting_sprint", label: "Meeting Sprint", icon: CalendarCheck, metric: "meetings", color: "text-blue-600 bg-blue-500/10 border-blue-500/20" },
  { value: "pipeline_builder", label: "Pipeline Builder", icon: TrendingUp, metric: "pipeline", color: "text-purple-600 bg-purple-500/10 border-purple-500/20" },
  { value: "deal_closer", label: "Deal Closer", icon: Handshake, metric: "deals", color: "text-orange-600 bg-orange-500/10 border-orange-500/20" },
];

const SCOPE_TYPES = [
  { value: "company", label: "Empresa inteira", icon: Building2 },
  { value: "team", label: "Equipa", icon: Users },
  { value: "individual", label: "Individual", icon: User },
];

const REWARD_TYPES = [
  { value: "recognition", label: "Reconhecimento", icon: Star },
  { value: "prize", label: "Prémio", icon: Gift },
  { value: "bonus", label: "Bónus", icon: Award },
];

interface ChallengeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editChallenge?: PerformanceChallenge | null;
}

export function ChallengeFormDialog({ open, onOpenChange, editChallenge }: ChallengeFormDialogProps) {
  const createChallenge = useCreateChallenge();
  const updateChallenge = useUpdateChallenge();
  const isEdit = !!editChallenge;

  const [form, setForm] = useState({
    challenge_name: "",
    challenge_type: "revenue_sprint",
    description: "",
    metric_type: "revenue",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    target_value: 0,
    scope_type: "company",
    reward_type: "recognition" as string | null,
    reward_value: "" as string | null,
  });

  useEffect(() => {
    if (editChallenge) {
      setForm({
        challenge_name: editChallenge.challenge_name,
        challenge_type: editChallenge.challenge_type,
        description: editChallenge.description || "",
        metric_type: editChallenge.metric_type,
        start_date: editChallenge.start_date,
        end_date: editChallenge.end_date,
        target_value: editChallenge.target_value,
        scope_type: editChallenge.scope_type || "company",
        reward_type: editChallenge.reward_type || "recognition",
        reward_value: editChallenge.reward_value || "",
      });
    } else {
      setForm({
        challenge_name: "", challenge_type: "revenue_sprint", description: "", metric_type: "revenue",
        start_date: new Date().toISOString().split("T")[0], end_date: "", target_value: 0,
        scope_type: "company", reward_type: "recognition", reward_value: "",
      });
    }
  }, [editChallenge, open]);

  const selectedType = CHALLENGE_TYPES.find(t => t.value === form.challenge_type);
  const metricUnit = form.metric_type === "revenue" || form.metric_type === "pipeline" ? "€" : "un.";

  const handleTypeSelect = (value: string) => {
    const type = CHALLENGE_TYPES.find(t => t.value === value);
    setForm(f => ({ ...f, challenge_type: value, metric_type: type?.metric || f.metric_type }));
  };

  const handleSubmit = async () => {
    if (!form.challenge_name || !form.end_date) {
      toast.error("Preenche o nome e a data de fim");
      return;
    }
    try {
      if (isEdit) {
        await updateChallenge.mutateAsync({ id: editChallenge!.id, ...form });
        toast.success("Desafio atualizado!");
      } else {
        await createChallenge.mutateAsync(form as any);
        toast.success("Desafio criado!");
      }
      onOpenChange(false);
    } catch {
      toast.error("Erro ao guardar desafio");
    }
  };

  const isPending = createChallenge.isPending || updateChallenge.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Desafio" : "Novo Desafio"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          {/* Type selector */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Tipo de Desafio</Label>
            <div className="grid grid-cols-2 gap-2">
              {CHALLENGE_TYPES.map(t => {
                const Icon = t.icon;
                const selected = form.challenge_type === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => handleTypeSelect(t.value)}
                    className={cn(
                      "flex items-center gap-2.5 p-3 rounded-lg border-2 text-left transition-all",
                      selected ? cn(t.color, "border-current font-semibold") : "border-border hover:border-muted-foreground/30 bg-card"
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="text-sm">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name */}
          <div>
            <Label>Nome do Desafio</Label>
            <Input value={form.challenge_name} onChange={e => setForm(f => ({ ...f, challenge_name: e.target.value }))} placeholder="ex: Closing Sprint Q1" />
          </div>

          {/* Description */}
          <div>
            <Label>Descrição</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descreve o desafio..." rows={2} />
          </div>

          {/* Dates + Target */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Início</Label>
              <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div>
              <Label>Fim</Label>
              <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
            </div>
            <div>
              <Label>Meta ({metricUnit})</Label>
              <Input type="number" value={form.target_value} onChange={e => setForm(f => ({ ...f, target_value: Number(e.target.value) }))} />
            </div>
          </div>

          {/* Metric preview */}
          {selectedType && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-sm text-muted-foreground">
              <selectedType.icon className="h-4 w-4" />
              <span>Métrica: <strong className="text-foreground">{form.metric_type}</strong> — cada participante precisa atingir <strong className="text-foreground">{form.target_value} {metricUnit}</strong></span>
            </div>
          )}

          {/* Scope */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Âmbito</Label>
            <div className="flex gap-2">
              {SCOPE_TYPES.map(s => {
                const Icon = s.icon;
                const selected = form.scope_type === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, scope_type: s.value }))}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all flex-1",
                      selected ? "border-primary bg-primary/5 text-primary font-medium" : "border-border hover:border-muted-foreground/30"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reward */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">Recompensa</Label>
            <div className="flex gap-2">
              {REWARD_TYPES.map(r => {
                const Icon = r.icon;
                const selected = form.reward_type === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, reward_type: r.value }))}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition-all",
                      selected ? "border-primary bg-primary/5 text-primary font-medium" : "border-border hover:border-muted-foreground/30"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {r.label}
                  </button>
                );
              })}
            </div>
            <Input
              value={form.reward_value || ""}
              onChange={e => setForm(f => ({ ...f, reward_value: e.target.value }))}
              placeholder="ex: Jantar de equipa, €500 bónus..."
              className="text-sm"
            />
          </div>

          <Button onClick={handleSubmit} disabled={isPending} className="w-full">
            {isEdit ? "Guardar Alterações" : "Criar Desafio"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
