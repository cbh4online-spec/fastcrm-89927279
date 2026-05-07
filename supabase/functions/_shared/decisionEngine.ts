// FastCRM Decision Engine — shared evaluator
// DSL JSON declarativa: { conditions: [{field, op, value}], actions: [{type, config}] }

export type Operator =
  | "eq" | "neq" | "gt" | "gte" | "lt" | "lte"
  | "in" | "not_in" | "contains" | "exists" | "not_exists"
  | "regex";

export interface Condition {
  field: string;       // dot path: payload.amount, entity_kind, event_name
  op: Operator;
  value?: unknown;
  combinator?: "and" | "or"; // default and
}

export interface DecisionAction {
  type: "create_task" | "assign_owner" | "send_notification" | "emit_kernel_event" | "trigger_workflow";
  config: Record<string, unknown>;
}

export interface KernelEventLite {
  id: string;
  workspace_id: string;
  type?: string;
  event_name?: string;
  entity_kind?: string;
  entity_id?: string | null;
  payload?: Record<string, unknown>;
  actor_user_id?: string | null;
  source_module?: string | null;
  occurred_at?: string;
  created_at?: string;
}

function getPath(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== "object") return undefined;
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

function compare(actual: unknown, op: Operator, expected: unknown): boolean {
  switch (op) {
    case "eq": return actual === expected;
    case "neq": return actual !== expected;
    case "gt": return Number(actual) > Number(expected);
    case "gte": return Number(actual) >= Number(expected);
    case "lt": return Number(actual) < Number(expected);
    case "lte": return Number(actual) <= Number(expected);
    case "in": return Array.isArray(expected) && expected.includes(actual);
    case "not_in": return Array.isArray(expected) && !expected.includes(actual);
    case "contains":
      if (typeof actual === "string") return actual.includes(String(expected));
      if (Array.isArray(actual)) return actual.includes(expected);
      return false;
    case "exists": return actual !== undefined && actual !== null;
    case "not_exists": return actual === undefined || actual === null;
    case "regex":
      try { return typeof actual === "string" && new RegExp(String(expected)).test(actual); }
      catch { return false; }
    default: return false;
  }
}

export function evaluateConditions(
  conditions: Condition[] | undefined | null,
  event: KernelEventLite,
): boolean {
  if (!conditions || conditions.length === 0) return true;
  // build context: flat event + payload
  const ctx = {
    ...event,
    type: event.type ?? event.event_name,
    event_name: event.event_name ?? event.type,
    payload: event.payload ?? {},
  };
  let result: boolean | null = null;
  for (const c of conditions) {
    const actual = c.field.startsWith("payload.")
      ? getPath(ctx.payload, c.field.slice("payload.".length))
      : getPath(ctx, c.field);
    const ok = compare(actual, c.op, c.value);
    const combinator = c.combinator ?? "and";
    if (result === null) result = ok;
    else result = combinator === "or" ? (result || ok) : (result && ok);
  }
  return result ?? true;
}

export function interpolate(value: unknown, event: KernelEventLite): unknown {
  if (typeof value === "string") {
    return value.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => {
      const v = path.startsWith("payload.")
        ? getPath(event.payload ?? {}, path.slice("payload.".length))
        : getPath(event as unknown as Record<string, unknown>, path);
      return v === undefined || v === null ? "" : String(v);
    });
  }
  if (Array.isArray(value)) return value.map((v) => interpolate(v, event));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = interpolate(v, event);
    return out;
  }
  return value;
}

export function resolveActions(actions: DecisionAction[] | undefined, event: KernelEventLite): DecisionAction[] {
  if (!actions) return [];
  return actions.map((a) => ({ type: a.type, config: interpolate(a.config ?? {}, event) as Record<string, unknown> }));
}
