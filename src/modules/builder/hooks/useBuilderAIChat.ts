import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BuilderAIMessage {
  id: string;
  workspace_id: string;
  asset_id: string;
  role: "user" | "assistant";
  content: string;
  summary: string | null;
  target_bid: string | null;
  html_before: string | null;
  html_after: string | null;
  is_error: boolean;
  created_at: string;
}

interface SendArgs {
  prompt: string;
  fullHtml: string;
  selectionHtml?: string | null;
  selectionBid?: string | null;
  assetType: string;
}

interface ChatResult {
  html: string;
  summary: string;
  scope: "selection" | "page";
}

export function useBuilderAIMessages(assetId: string | undefined) {
  return useQuery({
    queryKey: ["builder-ai-messages", assetId],
    queryFn: async (): Promise<BuilderAIMessage[]> => {
      if (!assetId) return [];
      const { data, error } = await supabase
        .from("builder_ai_messages")
        .select("*")
        .eq("asset_id", assetId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as BuilderAIMessage[];
    },
    enabled: !!assetId,
    staleTime: 10_000,
  });
}

export function useBuilderAIChat(assetId: string | undefined, workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  const messagesQuery = useBuilderAIMessages(assetId);
  const [isSending, setIsSending] = useState(false);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["builder-ai-messages", assetId] });
  }, [queryClient, assetId]);

  const persist = useCallback(
    async (row: Partial<BuilderAIMessage> & { role: "user" | "assistant"; content: string }) => {
      if (!assetId || !workspaceId) return;
      const { error } = await supabase.from("builder_ai_messages").insert({
        asset_id: assetId,
        workspace_id: workspaceId,
        role: row.role,
        content: row.content,
        summary: row.summary ?? null,
        target_bid: row.target_bid ?? null,
        html_before: row.html_before ?? null,
        html_after: row.html_after ?? null,
        is_error: row.is_error ?? false,
      });
      if (error) console.error("builder ai message persist error", error);
    },
    [assetId, workspaceId],
  );

  const send = useCallback(
    async (args: SendArgs): Promise<ChatResult> => {
      setIsSending(true);
      try {
        const history = (messagesQuery.data ?? [])
          .filter((m) => !m.is_error)
          .slice(-8)
          .map((m) => ({
            role: m.role,
            content: m.role === "assistant" ? (m.summary ?? m.content) : m.content,
          }));

        await persist({ role: "user", content: args.prompt, target_bid: args.selectionBid ?? null });
        invalidate();

        const { data, error } = await supabase.functions.invoke("builder-ai", {
          body: {
            mode: "chat",
            prompt: args.prompt,
            fullHtml: args.selectionHtml ? undefined : args.fullHtml,
            selectionHtml: args.selectionHtml ?? undefined,
            assetType: args.assetType,
            workspaceId: workspaceId ?? null,
            history,
          },
        });

        if (error) throw new Error(error.message);
        if (data?.error) {
          throw new Error(data.message || "Erro na IA");
        }
        if (!data?.html) throw new Error("A IA não devolveu conteúdo.");

        const result: ChatResult = {
          html: data.html as string,
          summary: (data.summary as string) || "Alteração aplicada.",
          scope: (data.scope as "selection" | "page") ?? (args.selectionHtml ? "selection" : "page"),
        };

        await persist({
          role: "assistant",
          content: result.summary,
          summary: result.summary,
          target_bid: args.selectionBid ?? null,
          html_before: args.fullHtml,
          html_after: result.scope === "page" ? result.html : null,
        });
        invalidate();

        return result;
      } catch (e) {
        await persist({
          role: "assistant",
          content: e instanceof Error ? e.message : "Erro desconhecido",
          is_error: true,
        });
        invalidate();
        throw e;
      } finally {
        setIsSending(false);
      }
    },
    [messagesQuery.data, persist, invalidate, workspaceId],
  );

  const sendStreaming = useCallback(
    async (
      args: SendArgs,
      opts: { onDelta?: (full: string) => void; signal?: AbortSignal } = {},
    ): Promise<ChatResult> => {
      setIsSending(true);
      try {
        const history = (messagesQuery.data ?? [])
          .filter((m) => !m.is_error)
          .slice(-8)
          .map((m) => ({
            role: m.role,
            content: m.role === "assistant" ? (m.summary ?? m.content) : m.content,
          }));

        await persist({ role: "user", content: args.prompt, target_bid: args.selectionBid ?? null });
        invalidate();

        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/builder-ai`;

        const res = await fetch(url, {
          method: "POST",
          signal: opts.signal,
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            mode: "chat",
            stream: true,
            prompt: args.prompt,
            fullHtml: args.selectionHtml ? undefined : args.fullHtml,
            selectionHtml: args.selectionHtml ?? undefined,
            assetType: args.assetType,
            workspaceId: workspaceId ?? null,
            history,
          }),
        });

        if (!res.ok || !res.body) throw new Error(`stream_unavailable_${res.status}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let acc = "";
        let result: ChatResult | null = null;
        let streamError: string | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const blocks = buffer.split("\n\n");
          buffer = blocks.pop() ?? "";
          for (const block of blocks) {
            const eventLine = block.split("\n").find((l) => l.startsWith("event:"));
            const dataLine = block.split("\n").find((l) => l.startsWith("data:"));
            if (!dataLine) continue;
            const event = eventLine?.slice(6).trim() ?? "message";
            let payload: any;
            try {
              payload = JSON.parse(dataLine.slice(5).trim());
            } catch {
              continue;
            }
            if (event === "delta" && payload?.text) {
              acc += payload.text as string;
              opts.onDelta?.(acc);
            } else if (event === "done") {
              result = {
                html: payload.html as string,
                summary: (payload.summary as string) || "Alteração aplicada.",
                scope: (payload.scope as "selection" | "page") ?? (args.selectionHtml ? "selection" : "page"),
              };
            } else if (event === "error") {
              streamError = (payload?.message as string) || "Erro na IA";
            }
          }
        }

        if (streamError) throw new Error(streamError);
        if (!result) throw new Error("A IA não devolveu conteúdo.");

        await persist({
          role: "assistant",
          content: result.summary,
          summary: result.summary,
          target_bid: args.selectionBid ?? null,
          html_before: args.fullHtml,
          html_after: result.scope === "page" ? result.html : null,
        });
        invalidate();

        return result;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") {
          setIsSending(false);
          throw e;
        }
        await persist({
          role: "assistant",
          content: e instanceof Error ? e.message : "Erro desconhecido",
          is_error: true,
        });
        invalidate();
        throw e;
      } finally {
        setIsSending(false);
      }
    },
    [messagesQuery.data, persist, invalidate, workspaceId],
  );

  const clear = useMutation({
    mutationFn: async () => {
      if (!assetId) return;
      const { error } = await supabase.from("builder_ai_messages").delete().eq("asset_id", assetId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    messages: messagesQuery.data ?? [],
    isLoading: messagesQuery.isLoading,
    isSending,
    send,
    clear,
  };
}
