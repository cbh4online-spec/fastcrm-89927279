import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PipelineStage {
  name: string;
  description: string;
  position: number;
  color: string;
}

export interface CustomFieldConfig {
  name: string;
  field_type: "text" | "number" | "select" | "date" | "boolean";
  required: boolean;
  options?: string[];
  reason: string;
}

export interface FormFieldConfig {
  name: string;
  type: "text" | "email" | "phone" | "select" | "textarea";
  required: boolean;
  options?: string[];
}

export interface FormConfig {
  name: string;
  description: string;
  fields: FormFieldConfig[];
}

export interface AutomationConfig {
  name: string;
  description: string;
  trigger: string;
  actions: string[];
}

export interface DashboardKPI {
  name: string;
  metric: string;
  priority: "high" | "medium" | "low";
}

export interface OnboardingConfig {
  pipeline: {
    name: string;
    stages: PipelineStage[];
  };
  customFields: {
    leads: CustomFieldConfig[];
    contacts: CustomFieldConfig[];
    companies: CustomFieldConfig[];
    opportunities: CustomFieldConfig[];
  };
  forms: FormConfig[];
  automations: AutomationConfig[];
  dashboardKPIs: DashboardKPI[];
  explanations: {
    pipeline: string;
    customFields: string;
    forms: string;
    automations: string;
    general: string;
  };
}

export interface OnboardingAnswers {
  businessType: string;
  customBusinessType?: string;
  successDefinition: string;
  processDescription: string;
  channels: string[];
}

export type OnboardingStep = "business" | "success" | "process" | "channels" | "generating" | "preview" | "applying" | "complete";

export function useIntelligentOnboarding() {
  const [step, setStep] = useState<OnboardingStep>("business");
  const [answers, setAnswers] = useState<OnboardingAnswers>({
    businessType: "",
    customBusinessType: "",
    successDefinition: "",
    processDescription: "",
    channels: [],
  });
  const [config, setConfig] = useState<OnboardingConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateAnswer = <K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const nextStep = () => {
    const steps: OnboardingStep[] = ["business", "success", "process", "channels", "generating", "preview", "applying", "complete"];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const steps: OnboardingStep[] = ["business", "success", "process", "channels"];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  const generateConfig = async () => {
    setIsLoading(true);
    setError(null);
    setStep("generating");

    try {
      const { data, error: fnError } = await supabase.functions.invoke("ai-onboarding-setup", {
        body: answers,
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setConfig(data.config);
      setStep("preview");
    } catch (err) {
      console.error("Error generating config:", err);
      setError(err instanceof Error ? err.message : "Erro ao gerar configuração");
      setStep("process"); // Go back to process step on error
      toast.error("Erro ao gerar configuração. Tenta novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const updateConfig = (newConfig: OnboardingConfig) => {
    setConfig(newConfig);
  };

  const removeStage = (index: number) => {
    if (!config) return;
    const newStages = config.pipeline.stages.filter((_, i) => i !== index);
    // Reorder positions
    newStages.forEach((stage, i) => {
      stage.position = i + 1;
    });
    setConfig({
      ...config,
      pipeline: { ...config.pipeline, stages: newStages },
    });
  };

  const removeCustomField = (entity: keyof OnboardingConfig["customFields"], index: number) => {
    if (!config) return;
    setConfig({
      ...config,
      customFields: {
        ...config.customFields,
        [entity]: config.customFields[entity].filter((_, i) => i !== index),
      },
    });
  };

  const removeForm = (index: number) => {
    if (!config) return;
    setConfig({
      ...config,
      forms: config.forms.filter((_, i) => i !== index),
    });
  };

  const removeAutomation = (index: number) => {
    if (!config) return;
    setConfig({
      ...config,
      automations: config.automations.filter((_, i) => i !== index),
    });
  };

  const removeKPI = (index: number) => {
    if (!config) return;
    setConfig({
      ...config,
      dashboardKPIs: config.dashboardKPIs.filter((_, i) => i !== index),
    });
  };

  const reset = () => {
    setStep("business");
    setAnswers({
      businessType: "",
      customBusinessType: "",
      successDefinition: "",
      processDescription: "",
      channels: [],
    });
    setConfig(null);
    setError(null);
  };

  return {
    step,
    setStep,
    answers,
    updateAnswer,
    config,
    updateConfig,
    isLoading,
    error,
    nextStep,
    prevStep,
    generateConfig,
    removeStage,
    removeCustomField,
    removeForm,
    removeAutomation,
    removeKPI,
    reset,
  };
}
