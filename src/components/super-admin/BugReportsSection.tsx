import { useState, useEffect, useCallback } from "react";
import { useBugReportsAdmin, BugReport, BugReportStatus } from "@/hooks/useBugReport";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { Search, Download, X, ExternalLink, Loader2, Check } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  open: { label: "Aberto", className: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  in_review: { label: "Em análise", className: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  resolved: { label: "Resolvido", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  closed: { label: "Fechado", className: "bg-secondary text-muted-foreground border-border" },
  duplicate: { label: "Duplicado", className: "bg-secondary text-muted-foreground border-border" },
};

const CATEGORY_LABELS: Record<string, { label: string; icon: string; className: string }> = {
  bug: { label: "Bug", icon: "🐛", className: "bg-destructive/10 text-destructive" },
  question: { label: "Dúvida", icon: "❓", className: "bg-blue-500/10 text-blue-600" },
  suggestion: { label: "Sugestão", icon: "💡", className: "bg-amber-500/10 text-amber-600" },
  performance: { label: "Lentidão", icon: "🐢", className: "bg-purple-500/10 text-purple-600" },
  other: { label: "Outro", icon: "📌", className: "bg-secondary text-muted-foreground" },
};

const PRIORITY_DOTS: Record<string, string> = {
  low: "bg-emerald-500",
  normal: "bg-muted-foreground",
  high: "bg-amber-500",
  critical: "bg-destructive",
};

export default function BugReportsAdminPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedReport, setSelectedReport] = useState<BugReport | null>(null);

  const { reports, isLoading, updateReport, counts } = useBugReportsAdmin({
    status: statusFilter,
    category: categoryFilter,
    search,
  });

  const handleExportCSV = () => {
    const headers = ["Ticket", "Data", "Utilizador", "Tipo", "Prioridade", "Estado", "Título", "Rota", "Browser", "OS"];
    const rows = reports.map((r) => [
      r.ticket_number,
      new Date(r.created_at).toLocaleDateString("pt-PT"),
      r.user_email ?? "",
      r.category,
      r.priority,
      r.status,
      `"${r.title.replace(/"/g, '""')}"`,
      r.route ?? "",
      r.browser_name ?? "",
      r.os_name ?? "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bug-reports-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleStatusChange = (id: string, status: BugReportStatus) => {
    updateReport.mutate({ id, status }, {
      onSuccess: () => toast.success("Estado atualizado"),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reportes de Problema</h1>
          <p className="text-sm text-muted-foreground">Gerir reportes de bugs e sugestões dos utilizadores</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-md hover:bg-secondary/50 transition-colors text-muted-foreground"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total", count: counts.total, className: "text-foreground" },
          { label: "Em aberto", count: counts.open, className: "text-amber-600" },
          { label: "Em análise", count: counts.in_review, className: "text-blue-600" },
          { label: "Resolvidos", count: counts.resolved, className: "text-emerald-600" },
        ].map((c) => (
          <div key={c.label} className="border border-border rounded-lg p-4 bg-card">
            <p className="text-xs text-muted-foreground mb-1">{c.label}</p>
            <p className={`text-2xl font-bold ${c.className}`}>{c.count}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar ticket, email ou título..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-border rounded-md bg-background"
        >
          <option value="all">Todos os estados</option>
          <option value="open">Aberto</option>
          <option value="in_review">Em análise</option>
          <option value="resolved">Resolvido</option>
          <option value="closed">Fechado</option>
          <option value="duplicate">Duplicado</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-border rounded-md bg-background"
        >
          <option value="all">Todos os tipos</option>
          <option value="bug">Bug</option>
          <option value="question">Dúvida</option>
          <option value="suggestion">Sugestão</option>
          <option value="performance">Lentidão</option>
          <option value="other">Outro</option>
        </select>
      </div>

      {/* Table + Drawer */}
      <div className="flex gap-0 border border-border rounded-lg overflow-hidden">
        {/* Table */}
        <div className={`flex-1 ${selectedReport ? "hidden lg:block" : ""}`}>
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground text-sm">Nenhum reporte encontrado</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Ticket</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Utilizador</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Título</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Tipo</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Prior.</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Data</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Estado</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => {
                    const cat = CATEGORY_LABELS[r.category] ?? CATEGORY_LABELS.other;
                    const isCriticalOpen = r.status === "open" && r.priority === "critical";
                    return (
                      <tr
                        key={r.id}
                        className={`border-b border-border hover:bg-secondary/30 transition-colors ${
                          isCriticalOpen ? "border-l-2 border-l-destructive" : ""
                        } ${selectedReport?.id === r.id ? "bg-secondary/40" : ""}`}
                      >
                        <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap">{r.ticket_number}</td>
                        <td className="px-4 py-2.5">
                          <p className="text-xs truncate max-w-[140px]">{r.user_email ?? "—"}</p>
                        </td>
                        <td className="px-4 py-2.5">
                          <p className="text-xs truncate max-w-[180px]" title={r.title}>{r.title}</p>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${cat.className}`}>
                            {cat.icon} {cat.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${PRIORITY_DOTS[r.priority] ?? PRIORITY_DOTS.normal}`} />
                            <span className="text-xs capitalize">{r.priority}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: pt })}
                        </td>
                        <td className="px-4 py-2.5">
                          <select
                            value={r.status}
                            onChange={(e) => handleStatusChange(r.id, e.target.value as BugReportStatus)}
                            className="text-[11px] px-2 py-1 rounded border border-border bg-background"
                          >
                            <option value="open">Aberto</option>
                            <option value="in_review">Em análise</option>
                            <option value="resolved">Resolvido</option>
                            <option value="closed">Fechado</option>
                            <option value="duplicate">Duplicado</option>
                          </select>
                        </td>
                        <td className="px-4 py-2.5">
                          <button
                            onClick={() => setSelectedReport(r)}
                            className="text-xs text-primary hover:underline whitespace-nowrap"
                          >
                            Ver detalhes
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail Drawer */}
        {selectedReport && (
          <ReportDetailDrawer
            report={selectedReport}
            onClose={() => setSelectedReport(null)}
            onStatusChange={handleStatusChange}
            onNotesChange={(id, notes) => {
              updateReport.mutate({ id, adminNotes: notes });
            }}
          />
        )}
      </div>
    </div>
  );
}

