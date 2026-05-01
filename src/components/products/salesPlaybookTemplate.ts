/**
 * Default Sales & Post-Sales playbook template applied to new products.
 *
 * Goal: give the team a usable starting point with clear sections and at least
 * one concrete objection→response example. The user can edit any section or
 * regenerate it with AI from the product detail tab.
 */

export interface ObjectionItemTpl {
  objection: string;
  response: string;
}

export interface SalesPlaybookTpl {
  script: string;
  objections: ObjectionItemTpl[];
  warranty: string;
  /** Marker so we can distinguish a "default template" from user-authored content. */
  is_template?: boolean;
}

export const DEFAULT_SALES_PLAYBOOK: SalesPlaybookTpl = {
  is_template: true,
  script: [
    "## 1. Abertura",
    "- Cumprimentar o cliente pelo nome e confirmar disponibilidade (2-3 min).",
    "- Apresentação curta: nome, empresa e motivo do contacto.",
    "",
    "## 2. Diagnóstico",
    "- Perguntas-chave para entender contexto, dor e urgência.",
    "- Confirmar quem decide e qual o orçamento disponível.",
    "",
    "## 3. Apresentação da solução",
    "- Ligar a dor identificada aos benefícios concretos do produto.",
    "- Mostrar 1-2 provas sociais (caso de sucesso, número, testemunho).",
    "",
    "## 4. Proposta de valor e preço",
    "- Explicar o que está incluído e o que não está.",
    "- Apresentar o preço com confiança, sem pedir desculpa.",
    "",
    "## 5. Fecho",
    "- Pergunta de fecho direta: «Faz sentido avançarmos hoje?»",
    "- Confirmar próximos passos, prazos e responsável de cada lado.",
  ].join("\n"),
  objections: [
    {
      objection: "Está caro / não tenho orçamento agora.",
      response: [
        "Compreendo. Vamos olhar para o retorno: o investimento neste produto resolve [dor concreta] e",
        "tipicamente recupera-se em [prazo]. Posso mostrar 2 opções: uma com pagamento faseado e outra",
        "com a versão essencial — qual prefere ver primeiro?",
      ].join(" "),
    },
    {
      objection: "Preciso de pensar / falar com o sócio.",
      response: [
        "Faz todo o sentido. Para essa conversa ser produtiva, posso enviar-lhe agora um resumo de 1 página",
        "com benefícios, preço e próximos passos? Marcamos já uma chamada curta para sexta para alinhar?",
      ].join(" "),
    },
    {
      objection: "Já uso outra solução / concorrente.",
      response: [
        "Ótimo, isso significa que já reconhece o valor desta categoria. O que costumamos resolver melhor é",
        "[diferencial 1] e [diferencial 2]. Posso mostrar-lhe em 5 minutos a diferença prática no seu caso?",
      ].join(" "),
    },
  ],
  warranty: [
    "## Garantia",
    "- Período: indicar prazo (ex.: 14 dias satisfação ou reembolso, 12 meses garantia técnica).",
    "- Âmbito: o que cobre e o que não cobre.",
    "- Condições: estado do produto, comprovativo de compra, exclusões.",
    "",
    "## Pedido de reclamação",
    "1. Cliente abre pedido por email/WhatsApp com nº de encomenda + descrição + fotos.",
    "2. Equipa de pós-venda responde em até 24h úteis com triagem e SLA.",
    "3. Resolução: troca, reparação, crédito ou reembolso conforme decisão.",
    "",
    "## Procedimento interno",
    "- Registar o caso no CRM com tag «pós-venda».",
    "- Notificar responsável do produto se houver defeito recorrente.",
    "- Pedir avaliação ao cliente após resolução.",
  ].join("\n"),
};

/** True when the playbook is empty or just the seeded template. */
export function isEmptyOrTemplate(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return true;
  const o = raw as Record<string, unknown>;
  if (o.is_template === true) return true;
  const script = typeof o.script === "string" ? o.script.trim() : "";
  const warranty = typeof o.warranty === "string" ? o.warranty.trim() : "";
  const objections = Array.isArray(o.objections) ? o.objections : [];
  return script === "" && warranty === "" && objections.length === 0;
}
