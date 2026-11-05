import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  TICKET_LABEL, agingRisk, collectionRisk, concentrationRisk, dormantRisk, smallTicketRisk,
  type CustomerBehavior, type ExecutiveDiagnostics, type RiskLevel,
} from "@/lib/bgi/executiveDiagnostics";
import type { ActionLists } from "@/lib/bgi/actionLists";

// jsPDF (Helvetica) não suporta os espaços finos do Intl → normalizar.
const clean = (s: string) => s.replace(/[\u202f\u00a0]/g, " ");
const eur = (v: number | null) => clean(new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v || 0));
const pct = (v: number | null) => (v == null ? "—" : `${clean(v.toLocaleString("pt-PT"))}%`);
const dt = (d: string) => clean(new Intl.DateTimeFormat("pt-PT", { timeZone: "Europe/Lisbon" }).format(new Date(`${d}T12:00:00Z`)));
const PRIMARY: [number, number, number] = [30, 64, 175];
const RISK_TXT: Record<RiskLevel, string> = { ok: "Saudável", warning: "Atenção", critical: "Crítico" };

export function buildExecutiveSummary(d: ExecutiveDiagnostics, b: CustomerBehavior | undefined): string[] {
  const out: string[] = [];
  const c = d.concentration, a = d.aging;
  out.push(`${RISK_TXT[concentrationRisk(c.top3_share)]} — Concentração: o top 3 representa ${pct(c.top3_share)} e o top 10 ${pct(c.top10_share)} da faturação líquida (${eur(c.total_net)}, ${c.customers} clientes).`);
  out.push(`${RISK_TXT[collectionRisk(d.collection.rate)]} — Cobrança: ${pct(d.collection.rate)} do faturado no período já foi recebido (${eur(d.collection.paid_gross)} de ${eur(d.collection.invoiced_gross)}).`);
  if (a.total > 0) out.push(`${RISK_TXT[agingRisk(a)]} — Saldos: ${eur(a.total)} em aberto, dos quais ${eur(a.d61_90 + a.d90_plus)} com mais de 60 dias de atraso.`);
  if (b) {
    out.push(`${RISK_TXT[dormantRisk(b.dormant.value_at_risk, c.total_net)]} — Clientes parados: ${b.dormant.count} clientes habituais sem compras há mais de 60 dias, com ${eur(b.dormant.value_at_risk)} de valor anual em risco.`);
    if (b.tickets.count) out.push(`${RISK_TXT[smallTicketRisk(b.tickets)]} — Valor das faturas: média de ${eur(b.tickets.avg)} e mediana de ${eur(b.tickets.median)} em ${b.tickets.count} faturas.`);
  }
  return out;
}

