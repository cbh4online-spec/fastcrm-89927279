// Registo de emails automáticos (Resend) no Cost Guard — tarifa email_transactional
// com margem de 50%. Nunca lança: falhas de registo não bloqueiam o email já enviado.
// deno-lint-ignore no-explicit-any
export async function recordTransactionalEmail(client: any, params: {
  workspaceId: string | null | undefined;
  quantity?: number;
  entityType?: string;
  entityId?: string | null;
  sourceFunction: string;
}): Promise<void> {
  if (!params.workspaceId) return;
  try {
    const { error } = await client.rpc("cost_guard_record_event", {
      p_workspace_id: params.workspaceId,
      p_source_module: "email",
      p_usage_type: "email_transactional",
      p_quantity: params.quantity ?? 1,
      p_unit: "email",
      p_provider_name: "resend",
      p_entity_type: params.entityType ?? null,
      p_entity_id: params.entityId ?? null,
      p_metadata: { source_function: params.sourceFunction },
    });
    if (error) console.error("[emailBilling] record failed:", error.message);
  } catch (e) {
    console.error("[emailBilling] record exception:", e instanceof Error ? e.message : e);
  }
}
