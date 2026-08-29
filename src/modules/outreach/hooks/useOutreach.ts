/**
 * Hooks do módulo "Contacto 1:1 validado".
 *
 * Regras invioláveis:
 *  - Nada é enviado pelo sistema. Todos os botões apenas abrem o canal/composição nativa.
 *  - Nenhum conteúdo é gerado de forma fictícia: o rascunho só usa dados reais da ficha.
 *  - Registo na timeline apenas como "rascunho criado" ou "envio assistido".
 */
import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { isValidPhone, toE164 } from "@/utils/phone";
import type {
  OutreachChannel,
  OutreachCheck,
  OutreachDraft,
  OutreachEntityType,
  OutreachEvent,
  OutreachSettings,
  OutreachSuppression,
  OutreachValidation,
} from "../types";

const db = () => supabase as any;

const DEFAULT_SETTINGS = {
  daily_limit: 20,
  per_company_limit: 2,
  cooldown_days: 14,
};

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

/* ------------------------------------------------------------------ settings */

export function useOutreachSettings() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["outreach-settings", currentWorkspace?.id, user?.id],
    enabled: !!currentWorkspace?.id,
    queryFn: async () => {
      const { data, error } = await db()
        .from("outreach_settings")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id);
      if (error) throw error;
      const rows = (data ?? []) as OutreachSettings[];
      const mine = rows.find((r) => r.user_id === user?.id);
      const workspaceLevel = rows.find((r) => !r.user_id);
      return { mine: mine ?? null, workspaceLevel: workspaceLevel ?? null };
    },
  });

  const effective = useMemo(() => {
    const mine = query.data?.mine;
    const ws = query.data?.workspaceLevel;
    return {
      daily_limit: mine?.daily_limit ?? ws?.daily_limit ?? DEFAULT_SETTINGS.daily_limit,
      per_company_limit:
        mine?.per_company_limit ?? ws?.per_company_limit ?? DEFAULT_SETTINGS.per_company_limit,
      cooldown_days: mine?.cooldown_days ?? ws?.cooldown_days ?? DEFAULT_SETTINGS.cooldown_days,
    };
  }, [query.data]);

  return { ...query, effective };
}

export function useSaveOutreachSettings() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      scope: "workspace" | "user";
      daily_limit: number;
      per_company_limit: number;
      cooldown_days: number;
    }) => {
      if (!currentWorkspace?.id) throw new Error("Sem workspace activo");
      const userId = input.scope === "user" ? user?.id ?? null : null;

      const { data: existing, error: selError } = await db()
        .from("outreach_settings")
        .select("id")
        .eq("workspace_id", currentWorkspace.id)
        .is("user_id", userId === null ? null : undefined)
        .maybeSingle();

      let currentId: string | null = null;
      if (userId) {
        const { data } = await db()
          .from("outreach_settings")
          .select("id")
          .eq("workspace_id", currentWorkspace.id)
          .eq("user_id", userId)
          .maybeSingle();
        currentId = data?.id ?? null;
      } else {
        if (selError) throw selError;
        currentId = existing?.id ?? null;
      }

      const payload = {
        workspace_id: currentWorkspace.id,
        user_id: userId,
        daily_limit: input.daily_limit,
        per_company_limit: input.per_company_limit,
        cooldown_days: input.cooldown_days,
        updated_at: new Date().toISOString(),
      };

      if (currentId) {
        const { error } = await db().from("outreach_settings").update(payload).eq("id", currentId);
        if (error) throw error;
      } else {
        const { error } = await db().from("outreach_settings").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["outreach-settings"] });
      toast.success("Limites guardados");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao guardar limites"),
  });
}

/* --------------------------------------------------------------- validation */

export function useOutreachValidation(entityType: OutreachEntityType, entityId?: string) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["outreach-validation", currentWorkspace?.id, entityType, entityId],
    enabled: !!currentWorkspace?.id && !!entityId,
    queryFn: async () => {
      const { data, error } = await db()
        .from("outreach_validations")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .eq("entity_type", entityType)
        .eq("entity_id", entityId!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as OutreachValidation | null;
    },
  });
}

