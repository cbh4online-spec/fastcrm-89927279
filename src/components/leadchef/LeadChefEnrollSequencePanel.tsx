import { useState } from "react";
import { Workflow, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useLeadChefSequences,
  useEnrollLeadInSequence,
  useLeadSequenceRuns,
} from "@/hooks/leadchef/useLeadChefSequences";
import { LeadChefSequenceRunLogPanel } from "./LeadChefSequenceRunLogPanel";
import { cn } from "@/lib/utils";

interface Props {
  leadId: string;
}

export function LeadChefEnrollSequencePanel({ leadId }: Props) {
  const { data: sequences, isLoading } = useLeadChefSequences();
  const { data: runs } = useLeadSequenceRuns(leadId);
  const enroll = useEnrollLeadInSequence();
  const [sequenceId, setSequenceId] = useState<string>("");
  const [openLogsFor, setOpenLogsFor] = useState<string | null>(null);

  const enabled = (sequences ?? []).filter((s) => s.is_enabled);

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Workflow className="h-4 w-4 text-emerald-600" />
        <h3 className="text-sm font-semibold text-slate-900">Sequências</h3>
      </div>

      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
      ) : enabled.length === 0 ? (
        <p className="text-xs text-slate-500">Sem sequências ativas. Cria/ativa em Sequências.</p>
      ) : (
        <div className="flex gap-2">
          <Select value={sequenceId} onValueChange={setSequenceId}>
            <SelectTrigger className="flex-1 h-9 text-sm">
              <SelectValue placeholder="Escolher sequência…" />
            </SelectTrigger>
            <SelectContent>
              {enabled.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            disabled={!sequenceId || enroll.isPending}
            onClick={() => enroll.mutate({ leadId, sequenceId })}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {enroll.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Inscrever"}
          </Button>
        </div>
      )}

      {runs && runs.length > 0 && (
        <div className="mt-3 space-y-2">
          {runs.map((r) => {
            const isOpen = openLogsFor === r.id;
            const statusClass =
              r.status === "active"   ? "text-emerald-700"
              : r.status === "paused" ? "text-amber-700"
              : r.status === "completed" ? "text-sky-700"
              : "text-slate-500";
            return (
              <div key={r.id} className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => setOpenLogsFor(isOpen ? null : r.id)}
                  className="w-full text-xs flex items-center justify-between bg-slate-50 hover:bg-slate-100 rounded-lg px-2.5 py-1.5 transition"
                >
                  <span className="flex items-center gap-1.5 text-slate-700 truncate">
                    {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    {r.leadchef_sequences?.name ?? "Sequência"}
                  </span>
                  <span className={cn("text-[10px] font-medium", statusClass)}>
                    passo {r.current_step_order} · {r.status}
                  </span>
                </button>
                {isOpen && <LeadChefSequenceRunLogPanel runId={r.id} className="!p-3" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
