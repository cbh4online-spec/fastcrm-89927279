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
  type OutreachMedia,
} from "@/lib/prospecting/outreachMedia";

export const OUTREACH_MEDIA_QUERY_KEY = "prospecting-outreach-media";

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

  /** Apaga ficheiros já sem referências (só o dono consegue, pela política do Storage). */
  const cleanupPaths = async (paths: string[]) => {
    for (const path of Array.from(new Set(paths))) {
      const { count } = await mediaTable()
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("storage_path", path);
      if ((count ?? 0) === 0) await supabase.storage.from(PROSPECTING_VIDEO_BUCKET).remove([path]);
    }
  };

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
      if (!valid.ok) throw new Error(valid.error);
      const old = previousPaths(target);
      await upsertRows(target, { kind: "url", url: valid.url });
      await cleanupPaths(old);
    },
    onSuccess: invalidate,
  });

  const uploadVideo = useMutation({
    mutationFn: async ({ file, ...target }: MediaTarget & { file: File }) => {
      if (!workspaceId || !user?.id) throw new Error("Sessão ou espaço de trabalho indisponível");
      const valid = validateVideoFile(file);
      if (!valid.ok) throw new Error(valid.error);
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
      const old = previousPaths(target);
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
      await cleanupPaths(old);
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (target: MediaTarget) => {
      if (!workspaceId) throw new Error("Espaço de trabalho indisponível");
      const old = previousPaths(target);
      const { error } = await mediaTable()
        .delete()
        .eq("workspace_id", workspaceId)
        .in("profile_id", target.profileIds)
        .in("step_index", target.steps);
      if (error) throw error;
      await cleanupPaths(old);
    },
    onSuccess: invalidate,
  });

  const get = (profileId: string, stepIndex: number): OutreachMedia | null =>
    query.data?.[mediaKey(profileId, stepIndex)] ?? null;

  return { ...query, get, setUrl, uploadVideo, remove };
}