export function useSaveOutreachValidation(entityType: OutreachEntityType, entityId?: string) {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: Partial<OutreachValidation>) => {
      if (!currentWorkspace?.id || !entityId) throw new Error("Sem contexto de entidade");
      const payload: Record<string, unknown> = {
        workspace_id: currentWorkspace.id,
        entity_type: entityType,
        entity_id: entityId,
        ...input,
        updated_at: new Date().toISOString(),
      };
      if (input.is_validated) {
        payload.validated_by = user?.id ?? null;
        payload.validated_at = new Date().toISOString();
      }
      const { error } = await db()
        .from("outreach_validations")
        .upsert(payload, { onConflict: "workspace_id,entity_type,entity_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["outreach-validation"] });
      qc.invalidateQueries({ queryKey: ["outreach-events"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao guardar validação"),
  });
}

/* ------------------------------------------------------------- suppressions */

export function useOutreachSuppressions(entityType: OutreachEntityType, entityId?: string) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["outreach-suppressions", currentWorkspace?.id, entityType, entityId],
    enabled: !!currentWorkspace?.id && !!entityId,
    queryFn: async () => {
      const { data, error } = await db()
        .from("outreach_suppressions")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .eq("entity_type", entityType)
        .eq("entity_id", entityId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as OutreachSuppression[];
    },
  });
}

export function useToggleOutreachSuppression(entityType: OutreachEntityType, entityId?: string) {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      reason: OutreachSuppression["reason"];
      active: boolean;
      notes?: string;
    }) => {
      if (!currentWorkspace?.id || !entityId) throw new Error("Sem contexto de entidade");
      if (!input.active) {
        const { error } = await db()
          .from("outreach_suppressions")
          .delete()
          .eq("workspace_id", currentWorkspace.id)
          .eq("entity_type", entityType)
          .eq("entity_id", entityId)
          .eq("reason", input.reason);
        if (error) throw error;
        return;
      }
      const { error } = await db().from("outreach_suppressions").upsert(
        {
          workspace_id: currentWorkspace.id,
          entity_type: entityType,
          entity_id: entityId,
          reason: input.reason,
          notes: input.notes ?? null,
          created_by: user?.id ?? null,
        },
        { onConflict: "workspace_id,entity_type,entity_id,reason" },
      );
      if (error) throw error;

      await db().from("outreach_events").insert({
        workspace_id: currentWorkspace.id,
        entity_type: entityType,
        entity_id: entityId,
        event_type: "stopped",
        reason: input.reason,
        created_by: user?.id ?? null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["outreach-suppressions"] });
      qc.invalidateQueries({ queryKey: ["outreach-events"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao actualizar estado"),
  });
}

/* -------------------------------------------------------------------- draft */

export function useOutreachDraft(entityType: OutreachEntityType, entityId?: string) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["outreach-draft", currentWorkspace?.id, entityType, entityId],
    enabled: !!currentWorkspace?.id && !!entityId,
    queryFn: async () => {
      const { data, error } = await db()
        .from("outreach_drafts")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .eq("entity_type", entityType)
        .eq("entity_id", entityId!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as OutreachDraft | null;
    },
  });
}

export function useSaveOutreachDraft(entityType: OutreachEntityType, entityId?: string) {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      subject?: string | null;
      body: string;
      context_summary?: string | null;
      value_proposition?: string | null;
      status?: OutreachDraft["status"];
      isNew?: boolean;
      companyId?: string | null;
    }) => {
      if (!currentWorkspace?.id || !entityId) throw new Error("Sem contexto de entidade");
      const now = new Date().toISOString();
      const payload: Record<string, unknown> = {
        workspace_id: currentWorkspace.id,
        entity_type: entityType,
        entity_id: entityId,
        subject: input.subject ?? null,
        body: input.body,
        context_summary: input.context_summary ?? null,
        value_proposition: input.value_proposition ?? null,
        status: input.status ?? "draft",
        created_by: user?.id ?? null,
        updated_at: now,
      };
      if (input.status === "reviewed") {
        payload.reviewed_by = user?.id ?? null;
        payload.reviewed_at = now;
      }

      const { data, error } = await db()
        .from("outreach_drafts")
        .upsert(payload, { onConflict: "workspace_id,entity_type,entity_id" })
        .select()
        .single();
      if (error) throw error;

      await db().from("outreach_events").insert({
        workspace_id: currentWorkspace.id,
        entity_type: entityType,
        entity_id: entityId,
        company_id: input.companyId ?? null,
        event_type: input.isNew ? "draft_created" : input.status === "reviewed" ? "reviewed" : "draft_updated",
        created_by: user?.id ?? null,
      });

      return data as OutreachDraft;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["outreach-draft"] });
      qc.invalidateQueries({ queryKey: ["outreach-events"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao guardar rascunho"),
  });
}

/* ------------------------------------------------------------------- events */