export function exportGrowthDossierPdf(opts: { workspaceName: string; rangeLabel: string; diag: ExecutiveDiagnostics; behavior?: CustomerBehavior; actions?: ActionLists }) {
  const { diag: d, behavior: b, actions } = opts;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 15;
  let y = 0;
  const lastY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  const ensure = (h: number) => { if (y + h > 280) { doc.addPage(); y = 20; } };
  const h2 = (t: string) => { ensure(20); doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(...PRIMARY); doc.text(t, M, y); y += 7; doc.setTextColor(30, 30, 30); };
  const para = (t: string) => { doc.setFont("helvetica", "normal"); doc.setFontSize(10); const lines = doc.splitTextToSize(t, W - 2 * M); ensure(lines.length * 5); doc.text(lines, M, y); y += lines.length * 5 + 2; };
  const table = (head: string[], body: (string | number)[][], rightCols: number[] = []) => {
    autoTable(doc, {
      startY: y, head: [head], body: body.map((r) => r.map(String)), margin: { left: M, right: M },
      styles: { fontSize: 8.5, cellPadding: 1.8 }, headStyles: { fillColor: PRIMARY },
      columnStyles: Object.fromEntries(rightCols.map((c) => [c, { halign: "right" }])),
    });
    y = lastY() + 8;
  };

  // 1. Capa
  doc.setFillColor(...PRIMARY); doc.rect(0, 0, W, 70, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(22);
  doc.text("Dossier Executivo", M, 32);
  doc.setFontSize(13); doc.setFont("helvetica", "normal");
  doc.text(clean(opts.workspaceName), M, 44);
  doc.text(`${opts.rangeLabel}: ${dt(d.start)} a ${dt(d.end)} (exclusive)`, M, 52);
  doc.setFontSize(9); doc.text(`Gerado em ${clean(new Intl.DateTimeFormat("pt-PT", { timeZone: "Europe/Lisbon", dateStyle: "long", timeStyle: "short" }).format(new Date()))}`, M, 62);
  doc.setTextColor(30, 30, 30); y = 85;

  // 2. Resumo
  h2("1. Resumo executivo");
  buildExecutiveSummary(d, b).forEach((l) => para(`• ${l}`));

  // 3. Concentração
  h2("2. Concentração de clientes");
  para(`Faturação líquida ${eur(d.concentration.total_net)} · ${d.concentration.customers} clientes · top 3 ${pct(d.concentration.top3_share)} · top 10 ${pct(d.concentration.top10_share)} · top 20 ${pct(d.concentration.top20_share)} · ${d.concentration.customers_for_80pct ?? "—"} clientes fazem 80% da faturação.`);
  if (d.concentration.top.length) table(["#", "Cliente", "Faturado", "Peso", "Em aberto"], d.concentration.top.map((c, i) => [i + 1, clean(c.name), eur(c.net), pct(c.share), eur(c.open)]), [2, 3, 4]);

  // 4. Cobrança e saldos
  h2("3. Cobrança e antiguidade dos saldos");
  para(`Faturado (c/ IVA) ${eur(d.collection.invoiced_gross)} · recebido ${eur(d.collection.paid_gross)} · taxa de cobrança ${pct(d.collection.rate)}.`);
  table(["Total em aberto", "Não vencido", "1–30 d", "31–60 d", "61–90 d", "> 90 d"],
    [[eur(d.aging.total), eur(d.aging.not_due), eur(d.aging.d1_30), eur(d.aging.d31_60), eur(d.aging.d61_90), eur(d.aging.d90_plus)]], [0, 1, 2, 3, 4, 5]);
  if (d.aging.top_debtors.length) table(["Maiores devedores", "Saldo", "Faturas", "Maior atraso"], d.aging.top_debtors.map((x) => [clean(x.name), eur(x.balance), x.invoices, x.max_overdue_days > 0 ? `${x.max_overdue_days} dias` : "Não vencido"]), [1, 2, 3]);

  // 5–6. Comportamento
  if (b) {
    h2("4. Clientes que deixaram de comprar");
    para(`${b.dormant.count} clientes parados (61–90 d: ${b.dormant.d61_90} · 91–180 d: ${b.dormant.d91_180} · > 180 d: ${b.dormant.d180_plus}). Valor anual em risco: ${eur(b.dormant.value_at_risk)}. Intervalo típico entre compras: ${b.frequency.median_gap_days ?? "—"} dias.`);
    if (b.dormant.top.length) table(["Cliente", "Última compra", "Parado há", "Ritmo", "Valor anual"], b.dormant.top.slice(0, 10).map((x) => [clean(x.name), dt(x.last_date), `${x.idle_days} d`, x.avg_gap_days != null ? `${x.avg_gap_days} d` : "—", eur(x.value12)]), [2, 3, 4]);
    h2("5. Valor das faturas");
    para(`${b.tickets.count} faturas · média ${eur(b.tickets.avg)} · mediana ${eur(b.tickets.median)}.`);
    if (b.tickets.count) table(["Escalão", "Faturas", "% faturas", "Valor"], b.tickets.buckets.map((x) => [TICKET_LABEL[x.key], x.count, `${Math.round((100 * x.count) / b.tickets.count)}%`, eur(x.value)]), [1, 2, 3]);
  }

  // 7. Plano de ação
  if (actions) {
    h2("6. Plano de ação");
    para(`Prioridade 1 — Cobrar saldos vencidos há mais de 60 dias (${actions.collect.length} clientes).`);
    if (actions.collect.length) table(["Cliente", "Saldo", "Faturas", "Maior atraso"], actions.collect.slice(0, 10).map((x) => [clean(x.name), eur(x.amount), x.invoices, `${x.max_overdue_days} d`]), [1, 2, 3]);
    para(`Prioridade 2 — Reativar clientes parados há mais do dobro do seu ritmo (${actions.reactivate.length} clientes).`);
    if (actions.reactivate.length) table(["Cliente", "Parado há", "Ritmo", "Valor anual"], actions.reactivate.slice(0, 10).map((x) => [clean(x.name), `${x.idle_days} d`, x.avg_gap_days != null ? `${x.avg_gap_days} d` : "—", eur(x.amount)]), [1, 2, 3]);
    para(`Prioridade 3 — Aumentar o valor das compras de clientes frequentes com faturas abaixo de 150 € em média (${actions.upsell.length} clientes).`);
    if (actions.upsell.length) table(["Cliente", "Faturas", "Valor médio", "Total"], actions.upsell.slice(0, 10).map((x) => [clean(x.name), x.invoices, eur(x.avg_ticket), eur(x.amount)]), [1, 2, 3]);
  }

  // 8. Metodologia
  h2("Metodologia");
  para("Datas em calendário de Lisboa. Contam faturas, notas de débito e notas de crédito emitidas (exclui anuladas, rascunhos, pró-formas e documentos de trabalho). Faturação líquida = total sem IVA, deduzindo notas de crédito. O atraso conta-se desde a data de vencimento ou, quando esta não existe, desde a data da fatura — o que pode aumentar os atrasos apresentados. Clientes parados: 2 ou mais compras nos últimos 2 anos e sem faturas há mais de 60 dias.");

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) { doc.setPage(p); doc.setFontSize(8); doc.setTextColor(120, 120, 120); doc.text(`FastCRM · Crescimento · página ${p} de ${pages}`, W - M, 290, { align: "right" }); }
  const safe = opts.workspaceName.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase();
  doc.save(`dossier-executivo-${safe}-${d.start}.pdf`);
}
