export type ClientRef = { companyId?: string | null; contactId?: string | null; name?: string | null };

/** Lista de faturas filtrada pelo nome do cliente (e opcionalmente pela situação). */
export function clientInvoicesHref(name: string | null | undefined, due?: "paid" | "not_due" | "overdue"): string {
  const p = new URLSearchParams();
  if (name && name !== "—") p.set("q", name.slice(0, 200));
  if (due) p.set("due", due);
  const qs = p.toString();
  return `/dashboard/invoices${qs ? `?${qs}` : ""}`;
}

/** Ficha da empresa → ficha do contacto → faturas pelo nome. */
export function clientHref(c: ClientRef): string {
  if (c.companyId) return `/dashboard/companies/${encodeURIComponent(c.companyId)}`;
  if (c.contactId) return `/dashboard/contacts/${encodeURIComponent(c.contactId)}`;
  return clientInvoicesHref(c.name);
}