export function useOutreachEvents(params: {
  entityType?: OutreachEntityType;
  entityId?: string;
  limit?: number;
}) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["outreach-events", currentWorkspace?.id, params],
    enabled: !!currentWorkspace?.id,
    queryFn: async () => {
      let q = db()
        .from("outreach_events")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .order("created_at", { ascending: false })
        .limit(params.limit ?? 50);
      if (params.entityType) q = q.eq("entity_type", params.entityType);
      if (params.entityId) q = q.eq("entity_id", params.entityId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as OutreachEvent[];
    },
  });
}

/** Envios assistidos do utilizador actual hoje + por empresa + último contacto à entidade. */
export function useOutreachUsage(entityType: OutreachEntityType, entityId?: string, companyId?: string | null) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["outreach-usage", currentWorkspace?.id, user?.id, entityType, entityId, companyId],
    enabled: !!currentWorkspace?.id && !!user?.id,
    queryFn: async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { count: todayCount, error: todayError } = await db()
        .from("outreach_events")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", currentWorkspace!.id)
        .eq("created_by", user!.id)
        .eq("event_type", "assisted_send")
        .gte("created_at", startOfDay.toISOString());
      if (todayError) throw todayError;

      let companyCount = 0;
      if (companyId) {
        const { count, error } = await db()
          .from("outreach_events")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", currentWorkspace!.id)
          .eq("event_type", "assisted_send")
          .eq("company_id", companyId)
          .gte("created_at", startOfDay.toISOString());
        if (error) throw error;
        companyCount = count ?? 0;
      }

      let lastContactAt: string | null = null;
      if (entityId) {
        const { data, error } = await db()
          .from("outreach_events")
          .select("created_at")
          .eq("workspace_id", currentWorkspace!.id)
          .eq("entity_type", entityType)
          .eq("entity_id", entityId)
          .eq("event_type", "assisted_send")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        lastContactAt = data?.created_at ?? null;
      }

      return { todayCount: todayCount ?? 0, companyCount, lastContactAt };
    },
  });
}

/* ------------------------------------------------------------- disponibilidade de canal */

export function useWhatsAppChannelAvailable() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["outreach-whatsapp-available", currentWorkspace?.id],
    enabled: !!currentWorkspace?.id,
    queryFn: async () => {
      const [{ count: channelCount }, { count: ghlCount }] = await Promise.all([
        db()
          .from("communication_channels")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", currentWorkspace!.id)
          .eq("channel_type", "whatsapp")
          .eq("status", "active"),
        db()
          .from("workspace_ghl_social_channels")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", currentWorkspace!.id)
          .eq("channel_type", "whatsapp")
          .eq("is_active", true),
      ]);
      return (channelCount ?? 0) > 0 || (ghlCount ?? 0) > 0;
    },
  });
}

/* --------------------------------------------------------------- elegibilidade */

export interface EligibilityInput {
  channel: OutreachChannel;
  validation: OutreachValidation | null;
  suppressions: OutreachSuppression[];
  email?: string | null;
  phone?: string | null;
  socialUrl?: string | null;
  whatsappAvailable: boolean;
  draft: OutreachDraft | null;
  usage: { todayCount: number; companyCount: number; lastContactAt: string | null } | undefined;
  limits: { daily_limit: number; per_company_limit: number; cooldown_days: number };
}

