export type ManualMethod = "revolut" | "mbway";

/** Normaliza um link Revolut: aceita "revolut.me/nome" ou URL completo; acrescenta o valor quando é um link revolut.me base. */
export function buildRevolutLink(raw: string, amount: number): string {
  const t = raw.trim();
  if (!t) return "";
  const url = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  const isBase = /^https:\/\/revolut\.me\/[^/?#]+\/?$/i.test(url);
  if (isBase && amount > 0) return `${url.replace(/\/$/, "")}/${amount.toFixed(2)}`;
  return url;
}

export function buildManualMessage(opts: {
  method: ManualMethod; clientName: string; amountLabel: string; reference: string; link?: string; phone?: string;
}): string {
  const hello = opts.clientName ? `Olá ${opts.clientName}` : "Olá";
  if (opts.method === "revolut") {
    return `${hello}, para concluir a renovação no valor de ${opts.amountLabel} (ref. ${opts.reference}), pode pagar através da Revolut neste link: ${opts.link}\nObrigado!`;
  }
  return `${hello}, para concluir a renovação no valor de ${opts.amountLabel}, pode efetuar o pagamento por MB WAY para o número ${opts.phone}, indicando no descritivo a referência ${opts.reference}.\nObrigado!`;
}
