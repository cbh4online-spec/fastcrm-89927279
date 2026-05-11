export function normalizeInvoiceXpressAccountInput(value: string): string {
  const raw = value.trim().toLowerCase();
  if (!raw) return "";

  try {
    const url = new URL(raw.match(/^https?:\/\//) ? raw : `https://${raw}`);
    const host = url.hostname.replace(/^www\./, "");

    if (host.endsWith(".app.invoicexpress.com")) {
      return host.replace(/\.app\.invoicexpress\.com$/, "");
    }

    if (!host.includes(".")) return host;
  } catch {
    // Falls back to sanitising plain account names.
  }

  return raw
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\.app\.invoicexpress\.com.*$/, "")
    .replace(/[^a-z0-9-]/g, "");
}

export function getInvoiceXpressAccountUrl(account: string): string {
  const normalized = normalizeInvoiceXpressAccountInput(account);
  return normalized ? `https://${normalized}.app.invoicexpress.com` : "";
}