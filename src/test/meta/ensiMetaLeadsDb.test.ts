import { beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { PGlite } from "@electric-sql/pglite";

const migration = readFileSync(resolve(__dirname, "../../../drizzle/migrations/0146_ensi_meta_leads_receipts.sql"), "utf8");
const workspaceId = "0662fc16-6286-4156-a908-08c7dfec0fb7";
const ownerId = "11111111-1111-4111-8111-111111111111";
let db: PGlite;

const normalized = {
  full_name: "Pessoa Sintética",
  email: "pessoa@example.com",
  phone_number: "+351912345678",
  edicao: "Porto — Janeiro 2027",
  presencial: "Sim",
  atividade: "Estética",
  attribution: { form_id: "29967420322844561", source: "graph_api" },
};

async function ingest(leadId: string, data: Record<string, unknown> = normalized, formId = "29967420322844561") {
  const result = await db.query<{ result: any }>(
    `SELECT public.ensi_ingest_meta_lead(
      $1::uuid, '113692350807474', $2, $3, '111', '222', '333',
      $4::jsonb, $5::jsonb, now()
    ) AS result`,
    [workspaceId, formId, leadId, JSON.stringify({ id: leadId, field_data: [] }), JSON.stringify(data)],
  );
  return result.rows[0].result;
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY);
    CREATE TYPE public.workspace_member_role AS ENUM ('owner', 'admin', 'agent');
    CREATE TABLE public.workspaces (id uuid PRIMARY KEY, slug text NOT NULL);
    CREATE TABLE public.workspace_members (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL,
      user_id uuid NOT NULL REFERENCES auth.users(id), role public.workspace_member_role NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE public.contacts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL,
      created_by uuid NOT NULL REFERENCES auth.users(id), name text NOT NULL,
      email text, phone text, source text, lead_source text,
      external_provider text, external_id text, custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
      deleted_at timestamptz
    );
    CREATE TABLE public.meta_leads (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL,
      page_id text, form_id text, lead_id_external text, campaign_id text, adset_id text, ad_id text,
      platform text NOT NULL DEFAULT 'facebook', raw_payload_json jsonb, normalized_payload_json jsonb,
      dedupe_key text, processing_status text NOT NULL DEFAULT 'pending', contact_id uuid,
      opportunity_id uuid, workflow_run_id uuid, error_message text,
      received_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    INSERT INTO auth.users(id) VALUES ('${ownerId}');
    INSERT INTO public.workspaces(id, slug) VALUES ('${workspaceId}', 'pharliss');
    INSERT INTO public.workspace_members(workspace_id, user_id, role) VALUES ('${workspaceId}', '${ownerId}', 'owner');
  `);
  await db.exec(migration);
}, 60_000);

describe("RPC ENSI em Postgres isolado", () => {
  it("aceita uma vez e repetições concorrentes não duplicam lead ou contacto", async () => {
    const results = await Promise.all(Array.from({ length: 6 }, () => ingest("900000000000101")));
    expect(results.filter((result) => result.status === "accepted")).toHaveLength(1);
    expect(results.filter((result) => result.status === "duplicate")).toHaveLength(5);
    const counts = await db.query<{ leads: number; contacts: number; receipts: number }>(
      `SELECT
        (SELECT count(*)::int FROM public.meta_leads WHERE lead_id_external = '900000000000101') AS leads,
        (SELECT count(*)::int FROM public.contacts WHERE external_id = '900000000000101') AS contacts,
        (SELECT count(*)::int FROM public.ensi_meta_lead_receipts WHERE lead_id_external = '900000000000101') AS receipts`,
    );
    expect(counts.rows[0]).toEqual({ leads: 1, contacts: 1, receipts: 1 });
    const lead = await db.query<any>(`SELECT * FROM public.meta_leads WHERE lead_id_external = '900000000000101'`);
    expect(lead.rows[0]).toMatchObject({ processing_status: "processed", opportunity_id: null, workflow_run_id: null });
    expect(lead.rows[0].normalized_payload_json).toMatchObject({ edicao: "Porto — Janeiro 2027", presencial: "Sim", atividade: "Estética" });
  });

  it("reutiliza correspondência única sem sobrescrever o contacto", async () => {
    await db.query(
      `INSERT INTO public.contacts(workspace_id, created_by, name, email, phone, source)
       VALUES ($1, $2, 'Nome original', 'reused@example.com', '+351911111111', 'origem-original')`,
      [workspaceId, ownerId],
    );
    const result = await ingest("900000000000102", { ...normalized, email: "reused@example.com", phone_number: "+351911111111" });
    expect(result.contact_disposition).toBe("reused");
    const contact = await db.query<any>(`SELECT * FROM public.contacts WHERE email = 'reused@example.com'`);
    expect(contact.rows).toHaveLength(1);
    expect(contact.rows[0]).toMatchObject({ name: "Nome original", source: "origem-original", phone: "+351911111111" });
  });

  it("sinaliza ambiguidade sem escolher, criar ou alterar contactos", async () => {
    await db.query(
      `INSERT INTO public.contacts(workspace_id, created_by, name, email)
       VALUES
        ($1, $2, 'Ambíguo A', 'ambiguous@example.com'),
        ($1, $2, 'Ambíguo B', 'ambiguous@example.com')`,
      [workspaceId, ownerId],
    );
    const before = await db.query<{ count: number }>(`SELECT count(*)::int AS count FROM public.contacts`);
    const result = await ingest("900000000000103", { ...normalized, email: "ambiguous@example.com" });
    expect(result).toMatchObject({ contact_disposition: "ambiguous", contact_id: null });
    const after = await db.query<{ count: number }>(`SELECT count(*)::int AS count FROM public.contacts`);
    expect(after.rows[0].count).toBe(before.rows[0].count);
    const lead = await db.query<any>(`SELECT * FROM public.meta_leads WHERE lead_id_external = '900000000000103'`);
    expect(lead.rows[0]).toMatchObject({ contact_id: null, error_message: "ambiguous_contact_match" });
  });

  it("recusa outro formulário e dados sem identificação útil", async () => {
    await expect(ingest("900000000000104", normalized, "999")).rejects.toThrow("ENSI_INVALID_TARGET");
    await expect(ingest("900000000000105", { full_name: null, email: null, phone_number: null })).rejects.toThrow("ENSI_NO_USEFUL_DATA");
    const count = await db.query<{ count: number }>(`SELECT count(*)::int AS count FROM public.meta_leads WHERE lead_id_external IN ('900000000000104', '900000000000105')`);
    expect(count.rows[0].count).toBe(0);
  });
});
