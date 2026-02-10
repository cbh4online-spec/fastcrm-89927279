import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSuggestCommunityCategory() {
  return useMutation({
    mutationFn: async ({ communityName, communityDescription }: { communityName: string; communityDescription: string }) => {
      const { data, error } = await supabase.functions.invoke("community-ai-category", {
        body: { communityName, communityDescription },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Erro ao sugerir categoria");
      return data.category as string;
    },
  });
}
