import { Check, X } from "lucide-react";
import { LeadChefMobileShell } from "@/components/leadchef/LeadChefMobileShell";
import { LeadChefPermissionGate } from "@/components/leadchef/LeadChefPermissionGate";
import { LeadChefRoleBadge } from "@/components/leadchef/LeadChefRoleBadge";
import { LeadChefTeamEmptyState } from "@/components/leadchef/LeadChefTeamEmptyState";
import { useLeadChefPermissions } from "@/hooks/leadchef/useLeadChefPermissions";
import { useLeadChefTeamMembers } from "@/hooks/leadchef/useLeadChefTeamMembers";

const CAPABILITIES: { key: keyof ReturnType<typeof useLeadChefPermissions>; label: string }[] = [
  { key: "canViewTeam", label: "Ver equipa" },
  { key: "canViewAllLeadChefData", label: "Ver todos os leads do workspace" },
  { key: "canEditTeamGoals", label: "Editar objetivos da equipa" },
  { key: "canAssignLeads", label: "Atribuir leads" },
  { key: "canViewPermissionsPage", label: "Ver permissões" },
];

export default function LeadChefPermissoesPage() {
  return (
    <LeadChefMobileShell title="Permissões" subtitle="Como o teu acesso ao LeadChef está configurado." showFab={false}>
      <LeadChefPermissionGate requireManager>
        <Inner />
      </LeadChefPermissionGate>
    </LeadChefMobileShell>
  );
}

function Inner() {
  const perms = useLeadChefPermissions();
  const { data: members } = useLeadChefTeamMembers();

  return (
    <>
      <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">O teu role</p>
        <div className="mt-2 flex items-center gap-2">
          <LeadChefRoleBadge role={perms.workspaceRole} />
          <span className="text-sm text-slate-700 font-medium capitalize">{perms.leadchefRole}</span>
        </div>
      </section>

      <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Capacidades</h2>
        <ul className="space-y-2">
          {CAPABILITIES.map((c) => {
            const ok = !!perms[c.key];
            return (
              <li key={c.key} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">{c.label}</span>
                {ok ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-medium">
                    <Check className="h-4 w-4" /> Sim
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-slate-400 text-xs font-medium">
                    <X className="h-4 w-4" /> Não
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Membros</h2>
        {!members || members.length === 0 ? (
          <LeadChefTeamEmptyState />
        ) : (
          <ul className="divide-y divide-slate-100">
            {members.map((m) => (
              <li key={m.userId} className="py-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{m.name}</p>
                  {m.email && <p className="text-xs text-slate-500 truncate">{m.email}</p>}
                </div>
                <LeadChefRoleBadge role={m.role} />
              </li>
            ))}
          </ul>
        )}
        <p className="text-[11px] text-slate-500 mt-3">
          A gestão de roles é feita nas definições de workspace do FastCRM.
        </p>
      </section>
    </>
  );
}
