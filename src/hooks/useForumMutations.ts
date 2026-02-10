import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useCreateForumCategory(workspaceId: string | undefined) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      description,
      icon,
      isPrivate,
      isReadOnly,
    }: {
      name: string;
      description: string | null;
      icon: string;
      isPrivate: boolean;
      isReadOnly: boolean;
    }) => {
      if (!workspaceId) throw new Error("Sem workspace");
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const { data, error } = await supabase
        .from("forum_categories")
        .insert({
          workspace_id: workspaceId,
          name,
          slug,
          description,
          icon,
          is_private: isPrivate,
          is_read_only: isReadOnly,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["forum-categories"] });
      toast.success("Canal criado!");
    },
    onError: () => toast.error("Erro ao criar canal"),
  });
}
