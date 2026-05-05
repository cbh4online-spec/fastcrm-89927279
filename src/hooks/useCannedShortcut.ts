import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  expandSnippetVariables,
  SnippetVariableContext,
} from "@/lib/snippetVariables";

export interface InboxSnippet {
  id: string;
  shortcut: string;
  title: string;
  content: string;
  description: string | null;
  is_personal: boolean;
  usage_count: number;
}

interface UseCannedShortcutOptions {
  workspaceId: string | undefined;
  inputValue: string;
  /** Callback recebe o conteúdo já expandido com variáveis. */
  onSelect: (expandedContent: string, snippet: InboxSnippet) => void;
  /** Contexto para expansão de variáveis ({{nome}}, etc.). Opcional. */
  variableContext?: SnippetVariableContext;
}

export function useCannedShortcut({
  workspaceId,
  inputValue,
  onSelect,
  variableContext,
}: UseCannedShortcutOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { data: responses = [] } = useQuery({
    queryKey: ["inbox_snippets", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await (supabase as any)
        .from("inbox_snippets")
        .select("id, shortcut, title, content, description, is_personal, usage_count")
        .eq("workspace_id", workspaceId)
        .order("usage_count", { ascending: false })
        .order("shortcut", { ascending: true });
      if (error) throw error;
      return (data || []) as InboxSnippet[];
    },
    enabled: !!workspaceId,
    staleTime: 30_000,
  });

  // Detectar "/" no início do input
  useEffect(() => {
    if (inputValue.startsWith("/") && inputValue.length >= 1) {
      setIsOpen(true);
      setSearch(inputValue.slice(1).toLowerCase());
      setSelectedIndex(0);
    } else {
      setIsOpen(false);
      setSearch("");
    }
  }, [inputValue]);

  const filtered = responses.filter(
    (r) =>
      !search ||
      r.shortcut.toLowerCase().includes(search) ||
      r.title.toLowerCase().includes(search) ||
      r.content.toLowerCase().includes(search),
  );

  const handleSelect = useCallback(
    async (snippet: InboxSnippet) => {
      const ctx = variableContext ?? {};
      const expanded = expandSnippetVariables(snippet.content, ctx);
      onSelect(expanded.text, snippet);
      setIsOpen(false);

      // Tracking de utilização (best-effort, não bloqueia)
      try {
        await (supabase as any)
          .from("inbox_snippets")
          .update({
            usage_count: snippet.usage_count + 1,
            last_used_at: new Date().toISOString(),
          })
          .eq("id", snippet.id);
      } catch {
        /* silenciar — tracking não deve bloquear UX */
      }
    },
    [onSelect, variableContext],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || filtered.length === 0) return false;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
        return true;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        return true;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        handleSelect(filtered[selectedIndex]);
        return true;
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        return true;
      }
      return false;
    },
    [isOpen, filtered, selectedIndex, handleSelect],
  );

  return {
    isOpen,
    filtered,
    selectedIndex,
    handleSelect,
    handleKeyDown,
  };
}
