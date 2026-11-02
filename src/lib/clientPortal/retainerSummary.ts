import { computeRetainerUsage, type RetainerEntrySource } from "@/lib/retainers/retainerUsage";

export interface PortalRetainerSummary {
  id: string;
  name: string;
  included_hours: number;
  entries: { source: RetainerEntrySource; minutes: number; billable: boolean }[];
}

export function portalRetainerUsage(retainer: PortalRetainerSummary) {
  return computeRetainerUsage(retainer.entries.map((entry, index) => ({
    ...entry, id: String(index), date: "", description: null, userId: null,
    parentId: "", parentLabel: "",
  })), Number(retainer.included_hours), 0);
}