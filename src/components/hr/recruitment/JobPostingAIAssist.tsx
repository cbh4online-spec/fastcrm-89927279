import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import type { JobOpeningFormValues } from "@/schemas/hr/jobOpeningSchema";

type AiAction = "generate_description" | "suggest_salary" | "generate_requirements" | "generate_all";

interface Props {
  form: UseFormReturn<JobOpeningFormValues>;
}

export function JobPostingAIAssist({ form }: Props) {
  const { currentWorkspace } = useWorkspace();
  const [loading, setLoading] = useState<AiAction | null>(null);

  const getFormContext = () => ({
    title: form.getValues("title"),
    location: form.getValues("location"),
    employment_type: form.getValues("employment_type"),
    remote_option: form.getValues("remote_option"),
    description: form.getValues("description"),
    workspace_id: currentWorkspace?.id,
  });

  const run = async (action: AiAction) => {
    const ctx = getFormContext();
    if (!ctx.title?.trim()) {
      toast.error("Preencha o título da vaga primeiro.");
      return;
    }
    if (!ctx.workspace_id) return;

    setLoading(action);
    try {
      const { data, error } = await supabase.functions.invoke("hr-job-ai-assist", {
        body: { action, ...ctx },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      const r = data?.result;
      if (!r) return;

      if (action === "generate_description" || action === "generate_all") {
        if (r.description) form.setValue("description", r.description, { shouldDirty: true });
      }
      if (action === "suggest_salary" || action === "generate_all") {
        if (r.salary_min != null) form.setValue("salary_min", r.salary_min, { shouldDirty: true });
        if (r.salary_max != null) form.setValue("salary_max", r.salary_max, { shouldDirty: true });
        if (r.reasoning && action === "suggest_salary") toast.info(r.reasoning);
      }
      if (action === "generate_requirements" || action === "generate_all") {
        if (r.requirements) form.setValue("requirements_text", r.requirements, { shouldDirty: true });
        if (r.nice_to_have) form.setValue("nice_to_have_text", r.nice_to_have, { shouldDirty: true });
      }

      toast.success("Conteúdo gerado com sucesso!");
    } catch (err: any) {
      console.error("AI assist error:", err);
      toast.error("Erro ao gerar conteúdo com IA.");
    } finally {
      setLoading(null);
    }
  };

  return { loading, run };
}

interface AIButtonProps {
  action: AiAction;
  loading: AiAction | null;
  onRun: (action: AiAction) => void;
  label: string;
  className?: string;
}

export function AIFieldButton({ action, loading, onRun, label, className }: AIButtonProps) {
  const isLoading = loading === action || loading === "generate_all";
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={`h-6 px-2 text-xs gap-1 text-primary hover:text-primary ${className ?? ""}`}
      disabled={!!loading}
      onClick={() => onRun(action)}
    >
      {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
      {label}
    </Button>
  );
}

export function AIGenerateAllButton({ loading, onRun }: { loading: AiAction | null; onRun: (a: AiAction) => void }) {
  const isLoading = loading === "generate_all";
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-1.5"
      disabled={!!loading}
      onClick={() => onRun("generate_all")}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      Gerar tudo com IA
    </Button>
  );
}
