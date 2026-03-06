import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { emitKernelEvent } from "@/lib/kernelEmitter";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { 
  CreditProposal, 
  FinancialProfile, 
  AIViabilityAnalysis,
  BankRecommendation,
  OptimizationSuggestion 
} from "../types";

interface AnalyzeViabilityInput {
  proposal: CreditProposal;
  financialProfile?: FinancialProfile;
  bankPartners?: Array<{ id: string; name: string; terms: unknown[] }>;
}

interface ExtractDocumentInput {
  document_type: string;
  file_url: string;
  file_name: string;
}

interface ExtractedDocumentData {
  document_type: string;
  extracted_fields: Record<string, unknown>;
  confidence: number;
  warnings?: string[];
}

interface ProposalCopilotInput {
  proposal: CreditProposal;
  financialProfile?: FinancialProfile;
  question?: string;
  action?: "optimize" | "next_steps" | "objection_handling" | "comparison";
}

interface CopilotResponse {
  response: string;
  suggestions?: string[];
  actions?: Array<{
    type: string;
    description: string;
    priority: "high" | "medium" | "low";
  }>;
}

export function useCreditAI() {
  const { currentWorkspace } = useWorkspace();

  // AI Viability Analysis
  const analyzeViability = useMutation({
    mutationFn: async (input: AnalyzeViabilityInput): Promise<AIViabilityAnalysis> => {
      const { data, error } = await supabase.functions.invoke("ai-credit-analysis", {
        body: {
          mode: "viability",
          proposal: input.proposal,
          financialProfile: input.financialProfile,
          bankPartners: input.bankPartners,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Erro na análise de viabilidade");
      
      return data.analysis;
    },
    onError: (error: Error) => {
      if (error.message.includes("429")) {
        toast.error("Limite de pedidos excedido", {
          description: "Aguarde alguns segundos e tente novamente.",
        });
      } else if (error.message.includes("402")) {
        toast.error("Créditos IA esgotados", {
          description: "Adicione créditos para continuar a usar a IA.",
        });
      } else {
        toast.error("Erro na análise IA", { description: error.message });
      }
    },
  });

  // AI Bank Matching
  const matchBanks = useMutation({
    mutationFn: async (input: {
      proposal: CreditProposal;
      financialProfile?: FinancialProfile;
      bankPartners: Array<{ id: string; name: string; terms: unknown[] }>;
    }): Promise<BankRecommendation[]> => {
      const { data, error } = await supabase.functions.invoke("ai-credit-analysis", {
        body: {
          mode: "bank_matching",
          proposal: input.proposal,
          financialProfile: input.financialProfile,
          bankPartners: input.bankPartners,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Erro no matching bancário");
      
      return data.recommendations;
    },
    onError: (error: Error) => {
      toast.error("Erro no matching IA", { description: error.message });
    },
  });

  // AI Document Extraction (OCR)
  const extractDocumentData = useMutation({
    mutationFn: async (input: ExtractDocumentInput): Promise<ExtractedDocumentData> => {
      const { data, error } = await supabase.functions.invoke("ai-credit-analysis", {
        body: {
          mode: "extract_document",
          document_type: input.document_type,
          file_url: input.file_url,
          file_name: input.file_name,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Erro na extração de documento");
      
      return data.extracted;
    },
    onSuccess: (data, variables) => {
      console.log(`[AI-DOCINT] Document extracted successfully type=${variables.document_type} confidence=${data.confidence}`);
      toast.success("Documento processado com sucesso");
      if (currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'DOCINT.EXTRACTED',
          entity_kind: 'credit_document',
          entity_id: variables.file_name,
          source_module: 'ai-docint',
          payload: { document_type: variables.document_type, confidence: data.confidence },
        });
      }
    },
    onError: (error: Error) => {
      console.error(`[AI-DOCINT] Document extraction failed: ${error.message}`);
      toast.error("Erro na extração", { description: error.message });
    },
  });

  // AI Proposal Copilot
  const askCopilot = useMutation({
    mutationFn: async (input: ProposalCopilotInput): Promise<CopilotResponse> => {
      const { data, error } = await supabase.functions.invoke("ai-credit-analysis", {
        body: {
          mode: "copilot",
          proposal: input.proposal,
          financialProfile: input.financialProfile,
          question: input.question,
          action: input.action,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Erro no copilot");
      
      return data.response;
    },
    onError: (error: Error) => {
      toast.error("Erro no Copilot", { description: error.message });
    },
  });

  // Get optimization suggestions
  const getOptimizations = useMutation({
    mutationFn: async (input: {
      proposal: CreditProposal;
      financialProfile?: FinancialProfile;
    }): Promise<OptimizationSuggestion[]> => {
      const { data, error } = await supabase.functions.invoke("ai-credit-analysis", {
        body: {
          mode: "optimize",
          proposal: input.proposal,
          financialProfile: input.financialProfile,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Erro nas sugestões");
      
      return data.suggestions;
    },
    onError: (error: Error) => {
      toast.error("Erro nas sugestões", { description: error.message });
    },
  });

  return {
    analyzeViability,
    matchBanks,
    extractDocumentData,
    askCopilot,
    getOptimizations,
    isLoading:
      analyzeViability.isPending ||
      matchBanks.isPending ||
      extractDocumentData.isPending ||
      askCopilot.isPending ||
      getOptimizations.isPending,
  };
}