// ── DETAIL DRAWER ──────────────────────────────────────────
interface DrawerProps {
  report: BugReport;
  onClose: () => void;
  onStatusChange: (id: string, status: BugReportStatus) => void;
  onNotesChange: (id: string, notes: string) => void;
}

function ReportDetailDrawer({ report, onClose, onStatusChange, onNotesChange }: DrawerProps) {
  const [notes, setNotes] = useState(report.admin_notes ?? "");
  const [savedMsg, setSavedMsg] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset notes when report changes
  useEffect(() => {
    setNotes(report.admin_notes ?? "");
  }, [report.id, report.admin_notes]);

  const handleNotesChange = useCallback((value: string) => {
    setNotes(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onNotesChange(report.id, value);
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2000);
    }, 1000);
  }, [report.id, onNotesChange]);

  const cat = CATEGORY_LABELS[report.category] ?? CATEGORY_LABELS.other;
  const status = STATUS_LABELS[report.status] ?? STATUS_LABELS.open;

  return (
    <div className="w-full lg:w-[400px] border-l border-border bg-card flex flex-col">
      {/* Drawer header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold">{report.ticket_number}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${status.className}`}>{status.label}</span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* Title & desc */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">{report.title}</h3>
            <p className="text-xs text-muted-foreground whitespace-pre-wrap">{report.description}</p>
          </div>

          {/* Category + Priority */}
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${cat.className}`}>
              {cat.icon} {cat.label}
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${PRIORITY_DOTS[report.priority]}`} />
              <span className="text-xs capitalize">{report.priority}</span>
            </div>
          </div>

          {/* Screenshot */}
          {report.screenshot_url && (
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Captura de ecrã</label>
              <a href={report.screenshot_url} target="_blank" rel="noopener noreferrer" className="block">
                <img src={report.screenshot_url} alt="Screenshot" className="w-full rounded-md border border-border" />
              </a>
            </div>
          )}

          {/* Attachment */}
          {report.attachment_url && (
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Ficheiro anexo</label>
              <a
                href={report.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-primary hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {report.attachment_name ?? "Ficheiro"}
              </a>
            </div>
          )}

          {/* Context */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Contexto</label>
            <div className="space-y-1 bg-secondary/30 rounded-md p-3">
              {[
                ["Rota", report.route],
                ["Browser", [report.browser_name, report.browser_version].filter(Boolean).join(" ")],
                ["OS", [report.os_name, report.os_version].filter(Boolean).join(" ")],
                ["Viewport", report.viewport_width && report.viewport_height ? `${report.viewport_width}×${report.viewport_height}` : null],
                ["Ecrã", report.screen_width && report.screen_height ? `${report.screen_width}×${report.screen_height}` : null],
                ["User Agent", report.user_agent],
              ]
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k as string} className="flex gap-2">
                    <span className="text-[10px] text-muted-foreground w-14 flex-shrink-0">{k}</span>
                    <span className="text-[10px] text-foreground/80 font-mono break-all">{v}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Admin Notes */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-muted-foreground">Notas de admin</label>
              {savedMsg && (
                <span className="text-[10px] text-emerald-500 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Guardado
                </span>
              )}
            </div>
            <textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Notas internas sobre este reporte..."
              rows={3}
              className="w-full px-3 py-2 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-y"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {report.status !== "resolved" && (
              <button
                onClick={() => onStatusChange(report.id, "resolved")}
                className="flex-1 py-2 text-xs font-medium rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors"
              >
                Marcar como resolvido
              </button>
            )}
            {report.status !== "closed" && (
              <button
                onClick={() => onStatusChange(report.id, "closed")}
                className="flex-1 py-2 text-xs font-medium rounded-md bg-secondary text-muted-foreground border border-border hover:bg-secondary/80 transition-colors"
              >
                Fechar ticket
              </button>
            )}
          </div>

          {/* Timestamps */}
          <div className="text-[10px] text-muted-foreground space-y-0.5 pt-2 border-t border-border">
            <p>Submetido: {new Date(report.created_at).toLocaleString("pt-PT")}</p>
            <p>Atualizado: {new Date(report.updated_at).toLocaleString("pt-PT")}</p>
            {report.resolved_at && <p>Resolvido: {new Date(report.resolved_at).toLocaleString("pt-PT")}</p>}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// Need useRef for debounce
import { useRef } from "react";