export function evaluateOutreachEligibility(input: EligibilityInput): {
  checks: OutreachCheck[];
  allowed: boolean;
} {
  const {
    channel, validation, suppressions, email, phone, socialUrl,
    whatsappAvailable, draft, usage, limits,
  } = input;

  const checks: OutreachCheck[] = [];

  checks.push({
    id: "validated",
    label: "Empresa/contacto marcado como validado",
    passed: !!validation?.is_validated,
    blocking: true,
    detail: validation?.is_validated ? undefined : "Marque como validado antes de preparar contacto.",
  });

  checks.push({
    id: "legal_basis",
    label: "Base legal / consentimento registado",
    passed: !!validation?.legal_basis,
    blocking: true,
    detail: validation?.legal_basis ? validation.consent_source ?? undefined : "Registe a base legal.",
  });

  const channelAllowed = (validation?.allowed_channels ?? []).includes(channel);
  checks.push({
    id: "channel_allowed",
    label: "Canal permitido para esta entidade",
    passed: channelAllowed,
    blocking: true,
    detail: channelAllowed ? undefined : "Autorize este canal na validação.",
  });

  if (channel === "email") {
    const ok = !!email && EMAIL_REGEX.test(email.trim());
    checks.push({ id: "email", label: "E-mail válido", passed: ok, blocking: true, detail: email ?? "Sem e-mail" });
  }
  if (channel === "whatsapp") {
    const ok = !!phone && isValidPhone(phone);
    checks.push({ id: "phone", label: "Telefone válido", passed: ok, blocking: true, detail: phone ?? "Sem telefone" });
    checks.push({
      id: "wa_channel",
      label: "Canal WhatsApp ligado no workspace",
      passed: whatsappAvailable,
      blocking: false,
      detail: whatsappAvailable ? undefined : "Indisponível — use a alternativa wa.me ou ligue o canal em Integrações.",
    });
  }
  if (channel === "social") {
    checks.push({
      id: "social",
      label: "Perfil social disponível",
      passed: !!socialUrl,
      blocking: true,
      detail: socialUrl ?? "Sem perfil registado",
    });
  }

  const optOut = suppressions.find((s) => s.reason === "opt_out");
  checks.push({
    id: "opt_out",
    label: "Sem opt-out registado",
    passed: !optOut,
    blocking: true,
    detail: optOut ? "Opt-out activo — contacto interdito." : undefined,
  });

  const stop = suppressions.find((s) => s.reason === "blocked" || s.reason === "replied" || s.reason === "manual");
  checks.push({
    id: "no_stop",
    label: "Sem resposta, bloqueio ou paragem manual",
    passed: !stop,
    blocking: true,
    detail: stop ? `Paragem activa: ${stop.reason}` : undefined,
  });

  checks.push({
    id: "reviewed",
    label: "Rascunho revisto por humano",
    passed: draft?.status === "reviewed" || draft?.status === "used",
    blocking: true,
    detail: draft ? undefined : "Crie e reveja o rascunho.",
  });

  const cooldownMs = limits.cooldown_days * 24 * 60 * 60 * 1000;
  const lastAt = usage?.lastContactAt ? new Date(usage.lastContactAt).getTime() : null;
  const inCooldown = lastAt !== null && Date.now() - lastAt < cooldownMs;
  checks.push({
    id: "cooldown",
    label: `Cooldown de ${limits.cooldown_days} dias respeitado`,
    passed: !inCooldown,
    blocking: true,
    detail: inCooldown && lastAt
      ? `Último contacto assistido em ${new Date(lastAt).toLocaleDateString("pt-PT")}`
      : undefined,
  });

  const dailyOk = (usage?.todayCount ?? 0) < limits.daily_limit;
  checks.push({
    id: "daily_limit",
    label: `Limite diário (${usage?.todayCount ?? 0}/${limits.daily_limit})`,
    passed: dailyOk,
    blocking: true,
  });

  const companyOk = (usage?.companyCount ?? 0) < limits.per_company_limit;
  checks.push({
    id: "company_limit",
    label: `Limite por empresa (${usage?.companyCount ?? 0}/${limits.per_company_limit})`,
    passed: companyOk,
    blocking: true,
  });

  return { checks, allowed: checks.every((c) => !c.blocking || c.passed) };
}

/* ----------------------------------------------------- registo de envio assistido */

export function useRegisterAssistedSend(entityType: OutreachEntityType, entityId?: string) {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: { channel: OutreachChannel; companyId?: string | null; details?: Record<string, unknown> }) => {
      if (!currentWorkspace?.id || !entityId) throw new Error("Sem contexto de entidade");
      const { error } = await db().from("outreach_events").insert({
        workspace_id: currentWorkspace.id,
        entity_type: entityType,
        entity_id: entityId,
        company_id: input.companyId ?? null,
        channel: input.channel,
        event_type: "assisted_send",
        details: input.details ?? {},
        created_by: user?.id ?? null,
      });
      if (error) throw error;

      await db().from("outreach_drafts").update({ status: "used", updated_at: new Date().toISOString() })
        .eq("workspace_id", currentWorkspace.id)
        .eq("entity_type", entityType)
        .eq("entity_id", entityId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["outreach-events"] });
      qc.invalidateQueries({ queryKey: ["outreach-usage"] });
      qc.invalidateQueries({ queryKey: ["outreach-draft"] });
      toast.success("Registado como envio assistido (não confirma entrega)");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao registar"),
  });
}

export function whatsappDeepLink(phone: string, text: string) {
  const e164 = toE164(phone) ?? phone;
  return `https://wa.me/${e164.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

export function mailtoLink(email: string, subject: string, body: string) {
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
