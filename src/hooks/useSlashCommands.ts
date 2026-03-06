import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAskAI } from "./useAskAI";
import { useIntelligencePanel } from "./useIntelligencePanel";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface SlashCommand {
  id: string;
  command: string;
  label: string;
  description: string;
  icon: string;
  category: "pipeline" | "leads" | "revenue" | "actions" | "intelligence";
}

export const SLASH_COMMANDS: SlashCommand[] = [
  { id: "brief", command: "/brief", label: "Brief Executivo", description: "Resumo executivo gerado pela IA estratégica", icon: "FileText", category: "intelligence" },
  { id: "forecast", command: "/forecast", label: "Previsão de Receita", description: "Previsão de receita com cenários", icon: "TrendingUp", category: "revenue" },
  { id: "leads", command: "/leads", label: "Estado dos Leads", description: "Leads activos e sem resposta", icon: "Users", category: "leads" },
  { id: "pipeline", command: "/pipeline", label: "Análise do Pipeline", description: "Resumo do estado actual do pipeline", icon: "BarChart3", category: "pipeline" },
  { id: "risk", command: "/risk", label: "Deals em Risco", description: "Oportunidades em risco com ações sugeridas", icon: "AlertTriangle", category: "pipeline" },
  { id: "stalled", command: "/stalled", label: "Deals Parados", description: "Oportunidades paradas na etapa actual", icon: "Target", category: "pipeline" },
  { id: "priorities", command: "/priorities", label: "Prioridades do Dia", description: "Acções prioritárias combinadas", icon: "Target", category: "actions" },
  { id: "drift", command: "/drift", label: "Contexto Drift", description: "Contexto estratégico desactualizado", icon: "AlertTriangle", category: "intelligence" },
  { id: "tarefas", command: "/tarefas", label: "Tarefas de Hoje", description: "Tarefas e follow-ups pendentes", icon: "CheckSquare", category: "actions" },
  { id: "kernel", command: "/kernel", label: "Decisões do Kernel", description: "Decisões e acções pendentes do Kernel", icon: "Brain", category: "intelligence" },
  // Legacy commands
  { id: "resumir-pipeline", command: "/resumir pipeline", label: "Resumir Pipeline", description: "Resumo do estado actual do pipeline", icon: "BarChart3", category: "pipeline" },
  { id: "prioridades", command: "/prioridades", label: "Prioridades do Dia", description: "Acções prioritárias sugeridas pela IA", icon: "Target", category: "actions" },
  { id: "analisar-lead", command: "/analisar lead", label: "Analisar Lead", description: "Classificar e analisar um lead específico", icon: "Users", category: "leads" },
  { id: "prever-receita", command: "/prever receita", label: "Prever Receita", description: "Previsão de receita com cenários", icon: "TrendingUp", category: "revenue" },
  { id: "criar-followup", command: "/criar follow-up", label: "Criar Follow-up", description: "Criar tarefa de follow-up rápida", icon: "CheckSquare", category: "actions" },
  { id: "gerar-proposta", command: "/gerar proposta", label: "Gerar Proposta", description: "Navegar para criação de proposta", icon: "FileText", category: "actions" },
];

export interface SlashCommandResult {
  command: string;
  title: string;
  content: string;
  data?: Record<string, unknown>;
  loading: boolean;
  type?: "brief" | "text"; // structured type for rendering
  items?: any[];
  actions?: any[];
}

// Map of slash command IDs to their ask-fastcrm question strings
const SLASH_TO_QUESTION: Record<string, string> = {
  forecast: "previsão de receita forecast summary",
  "prever-receita": "previsão de receita forecast summary",
  leads: "leads sem resposta activos sem atividade",
  pipeline: "pipeline summary resumo pipeline health",
  "resumir-pipeline": "pipeline summary resumo pipeline health",
  drift: "contexto desatualizado drift overview",
  risk: "deals em risco quais estão em risco",
  stalled: "deals parados estagnados stuck",
  priorities: "prioridades do dia o que devo fazer hoje",
  prioridades: "prioridades do dia o que devo fazer hoje",
  tarefas: "tarefas do dia prioridades",
  kernel: "decisões pendentes kernel decisions",
};

