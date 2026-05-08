import type { WorkspaceRole } from "@/contexts/WorkspaceContext";
import { Badge } from "@/components/ui/badge";

const LABELS: Record<WorkspaceRole, string> = {
  owner: "Owner",
  admin: "Admin",
  agent: "Agente",
  viewer: "Viewer",
  agency: "Agência",
  hr: "RH",
};

const COLORS: Record<WorkspaceRole, string> = {
  owner: "bg-emerald-100 text-emerald-800 border-emerald-200",
  admin: "bg-emerald-50 text-emerald-700 border-emerald-200",
  agent: "bg-sky-50 text-sky-700 border-sky-200",
  viewer: "bg-slate-100 text-slate-600 border-slate-200",
  agency: "bg-violet-50 text-violet-700 border-violet-200",
  hr: "bg-amber-50 text-amber-700 border-amber-200",
};

export function LeadChefRoleBadge({ role }: { role: WorkspaceRole | null }) {
  if (!role) return null;
  return (
    <Badge variant="outline" className={`text-[11px] font-medium border ${COLORS[role]}`}>
      {LABELS[role]}
    </Badge>
  );
}
