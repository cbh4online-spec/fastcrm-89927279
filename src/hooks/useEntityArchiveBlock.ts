import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export type ArchivableEntity = "contact" | "company" | "lead";

const TABLE_BY_ENTITY: Record<ArchivableEntity, "contacts" | "companies" | "leads"> = {
  contact: "contacts",
  company: "companies",
  lead: "leads",
};

export const ENTITY_LABEL: Record<ArchivableEntity, string> = {
  contact: "Contacto",
  company: "Empresa",
  lead: "Lead",
};

/** Query keys that must be refreshed after archiving/blocking. */
const INVALIDATE_KEYS = [
  "contacts",
  "companies",
  "leads",
  "smart-contacts",
  "smart-companies",
  "smart-leads",
  "contacts-kpis",
  "companies-kpis",
  "leads-kpis",
  "entity-nav-ids",
  "contact",
  "company",
  "lead",
];

async function logEntityAudit(params: {
  workspaceId?: string;
  entity: ArchivableEntity;
  entityId: string;
  action: string;
  reason?: string | null;
}) {
  try {
    const { data: userData } = await supabase.auth.getUser();
    await (supabase as any).from("activity_logs").insert({
      workspace_id: params.workspaceId,
      user_id: userData.user?.id ?? null,
      entity_type: params.entity,
      entity_id: params.entityId,
      action: params.action,
      metadata: { reason: params.reason ?? null },
    });
  } catch {
    // auditoria não deve bloquear a operação
  }
}

export function useEntityArchiveBlock(entity: ArchivableEntity) {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const table = TABLE_BY_ENTITY[entity];
  const label = ENTITY_LABEL[entity];

  const invalidate = () => {
    INVALIDATE_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  };

  const archive = useMutation({
    mutationFn: async ({ ids, reason }: { ids: string[]; reason?: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await (supabase as any)
        .from(table)
        .update({
          archived_at: new Date().toISOString(),
          archived_by: userData.user?.id ?? null,
          archive_reason: reason?.trim() || null,
        })
        .in("id", ids);
      if (error) throw error;
      await Promise.all(
        ids.map((id) =>
          logEntityAudit({
            workspaceId: currentWorkspace?.id,
            entity,
            entityId: id,
            action: "archived",
            reason,
          })
        )
      );
      return ids;
    },
    onSuccess: (ids) => {
      invalidate();
      toast.success(ids.length > 1 ? `${ids.length} registos arquivados` : `${label} arquivado`);
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível arquivar"),
  });

  const unarchive = useMutation({
    mutationFn: async ({ ids }: { ids: string[] }) => {
      const { error } = await (supabase as any)
        .from(table)
        .update({ archived_at: null, archived_by: null, archive_reason: null })
        .in("id", ids);
      if (error) throw error;
      await Promise.all(
        ids.map((id) =>
          logEntityAudit({ workspaceId: currentWorkspace?.id, entity, entityId: id, action: "unarchived" })
        )
      );
      return ids;
    },
    onSuccess: (ids) => {
      invalidate();
      toast.success(ids.length > 1 ? `${ids.length} registos desarquivados` : `${label} desarquivado`);
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível desarquivar"),
  });

  const block = useMutation({
    mutationFn: async ({ ids, reason }: { ids: string[]; reason: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await (supabase as any)
        .from(table)
        .update({
          is_blocked: true,
          blocked_at: new Date().toISOString(),
          blocked_by: userData.user?.id ?? null,
          block_reason: reason.trim(),
        })
        .in("id", ids);
      if (error) throw error;
      await Promise.all(
        ids.map((id) =>
          logEntityAudit({ workspaceId: currentWorkspace?.id, entity, entityId: id, action: "blocked", reason })
        )
      );
      return ids;
    },
    onSuccess: () => {
      invalidate();
      toast.success(`${label} bloqueado — interações desativadas`);
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível bloquear"),
  });

  const unblock = useMutation({
    mutationFn: async ({ ids }: { ids: string[] }) => {
      const { error } = await (supabase as any)
        .from(table)
        .update({ is_blocked: false, blocked_at: null, blocked_by: null, block_reason: null })
        .in("id", ids);
      if (error) throw error;
      await Promise.all(
        ids.map((id) =>
          logEntityAudit({ workspaceId: currentWorkspace?.id, entity, entityId: id, action: "unblocked" })
        )
      );
      return ids;
    },
    onSuccess: () => {
      invalidate();
      toast.success(`${label} desbloqueado`);
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível desbloquear"),
  });

  return { archive, unarchive, block, unblock };
}

/** Estado de interação de um registo: bloqueado impede qualquer comunicação de saída. */
export function useEntityInteractionLock(record?: { is_blocked?: boolean | null; block_reason?: string | null; archived_at?: string | null } | null) {
  const isBlocked = !!record?.is_blocked;
  const isArchived = !!record?.archived_at;
  return {
    isBlocked,
    isArchived,
    canInteract: !isBlocked,
    lockReason: isBlocked
      ? record?.block_reason
        ? `Registo bloqueado: ${record.block_reason}`
        : "Registo bloqueado — interações desativadas"
      : null,
  };
}
