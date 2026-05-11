/**
 * Renderiza a mensagem de partilha do link de pagamento substituindo
 * placeholders no formato {{name}}. Variáveis em falta caem para "".
 */
export type PaymentMessageVars = {
  customer_name?: string | null;
  invoice_number?: string | null;
  amount?: string | null;
  link: string;
};

export function renderPaymentMessage(template: string, vars: PaymentMessageVars): string {
  const map: Record<string, string> = {
    customer_name: (vars.customer_name ?? "").toString(),
    invoice_number: (vars.invoice_number ?? "").toString(),
    amount: (vars.amount ?? "").toString(),
    link: vars.link,
  };
  return template
    .replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, key: string) => map[key.toLowerCase()] ?? "")
    .replace(/[ \t]+/g, " ")
    .trim();
}
