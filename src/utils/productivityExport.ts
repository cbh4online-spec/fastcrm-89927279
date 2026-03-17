import jsPDF from "jspdf";
import Papa from "papaparse";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import type { DailyPriority, ProductivityGoal } from "@/hooks/useProductivityCoach";
import type { Meeting } from "@/hooks/useMeetings";
import type { WeeklyMetric } from "@/hooks/useWeeklyPerformance";

export interface ProductivityExportData {
  priorities: DailyPriority[];
  goals: ProductivityGoal[];
  meetings: Meeting[];
  weeklyMetrics?: WeeklyMetric[];
  weekLabel?: string;
  workspaceName?: string;
  userName?: string;
}

// ─── Helpers ───

function getWeekBounds() {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

function isToday(dateStr: string) {
  return new Date(dateStr).toDateString() === new Date().toDateString();
}

function isThisWeek(dateStr: string) {
  const { start, end } = getWeekBounds();
  const d = new Date(dateStr);
  return d >= start && d <= end;
}

function checkPage(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > 275) {
    doc.addPage();
    return 20;
  }
  return y;
}

function drawSectionHeader(doc: jsPDF, title: string, y: number): number {
  y = checkPage(doc, y, 14);
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(14, y - 4, 182, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(title, 18, y + 3);
  doc.setTextColor(30, 41, 59);
  return y + 14;
}

function addFooter(doc: jsPDF, title: string) {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(title, 14, 290);
    doc.text(`Página ${i}/${total}`, 196, 290, { align: "right" });
  }
}

// ─── PDF Export ───

export function exportProductivityPDF(mode: "daily" | "weekly", data: ProductivityExportData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  const today = new Date();
  const dateLabel = mode === "daily"
    ? format(today, "EEEE, dd 'de' MMMM yyyy", { locale: pt })
    : data.weekLabel || `${format(getWeekBounds().start, "dd/MM")} — ${format(getWeekBounds().end, "dd/MM")}`;

  const titleText = mode === "daily" ? "Briefing Diário" : "Briefing Semanal";

  // Header
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(titleText, 14, 16);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(dateLabel, 14, 24);
  if (data.workspaceName) {
    doc.text(data.workspaceName, pageWidth - 14, 16, { align: "right" });
  }
  if (data.userName) {
    doc.text(data.userName, pageWidth - 14, 24, { align: "right" });
  }

  doc.setTextColor(30, 41, 59);
  let y = 42;

  // Filter data based on mode
  const filteredMeetings = mode === "daily"
    ? data.meetings.filter(m => isToday(m.start_time) && m.status !== "cancelled")
    : data.meetings.filter(m => isThisWeek(m.start_time) && m.status !== "cancelled");

  const filteredGoals = mode === "daily"
    ? data.goals.filter(g => g.period === "daily")
    : data.goals.filter(g => g.period === "daily" || g.period === "weekly");

  // ── Section 1: Priorities ──
  y = drawSectionHeader(doc, `Prioridades ${mode === "daily" ? "de Hoje" : "da Semana"}`, y);

  const prioritiesToShow = mode === "daily"
    ? data.priorities.filter(p => p.priority_date === today.toISOString().split("T")[0])
    : data.priorities;

  if (prioritiesToShow.length === 0) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text("Nenhuma prioridade definida.", 18, y);
    y += 8;
  } else {
    prioritiesToShow.forEach((p, i) => {
      y = checkPage(doc, y, 12);
      const status = p.is_completed ? "✓" : "○";
      const statusColor = p.is_completed ? [22, 163, 74] : [156, 163, 175]; // green-600 / gray-400
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.text(status, 18, y);
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "normal");
      doc.text(`${i + 1}. ${p.title}`, 26, y);
      if (p.description) {
        y += 5;
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        const desc = doc.splitTextToSize(p.description, 160);
        doc.text(desc, 26, y);
        y += desc.length * 4;
        doc.setTextColor(30, 41, 59);
      }
      y += 8;
    });
  }

  // ── Section 2: Meetings ──
  y = drawSectionHeader(doc, `Reuniões ${mode === "daily" ? "de Hoje" : "da Semana"} (${filteredMeetings.length})`, y);

  if (filteredMeetings.length === 0) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text("Nenhuma reunião agendada.", 18, y);
    y += 8;
  } else {
    // Sort by start_time
    const sorted = [...filteredMeetings].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    sorted.forEach(m => {
      y = checkPage(doc, y, 14);
      const time = format(new Date(m.start_time), "HH:mm");
      const endTime = format(new Date(m.end_time), "HH:mm");
      const dayLabel = mode === "weekly" ? format(new Date(m.start_time), "EEE dd", { locale: pt }) + " · " : "";

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(59, 130, 246); // blue-500
      doc.text(`${dayLabel}${time}–${endTime}`, 18, y);
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "normal");
      doc.text(m.title, 60, y);

      const contactName = m.contact?.name || "";
      const companyName = m.company?.name || "";
      const extra = [contactName, companyName].filter(Boolean).join(" · ");
      if (extra) {
        y += 4;
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(extra, 60, y);
        doc.setTextColor(30, 41, 59);
      }
      y += 8;
    });
  }

  // ── Section 3: Goals ──
  y = drawSectionHeader(doc, `Metas ${mode === "daily" ? "Diárias" : "Diárias & Semanais"}`, y);

  if (filteredGoals.length === 0) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text("Nenhuma meta definida.", 18, y);
    y += 8;
  } else {
    filteredGoals.forEach(g => {
      y = checkPage(doc, y, 14);
      const progress = g.target_value && g.target_value > 0
        ? Math.round(((g.current_value || 0) / g.target_value) * 100)
        : 0;
      const statusEmoji = g.status === "completed" ? "✓" : g.status === "in_progress" ? "▶" : "○";

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(`${statusEmoji} ${g.title}`, 18, y);

      // Progress bar
      const barX = 140;
      const barW = 50;
      const barH = 4;
      doc.setFillColor(226, 232, 240); // slate-200
      doc.rect(barX, y - 3, barW, barH, "F");
      const fillW = Math.min(barW, (progress / 100) * barW);
      const barColor = progress >= 100 ? [22, 163, 74] : progress >= 50 ? [234, 179, 8] : [239, 68, 68];
      doc.setFillColor(barColor[0], barColor[1], barColor[2]);
      doc.rect(barX, y - 3, fillW, barH, "F");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(`${progress}%`, barX + barW + 3, y);

      if (g.target_value) {
        y += 5;
        doc.setTextColor(100, 116, 139);
        doc.text(`${g.current_value || 0} / ${g.target_value} ${g.unit || ""}  ·  ${g.period}`, 22, y);
        doc.setTextColor(30, 41, 59);
      }
      y += 8;
    });
  }

  // ── Section 4: Weekly Metrics (only for weekly mode) ──
  if (mode === "weekly" && data.weeklyMetrics && data.weeklyMetrics.length > 0) {
    y = drawSectionHeader(doc, "KPIs Semanais", y);
    
    // Table header
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y - 4, 182, 7, "F");
    doc.text("Métrica", 18, y);
    doc.text("Atual", 100, y, { align: "right" });
    doc.text("Meta", 130, y, { align: "right" });
    doc.text("Progresso", 170, y, { align: "right" });
    y += 8;

    doc.setFont("helvetica", "normal");
    data.weeklyMetrics.forEach(m => {
      y = checkPage(doc, y, 8);
      doc.setFontSize(8);
      doc.text(m.label, 18, y);
      const actualStr = m.format === "currency" ? `€${m.actual.toLocaleString("pt-PT")}` : String(m.actual);
      const targetStr = m.format === "currency" ? `€${m.target.toLocaleString("pt-PT")}` : String(m.target);
      doc.text(actualStr, 100, y, { align: "right" });
      doc.text(targetStr, 130, y, { align: "right" });

      const statusColor = m.status === "green" ? [22, 163, 74] : m.status === "yellow" ? [234, 179, 8] : [239, 68, 68];
      doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.text(`${m.pct}%`, 170, y, { align: "right" });
      doc.setTextColor(30, 41, 59);
      y += 6;
    });
  }

  // ── Summary box ──
  y = checkPage(doc, y, 30);
  y += 4;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, y, 182, 22, 3, 3, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Resumo", 18, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  const completed = data.priorities.filter(p => p.is_completed).length;
  const summaryLine = [
    `${completed}/${prioritiesToShow.length} prioridades concluídas`,
    `${filteredMeetings.length} reuniões`,
    `${filteredGoals.filter(g => g.status === "completed").length}/${filteredGoals.length} metas concluídas`,
  ].join("  ·  ");
  doc.text(summaryLine, 18, y + 14);

  // Footer
  addFooter(doc, `${titleText} — ${dateLabel} — Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")}`);

  doc.save(`briefing-${mode}-${format(today, "yyyy-MM-dd")}.pdf`);
}

