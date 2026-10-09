import { useCallback, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { ExtractedProfile } from "@/hooks/useInstagramExtraction";

export interface CadenceProfile {
  id: string;
  profile_name: string | null;
  profile_url: string;
  inferred_profession: string | null;
  platform: string;
  phone?: string | null;
}

export interface CadenceMessage {
  profileId: string;
  message: string;
  message_plain: string;
  error?: string;
}

const BATCH_SIZE = 5;
const MAX_PROFILES = 50;

/**
 * Inicia a cadência Instagram → WhatsApp a partir de perfis extraídos:
 * gera mensagens em lotes pequenos e alimenta o modo foco (BulkOutreachDialog).
 */
export function useProspectingCadenceLauncher() {
  const { currentWorkspace } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [profiles, setProfiles] = useState<CadenceProfile[]>([]);
  const [messages, setMessages] = useState<CadenceMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const start = useCallback(async (selected: ExtractedProfile[]) => {
    const eligible = selected.filter((p) => !p.converted_lead_id);
    const skipped = selected.length - eligible.length;
    if (skipped > 0) toast.info(`${skipped} perfil(is) já são leads e ficaram de fora`);
    if (eligible.length === 0) return;
    const batch = eligible.slice(0, MAX_PROFILES);
    if (eligible.length > MAX_PROFILES) toast.info(`Máximo de ${MAX_PROFILES} perfis por sessão`);

    setProfiles(batch.map((p) => ({
      id: p.id,
      profile_name: p.profile_name ?? (p.instagram_username ? `@${p.instagram_username}` : null),
      profile_url: p.profile_url,
      inferred_profession: p.instagram_category,
      platform: "instagram",
      phone: p.extracted_phone,
    })));
    setMessages([]);
    setOpen(true);
    setIsGenerating(true);
    setProgress({ done: 0, total: batch.length });

    const workspaceContext = currentWorkspace
      ? { name: currentWorkspace.name || "", description: (currentWorkspace as { description?: string }).description || "" }
      : null;
    const all: CadenceMessage[] = [];
    try {
      for (let i = 0; i < batch.length; i += BATCH_SIZE) {
        const slice = batch.slice(i, i + BATCH_SIZE);
        const { data, error } = await supabase.functions.invoke("batch-generate-prospecting-messages", {
          body: {
            profiles: slice.map((p) => ({
              id: p.id,
              name: p.profile_name || p.instagram_username || "Sem nome",
              category: p.instagram_category || undefined,
              bio: p.profile_bio || undefined,
              location: p.inferred_location || undefined,
              followers: p.instagram_followers_count || undefined,
              isVerified: p.instagram_is_verified || undefined,
              isBusiness: p.instagram_is_business || undefined,
              profileUrl: p.profile_url,
            })),
            tone: "casual",
            workspaceContext,
            serviceContext: null,
            workspaceId: currentWorkspace?.id ?? null,
          },
        });
        if (error) {
          // Erro terminal para este lote: marca os perfis e pára (sem novas tentativas automáticas)
          all.push(...slice.map((p) => ({ profileId: p.id, message: "", message_plain: "", error: "Erro ao gerar mensagem" })));
          setMessages([...all]);
          toast.error("Não foi possível gerar as mensagens. Tente novamente mais tarde.");
          break;
        }
        all.push(...((data?.results ?? []) as CadenceMessage[]));
        setMessages([...all]);
        setProgress({ done: Math.min(i + BATCH_SIZE, batch.length), total: batch.length });
      }
    } finally {
      setIsGenerating(false);
    }
  }, [currentWorkspace]);

  return { open, setOpen, profiles, messages, isGenerating, progress, start };
}
