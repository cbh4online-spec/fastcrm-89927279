import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CannedResponse {
  id: string;
  shortcut: string;
  title: string;
  content: string;
  category: string;
}

interface UseCannedShortcutOptions {
  workspaceId: string | undefined;
  inputValue: string;
  onSelect: (content: string) => void;
}

export function useCannedShortcut({ workspaceId, inputValue, onSelect }: UseCannedShortcutOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { data: responses = [] } = useQuery({
    queryKey: ["chat_canned_responses", workspaceId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("chat_canned_responses")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("shortcut");
      if (error) throw error;
      return (data || []) as CannedResponse[];
    },
    enabled: !!workspaceId,
  });

  // Detect "/" at start of input
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

  const filtered = responses.filter(r =>
    !search ||
    r.shortcut.toLowerCase().includes(search) ||
    r.title.toLowerCase().includes(search) ||
    r.content.toLowerCase().includes(search)
  );

  const handleSelect = useCallback((response: CannedResponse) => {
    onSelect(response.content);
    setIsOpen(false);
  }, [onSelect]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen || filtered.length === 0) return false;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
      return true;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
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
  }, [isOpen, filtered, selectedIndex, handleSelect]);

  return {
    isOpen,
    filtered,
    selectedIndex,
    handleSelect,
    handleKeyDown,
  };
}
