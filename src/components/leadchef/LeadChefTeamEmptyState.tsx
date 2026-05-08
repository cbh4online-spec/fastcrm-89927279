import { Users } from "lucide-react";

export function LeadChefTeamEmptyState({ message }: { message?: string }) {
  return (
    <div className="rounded-2xl bg-white border border-dashed border-slate-200 p-8 text-center">
      <Users className="h-10 w-10 text-slate-400 mx-auto mb-3" />
      <p className="text-sm text-slate-600">
        {message ?? "Ainda não existem membros associados a esta equipa."}
      </p>
    </div>
  );
}
