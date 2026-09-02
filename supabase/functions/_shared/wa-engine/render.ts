/**
 * Renderização segura de mensagens do Conversion Engine.
 *
 * Regra fundamental: nunca enviar uma mensagem com variáveis por resolver.
 * Se faltar informação obrigatória, o envio automático é bloqueado; o modo
 * assistido pode mostrar a mensagem ao utilizador com as lacunas assinaladas.
 */

export const VARIABLE_REGEX = /\{\{\s*([\w.-]+)\s*\}\}/g;

/** Catálogo de variáveis comerciais suportadas pelo motor. */
export const ENGINE_VARIABLES = [
  "primeiro_nome",
  "nome_completo",
  "empresa",
  "comercial",
  "produto_interesse",
  "servico_interesse",
  "origem_lead",
  "campanha",
  "anuncio",
  "funil",
  "problema_principal",
  "objetivo_cliente",
  "objecao",
  "valor_proposta",
  "numero_proposta",
  "link_proposta",
  "data_reuniao",
  "hora_reuniao",
  "duracao_reuniao",
  "link_agendamento",
  "link_reuniao",
  "opcao_1",
  "opcao_2",
  "opcao_3",
  "pergunta_qualificacao_binaria",
] as const;

export type EngineVariable = (typeof ENGINE_VARIABLES)[number];

export interface RenderInput {
  body: string;
  /** Valores conhecidos (podem vir vazios/nulos). */
  values: Record<string, string | null | undefined>;
  /** Fallbacks seguros previamente definidos no playbook. */
  fallbacks?: Record<string, string>;
  /** Variáveis obrigatórias declaradas no playbook. */
  requiredVariables?: string[];
}

export interface RenderResult {
  text: string;
  /** Variáveis detetadas no corpo. */
  detected: string[];
  /** Variáveis obrigatórias (ou detetadas) sem valor nem fallback. */
  missing: string[];
  /** Verdadeiro quando é seguro enviar automaticamente. */
  canAutoSend: boolean;
}

export function detectVariables(body: string): string[] {
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  const re = new RegExp(VARIABLE_REGEX.source, "g");
  while ((m = re.exec(body))) found.add(m[1]);
  return Array.from(found);
}

function resolveValue(
  key: string,
  values: Record<string, string | null | undefined>,
  fallbacks: Record<string, string>,
): string | null {
  const raw = values[key];
  if (typeof raw === "string" && raw.trim().length > 0) return raw.trim();
  const fb = fallbacks[key];
  if (typeof fb === "string" && fb.trim().length > 0) return fb.trim();
  return null;
}

/**
 * Renderiza a mensagem. Variáveis sem valor nem fallback ficam listadas em
 * `missing` e a mensagem devolvida remove-as (nunca mostra `{{...}}`).
 */
export function renderEngineMessage(input: RenderInput): RenderResult {
  const fallbacks = input.fallbacks ?? {};
  const detected = detectVariables(input.body);
  const missing: string[] = [];

  let text = input.body.replace(VARIABLE_REGEX, (_raw, key: string) => {
    const value = resolveValue(key, input.values, fallbacks);
    if (value === null) {
      missing.push(key);
      return "";
    }
    return value;
  });

  // Limpeza de espaçamento resultante de variáveis removidas.
  text = text
    .split("\n")
    .map((line) => line.replace(/[ \t]{2,}/g, " ").replace(/\s+([,.!?])/g, "$1").trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  for (const req of input.requiredVariables ?? []) {
    if (!missing.includes(req) && resolveValue(req, input.values, fallbacks) === null) {
      missing.push(req);
    }
  }

  const uniqueMissing = Array.from(new Set(missing));
  return {
    text,
    detected,
    missing: uniqueMissing,
    canAutoSend: uniqueMissing.length === 0,
  };
}

/** Lança se a mensagem final ainda contiver variáveis por resolver. */
export function assertNoUnresolvedVariables(text: string): void {
  const remaining = detectVariables(text);
  if (remaining.length > 0) {
    throw new Error(`unresolved_variables: ${remaining.join(", ")}`);
  }
}
