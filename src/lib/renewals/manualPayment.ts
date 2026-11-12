export type ManualMethod = "revolut" | "mbway";

/** Normaliza um link Revolut: aceita "revolut.me/nome" ou URL completo; acrescenta o valor quando é um link revolut.me base. */
export function buildRevolutLink(raw: string, amount: number): string {
  let t = raw.trim();
  if (!t) return "";
  // Se colarem a mensagem completa da Revolut, extrair só o link.
  const found = t.match(/https?:\/\/\S+/i);
  if (found) t = found[0].replace(/[.,;)]+$/, "");
  else if (/\s/.test(t)) return "";
  const url = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  const isBase = /^https:\/\/revolut\.me\/[^/?#]+\/?$/i.test(url);
  if (isBase && amount > 0) return `${url.replace(/\/$/, "")}/${amount.toFixed(2)}`;
  return url;
}

export interface ManualMessageLine { name: string; qty: number; amountLabel: string }

export function buildManualMessage(opts: {
  method: ManualMethod | "stripe"; clientName: string; amountLabel: string; reference: string; link?: string; phone?: string;
  title?: string; lines?: ManualMessageLine[]; periodLabel?: string;
}): string {
  const hello = opts.clientName ? `Olá ${opts.clientName},` : "Olá,";
  const head = opts.title?.trim() ? `*${opts.title.trim()}*\n\n` : "";
  const items = opts.lines?.length
    ? `\n\nItens${opts.periodLabel ? ` (${opts.periodLabel})` : ""}:\n` +
      opts.lines.map((l) => `• ${l.name}${l.qty !== 1 ? ` x${l.qty}` : ""} — ${l.amountLabel}`).join("\n") +
      `\nTotal: ${opts.amountLabel}`
    : "";
  const intro = `${hello} segue o pedido de pagamento da renovação (ref. ${opts.reference}).${items}\n\n`;
  let how: string;
  if (opts.method === "revolut") how = `Pode pagar através da Revolut neste link: ${opts.link}`;
  else if (opts.method === "stripe") how = `Pode pagar por cartão neste link seguro: ${opts.link}`;
  else how = `Pode efetuar o pagamento por MB WAY para o número ${opts.phone}, indicando no descritivo a referência ${opts.reference}.`;
  return `${head}${intro}${how}\nObrigado!`;
}
