/**
 * Restringe as etapas mostradas ao funil da oportunidade, evitando misturar
 * etapas de outros funis ou etapas antigas sem funil associado.
 */
export interface StageLike {
  id: string;
  pipeline_id?: string | null;
}

export function stagesForOpportunity<T extends StageLike>(
  stages: T[],
  opportunity?: { pipeline_id?: string | null; stage_id?: string | null } | null,
): T[] {
  if (!opportunity) return [];
  const pipelineId =
    opportunity.pipeline_id ??
    stages.find((s) => s.id === opportunity.stage_id)?.pipeline_id ??
    null;
  if (!pipelineId) {
    // Sem funil conhecido: mostrar só a etapa atual, nunca a lista inteira.
    return stages.filter((s) => s.id === opportunity.stage_id);
  }
  return stages.filter((s) => s.pipeline_id === pipelineId);
}
