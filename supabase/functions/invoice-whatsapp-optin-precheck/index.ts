// Backend opt-in verification for invoice WhatsApp sends.
// Validates that the destination phone has not opted out for the workspace
// of the given invoice. Service-role used for read; auth context enforced
// via JWT + workspace membership check.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

interface Body {
  invoice_id?: string;
  phone?: string;
}

function normalizePhoneVariants(raw: string): string[] {
  const digits = raw.replace(/\D+/g, "");
  if (!digits) return [];
  const set = new Set<string>();
  set.add(raw.trim());
  set.add(digits);
  set.add(`+${digits}`);
  // PT default: if 9 digits starting with 9, prepend 351
  if (digits.length === 9 && digits.startsWith("9")) {
    set.add(`351${digits}`);
    set.add(`+351${digits}`);
  }
  // strip leading country code variants
  if (digits.startsWith("351") && digits.length > 9) {
    set.add(digits.slice(3));
    set.add(`+${digits}`);
  }
  return Array.from(set).filter(Boolean);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userRes.user.id;

    const body = (await req.json().catch(() => ({}))) as Body;
    const invoiceId = body.invoice_id?.trim();
    const phone = body.phone?.trim();
    if (!invoiceId || !phone) {
      return json({ error: "invoice_id and phone are required" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false },
    });

    const { data: invoice, error: invErr } = await admin
      .from("invoices")
      .select("id, workspace_id")
      .eq("id", invoiceId)
      .maybeSingle();
    if (invErr || !invoice) return json({ error: "Invoice not found" }, 404);

    const workspaceId = invoice.workspace_id as string;

    // Workspace membership check
    const { data: member } = await admin
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!member) return json({ error: "Forbidden" }, 403);

    const variants = normalizePhoneVariants(phone);
    if (variants.length === 0) {
      return json({ allowed: false, reason: "invalid_phone" });
    }

    const { data: optouts, error: optErr } = await admin
      .from("whatsapp_optouts")
      .select("id, phone, source, reason, created_at")
      .eq("workspace_id", workspaceId)
      .in("phone", variants)
      .limit(1);
    if (optErr) {
      console.error("[wa-precheck] query error", optErr.message);
      // Fail-closed
      return json({ allowed: false, reason: "lookup_error", message: optErr.message }, 200);
    }

    if (optouts && optouts.length > 0) {
      const o = optouts[0];
      return json({
        allowed: false,
        reason: "optout",
        optout: {
          phone: o.phone,
          source: o.source,
          reason: o.reason,
          created_at: o.created_at,
        },
      });
    }

    return json({ allowed: true });
  } catch (e) {
    console.error("[wa-precheck] fatal", (e as Error).message);
    return json({ allowed: false, reason: "internal_error", message: (e as Error).message }, 200);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
