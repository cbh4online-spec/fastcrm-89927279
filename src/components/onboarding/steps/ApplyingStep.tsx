import { useEffect, useState } from "react";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { OnboardingConfig } from "@/hooks/useIntelligentOnboarding";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { OnboardingSegment } from "@/config/onboardingSegments";
import { getSegmentProfile } from "@/config/onboardingSegments";

interface ApplyStep {
  id: string;
  label: string;
  status: "pending" | "loading" | "done" | "error";
}

interface OnboardingAnswers {
  businessType: string;
  customBusinessType?: string;
  successDefinition: string;
  processDescription: string;
  channels: string[];
  revenueModel?: string;
  teamSize?: string;
  salesComplexity?: string;
  primaryObjective?: string;
}

interface ApplyingStepProps {
  config: OnboardingConfig;
  answers: OnboardingAnswers;
  segment?: OnboardingSegment;
  durationMs?: number;
  onComplete: () => void;
}

// Map AI automation triggers to valid enum values
const TRIGGER_MAP: Record<string, string> = {
  "lead_created": "lead_created",
  "new_lead": "lead_created",
  "opportunity_stage_changed": "opportunity_stage_changed",
  "stage_change": "opportunity_stage_changed",
  "contact_created": "contact_created",
  "lead_no_response": "lead_no_response",
  "no_response": "lead_no_response",
  "message_received": "message_received",
  "first_message": "first_message_from_lead",
  "scheduled": "scheduled_time",
};

function mapTrigger(trigger: string): string {
  const lower = trigger.toLowerCase().replace(/\s+/g, "_");
  return TRIGGER_MAP[lower] || "lead_created";
}

