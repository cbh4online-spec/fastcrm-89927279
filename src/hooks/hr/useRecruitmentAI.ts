import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type AIAction =
  | "screen_cv"
  | "generate_description"
  | "generate_questions"
  | "summarize_candidate"
  | "generate_email";

interface AIRequest {
  action: AIAction;
  payload: Record<string, unknown>;
}

interface AIResponse {
  result: any;
  error?: string;
}

export function useRecruitmentAI() {
  const [loading, setLoading] = useState(false);

  const invoke = async (request: AIRequest): Promise<AIResponse> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("hr-recruitment-ai", {
        body: request,
      });
      if (error) throw error;

      if (data?.error) {
        if (data.error.includes("Rate limit")) {
          toast.error("Limite de pedidos atingido. Tente novamente em breve.");
        } else if (data.error.includes("Payment")) {
          toast.error("Créditos de IA esgotados. Adicione créditos nas definições.");
        } else {
          toast.error(data.error);
        }
        return { result: null, error: data.error };
      }

      return { result: data?.result ?? data };
    } catch (err: any) {
      console.error("AI error:", err);
      toast.error("Erro ao processar pedido de IA");
      return { result: null, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const screenCV = (cvText: string, jobRequirements: string, jobTitle: string) =>
    invoke({
      action: "screen_cv",
      payload: { cv_text: cvText, job_requirements: jobRequirements, job_title: jobTitle },
    });

  const generateDescription = (title: string, department?: string, context?: string) =>
    invoke({
      action: "generate_description",
      payload: { title, department, context },
    });

  const generateQuestions = (candidateProfile: string, jobRequirements: string) =>
    invoke({
      action: "generate_questions",
      payload: { candidate_profile: candidateProfile, job_requirements: jobRequirements },
    });

  const summarizeCandidate = (candidateData: Record<string, unknown>) =>
    invoke({
      action: "summarize_candidate",
      payload: { candidate_data: candidateData },
    });

  const generateEmail = (
    emailType: string,
    candidateName: string,
    jobTitle: string,
    context?: string
  ) =>
    invoke({
      action: "generate_email",
      payload: { email_type: emailType, candidate_name: candidateName, job_title: jobTitle, context },
    });

  return {
    loading,
    screenCV,
    generateDescription,
    generateQuestions,
    summarizeCandidate,
    generateEmail,
  };
}
