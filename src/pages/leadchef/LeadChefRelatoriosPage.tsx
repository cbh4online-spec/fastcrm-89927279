import { useState } from "react";
import { Loader2, TrendingUp, Trophy, Users, Target, BarChart3, Download, FileText } from "lucide-react";
import { LeadChefMobileShell } from "@/components/leadchef/LeadChefMobileShell";
import { LeadChefPermissionGate } from "@/components/leadchef/LeadChefPermissionGate";
import { LeadChefTeamMetricCard } from "@/components/leadchef/LeadChefTeamMetricCard";
import { LeadChefTeamDateRangeSelector } from "@/components/leadchef/LeadChefTeamDateRangeSelector";
import { useLeadChefFunnel } from "@/hooks/leadchef/useLeadChefFunnel";
import { useLeadChefConversionTrend } from "@/hooks/leadchef/useLeadChefConversionTrend";
import { useLeadChefAgentRanking } from "@/hooks/leadchef/useLeadChefAgentRanking";
import type { LeadChefPeriod } from "@/utils/leadchef/period";
import { buildCSV, downloadFile } from "@/utils/leadchef/csv";
import { printLeadChefDocument } from "@/utils/leadchef/pdf";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  BarChart,
  Bar,
} from "recharts";

const PERIOD_LABEL: Record<LeadChefPeriod, string> = {
  today: "Hoje",
  week: "Esta semana",
  month: "Este mês",
};

export default function LeadChefRelatoriosPage() {
  const [period, setPeriod] = useState<LeadChefPeriod>("month");

  return (
    <LeadChefMobileShell title="Relatórios" subtitle="Funil, ranking e evolução da equipa." showFab={false}>
      <LeadChefPermissionGate requireManager>
        <Content period={period} setPeriod={setPeriod} />
      </LeadChefPermissionGate>
    </LeadChefMobileShell>
  );
}

