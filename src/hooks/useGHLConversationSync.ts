import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface ConversationSyncResult {
  conversations_created: number;
  conversations_updated: number;
  messages_created: number;
  messages_skipped: number;
  errors: string[];
  /** Conversas ignoradas com o motivo real (não fatais) */
  skipped_details?: string[];
  total_processed: number;
  /** true quando ficou trabalho por concluir e é preciso retomar */
  partial?: boolean;
  resumed_from?: string | null;
}

export interface ConversationSyncProgress {
  page: number;
  processed: number;
  conversations_created: number;
  messages_created: number;
  /** número da execução encadeada (1 = primeira passagem) */
  pass?: number;
}

/** Número máximo de continuações automáticas após uma passagem parcial */
const MAX_CONTINUATIONS = 20;

function mergeResults(
  acc: ConversationSyncResult | null,
  next: ConversationSyncResult
): ConversationSyncResult {
  if (!acc) return next;
  return {
    conversations_created: acc.conversations_created + next.conversations_created,
    conversations_updated: acc.conversations_updated + next.conversations_updated,
    messages_created: acc.messages_created + next.messages_created,
    messages_skipped: acc.messages_skipped + next.messages_skipped,
    errors: [...acc.errors, ...next.errors],
    skipped_details: [...(acc.skipped_details || []), ...(next.skipped_details || [])],
    total_processed: acc.total_processed + next.total_processed,
    partial: next.partial,
    resumed_from: next.resumed_from ?? acc.resumed_from ?? null,
  };
}

export function useGHLConversationSync() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<ConversationSyncResult | null>(null);
  const [progress, setProgress] = useState<ConversationSyncProgress | null>(null);

  const syncConversations = useCallback(
    async (includeMessages = true, daysBack = 30): Promise<ConversationSyncResult | null> => {
      if (!currentWorkspace?.id) {
        toast.error("Nenhum workspace selecionado");
        return null;
      }

      setIsSyncing(true);
      setLastResult(null);
      setProgress(null);

      /** Executa uma passagem da edge function (a função retoma sozinha do cursor guardado) */
      const runPass = async (
        accessToken: string,
        pass: number,
        base: ConversationSyncResult | null
      ): Promise<ConversationSyncResult | null> => {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

        const response = await fetch(`${supabaseUrl}/functions/v1/ghl-sync-conversations`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            workspace_id: currentWorkspace.id,
            stream: true,
            include_messages: includeMessages,
            days_back: daysBack,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || `Erro ${response.status}`;
          toast.error(`Erro na sincronização: ${errorMessage}`);
          return null;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          toast.error("Erro ao iniciar a sincronização (stream indisponível)");
          return null;
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let passResult: ConversationSyncResult | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (!line.startsWith("event: ")) continue;

            const eventType = line.substring(7);
            const dataLine = lines[i + 1];
            if (!dataLine?.startsWith("data: ")) continue;

            let data: Record<string, unknown>;
            try {
              data = JSON.parse(dataLine.substring(6));
            } catch {
              i++;
              continue;
            }

            switch (eventType) {
              case "progress":
                setProgress({
                  page: Number(data.page) || 0,
                  processed: (base?.total_processed || 0) + (Number(data.processed) || 0),
                  conversations_created:
                    (base?.conversations_created || 0) + (Number(data.conversations_created) || 0),
                  messages_created:
                    (base?.messages_created || 0) + (Number(data.messages_created) || 0),
                  pass,
                });
                break;

              case "complete":
                passResult = data as unknown as ConversationSyncResult;
                break;

              case "error":
                toast.error(String(data.error || "Erro durante a sincronização"));
                break;
            }

            i++;
          }
        }

        return passResult;
      };

      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session?.access_token) {
          toast.error("Sessão expirada. Por favor, faça login novamente.");
          return null;
        }
        const accessToken = session.session.access_token;

        let aggregated: ConversationSyncResult | null = null;
        let pass = 1;

        while (pass <= MAX_CONTINUATIONS + 1) {
          const passResult = await runPass(accessToken, pass, aggregated);
          if (!passResult) break;

          aggregated = mergeResults(aggregated, passResult);
          setLastResult(aggregated);

          // Só continua automaticamente se a paragem foi por tempo/limites,
          // não em erros de credenciais/permissões.
          const fatal = passResult.errors.some(
            (e) => e.includes("API Key") || e.includes("Acesso negado")
          );
          if (!passResult.partial || fatal) break;

          // Parar cedo se a passagem não produziu qualquer progresso (evita ciclos inúteis)
          const madeProgress =
            passResult.total_processed > 0 ||
            passResult.conversations_created > 0 ||
            passResult.conversations_updated > 0 ||
            passResult.messages_created > 0;
          if (!madeProgress) break;

          pass++;
        }

        if (aggregated) {
          await queryClient.invalidateQueries({ queryKey: ["conversations"] });
          await queryClient.invalidateQueries({ queryKey: ["messages"] });

          const skippedCount = aggregated.skipped_details?.length || 0;
          const summary = `${aggregated.conversations_created} conversas, ${aggregated.messages_created} mensagens`;

          if (aggregated.errors.length > 0) {
            const detail = aggregated.errors[0];
            toast.warning(`Sincronização parcial: ${summary}`, {
              description:
                aggregated.errors.length > 1
                  ? `${detail} (+${aggregated.errors.length - 1} outros avisos)`
                  : detail,
              duration: 10000,
            });
          } else if (
            aggregated.conversations_created === 0 &&
            aggregated.messages_created === 0
          ) {
            toast.info("Nenhuma conversa nova para sincronizar", {
              description:
                skippedCount > 0 ? `${skippedCount} conversa(s) ignorada(s).` : undefined,
            });
          } else {
            toast.success(`Sincronização concluída: ${summary}`, {
              description:
                skippedCount > 0
                  ? `${skippedCount} conversa(s) ignorada(s) — ver detalhes.`
                  : undefined,
            });
          }

          if (skippedCount > 0) {
            console.warn("[GHL Conversation Sync] Ignoradas:", aggregated.skipped_details);
          }
        }

        return aggregated;
      } catch (error) {
        console.error("[GHL Conversation Sync] Error:", error);
        toast.error("Erro ao sincronizar conversas do GHL", {
          description: error instanceof Error ? error.message : undefined,
        });
        return null;
      } finally {
        setIsSyncing(false);
        setTimeout(() => setProgress(null), 3000);
      }
    },
    [currentWorkspace?.id, queryClient]
  );

  return {
    syncConversations,
    isSyncing,
    lastResult,
    progress,
  };
}
