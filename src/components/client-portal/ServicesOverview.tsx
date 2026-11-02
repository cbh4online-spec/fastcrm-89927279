import { useQuery } from "@tanstack/react-query";
import { Clock3, FolderKanban, HeadphonesIcon, FileCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatMinutes } from "@/lib/retainers/retainerUsage";
import { portalRetainerUsage, type PortalRetainerSummary } from "@/lib/clientPortal/retainerSummary";

interface Props {
  workspaceId: string | null;
  monthKey: string;
  projects: number;
  tickets: number;
  pendingMinutes: number;
  hoursLoading: boolean;
  hoursError: boolean;
  canApprove: boolean;
  onOpen: (tab: string) => void;
}

export function ServicesOverview(props: Props) {
  const retainers = useQuery({
    queryKey: ["portal-retainer-summary", props.workspaceId, props.monthKey],
    enabled: !!props.workspaceId,
    queryFn: async () => {
      if (!props.workspaceId) throw new Error("Sem workspace");
      const { data, error } = await supabase.rpc("portal_retainer_summary", {
        _workspace: props.workspaceId, _month: `${props.monthKey}-01`,
      });
      if (error) throw error;
      return (data ?? []) as unknown as PortalRetainerSummary[];
    },
  });
  const metrics = [
    { label: "Projetos em curso", value: String(props.projects), icon: FolderKanban, tab: "projects" },
    { label: "Tickets em aberto", value: String(props.tickets), icon: HeadphonesIcon, tab: "tickets" },
    { label: "Horas por aprovar", value: props.hoursLoading ? "A carregar…" : props.hoursError ? "Indisponível" : formatMinutes(props.pendingMinutes), icon: FileCheck, tab: "hours" },
  ];
  return <div className="space-y-6">
    <div className="grid gap-3 sm:grid-cols-3">
      {metrics.map((metric) => <Card key={metric.tab}><CardContent className="p-4">
        <metric.icon className="mb-3 h-5 w-5 text-primary" />
        <p className="text-sm text-muted-foreground">{metric.label}</p>
        <p className="my-2 text-xl font-semibold text-foreground">{metric.value}</p>
        <Button variant="ghost" size="sm" onClick={() => props.onOpen(metric.tab)}>
          {metric.tab === "hours" && props.canApprove ? "Rever e aprovar" : "Consultar"}
        </Button>
      </CardContent></Card>)}
    </div>
    <section className="space-y-3" aria-label="Avenças do mês">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground"><Clock3 className="h-5 w-5" />Avenças do mês</h2>
      {retainers.isLoading ? <div role="status" className="flex items-center gap-2 py-4 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />A carregar avenças…</div>
        : retainers.isError ? <div role="alert" className="space-y-2"><p className="text-destructive">Não foi possível carregar o saldo de horas.</p><Button variant="outline" onClick={() => retainers.refetch()}>Tentar novamente</Button></div>
        : !retainers.data?.length ? <p className="py-4 text-muted-foreground">Não há avenças ativas neste mês.</p>
        : <div className="grid gap-4 lg:grid-cols-2">{retainers.data.map((retainer) => {
          const usage = portalRetainerUsage(retainer);
          return <Card key={retainer.id}>
            <CardHeader className="pb-3"><CardTitle className="text-base">{retainer.name}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap justify-between gap-2 text-sm"><span>{formatMinutes(usage.usedMinutes)} utilizadas</span><span className="text-muted-foreground">de {formatMinutes(usage.includedMinutes)}</span></div>
              <Progress value={Math.min(100, usage.pct)} aria-label={`Consumo de ${retainer.name}`} />
              <p className={usage.overageMinutes ? "font-medium text-destructive" : "font-medium text-foreground"}>
                {usage.overageMinutes ? `${formatMinutes(usage.overageMinutes)} extra` : `${formatMinutes(usage.remainingMinutes)} disponíveis`}
              </p>
              <p className="text-xs text-muted-foreground">Projetos: {formatMinutes(usage.projectMinutes)} · Suporte: {formatMinutes(usage.ticketMinutes)}</p>
              <Button variant="outline" size="sm" onClick={() => props.onOpen("hours")}>Ver horas do mês</Button>
            </CardContent>
          </Card>;
        })}</div>}
    </section>
  </div>;
}