function Content({ period, setPeriod }: { period: LeadChefPeriod; setPeriod: (p: LeadChefPeriod) => void }) {
  const funnel = useLeadChefFunnel();
  const trend = useLeadChefConversionTrend(6);
  const ranking = useLeadChefAgentRanking(period);

  const isLoading = funnel.isLoading || trend.isLoading || ranking.isLoading;

  const stamp = () => new Date().toISOString().slice(0, 10);
  const periodLabel = PERIOD_LABEL[period];

  function handleExportCSV() {
    try {
      const sections: string[] = [];

      // Funil
      sections.push("FUNIL");
      sections.push(
        buildCSV(
          ["Etapa", "Leads", "% do topo"],
          (funnel.data?.steps ?? []).map((s) => ({ Etapa: s.label, Leads: s.count, "% do topo": `${s.pctOfTop}%` })),
        ).replace(/^\uFEFF/, ""),
      );
      sections.push("");

      // Evolução
      sections.push("EVOLUCAO MENSAL");
      sections.push(
        buildCSV(
          ["Mês", "Leads criados", "Vendas", "Conversão %"],
          (trend.data ?? []).map((p) => ({
            "Mês": p.label,
            "Leads criados": p.created,
            Vendas: p.won,
            "Conversão %": p.conversion,
          })),
        ).replace(/^\uFEFF/, ""),
      );
      sections.push("");

      // Ranking
      sections.push(`RANKING DE AGENTES (${periodLabel})`);
      sections.push(
        buildCSV(
          ["#", "Agente", "Leads", "Demos", "Vendas", "Conversão %", "Score"],
          ranking.rows.map((r, i) => ({
            "#": i + 1,
            Agente: r.name,
            Leads: r.leadsCreated,
            Demos: r.demosCompleted,
            Vendas: r.salesWon,
            "Conversão %": r.conversionRate,
            Score: r.score,
          })),
        ).replace(/^\uFEFF/, ""),
      );

      const content = "\uFEFF" + sections.join("\n");
      downloadFile(`leadchef-relatorio-${period}-${stamp()}.csv`, content);
      toast.success("CSV gerado");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao gerar CSV");
    }
  }

  function handleExportPDF() {
    try {
      const f = funnel.data;
      printLeadChefDocument({
        title: "LeadChef · Relatório executivo",
        subtitle: `Período: ${periodLabel} · Gerado em ${new Date().toLocaleString("pt-PT")}`,
        sections: [
          {
            title: "Indicadores chave",
            rows: [
              { label: "Total de leads", value: String(f?.total ?? 0) },
              { label: "Vendas (won)", value: String(f?.won ?? 0) },
              { label: "Perdidos (lost)", value: String(f?.lost ?? 0) },
              { label: "Taxa de conversão", value: `${f?.conversionRate ?? 0}%` },
            ],
          },
          {
            title: "Funil",
            rows: (f?.steps ?? []).map((s) => ({
              label: s.label,
              value: `${s.count} leads · ${s.pctOfTop}% do topo`,
            })),
          },
          {
            title: "Evolução (últimos 6 meses)",
            rows: (trend.data ?? []).map((p) => ({
              label: p.label,
              value: `${p.created} leads · ${p.won} vendas · ${p.conversion}% conv.`,
            })),
          },
          {
            title: `Ranking de agentes (${periodLabel})`,
            rows:
              ranking.rows.length === 0
                ? [{ label: "Sem dados", value: "—" }]
                : ranking.rows.map((r, i) => ({
                    label: `${i + 1}. ${r.name}`,
                    value: `${r.leadsCreated} leads · ${r.demosCompleted} demos · ${r.salesWon} vendas · ${r.conversionRate}% · score ${r.score}`,
                  })),
          },
        ],
        footer: "LeadChef · Relatório gerado automaticamente",
      });
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao gerar PDF");
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-emerald-600" /> Indicadores chave
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          <LeadChefTeamDateRangeSelector value={period} onChange={setPeriod} />
          <Button size="sm" variant="outline" onClick={handleExportCSV} className="h-8 gap-1.5">
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportPDF} className="h-8 gap-1.5">
            <FileText className="h-3.5 w-3.5" /> PDF
          </Button>
        </div>
      </div>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <LeadChefTeamMetricCard label="Total leads" value={funnel.data?.total ?? 0} icon={Users} />
        <LeadChefTeamMetricCard label="Vendas" value={funnel.data?.won ?? 0} icon={Trophy} tone="success" />
        <LeadChefTeamMetricCard label="Perdidos" value={funnel.data?.lost ?? 0} tone="danger" />
        <LeadChefTeamMetricCard label="Conversão" value={`${funnel.data?.conversionRate ?? 0}%`} icon={Target} tone="success" />
      </section>

      <section className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Funil</h2>
        <div className="space-y-2">
          {funnel.data?.steps.map((step) => (
            <div key={step.stage}>
              <div className="flex items-center justify-between text-xs text-slate-700 mb-1">
                <span>{step.label}</span>
                <span className="font-medium">{step.count} · {step.pctOfTop}%</span>
              </div>
              <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ width: `${step.pctOfTop}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-600" /> Evolução (6 meses)
        </h2>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend.data ?? []} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="created" name="Leads" stroke="#0ea5e9" strokeWidth={2} />
              <Line type="monotone" dataKey="won" name="Vendas" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="h-44 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend.data ?? []} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit="%" />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Bar dataKey="conversion" name="Conversão" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-600" /> Ranking de agentes
        </h2>
        {ranking.rows.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">Sem atividade no período.</p>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-200">
                  <th className="text-left font-medium py-2">#</th>
                  <th className="text-left font-medium py-2">Agente</th>
                  <th className="text-right font-medium py-2">Leads</th>
                  <th className="text-right font-medium py-2">Demos</th>
                  <th className="text-right font-medium py-2">Vendas</th>
                  <th className="text-right font-medium py-2">Conv.</th>
                  <th className="text-right font-medium py-2">Score</th>
                </tr>
              </thead>
              <tbody>
                {ranking.rows.map((r, i) => (
                  <tr key={r.userId} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 text-slate-500">{i + 1}</td>
                    <td className="py-2 font-medium text-slate-900 truncate max-w-[140px]">{r.name}</td>
                    <td className="py-2 text-right">{r.leadsCreated}</td>
                    <td className="py-2 text-right">{r.demosCompleted}</td>
                    <td className="py-2 text-right text-emerald-700 font-semibold">{r.salesWon}</td>
                    <td className="py-2 text-right">{r.conversionRate}%</td>
                    <td className="py-2 text-right font-bold text-slate-900">{r.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
