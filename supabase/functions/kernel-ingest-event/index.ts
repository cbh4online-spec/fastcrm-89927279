import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface MatrixEntry {
  event_name: string;
  domain: string;
  source_module: string;
  entity_type: string;
  minimum_payload_json: { required?: string[]; optional?: string[] };
  signal_type: string | null;
  decision_type: string | null;
  action_type: string | null;
  priority: string;
  is_user_visible: boolean;
  auto_execute: boolean;
  target_module: string | null;
  is_active: boolean;
}

async function logFailure(
  supabase: ReturnType<typeof createClient>,
  params: {
    event_name: string;
    workspace_id?: string;
    entity_type?: string;
    entity_id?: string;
    source_module?: string;
    failure_stage: string;
    error_message: string;
    raw_payload?: Record<string, unknown>;
  }
) {
  try {
    await supabase.from("event_runtime_failures").insert({
      event_name: params.event_name,
      workspace_id: params.workspace_id ?? null,
      entity_type: params.entity_type ?? null,
      entity_id: params.entity_id ?? null,
      source_module: params.source_module ?? null,
      failure_stage: params.failure_stage,
      error_message: params.error_message,
      raw_payload: params.raw_payload ?? null,
    });
  } catch {}
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();

  try {
    const body = await req.json();
    const {
      workspace_id, type, entity_kind, entity_id,
      actor_type, actor_id, payload, source_module, source_route,
      idempotency_key, occurred_at, schema_version, correlation_id,
      causation_id, metadata,
    } = body;

    if (!workspace_id || !type || !entity_kind || !entity_id) {
      throw new Error("workspace_id, type, entity_kind, entity_id required");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const eventOccurredAt = occurred_at ?? new Date().toISOString();

    // ─── STEP 1: Lookup event in decision matrix ───
    const { data: matrixEntry } = await supabase
      .from("event_decision_matrix")
      .select("*")
      .eq("event_name", type)
      .eq("is_active", true)
      .maybeSingle() as { data: MatrixEntry | null };

    // Also check legacy registry (soft validation)
    let eventStatus = "pending";
    let eventName: string | null = null;

    const { data: registryEntry } = await supabase
      .from("event_registry")
      .select("event_name, is_active")
      .eq("event_name", type)
      .maybeSingle();

    if (registryEntry) {
      eventName = registryEntry.event_name;
      if (!registryEntry.is_active) eventStatus = "inactive";
    } else if (!matrixEntry) {
      eventStatus = "unregistered";
    }

    // ─── STEP 2: Validate minimum payload keys ───
    let payloadValid = true;
    let validationErrors: string[] = [];

    if (matrixEntry?.minimum_payload_json?.required) {
      const requiredKeys = matrixEntry.minimum_payload_json.required;
      const eventPayload = payload ?? {};
      const missingKeys = requiredKeys.filter((k: string) => !(k in eventPayload));
      if (missingKeys.length > 0) {
        payloadValid = false;
        validationErrors = missingKeys;
        await logFailure(supabase, {
          event_name: type,
          workspace_id,
          entity_type: entity_kind,
          entity_id,
          source_module,
          failure_stage: "payload_validation",
          error_message: `Missing required payload keys: ${missingKeys.join(", ")}`,
          raw_payload: eventPayload,
        });
      }
    }

    // ─── INSERT EVENT ───
    const { data: event, error: evErr } = await supabase
      .from("kernel_events")
      .insert({
        workspace_id,
        type,
        event_name: eventName ?? type,
        entity_kind,
        entity_id,
        actor_type: actor_type ?? "system",
        actor_id: actor_id ?? null,
        payload: payload ?? {},
        source_module: source_module ?? null,
        source_route: source_route ?? null,
        idempotency_key: idempotency_key ?? null,
        occurred_at: eventOccurredAt,
        ingested_at: new Date().toISOString(),
        schema_version: schema_version ?? 1,
        status: eventStatus === "pending" ? "pending" : eventStatus,
        correlation_id: correlation_id ?? null,
        causation_id: causation_id ?? null,
        metadata_json: metadata ?? {},
      })
      .select("id")
      .single();

    if (evErr) {
      if (evErr.code === "23505") {
        return new Response(JSON.stringify({ status: "duplicate", idempotency_key }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await logFailure(supabase, {
        event_name: type,
        workspace_id,
        entity_type: entity_kind,
        entity_id,
        source_module,
        failure_stage: "event_insertion",
        error_message: evErr.message,
        raw_payload: payload,
      });
      throw evErr;
    }

    // ─── UPSERT ENTITY REGISTRY ───
    const title = payload?.title ?? payload?.name ?? entity_id;
    const ownerId = payload?.owner_id ?? payload?.assigned_to ?? null;
    const entityStatus = payload?.status ?? payload?.stage ?? null;
    const entityScore = typeof payload?.score === "number" ? payload.score : null;

    await supabase
      .from("kernel_entities")
      .upsert(
        {
          workspace_id,
          kind: entity_kind,
          entity_id,
          title: typeof title === "string" ? title : entity_id,
          meta: payload ?? {},
          owner_id: ownerId,
          status: entityStatus,
          score: entityScore,
          last_activity_at: eventOccurredAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id,kind,entity_id" }
      );

    // ─── STEP 3-5: Matrix-driven signal → decision → action pipeline ───
    let signalId: string | null = null;
    let decisionId: string | null = null;
    let actionResult: string | null = null;

    if (matrixEntry && payloadValid) {
      // STEP 3: Create signal
      if (matrixEntry.signal_type) {
        try {
          const { data: signal, error: sigErr } = await supabase
            .from("kernel_signals")
            .insert({
              workspace_id,
              signal_type: matrixEntry.signal_type,
              entity_type: entity_kind,
              entity_id,
              severity: matrixEntry.priority,
              source: `matrix:${matrixEntry.event_name}`,
              evidence: {
                event_id: event.id,
                event_name: type,
                payload_snapshot: payload ?? {},
              },
            })
            .select("id")
            .single();

          if (sigErr) {
            await logFailure(supabase, {
              event_name: type,
              workspace_id,
              entity_type: entity_kind,
              entity_id,
              source_module,
              failure_stage: "signal_creation",
              error_message: sigErr.message,
              raw_payload: payload,
            });
          } else {
            signalId = signal?.id ?? null;
            // Emit SIGNAL.CREATED event (direct insert, no recursion)
            if (signalId) {
              supabase.from("kernel_events").insert({
                workspace_id,
                type: "SIGNAL.CREATED",
                event_name: "strategy.kernel.signal_created",
                entity_kind: "kernel_signal",
                entity_id: signalId,
                actor_type: "system",
                payload: { signal_type: matrixEntry.signal_type, source_event: type, event_id: event.id },
                source_module: "kernel",
                occurred_at: new Date().toISOString(),
                ingested_at: new Date().toISOString(),
                schema_version: 1,
                status: "processed",
                correlation_id: correlation_id ?? null,
                causation_id: event.id,
                metadata_json: {},
              }).then(() => {});
            }
          }
        } catch (e) {
          await logFailure(supabase, {
            event_name: type,
            workspace_id,
            entity_type: entity_kind,
            entity_id,
            source_module,
            failure_stage: "signal_creation",
            error_message: (e as Error).message,
            raw_payload: payload,
          });
        }
      }

      // STEP 4: Create decision
      if (matrixEntry.decision_type) {
        try {
          const { data: decision, error: decErr } = await supabase
            .from("kernel_decisions")
            .insert({
              workspace_id,
              decision_type: matrixEntry.decision_type,
              entity_type: entity_kind,
              entity_id,
              priority: matrixEntry.priority,
              status: matrixEntry.auto_execute ? "auto_executing" : "pending",
              is_visible: matrixEntry.is_user_visible,
              signal_id: signalId,
              source: `matrix:${matrixEntry.event_name}`,
              recommended_action: matrixEntry.action_type,
              evidence: {
                event_id: event.id,
                signal_id: signalId,
                signal_type: matrixEntry.signal_type,
              },
            })
            .select("id")
            .single();

          if (decErr) {
            await logFailure(supabase, {
              event_name: type,
              workspace_id,
              entity_type: entity_kind,
              entity_id,
              source_module,
              failure_stage: "decision_creation",
              error_message: decErr.message,
              raw_payload: payload,
            });
          } else {
            decisionId = decision?.id ?? null;
          }
        } catch (e) {
          await logFailure(supabase, {
            event_name: type,
            workspace_id,
            entity_type: entity_kind,
            entity_id,
            source_module,
            failure_stage: "decision_creation",
            error_message: (e as Error).message,
            raw_payload: payload,
          });
        }
      }

      // STEP 5: Execute action if auto_execute=true
      if (matrixEntry.auto_execute && matrixEntry.action_type && decisionId) {
        try {
          const { error: actionErr } = await supabase
            .from("kernel_actions")
            .insert({
              workspace_id,
              decision_id: decisionId,
              action_type: matrixEntry.action_type,
              entity_type: entity_kind,
              entity_id,
              status: "queued",
              target_module: matrixEntry.target_module,
              config: {
                event_id: event.id,
                signal_id: signalId,
                decision_id: decisionId,
                payload_snapshot: payload ?? {},
              },
            });

          if (actionErr) {
            await logFailure(supabase, {
              event_name: type,
              workspace_id,
              entity_type: entity_kind,
              entity_id,
              source_module,
              failure_stage: "action_execution",
              error_message: actionErr.message,
              raw_payload: payload,
            });
          } else {
            actionResult = "queued";
            // Update decision status
            if (decisionId) {
              await supabase
                .from("kernel_decisions")
                .update({ status: "action_queued" })
                .eq("id", decisionId);
            }
          }
        } catch (e) {
          await logFailure(supabase, {
            event_name: type,
            workspace_id,
            entity_type: entity_kind,
            entity_id,
            source_module,
            failure_stage: "action_execution",
            error_message: (e as Error).message,
            raw_payload: payload,
          });
        }
      }
    }

    // Log to system_function_runs (fire-and-forget)
    const latency = Date.now() - startTime;
    supabase.from("system_function_runs").insert({
      workspace_id,
      function_name: "kernel-ingest-event",
      module_id: "kernel",
      status: "success",
      latency_ms: latency,
      request_id: correlation_id ?? null,
      created_at: new Date().toISOString(),
    }).then(() => {});

    return new Response(
      JSON.stringify({
        status: "ok",
        event_id: event.id,
        validation: eventStatus,
        matrix_matched: !!matrixEntry,
        payload_valid: payloadValid,
        validation_errors: validationErrors.length > 0 ? validationErrors : undefined,
        signal_id: signalId,
        decision_id: decisionId,
        action: actionResult,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const errorMessage = (err as Error).message;

    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await supabase.from("system_function_runs").insert({
        function_name: "kernel-ingest-event",
        module_id: "kernel",
        status: "error",
        latency_ms: Date.now() - startTime,
        error_message: errorMessage,
      });
    } catch {}

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
