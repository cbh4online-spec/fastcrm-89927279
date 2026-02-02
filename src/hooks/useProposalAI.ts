import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ScopeData, TimelinePhase, ReferencesData } from "@/types/proposal";

interface ProposalItem {
  name: string;
  quantity: number;
  unit_price: number;
  description?: string;
  category?: string;
}

interface ProposalData {
  id: string;
  title: string;
  price: number;
  status: string;
  items: ProposalItem[];
}

interface OpportunityData {
  title: string;
  value: number;
  stage: string;
  lead?: { name: string; company?: string };
}

interface ClientData {
  name: string;
  type: "contact" | "company";
  industry?: string;
  previousProposals?: number;
}

export interface AnalysisResult {
  successScore: number;
  closeProbability: number;
  confidence: number;
  positiveFactors: Array<{
    factor: string;
    impact: "high" | "medium" | "low";
    description: string;
  }>;
  riskFactors: Array<{
    factor: string;
    severity: "high" | "medium" | "low";
    mitigation: string;
  }>;
  recommendations: Array<{
    action: string;
    priority: "now" | "soon" | "later";
    expectedImpact: string;
  }>;
  missingElements: string[];
  strengthAreas: string[];
  summary: string;
}

export interface ScopeResult {
  objectives: string;
  deliverables: string[];
  exclusions: string[];
  assumptions: string;
  confidence: number;
  reasoning: string;
}

export interface TimelineResult {
  phases: Array<{
    type: "phase" | "milestone";
    title: string;
    duration?: number;
    week?: number;
    description: string;
  }>;
  totalDuration: number;
  confidence: number;
  reasoning: string;
}

export interface ConditionsResult {
  paymentConditions: string;
  validityDays: number;
  notes: string;
  reasoning: string;
  confidence: number;
}

export interface ReferencesResult {
  projects: Array<{ title: string; description: string }>;
  testimonial: { quote: string; author: string; company: string; role: string };
  certifications: string[];
  reasoning: string;
  confidence: number;
}

type AIMode = "analyze" | "generate_scope" | "generate_timeline" | "suggest_conditions" | "suggest_references" | "copilot";

async function callAI<T>(
  mode: AIMode,
  proposalData: ProposalData,
  opportunityData?: OpportunityData,
  clientData?: ClientData,
  existingData?: Record<string, unknown>,
  question?: string
): Promise<T> {
  const { data, error } = await supabase.functions.invoke("ai-proposal-assistant", {
    body: {
      mode,
      proposalData,
      opportunityData,
      clientData,
      existingData,
      question,
    },
  });

  if (error) {
    throw new Error(error.message || "Erro ao comunicar com a IA");
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data as T;
}

export function useProposalAI() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingScope, setIsGeneratingScope] = useState(false);
  const [isGeneratingTimeline, setIsGeneratingTimeline] = useState(false);
  const [isSuggestingConditions, setIsSuggestingConditions] = useState(false);
  const [isSuggestingReferences, setIsSuggestingReferences] = useState(false);
  const [isCopilotLoading, setIsCopilotLoading] = useState(false);

  const analyzeProposal = useCallback(async (
    proposalData: ProposalData,
    opportunityData?: OpportunityData,
    clientData?: ClientData
  ): Promise<AnalysisResult | null> => {
    setIsAnalyzing(true);
    try {
      const result = await callAI<AnalysisResult>(
        "analyze",
        proposalData,
        opportunityData,
        clientData
      );
      return result;
    } catch (error) {
      console.error("analyzeProposal error:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao analisar proposta");
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const generateScope = useCallback(async (
    proposalData: ProposalData,
    opportunityData?: OpportunityData
  ): Promise<ScopeResult | null> => {
    setIsGeneratingScope(true);
    try {
      const result = await callAI<ScopeResult>(
        "generate_scope",
        proposalData,
        opportunityData
      );
      return result;
    } catch (error) {
      console.error("generateScope error:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao gerar âmbito");
      return null;
    } finally {
      setIsGeneratingScope(false);
    }
  }, []);

  const generateTimeline = useCallback(async (
    proposalData: ProposalData,
    existingScope?: ScopeData
  ): Promise<TimelineResult | null> => {
    setIsGeneratingTimeline(true);
    try {
      const result = await callAI<TimelineResult>(
        "generate_timeline",
        proposalData,
        undefined,
        undefined,
        existingScope ? { scope: existingScope } : undefined
      );
      return result;
    } catch (error) {
      console.error("generateTimeline error:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao gerar cronograma");
      return null;
    } finally {
      setIsGeneratingTimeline(false);
    }
  }, []);

  const suggestConditions = useCallback(async (
    proposalData: ProposalData,
    clientData?: ClientData
  ): Promise<ConditionsResult | null> => {
    setIsSuggestingConditions(true);
    try {
      const result = await callAI<ConditionsResult>(
        "suggest_conditions",
        proposalData,
        undefined,
        clientData
      );
      return result;
    } catch (error) {
      console.error("suggestConditions error:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao sugerir condições");
      return null;
    } finally {
      setIsSuggestingConditions(false);
    }
  }, []);

  const suggestReferences = useCallback(async (
    proposalData: ProposalData,
    clientData?: ClientData
  ): Promise<ReferencesResult | null> => {
    setIsSuggestingReferences(true);
    try {
      const result = await callAI<ReferencesResult>(
        "suggest_references",
        proposalData,
        undefined,
        clientData
      );
      return result;
    } catch (error) {
      console.error("suggestReferences error:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao sugerir referências");
      return null;
    } finally {
      setIsSuggestingReferences(false);
    }
  }, []);

  const askCopilot = useCallback(async (
    question: string,
    proposalData: ProposalData,
    opportunityData?: OpportunityData,
    clientData?: ClientData,
    existingData?: Record<string, unknown>
  ): Promise<string | null> => {
    setIsCopilotLoading(true);
    try {
      const result = await callAI<{ response: string }>(
        "copilot",
        proposalData,
        opportunityData,
        clientData,
        existingData,
        question
      );
      return result.response;
    } catch (error) {
      console.error("askCopilot error:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao processar pergunta");
      return null;
    } finally {
      setIsCopilotLoading(false);
    }
  }, []);

  return {
    // Loading states
    isAnalyzing,
    isGeneratingScope,
    isGeneratingTimeline,
    isSuggestingConditions,
    isSuggestingReferences,
    isCopilotLoading,
    isLoading: isAnalyzing || isGeneratingScope || isGeneratingTimeline || isSuggestingConditions || isSuggestingReferences || isCopilotLoading,
    
    // Actions
    analyzeProposal,
    generateScope,
    generateTimeline,
    suggestConditions,
    suggestReferences,
    askCopilot,
  };
}
