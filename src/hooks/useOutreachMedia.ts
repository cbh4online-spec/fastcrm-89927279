import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  buildVideoPath,
  mediaKey,
  PROSPECTING_VIDEO_BUCKET,
  PROSPECTING_VIDEO_LINK_TTL_SECONDS,
  PROSPECTING_VIDEO_MIME,
  validateShareUrl,
  validateVideoFile,
  needsVideoLinkRenewal,
  VIDEO_LINK_EXPIRED_MESSAGE,
  type OutreachMedia,
} from "@/lib/prospecting/outreachMedia";

export const OUTREACH_MEDIA_QUERY_KEY = "prospecting-outreach-media";
export const MEDIA_READ_FAILED_MESSAGE =
  "Não foi possível confirmar o vídeo/link associado. A abordagem não foi preparada; tente novamente.";

// Tabela nova: o tipo gerado pode ainda não estar no cliente tipado.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mediaTable = () => (supabase as any).from("prospecting_outreach_media");

export interface MediaTarget {
  profileIds: string[];
  steps: number[];
}

/**
 * Conteúdo associado a perfis/etapas do espaço de trabalho atual.
 * A chave inclui workspace e perfis, por isso nunca mistura conteúdos.
 */
export function useOutreachMedia(profileIds: string[]) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const qc = useQueryClient();
  const workspaceId = currentWorkspace?.id ?? null;
  const ids = Array.from(new Set(profileIds.filter(Boolean))).sort();
  const queryKey = [OUTREACH_MEDIA_QUERY_KEY, workspaceId, ids.join(",")];

  const query = useQuery({
    queryKey,
    enabled: !!workspaceId && ids.length > 0,
    staleTime: 30_000,
    queryFn: async (): Promise<Record<string, OutreachMedia>> => {
      const out: Record<string, OutreachMedia> = {};
      for (let i = 0; i < ids.length; i += 100) {
        const { data, error } = await mediaTable()
          .select("*")
          .eq("workspace_id", workspaceId)
          .in("profile_id", ids.slice(i, i + 100));
        if (error) throw error;
        for (const row of (data ?? []) as OutreachMedia[]) {
          if (row.workspace_id !== workspaceId) continue;
          out[mediaKey(row.profile_id, row.step_index)] = row;
        }
      }
      return out;
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: [OUTREACH_MEDIA_QUERY_KEY, workspaceId] });

  /**
   * Nunca apaga automaticamente um MP4 partilhado: um link assinado já copiado
   * ou gravado em `sent_media_url` continua válido até expirar (90 dias) e
   * remover a associação não o revoga. A limpeza após a validade fica pendente.
   */
  const previousPaths = (target: MediaTarget) =>
    target.profileIds.flatMap((p) =>
      target.steps.map((s) => query.data?.[mediaKey(p, s)]?.storage_path).filter((x): x is string => !!x),
    );

  const upsertRows = async (target: MediaTarget, fields: Partial<OutreachMedia>) => {
    if (!workspaceId || !user?.id) throw new Error("Sessão ou espaço de trabalho indisponível");
    const rows = target.profileIds.flatMap((profile_id) =>
      target.steps.map((step_index) => ({
        workspace_id: workspaceId,
        profile_id,
        step_index,
        created_by: user.id,
        label: null,
        storage_path: null,
        mime_type: null,
        size_bytes: null,
        url_expires_at: null,
        ...fields,
      })),
    );
    const { error } = await mediaTable().upsert(rows, { onConflict: "workspace_id,profile_id,step_index" });
    if (error) throw error;
  };

  const setUrl = useMutation({
    mutationFn: async ({ url, ...target }: MediaTarget & { url: string }) => {
      const valid = validateShareUrl(url);
      if (!valid.ok) throw new Error(valid.error ?? "Inválido");
      await upsertRows(target, { kind: "url", url: valid.url! });
    },
    onSuccess: invalidate,
  });

  const uploadVideo = useMutation({
    mutationFn: async ({ file, ...target }: MediaTarget & { file: File }) => {
      if (!workspaceId || !user?.id) throw new Error("Sessão ou espaço de trabalho indisponível");
      const valid = validateVideoFile(file);
      if (!valid.ok) throw new Error(valid.error ?? "Inválido");
      const path = buildVideoPath(workspaceId, user.id);
      const bucket = supabase.storage.from(PROSPECTING_VIDEO_BUCKET);
      const { error: upErr } = await bucket.upload(path, file, {
        contentType: PROSPECTING_VIDEO_MIME,
        upsert: false,
        cacheControl: "3600",
      });
      if (upErr) throw upErr;
      const { data: signed, error: signErr } = await bucket.createSignedUrl(path, PROSPECTING_VIDEO_LINK_TTL_SECONDS);
      if (signErr || !signed?.signedUrl) {
        await bucket.remove([path]);
        throw signErr ?? new Error("Não foi possível criar a ligação do vídeo");
      }
      try {
        await upsertRows(target, {
          kind: "video",
          url: signed.signedUrl,
          label: file.name.slice(0, 200),
          storage_path: path,
          mime_type: PROSPECTING_VIDEO_MIME,
          size_bytes: file.size,
          url_expires_at: new Date(Date.now() + PROSPECTING_VIDEO_LINK_TTL_SECONDS * 1000).toISOString(),
        });
      } catch (e) {
        await bucket.remove([path]);
        throw e;
      }
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (target: MediaTarget) => {
      if (!workspaceId) throw new Error("Espaço de trabalho indisponível");
      const { error } = await mediaTable()
        .delete()
        .eq("workspace_id", workspaceId)
        .in("profile_id", target.profileIds)
        .in("step_index", target.steps);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const get = (profileId: string, stepIndex: number): OutreachMedia | null =>
    query.data?.[mediaKey(profileId, stepIndex)] ?? null;

  /**
   * Antes de preparar uma abordagem: devolve o conteúdo com uma ligação ainda
   * válida. Um MP4 cuja ligação expira em menos de 24 h é reassinado (90 dias)
   * e gravado; se não for possível, falha em vez de partilhar um link expirado.
   */
  const ensureFresh = async (profileId: string, stepIndex: number): Promise<OutreachMedia | null> => {
    // Leitura garantida na base de dados: nunca depende da cache ainda a carregar
    // nem trata um erro de leitura como «sem conteúdo».
    if (!workspaceId) throw new Error(MEDIA_READ_FAILED_MESSAGE);
    const { data, error: readError } = await mediaTable()
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("profile_id", profileId)
      .eq("step_index", stepIndex)
      .maybeSingle();
    if (readError) throw new Error(MEDIA_READ_FAILED_MESSAGE);
    const row = (data as OutreachMedia | null) ?? null;
    if (!row || row.kind !== "video" || !needsVideoLinkRenewal(row)) return row;
    if (!workspaceId || !user?.id || !row.storage_path) throw new Error(VIDEO_LINK_EXPIRED_MESSAGE);
    const { data: signed, error: signErr } = await supabase.storage
      .from(PROSPECTING_VIDEO_BUCKET)
      .createSignedUrl(row.storage_path, PROSPECTING_VIDEO_LINK_TTL_SECONDS);
    if (signErr || !signed?.signedUrl) throw new Error(VIDEO_LINK_EXPIRED_MESSAGE);
    const url_expires_at = new Date(Date.now() + PROSPECTING_VIDEO_LINK_TTL_SECONDS * 1000).toISOString();
    const { error } = await mediaTable()
      .update({ url: signed.signedUrl, url_expires_at, created_by: user.id })
      .eq("id", row.id)
      .eq("workspace_id", workspaceId);
    if (error) throw new Error(VIDEO_LINK_EXPIRED_MESSAGE);
    void invalidate();
    return { ...row, url: signed.signedUrl, url_expires_at, created_by: user.id };
  };

  return { ...query, get, ensureFresh, setUrl, uploadVideo, remove };
}
