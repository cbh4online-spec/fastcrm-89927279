// Liga um cliente Stripe às fichas do CRM sem criar duplicados e aplica a etiqueta "stripe".
// Ordem de correspondência: email → telefone (só dígitos, últimos 9) → NIF.
export const STRIPE_TAG = "stripe";

const norm = (s?: string | null) => (s || "").trim().toLowerCase();
const digits = (s?: string | null) => (s || "").replace(/\D/g, "");

export function withStripeTag(tags: string[] | null | undefined): string[] | null {
  const list = Array.isArray(tags) ? tags : [];
  return list.some((t) => norm(t) === STRIPE_TAG) ? null : [...list, STRIPE_TAG];
}

async function tag(db: any, table: string, id: string) {
  const { data } = await db.from(table).select("tags").eq("id", id).maybeSingle();
  const next = withStripeTag(data?.tags);
  if (next) await db.from(table).update({ tags: next }).eq("id", id);
}

async function findByContact(db: any, table: string, ws: string, email: string, phone: string) {
  if (email) {
    const { data } = await db.from(table).select("id, company_id").eq("workspace_id", ws)
      .ilike("email", email).is("deleted_at", null).order("created_at", { ascending: true }).limit(1);
    if (data?.[0]) return data[0];
  }
  if (phone.length >= 9) {
    const { data } = await db.from(table).select("id, company_id").eq("workspace_id", ws)
      .ilike("phone", `%${phone.slice(-9)}`).is("deleted_at", null).order("created_at", { ascending: true }).limit(1);
    if (data?.[0]) return data[0];
  }
  return null;
}

export interface ResolveInput {
  workspaceId: string;
  contract: { id: string; contact_id: string | null; company_id: string | null; created_by?: string | null };
  customer: { name?: string | null; email?: string | null; phone?: string | null; tax_id?: string | null };
}

export async function resolveStripeCustomer(db: any, { workspaceId, contract, customer }: ResolveInput) {
  const email = norm(customer.email);
  const phone = digits(customer.phone);
  let contactId = contract.contact_id;
  let companyId = contract.company_id;
  let leadId: string | null = null;
  let created = false;

  if (!contactId) {
    const c = await findByContact(db, "contacts", workspaceId, email, phone);
    if (c) { contactId = c.id; companyId = companyId || c.company_id || null; }
  }
  if (!companyId && customer.tax_id) {
    const nif = digits(customer.tax_id);
    if (nif.length >= 9) {
      const { data } = await db.from("companies").select("id").eq("workspace_id", workspaceId)
        .ilike("tax_id", `%${nif.slice(-9)}`).is("deleted_at", null).limit(1);
      if (data?.[0]) companyId = data[0].id;
    }
  }
  if (!contactId) {
    const l = await findByContact(db, "leads", workspaceId, email, phone);
    if (l) leadId = l.id;
  }
  // Só cria contacto quando não existe em lado nenhum (nem como lead) e há email
  if (!contactId && !leadId && email && contract.created_by) {
    const { data } = await db.from("contacts").insert({
      workspace_id: workspaceId, created_by: contract.created_by,
      name: customer.name?.trim() || email, email, phone: customer.phone || null,
      company_id: companyId, tags: [STRIPE_TAG],
    }).select("id").maybeSingle();
    if (data) { contactId = data.id; created = true; }
  }

  if (contactId && !created) await tag(db, "contacts", contactId);
  if (companyId) await tag(db, "companies", companyId);
  if (leadId) await tag(db, "leads", leadId);

  const patch: Record<string, string> = {};
  if (contactId && contactId !== contract.contact_id) patch.contact_id = contactId;
  if (companyId && companyId !== contract.company_id) patch.company_id = companyId;
  if (Object.keys(patch).length) await db.from("renewal_contracts").update(patch).eq("id", contract.id);

  return { contactId, companyId, leadId, created };
}