// ─── CSV Export ───

export function exportProductivityCSV(mode: "daily" | "weekly", data: ProductivityExportData) {
  const today = new Date();

  // Priorities
  const prioritiesRows = (mode === "daily"
    ? data.priorities.filter(p => p.priority_date === today.toISOString().split("T")[0])
    : data.priorities
  ).map(p => ({
    Tipo: "Prioridade",
    Título: p.title,
    Descrição: p.description || "",
    Estado: p.is_completed ? "Concluída" : "Pendente",
    Data: p.priority_date,
    Hora: "",
    Contacto: "",
    Empresa: "",
    Progresso: "",
  }));

  // Meetings
  const filteredMeetings = mode === "daily"
    ? data.meetings.filter(m => isToday(m.start_time) && m.status !== "cancelled")
    : data.meetings.filter(m => isThisWeek(m.start_time) && m.status !== "cancelled");

  const meetingsRows = filteredMeetings.map(m => ({
    Tipo: "Reunião",
    Título: m.title,
    Descrição: m.description || "",
    Estado: m.status,
    Data: format(new Date(m.start_time), "yyyy-MM-dd"),
    Hora: `${format(new Date(m.start_time), "HH:mm")}–${format(new Date(m.end_time), "HH:mm")}`,
    Contacto: m.contact?.name || "",
    Empresa: m.company?.name || "",
    Progresso: "",
  }));

  // Goals
  const filteredGoals = mode === "daily"
    ? data.goals.filter(g => g.period === "daily")
    : data.goals.filter(g => g.period === "daily" || g.period === "weekly");

  const goalsRows = filteredGoals.map(g => {
    const progress = g.target_value && g.target_value > 0
      ? Math.round(((g.current_value || 0) / g.target_value) * 100)
      : 0;
    return {
      Tipo: "Meta",
      Título: g.title,
      Descrição: g.description || "",
      Estado: g.status,
      Data: g.period_start,
      Hora: "",
      Contacto: "",
      Empresa: "",
      Progresso: `${progress}%`,
    };
  });

  const allRows = [...prioritiesRows, ...meetingsRows, ...goalsRows];
  const csv = Papa.unparse(allRows, { delimiter: ";" });
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `briefing-${mode}-${format(today, "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
