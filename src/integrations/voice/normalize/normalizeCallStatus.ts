import type { CallStatus } from "../providers/types";

/**
 * Mapeia estados específicos de fornecedor para o vocabulário canónico do FastCRM.
 */
export function normalizeTwilioStatus(raw: string | undefined | null): CallStatus {
  switch ((raw ?? "").toLowerCase()) {
    case "queued":
    case "initiated":
      return "initiated";
    case "ringing":
      return "ringing";
    case "in-progress":
    case "answered":
      return "in_progress";
    case "completed":
      return "completed";
    case "busy":
      return "busy";
    case "no-answer":
      return "no_answer";
    case "failed":
      return "failed";
    case "canceled":
    case "cancelled":
      return "cancelled";
    default:
      return "completed";
  }
}

export function normalizeGenericStatus(raw: string | undefined | null): CallStatus {
  const v = (raw ?? "").toLowerCase().replace(/[-\s]/g, "_");
  const allowed: CallStatus[] = [
    "scheduled","initiated","ringing","answered","in_progress","completed",
    "busy","no_answer","missed","failed","cancelled","recorded","transcribed",
  ];
  return (allowed.includes(v as CallStatus) ? v : "completed") as CallStatus;
}