export function useSlashCommands() {
  const [result, setResult] = useState<SlashCommandResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const navigate = useNavigate();
  const { summarizeConversation, suggestNextActions } = useAskAI();
  const { data: intelligenceData, refetch: refetchIntelligence } = useIntelligencePanel();
  const { currentWorkspace } = useWorkspace();

  const parseSlashCommand = useCallback((input: string): { command: SlashCommand | null; args: string } => {
    const trimmed = input.trim().toLowerCase();
    // Sort by command length descending so longer commands match first
    const sorted = [...SLASH_COMMANDS].sort((a, b) => b.command.length - a.command.length);
    for (const cmd of sorted) {
      if (trimmed.startsWith(cmd.command)) {
        return { command: cmd, args: trimmed.slice(cmd.command.length).trim() };
      }
    }
    return { command: null, args: "" };
  }, []);

  const isSlashInput = useCallback((input: string): boolean => {
    return input.trim().startsWith("/");
  }, []);

  const getFilteredCommands = useCallback((input: string): SlashCommand[] => {
    const trimmed = input.trim().toLowerCase();
    if (trimmed === "/") return SLASH_COMMANDS;
    return SLASH_COMMANDS.filter(cmd => cmd.command.startsWith(trimmed));
  }, []);

  // Helper: call ask-fastcrm and return structured result
  const callAskFastCRM = async (question: string, command: SlashCommand, emoji: string): Promise<SlashCommandResult> => {
    if (!currentWorkspace?.id) {
      return { command: command.command, title: `${emoji} ${command.label}`, content: "Workspace não encontrado.", loading: false };
    }
    try {
      const { data, error } = await supabase.functions.invoke("ask-fastcrm", {
        body: { question },
        headers: { "X-Workspace-Id": currentWorkspace.id },
      });
      if (error) throw error;
      const headline = data?.answer?.headline || command.label;
      const subtext = data?.answer?.subtext || "";
      return {
        command: command.command,
        title: `${emoji} ${headline}`,
        content: subtext || headline,
        loading: false,
        data,
        items: data?.items,
        actions: data?.actions,
      };
    } catch {
      return { command: command.command, title: `${emoji} ${command.label}`, content: `Erro ao obter dados.`, loading: false };
    }
  };

  const executeCommand = useCallback(async (command: SlashCommand, args: string) => {
    setIsExecuting(true);
    setResult({ command: command.command, title: command.label, content: "A processar...", loading: true });

    try {
      switch (command.id) {
        // === /brief → invoke strategic-intelligence-brief directly ===
        case "brief": {
          if (!currentWorkspace?.id) {
            setResult({ command: command.command, title: "📋 Brief Executivo", content: "Workspace não encontrado.", loading: false });
            break;
          }
          try {
            const { data, error } = await supabase.functions.invoke("strategic-intelligence-brief", {
              body: { workspace_id: currentWorkspace.id },
            });
            if (error) throw error;
            const summary = data?.brief?.summary || data?.summary || "Sem dados suficientes para gerar o brief.";
            const actions = data?.brief?.priority_actions || data?.priority_actions || [];
            const actionsText = actions.length > 0
              ? "\n\n**Ações prioritárias:**\n" + actions.map((a: string, i: number) => `${i + 1}. ${a}`).join("\n")
              : "";
            setResult({
              command: command.command,
              title: "📋 Brief Executivo",
              content: summary + actionsText,
              data: data as Record<string, unknown>,
              loading: false,
              type: "brief",
            });
          } catch (err: any) {
            setResult({ command: command.command, title: "📋 Brief Executivo", content: "Erro ao gerar o brief. Tenta novamente.", loading: false });
          }
          break;
        }

        // === Commands routed to ask-fastcrm with structured results ===
        case "forecast":
        case "prever-receita": {
          const r = await callAskFastCRM(SLASH_TO_QUESTION[command.id] || "forecast", command, "📈");
          setResult(r);
          break;
        }
        case "leads": {
          const r = await callAskFastCRM(SLASH_TO_QUESTION.leads, command, "👥");
          setResult(r);
          break;
        }
        case "pipeline":
        case "resumir-pipeline": {
          const r = await callAskFastCRM(SLASH_TO_QUESTION.pipeline, command, "📊");
          setResult(r);
          break;
        }
        case "drift": {
          const r = await callAskFastCRM(SLASH_TO_QUESTION.drift, command, "⚠️");
          setResult(r);
          break;
        }
        case "risk": {
          const r = await callAskFastCRM(SLASH_TO_QUESTION.risk, command, "🔴");
          setResult(r);
          break;
        }
        case "stalled": {
          const r = await callAskFastCRM(SLASH_TO_QUESTION.stalled, command, "⏸️");
          setResult(r);
          break;
        }
        case "priorities":
        case "prioridades": {
          const r = await callAskFastCRM(SLASH_TO_QUESTION.priorities, command, "🎯");
          setResult(r);
          break;
        }
        case "tarefas":
        case "criar-followup": {
          const r = await callAskFastCRM(SLASH_TO_QUESTION.tarefas, command, "✅");
          setResult(r);
          break;
        }
        case "kernel": {
          const r = await callAskFastCRM(SLASH_TO_QUESTION.kernel, command, "🧠");
          setResult(r);
          break;
        }
        case "analisar-lead": {
          if (!args) {
            setResult({ command: command.command, title: "🔍 Analisar Lead", content: "Use: `/analisar lead [nome]` para buscar e classificar um lead.", loading: false });
          } else {
            setResult({ command: command.command, title: `🔍 Analisar: ${args}`, content: `A pesquisar "${args}"... Use a barra de pesquisa Ask para queries detalhadas sobre este lead.`, loading: false });
          }
          break;
        }
        case "gerar-proposta": {
          navigate("/dashboard/proposals");
          toast.info("A abrir propostas...");
          setResult(null);
          break;
        }
        default:
          setResult({ command: command.command, title: command.label, content: "Comando não implementado.", loading: false });
      }
    } catch (err) {
      setResult({ command: command.command, title: "Erro", content: "Ocorreu um erro ao executar o comando.", loading: false });
    } finally {
      setIsExecuting(false);
    }
  }, [intelligenceData, refetchIntelligence, navigate, currentWorkspace?.id]);

  const clearResult = useCallback(() => setResult(null), []);

  return {
    result,
    isExecuting,
    parseSlashCommand,
    isSlashInput,
    getFilteredCommands,
    executeCommand,
    clearResult,
    SLASH_COMMANDS,
  };
}
