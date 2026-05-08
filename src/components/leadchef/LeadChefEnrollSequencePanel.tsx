import { useState } from "react";
import { Workflow, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useLeadChefSequences,
  useEnrollLeadInSequence,
  useLeadSequenceRuns,
} from "@/hooks/leadchef/useLeadChefSequences";

interface Props {
  leadId: string;
}

export function LeadChefEnrollSequencePanel({ leadId }: Props) {
  const { data: sequences, isLoading } = useLeadChefSequences();
  const { data: runs } = useLeadSequenceRuns(leadId);
  const enroll = useEnrollLeadInSequence();
  const [sequenceId, setSequenceId] = useState<string>("");

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
        <div className="mt-3 space-y-1.5">
          {runs.map((r) => (
            <div key={r.id} className="text-xs flex items-center justify-between bg-slate-50 rounded-lg px-2.5 py-1.5">
              <span className="text-slate-700 truncate">{r.leadchef_sequences?.name ?? "Sequência"}</span>
              <span className="text-[10px] text-slate-500">
                passo {r.current_step_order} · {r.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
