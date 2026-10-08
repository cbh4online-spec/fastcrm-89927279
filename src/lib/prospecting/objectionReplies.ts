/**
 * Respostas rápidas às objeções mais comuns (PT-PT).
 * Apenas preenchem o texto; o envio continua sujeito às proteções existentes.
 */
export interface ObjectionReply {
  key: "price" | "timing" | "supplier" | "email";
  label: string;
  template: string;
}

export const OBJECTION_REPLIES: ObjectionReply[] = [
  {
    key: "price",
    label: "Qual é o preço?",
    template:
      "Olá {nome}, obrigado pela pergunta! O valor depende do que faz sentido para o seu caso. Tem 5 minutos esta semana para eu perceber a sua situação e indicar-lhe uma proposta ajustada?",
  },
  {
    key: "timing",
    label: "Agora não é altura",
    template:
      "Compreendo perfeitamente, {nome}. Posso mostrar-lhe numa conversa curta, sem compromisso, para avaliar mais tarde com calma. Prefere que volte a falar consigo daqui a algumas semanas?",
  },
  {
    key: "supplier",
    label: "Já temos fornecedor",
    template:
      "Ótimo, {nome}, é sinal de que já valoriza este tema. Muitas empresas usam-nos como complemento ou termo de comparação. Faz sentido trocarmos ideias 10 minutos para ver se acrescentamos valor?",
  },
  {
    key: "email",
    label: "Envie por email",
    template:
      "Claro, {nome}, envio com todo o gosto. Para a proposta ser útil, posso fazer-lhe 2 ou 3 perguntas rápidas antes? Qual o melhor email e horário?",
  },
];

export function fillObjectionReply(template: string, name?: string | null): string {
  const first = (name ?? "").trim().split(/\s+/)[0];
  return first ? template.replace(/\{nome\}/g, first) : template.replace(/,?\s*\{nome\}/g, "");
}