export function ApplyingStep({ config, answers, segment, durationMs, onComplete }: ApplyingStepProps) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const [steps, setSteps] = useState<ApplyStep[]>([
    { id: "pipeline", label: "A criar pipeline...", status: "pending" },
    { id: "fields", label: "A criar campos personalizados...", status: "pending" },
    { id: "forms", label: "A criar formulários...", status: "pending" },
    { id: "automations", label: "A registar automações sugeridas...", status: "pending" },
    { id: "context", label: "A configurar Context OS...", status: "pending" },
    { id: "finalize", label: "A finalizar configuração...", status: "pending" },
  ]);

  const updateStep = (id: string, status: ApplyStep["status"]) => {
    setSteps((prev) =>
      prev.map((step) => (step.id === id ? { ...step, status } : step))
    );
  };

  useEffect(() => {
    const applyConfiguration = async () => {
      if (!currentWorkspace || !user) {
        toast.error("Workspace não encontrado");
        return;
      }

      try {
        // Step 1: Create pipeline
        updateStep("pipeline", "loading");
        
        const { data: pipelineData, error: pipelineError } = await supabase
          .from("pipelines")
          .insert({
            workspace_id: currentWorkspace.id,
            name: config.pipeline.name,
            type: "sales",
            description: `Pipeline criado automaticamente durante o onboarding`,
            is_default: true,
          })
          .select()
          .single();

        if (pipelineError) {
          console.error("Error creating pipeline:", pipelineError);
        }

        const pipelineId = pipelineData?.id || null;

        for (const stage of config.pipeline.stages) {
          await supabase.from("pipeline_stages").insert({
            workspace_id: currentWorkspace.id,
            pipeline_id: pipelineId,
            name: stage.name,
            position: stage.position,
            color: stage.color,
            probability: Math.round((stage.position / config.pipeline.stages.length) * 100),
            description: stage.description || null,
          });
        }
        updateStep("pipeline", "done");

        // Step 2: Create custom fields
        updateStep("fields", "loading");
        const entityTypes = ["lead", "contact", "company", "opportunity"] as const;
        const entityMap = {
          lead: "leads",
          contact: "contacts",
          company: "companies",
          opportunity: "opportunities",
        } as const;

        for (const entityType of entityTypes) {
          const fields = config.customFields[entityMap[entityType]];
          for (let i = 0; i < fields.length; i++) {
            const field = fields[i];
            await supabase.from("custom_fields").insert({
              workspace_id: currentWorkspace.id,
              entity_type: entityType,
              name: field.name,
              field_type: field.field_type,
              required: field.required,
              options: field.options ? { choices: field.options } : null,
              position: i + 1,
            });
          }
        }
        updateStep("fields", "done");

        // Step 3: Create forms
        updateStep("forms", "loading");
        for (const form of config.forms) {
          const formSchema = {
            fields: form.fields.map((f, idx) => ({
              id: `field_${idx}`,
              name: f.name,
              type: f.type,
              required: f.required,
              options: f.options,
            })),
          };

          await supabase.from("forms").insert({
            workspace_id: currentWorkspace.id,
            created_by: user.id,
            name: form.name,
            description: form.description,
            form_type: "lead",
            schema: formSchema,
            is_active: true,
          });
        }
        updateStep("forms", "done");

        // Step 4: Create real automation suggestions
        updateStep("automations", "loading");
        for (const automation of config.automations) {
          try {
            await supabase.from("automation_suggestions").insert({
              workspace_id: currentWorkspace.id,
              title: automation.name,
              description: automation.description,
              trigger_type: mapTrigger(automation.trigger),
              trigger_config: { source: "onboarding" },
              conditions: {},
              actions: { steps: automation.actions.map((a) => ({ type: "action", label: a })) },
              confidence: 0.8,
              explanation: `Automação sugerida durante o onboarding baseada no teu processo de vendas.`,
              status: "pending",
            });
          } catch (err) {
            console.error("Error creating automation suggestion:", err);
          }
        }
        updateStep("automations", "done");

        // Step 5: Auto-setup Context OS
        updateStep("context", "loading");
        try {
          const teamSizeNum = answers.teamSize === "solo" ? 1 
            : answers.teamSize === "2-5" ? 3 
            : answers.teamSize === "6-20" ? 10 
            : answers.teamSize === "20+" ? 25 
            : null;

          const segmentProfile = segment ? getSegmentProfile(segment) : null;

          await supabase.from("business_context" as any).upsert({
            workspace_id: currentWorkspace.id,
            business_model: answers.revenueModel || answers.businessType,
            business_description: answers.successDefinition,
            sales_process_steps: answers.processDescription ? answers.processDescription.split(/[.,;]\s*/).filter(Boolean).slice(0, 10) : null,
            active_strategies: answers.channels,
            team_size: teamSizeNum,
            pricing_model: answers.revenueModel || null,
            onboarding_completed: true,
            updated_at: new Date().toISOString(),
          } as any, { onConflict: 'workspace_id' });

          // Configure intelligence defaults based on segment
          if (segmentProfile) {
            await supabase.from("workspace_settings" as any).upsert({
              workspace_id: currentWorkspace.id,
              enable_benchmarks: segmentProfile.intelligenceDefaults.enableBenchmarks,
              enable_forecast: segmentProfile.intelligenceDefaults.enableForecast,
            } as any, { onConflict: 'workspace_id' });
          }
        } catch (err) {
          console.error("Error setting up Context OS:", err);
        }
        updateStep("context", "done");

        // Step 6: Finalize — persist answers + segment + trigger Daily Brief
        updateStep("finalize", "loading");
        
        await supabase.from("workspace_onboarding" as any).upsert({
          workspace_id: currentWorkspace.id,
          business_type: answers.businessType,
          custom_business_type: answers.customBusinessType || null,
          success_definition: answers.successDefinition,
          process_description: answers.processDescription,
          channels: answers.channels,
          revenue_model: answers.revenueModel || null,
          team_size: answers.teamSize || null,
          sales_complexity: answers.salesComplexity || null,
          primary_objective: answers.primaryObjective || null,
          computed_segment: segment || null,
          onboarding_duration_ms: durationMs || null,
          completed_at: new Date().toISOString(),
          skipped: false,
        } as any, { onConflict: 'workspace_id' });

        // Fire-and-forget: generate first Daily Brief
        supabase.functions.invoke("daily-revenue-brief", {
          body: { workspace_id: currentWorkspace.id },
        }).catch((err) => console.warn("Daily Brief auto-gen failed (non-blocking):", err));
        
        updateStep("finalize", "done");

        setTimeout(() => {
          toast.success("Configuração aplicada com sucesso!");
          onComplete();
        }, 1000);

      } catch (error) {
        console.error("Error applying configuration:", error);
        toast.error("Erro ao aplicar configuração. Algumas configurações podem não ter sido criadas.");
        setTimeout(onComplete, 2000);
      }
    };

    applyConfiguration();
  }, [config, currentWorkspace, user, onComplete]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="flex flex-col items-center justify-center py-16 space-y-8 w-full max-w-md">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-foreground">
            A aplicar configuração
          </h2>
          <p className="text-muted-foreground">
            Estamos a configurar o teu CRM...
          </p>
        </div>

        <div className="w-full space-y-3">
          {steps.map((step) => (
            <div
              key={step.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border"
            >
              <div className="w-6 h-6 flex items-center justify-center">
                {step.status === "pending" && (
                  <div className="w-2 h-2 rounded-full bg-muted" />
                )}
                {step.status === "loading" && (
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                )}
                {step.status === "done" && (
                  <Check className="w-4 h-4 text-green-500" />
                )}
                {step.status === "error" && (
                  <AlertCircle className="w-4 h-4 text-destructive" />
                )}
              </div>
              <span
                className={
                  step.status === "done"
                    ? "text-muted-foreground line-through"
                    : step.status === "loading"
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
                }
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
