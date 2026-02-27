import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAskAI } from "./useAskAI";
import { useIntelligencePanel } from "./useIntelligencePanel";
import { toast } from "sonner";

export interface SlashCommand {
  id: string;
  command: string;
  label: string;
  description: string;
  icon: string;
  category: "pipeline" | "leads" | "revenue" | "actions";
}

export const SLASH_COMMANDS: SlashCommand[] = [
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
}

export function useSlashCommands() {
  const [result, setResult] = useState<SlashCommandResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const navigate = useNavigate();
  const { summarizeConversation, suggestNextActions } = useAskAI();
  const { data: intelligenceData, refetch: refetchIntelligence } = useIntelligencePanel();

  const parseSlashCommand = useCallback((input: string): { command: SlashCommand | null; args: string } => {
    const trimmed = input.trim().toLowerCase();
    for (const cmd of SLASH_COMMANDS) {
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
        case "resumir-pipeline": {
          await refetchIntelligence();
          const data = intelligenceData;
          if (data) {
            setResult({
              command: command.command,
              title: "📊 Resumo do Pipeline",
              content: `${data.total_open} deals abertos • Health médio: ${data.avg_health_score?.toFixed(0) || "N/A"}% • Healthy: ${data.health_distribution?.HEALTHY || 0} • Watch: ${data.health_distribution?.WATCH || 0} • At Risk: ${data.health_distribution?.AT_RISK || 0}`,
              data: data as unknown as Record<string, unknown>,
              loading: false,
            });
          } else {
            setResult({ command: command.command, title: "📊 Pipeline", content: "Sem dados disponíveis. Tente novamente.", loading: false });
          }
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
        case "prever-receita": {
          navigate("/dashboard/reports/forecasts");
          toast.info("A abrir previsão de receita...");
          setResult(null);
          break;
        }
        case "criar-followup": {
          navigate("/dashboard/tasks");
          toast.info("A abrir tarefas para criar follow-up...");
          setResult(null);
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
  }, [intelligenceData, refetchIntelligence, navigate]);

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
