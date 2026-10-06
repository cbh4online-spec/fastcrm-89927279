/** Cobertura de atribuição: % de leads+contactos+empresas atribuídos a gestores ativos do workspace. */
export interface CoverageInput { total: number; unassigned: number; assignedToMembers: number }
export function computeCoverage({ total, unassigned, assignedToMembers }: CoverageInput) {
  const safeTotal = Math.max(0, total);
  const assigned = Math.min(Math.max(0, assignedToMembers), safeTotal);
  const assignedToOthers = Math.max(0, safeTotal - Math.max(0, unassigned) - assigned);
  return {
    total: safeTotal,
    unassigned: Math.max(0, unassigned),
    assignedToMembers: assigned,
    assignedToOthers,
    coveragePct: safeTotal > 0 ? Math.round((assigned / safeTotal) * 100) : 0,
  };
}
