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
}

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

  const executeCommand = useCallback(async (command: SlashCommand, args: string) => {
    setIsExecuting(true);
    setResult({ command: command.command, title: command.label, content: "A processar...", loading: true });

    try {
      switch (command.id) {
        // === NEW: /brief → invoke strategic-intelligence-brief directly ===
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

        // === NEW: /forecast → structured query to ask-fastcrm ===
        case "forecast":
        case "prever-receita": {
          if (!currentWorkspace?.id) {
            setResult({ command: command.command, title: "📈 Previsão", content: "Workspace não encontrado.", loading: false });
            break;
          }
          try {
            const { data, error } = await supabase.functions.invoke("ask-fastcrm", {
              body: { question: "forecast summary previsão receita" },
              headers: { "X-Workspace-Id": currentWorkspace.id },
            });
            if (error) throw error;
            const headline = data?.answer?.headline || "Previsão de receita";
            const subtext = data?.answer?.subtext || "";
            setResult({ command: command.command, title: `📈 ${headline}`, content: subtext || headline, loading: false, data });
          } catch {
            setResult({ command: command.command, title: "📈 Previsão", content: "Erro ao obter previsão.", loading: false });
          }
          break;
        }

        // === NEW: /leads → ask-fastcrm with leads query ===
        case "leads": {
          if (!currentWorkspace?.id) break;
          try {
            const { data, error } = await supabase.functions.invoke("ask-fastcrm", {
              body: { question: "leads sem resposta activos sem atividade" },
              headers: { "X-Workspace-Id": currentWorkspace.id },
            });
            if (error) throw error;
            const headline = data?.answer?.headline || "Leads activos";
            const subtext = data?.answer?.subtext || "";
            setResult({ command: command.command, title: `👥 ${headline}`, content: subtext || headline, loading: false, data });
          } catch {
            setResult({ command: command.command, title: "👥 Leads", content: "Erro ao obter dados de leads.", loading: false });
          }
          break;
        }

        // === NEW: /pipeline → ask-fastcrm pipeline summary ===
        case "pipeline":
        case "resumir-pipeline": {
          if (!currentWorkspace?.id) break;
          try {
            const { data, error } = await supabase.functions.invoke("ask-fastcrm", {
              body: { question: "pipeline summary resumo pipeline health" },
              headers: { "X-Workspace-Id": currentWorkspace.id },
            });
            if (error) throw error;
            const headline = data?.answer?.headline || "Pipeline";
            const subtext = data?.answer?.subtext || "";
            setResult({ command: command.command, title: `📊 ${headline}`, content: subtext || headline, loading: false, data });
          } catch {
            setResult({ command: command.command, title: "📊 Pipeline", content: "Erro ao obter dados do pipeline.", loading: false });
          }
          break;
        }

        // === NEW: /drift → ask-fastcrm context drift ===
        case "drift": {
          if (!currentWorkspace?.id) break;
          try {
            const { data, error } = await supabase.functions.invoke("ask-fastcrm", {
              body: { question: "deals sem atividade sem próximo passo contexto desactualizado" },
              headers: { "X-Workspace-Id": currentWorkspace.id },
            });
            if (error) throw error;
            const headline = data?.answer?.headline || "Context Drift";
            const subtext = data?.answer?.subtext || "";
            setResult({ command: command.command, title: `⚠️ ${headline}`, content: subtext || headline, loading: false, data });
          } catch {
            setResult({ command: command.command, title: "⚠️ Drift", content: "Erro ao verificar contexto.", loading: false });
          }
          break;
        }

        // === NEW: /tarefas → navigate to tasks ===
        case "tarefas":
        case "criar-followup": {
          navigate("/dashboard/tasks");
          toast.info("A abrir tarefas...");
          setResult(null);
          break;
        }

        // === NEW: /kernel → navigate to kernel decisions ===
        case "kernel": {
          navigate("/dashboard/kernel");
          toast.info("A abrir decisões do Kernel...");
          setResult(null);
          break;
        }

        case "prioridades": {
          const actions = intelligenceData?.recommended_actions;
          if (actions && actions.length > 0) {
            const list = actions.slice(0, 5).map((a, i) => `${i + 1}. **${a.deal_title}** — ${a.action} (${a.priority})`).join("\n");
            setResult({ command: command.command, title: "🎯 Prioridades do Dia", content: list, loading: false });
          } else {
            setResult({ command: command.command, title: "🎯 Prioridades", content: "Nenhuma acção prioritária detectada. Pipeline limpo!", loading: false });
          }
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
