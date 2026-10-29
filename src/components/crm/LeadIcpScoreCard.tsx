import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Phone, RefreshCw, Target } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { isCallWorthy } from "@/lib/leads/icpScore";

interface Props {
  lead: {
    id: string;
    icp_fit_score?: number | null;
    icp_summary?: string | null;
    icp_reasons?: unknown;
    icp_score_status?: string | null;
  };
}

export function LeadIcpScoreCard({ lead }: Props) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const score = lead.icp_fit_score ?? null;
  const reasons = Array.isArray(lead.icp_reasons) ? (lead.icp_reasons as string[]) : [];
  const status = lead.icp_score_status;

  const rescore = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("requeue_lead_icp_score", { _lead_id: lead.id });
    setBusy(false);
    if (error) return toast.error("Não foi possível repontuar a lead.");
    toast.success("Lead enviada para nova pontuação. Fica pronta dentro de momentos.");
    setTimeout(() => qc.invalidateQueries({ queryKey: ["lead", lead.id] }), 20000);
  };

  return (
    <section className="rounded-lg border bg-card p-4 space-y-3" aria-label="Encaixe com o cliente ideal">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" aria-hidden />
          <h3 className="text-sm font-semibold">Encaixe com o cliente ideal</h3>
        </div>
        <Button size="sm" variant="ghost" onClick={rescore} disabled={busy}>
          <RefreshCw className={`h-4 w-4 mr-1 ${busy ? "animate-spin" : ""}`} /> Repontuar
        </Button>
      </div>

      {status === "no_icp" ? (
        <p className="text-sm text-muted-foreground">
          Sem pontuação: o cliente ideal ainda não está descrito.{" "}
          <Link to="/dashboard/context-os" className="text-primary underline">Definir cliente ideal</Link>
        </p>
      ) : score === null ? (
        <p className="text-sm text-muted-foreground">
          {status === "failed" ? "A pontuação falhou. Tente repontuar." : "A aguardar pontuação…"}
        </p>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-semibold tabular-nums">{score}</span>
            <span className="text-sm text-muted-foreground">/ 100</span>
            {isCallWorthy(score) && (
              <Badge className="gap-1"><Phone className="h-3 w-3" /> Vale uma ligação</Badge>
            )}
          </div>
          {lead.icp_summary && <p className="text-sm">{lead.icp_summary}</p>}
          {reasons.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {reasons.map((r) => (
                <li key={r}><Badge variant="secondary" className="font-normal">{r}</Badge></li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

export function IcpScoreBadge({ score }: { score: number | null | undefined }) {
  if (score === null || score === undefined) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="tabular-nums">{score}</span>
      {isCallWorthy(score) && (
        <Badge className="h-5 gap-1 px-1.5 text-[10px]"><Phone className="h-3 w-3" />Ligar</Badge>
      )}
    </span>
  );
}
