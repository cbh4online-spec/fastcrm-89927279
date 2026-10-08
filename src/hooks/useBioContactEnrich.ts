import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const MAX = 25;

/** Procura telefone/email no link da bio dos perfis selecionados (até 25 por vez). */
export function useBioContactEnrich() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (profileIds: string[]) => {
      if (!currentWorkspace?.id) throw new Error("Sem espaço de trabalho");
      const { data, error } = await supabase.functions.invoke("prospecting-bio-contact", {
        body: { workspaceId: currentWorkspace.id, profileIds: profileIds.slice(0, MAX) },
      });
      if (error || !data?.ok) throw new Error(data?.error || error?.message || "Falha na pesquisa");
      return data.summary as { checked: number; no_link: number; unreachable: number; phones_found: number; emails_found: number };
    },
    onSuccess: (s, ids) => {
      qc.invalidateQueries();
      const extra = ids.length > MAX ? ` Só os primeiros ${MAX} foram verificados.` : "";
      if (s.phones_found + s.emails_found === 0) {
        toast.info(`Nenhum contacto novo encontrado (${s.checked} sites lidos, ${s.no_link} sem link).${extra}`);
      } else {
        toast.success(`${s.phones_found} telefone(s) e ${s.emails_found} email(s) encontrados.${extra}`);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
