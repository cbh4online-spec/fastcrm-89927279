export interface QueueRowLite {
  profile_id: string;
  step_index: number;
  status: string;
  updated_at: string;
}

export interface ProspectingEffectiveness {
  approachesToday: number;
  approaches7d: number;
  responseRate: number | null; // 0–100, null sem abordagens
  followUpsDone: number;
  followUpsPending: number;
}

/** "cancelled" = cadência parada por resposta (webhook ou botão «Respondeu»). */
export function computeEffectiveness(rows: QueueRowLite[], now = new Date()): ProspectingEffectiveness {
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const since7d = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const approached = new Set<string>();
  const responded = new Set<string>();
  let approachesToday = 0;
  let approaches7d = 0;
  let followUpsDone = 0;
  let followUpsPending = 0;

  for (const r of rows) {
    if (r.step_index === 1 && r.status === "sent") {
      approached.add(r.profile_id);
      const t = new Date(r.updated_at).getTime();
      if (t >= since7d) approaches7d++;
      if (t >= startToday.getTime()) approachesToday++;
    }
    if (r.status === "cancelled") responded.add(r.profile_id);
    if (r.step_index > 1) {
      if (r.status === "sent") followUpsDone++;
      else if (r.status === "scheduled" || r.status === "ready") followUpsPending++;
    }
  }
  const respondedApproached = [...responded].filter((id) => approached.has(id)).length;
  return {
    approachesToday,
    approaches7d,
    responseRate: approached.size ? Math.round((respondedApproached / approached.size) * 100) : null,
    followUpsDone,
    followUpsPending,
  };
}
