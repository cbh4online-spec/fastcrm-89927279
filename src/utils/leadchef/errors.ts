/**
 * LeadChef — error helpers
 *
 * Padroniza mensagens amigáveis e logging consistente nos hooks LeadChef.
 * Não expor erros técnicos ao utilizador final.
 */

export type LeadChefErrorContext = string;

export function getLeadChefErrorMessage(error: unknown, fallback?: string): string {
  if (!error) return fallback ?? "Ocorreu um erro inesperado.";

  const err = error as {
    code?: string;
    message?: string;
    status?: number;
    details?: string;
  };

  // Permission / RLS
  if (err.code === "PGRST301" || err.code === "42501" || err.status === 403) {
    return "Sem permissão para esta ação.";
  }

  // Not found
  if (err.code === "PGRST116" || err.status === 404) {
    return "Registo não encontrado.";
  }

  // Unique constraint
  if (err.code === "23505") {
    return "Já existe um registo com estes dados.";
  }

  // Foreign key
  if (err.code === "23503") {
    return "Não foi possível guardar: existe uma referência inválida.";
  }

  // Not null
  if (err.code === "23502") {
    return "Faltam campos obrigatórios.";
  }

  // Network
  if (err.message?.toLowerCase().includes("failed to fetch") || err.message?.toLowerCase().includes("networkerror")) {
    return "Sem ligação. Verifique a internet e tente novamente.";
  }

  return fallback ?? "Não foi possível concluir a operação.";
}

export function logLeadChefError(context: LeadChefErrorContext, error: unknown): void {
  // Mantém um único ponto de logging para o módulo.
  // Em ambiente de produção pode ligar-se a um serviço de observabilidade.
  // eslint-disable-next-line no-console
  console.warn(`[LeadChef] ${context}`, error);
}
