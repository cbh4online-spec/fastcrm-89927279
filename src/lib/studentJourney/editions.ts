/** Regras das edições (turmas): estados, cidades e vagas. */
export const EDITION_STATUSES = ["planned", "provisional", "confirmed", "in_progress", "completed", "cancelled"] as const;
export type EditionStatus = (typeof EDITION_STATUSES)[number];

export const EDITION_STATUS_LABEL: Record<EditionStatus, string> = {
  planned: "Planeada",
  provisional: "Provisória",
  confirmed: "Confirmada",
  in_progress: "Em curso",
  completed: "Concluída",
  cancelled: "Cancelada",
};

export const SJ_CITIES = ["Porto", "Lisboa"] as const;

export function isEditionStatus(v: unknown): v is EditionStatus {
  return typeof v === "string" && (EDITION_STATUSES as readonly string[]).includes(v);
}

/** Inscrições que ocupam lugar: tudo menos desistências e simples interesse. */
const NON_SEAT = new Set(["dropped", "interested", "cancelled"]);
export function occupiesSeat(enrollmentStatus: string | null | undefined): boolean {
  return !!enrollmentStatus && !NON_SEAT.has(enrollmentStatus);
}

export interface EditionSeats {
  capacity: number | null;
  occupied: number;
  reserved: number;
  available: number | null; // null = sem limite definido
  full: boolean;
}

export function computeEditionSeats(
  capacity: number | null | undefined,
  reserved: number | null | undefined,
  enrollmentStatuses: (string | null | undefined)[],
): EditionSeats {
  const occupied = enrollmentStatuses.filter(occupiesSeat).length;
  const res = Math.max(0, reserved ?? 0);
  if (capacity == null || capacity <= 0) {
    return { capacity: null, occupied, reserved: res, available: null, full: false };
  }
  const available = Math.max(0, capacity - occupied - res);
  return { capacity, occupied, reserved: res, available, full: available === 0 };
}

/** Dias (YYYY-MM-DD) que uma edição ocupa dentro de um mês, para o calendário. */
export function editionDaysInMonth(start: string | null, end: string | null, year: number, month1: number): number[] {
  if (!start) return [];
  const s = start.slice(0, 10);
  const e = (end ?? start).slice(0, 10);
  const first = `${year}-${String(month1).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(year, month1, 0)).getUTCDate();
  const last = `${year}-${String(month1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  if (e < first || s > last) return [];
  const days: number[] = [];
  for (let d = 1; d <= lastDay; d++) {
    const ymd = `${year}-${String(month1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (ymd >= s && ymd <= e) days.push(d);
  }
  return days;
}
