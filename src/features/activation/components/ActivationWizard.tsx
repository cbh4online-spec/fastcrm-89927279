import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Target, Users, ArrowRight, Check, X } from "lucide-react";
import { useOnboardingState, useMarkGoal } from "../useActivation";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STEPS = [
  { id: 1, title: "Conta-nos sobre o teu negócio", icon: Sparkles },
  { id: 2, title: "Define o teu pipeline", icon: Target },
  { id: 3, title: "Adiciona o primeiro contacto", icon: Users },
];

export function ActivationWizard({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const { state, update } = useOnboardingState();
  const { upsert: upsertContext } = useBusinessContext();
  const mark = useMarkGoal();
  const [step, setStep] = useState(state?.wizard_step || 1);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [businessDescription, setBusinessDescription] = useState("");
  const [businessModel, setBusinessModel] = useState("");

  // Step 2
  const [pipelineName, setPipelineName] = useState("Pipeline de Vendas");
  const [stages, setStages] = useState("Lead, Qualificado, Proposta, Negociação, Ganho");

  // Step 3
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  const skip = async () => {
    await update.mutateAsync({ wizard_skipped: true, wizard_completed_at: new Date().toISOString() });
    onOpenChange(false);
    toast.info("Podes completar o setup mais tarde a partir do widget de progresso.");
  };

  const next = async () => {
    setSaving(true);
    try {
      if (step === 1) {
        await upsertContext.mutateAsync({
          business_description: businessDescription,
          business_model: businessModel || null,
        });
        await mark.mutateAsync({ goalKey: "business_context", source: "manual" });
        await update.mutateAsync({ wizard_step: 2 });
        setStep(2);
      } else if (step === 2) {
        if (!currentWorkspace) throw new Error("Workspace não encontrado");
        const stageList = stages.split(",").map((s, idx) => ({ name: s.trim(), order: idx }));
        const { data: pipeline, error } = await supabase
          .from("pipelines" as any)
          .insert({ workspace_id: currentWorkspace.id, name: pipelineName } as any)
          .select()
          .single();
        if (error) throw error;
        if (pipeline) {
          await supabase.from("pipeline_stages" as any).insert(
            stageList.map((s) => ({ pipeline_id: (pipeline as any).id, name: s.name, position: s.order, workspace_id: currentWorkspace.id })) as any
          );
        }
        await mark.mutateAsync({ goalKey: "create_pipeline", source: "manual" });
        await update.mutateAsync({ wizard_step: 3 });
        setStep(3);
      } else if (step === 3) {
        if (!currentWorkspace) throw new Error("Workspace não encontrado");
        if (contactName) {
          await supabase.from("contacts" as any).insert({
            workspace_id: currentWorkspace.id,
            name: contactName,
            email: contactEmail || null,
          } as any);
        }
        await update.mutateAsync({ wizard_completed_at: new Date().toISOString(), wizard_step: 3 });
        onOpenChange(false);
        toast.success("Boa! O teu workspace está pronto. Completa as restantes metas no widget.");
        navigate("/dashboard/onboarding");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao guardar");
    } finally {
      setSaving(false);
    }
  };

  const StepIcon = STEPS[step - 1].icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden gap-0">
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 border-b">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-primary/15 grid place-items-center">
                <StepIcon className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Passo {step} de {STEPS.length}
                </p>
                <h2 className="text-xl font-semibold">{STEPS[step - 1].title}</h2>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={skip}>
              <X className="size-4 mr-1" /> Saltar
            </Button>
          </div>
          <Progress value={(step / STEPS.length) * 100} className="h-1.5" />
        </div>

        <div className="p-8 space-y-5">
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="biz-desc">Descreve o teu negócio em 1-2 frases</Label>
                <Textarea
                  id="biz-desc"
                  value={businessDescription}
                  onChange={(e) => setBusinessDescription(e.target.value)}
                  placeholder="Ex: Vendemos software de gestão para clínicas dentárias em Portugal."
                  rows={3}
                  maxLength={500}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="biz-model">Modelo de negócio</Label>
                <Input
                  id="biz-model"
                  value={businessModel}
                  onChange={(e) => setBusinessModel(e.target.value)}
                  placeholder="Ex: SaaS B2B, Agência, E-commerce..."
                  maxLength={100}
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="pipe-name">Nome do pipeline</Label>
                <Input id="pipe-name" value={pipelineName} onChange={(e) => setPipelineName(e.target.value)} maxLength={80} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stages">Estágios (separados por vírgula)</Label>
                <Textarea
                  id="stages"
                  value={stages}
                  onChange={(e) => setStages(e.target.value)}
                  rows={3}
                  placeholder="Lead, Qualificado, Proposta, Negociação, Ganho"
                />
                <p className="text-xs text-muted-foreground">
                  Podes ajustar mais tarde em /dashboard/pipelines.
                </p>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="contact-name">Nome do contacto</Label>
                <Input id="contact-name" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Ex: Maria Silva" maxLength={120} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-email">Email (opcional)</Label>
                <Input id="contact-email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="maria@empresa.pt" maxLength={200} />
              </div>
              <p className="text-xs text-muted-foreground">
                Podes saltar e importar centenas de contactos depois via CSV.
              </p>
            </>
          )}
        </div>

        <div className="px-8 py-5 border-t bg-muted/30 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            <Check className="size-3 inline mr-1" /> Auto-guardado
          </p>
          <Button onClick={next} disabled={saving} className="gap-2">
            {step === STEPS.length ? "Concluir" : "Próximo"}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
