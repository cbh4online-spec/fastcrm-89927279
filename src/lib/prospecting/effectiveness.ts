export interface QueueRowLite {
  profile_id: string;
  step_index: number;
  status: string;
  updated_at: string;
}

export interface ProspectingEffectiveness {
  approachesToday: number;
  approaches7d: number;
  responseRate: number | null; // null enquanto não há respostas confirmadas associadas aos perfis
  followUpsDone: number;
  followUpsPending: number;
}

/**
 * A fila não guarda o motivo de "cancelled": resposta, conversão e rejeição
 * produzem esse estado. Não é possível calcular uma taxa de resposta fiável.
 */
export function computeEffectiveness(rows: QueueRowLite[], now = new Date()): ProspectingEffectiveness {
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const since7d = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const approachedToday = new Set<string>();
  const approached7d = new Set<string>();
  let followUpsDone = 0;
  let followUpsPending = 0;

  for (const r of rows) {
    if (r.step_index === 1 && r.status === "sent") {
      const t = new Date(r.updated_at).getTime();
      if (t >= since7d) approached7d.add(r.profile_id);
      if (t >= startToday.getTime()) approachedToday.add(r.profile_id);
    }
    if (r.step_index > 1) {
      if (r.status === "sent") followUpsDone++;
      else if (r.status === "scheduled" || r.status === "ready") followUpsPending++;
    }
  }
  return {
    approachesToday: approachedToday.size,
    approaches7d: approached7d.size,
    responseRate: null,
    followUpsDone,
    followUpsPending,
  };
}
