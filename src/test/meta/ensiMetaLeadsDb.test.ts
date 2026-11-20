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
  name: "Pessoa Sintética",
  email: "pessoa@example.com",
  phone_number: "+351912345678",
  edicao: "Porto — Janeiro 2027",
  presencial: "Sim",
  atividade: "Estética",
  attribution: { form_id: "29967420322844561", source: "graph_api" },
};

async function ingest(
  leadId: string | null,
  data: Record<string, unknown> = normalized,
  formId: string | null = "29967420322844561",
  pageId: string | null = "113692350807474",
) {
  const result = await db.query<{ result: any }>(
    `SELECT public.ensi_ingest_meta_lead(
      $1::uuid, $5, $2, $3, '111', '222', '333',
      $4::jsonb, $6::jsonb, now()
    ) AS result`,
    [workspaceId, formId, leadId, JSON.stringify({ id: leadId, field_data: [] }), pageId, JSON.stringify(data)],
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
  it("repetições do mesmo lead não duplicam; PGlite serializa as seis promessas", async () => {
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
    expect(lead.rows[0].normalized_payload_json).toMatchObject({
      name: "Pessoa Sintética", full_name: "Pessoa Sintética",
      edicao: "Porto — Janeiro 2027", presencial: "Sim", atividade: "Estética",
    });
  });

  it("dois leads distintos com os mesmos dados partilham um único contacto", async () => {
    const shared = { ...normalized, email: "shared@example.com", phone_number: "+351910000101" };
    const results = await Promise.all([
      ingest("900000000000106", shared),
      ingest("900000000000107", shared),
    ]);
    expect(results.map((result) => result.contact_disposition).sort()).toEqual(["created", "reused"]);
    expect(results[0].contact_id).toBe(results[1].contact_id);
    const contacts = await db.query<any>(`SELECT * FROM public.contacts WHERE email = 'shared@example.com'`);
    expect(contacts.rows).toHaveLength(1);
    expect(contacts.rows[0].name).toBe("Pessoa Sintética");
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
    const result = await ingest("900000000000103", { ...normalized, email: "ambiguous@example.com", phone_number: null });
    expect(result).toMatchObject({ contact_disposition: "ambiguous", contact_id: null });
    const after = await db.query<{ count: number }>(`SELECT count(*)::int AS count FROM public.contacts`);
    expect(after.rows[0].count).toBe(before.rows[0].count);
    const lead = await db.query<any>(`SELECT * FROM public.meta_leads WHERE lead_id_external = '900000000000103'`);
    expect(lead.rows[0]).toMatchObject({ contact_id: null, error_message: "ambiguous_contact_match" });
  });

  it("exige IDs não nulos e email válido ou telefone plausível", async () => {
    await expect(ingest(null)).rejects.toThrow("ENSI_MISSING_REQUIRED_ID");
    await expect(ingest("900000000000104", normalized, null)).rejects.toThrow("ENSI_MISSING_REQUIRED_ID");
    await expect(ingest("900000000000104", normalized, "29967420322844561", null)).rejects.toThrow("ENSI_MISSING_REQUIRED_ID");
    await expect(ingest("900000000000105", { ...normalized, email: null, phone_number: null })).rejects.toThrow("ENSI_NO_CONTACT_DATA");
    await expect(ingest("900000000000108", { ...normalized, email: "invalid", phone_number: "123" })).rejects.toThrow("ENSI_NO_CONTACT_DATA");
    const accepted = await ingest("900000000000109", { ...normalized, email: "invalid", phone_number: "+351910000109" });
    expect(accepted.status).toBe("accepted");
    const contact = await db.query<any>(`SELECT * FROM public.contacts WHERE external_id = '900000000000109'`);
    expect(contact.rows[0].email).toBeNull();
  });

  it("faz rollback do contacto e da receção se o lead falhar", async () => {
    await db.exec(`
      CREATE FUNCTION public.force_ensi_test_failure() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'FORCE_META_LEAD_FAILURE'; END;
      $$;
      CREATE TRIGGER force_ensi_test_failure BEFORE INSERT ON public.meta_leads
      FOR EACH ROW EXECUTE FUNCTION public.force_ensi_test_failure();
    `);
    await expect(ingest("900000000000110", { ...normalized, email: "rollback@example.com", phone_number: "+351910000110" }))
      .rejects.toThrow("FORCE_META_LEAD_FAILURE");
    const rolledBack = await db.query<{ contacts: number; receipts: number }>(
      `SELECT
        (SELECT count(*)::int FROM public.contacts WHERE external_id = '900000000000110') AS contacts,
        (SELECT count(*)::int FROM public.ensi_meta_lead_receipts WHERE lead_id_external = '900000000000110') AS receipts`,
    );
    expect(rolledBack.rows[0]).toEqual({ contacts: 0, receipts: 0 });
    await db.exec(`DROP TRIGGER force_ensi_test_failure ON public.meta_leads; DROP FUNCTION public.force_ensi_test_failure();`);
    const retry = await ingest("900000000000110", { ...normalized, email: "rollback@example.com", phone_number: "+351910000110" });
    expect(retry.status).toBe("accepted");
  });

  it("anon e authenticated não executam a RPC nem leem receções", async () => {
    const privileges = await db.query<Record<string, boolean>>(
      `SELECT
        has_function_privilege('anon', 'public.ensi_ingest_meta_lead(uuid,text,text,text,text,text,text,jsonb,jsonb,timestamptz)', 'EXECUTE') AS anon_rpc,
        has_function_privilege('authenticated', 'public.ensi_ingest_meta_lead(uuid,text,text,text,text,text,text,jsonb,jsonb,timestamptz)', 'EXECUTE') AS authenticated_rpc,
        has_function_privilege('service_role', 'public.ensi_ingest_meta_lead(uuid,text,text,text,text,text,text,jsonb,jsonb,timestamptz)', 'EXECUTE') AS service_rpc,
        has_table_privilege('anon', 'public.ensi_meta_lead_receipts', 'SELECT') AS anon_table,
        has_table_privilege('authenticated', 'public.ensi_meta_lead_receipts', 'SELECT') AS authenticated_table`,
    );
    expect(privileges.rows[0]).toEqual({
      anon_rpc: false,
      authenticated_rpc: false,
      service_rpc: true,
      anon_table: false,
      authenticated_table: false,
    });
  });
});
