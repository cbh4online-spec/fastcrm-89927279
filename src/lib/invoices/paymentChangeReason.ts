/** Motivo obrigatório para corrigir/anular recibos (espelha a regra do servidor: mínimo 3 caracteres). */
export function isValidChangeReason(reason: string | null | undefined): boolean {
  return (reason ?? "").trim().length >= 3;
}
