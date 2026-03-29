import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useMetaLeads, useReprocessLead } from "@/hooks/useMetaLeads";
import { RefreshCw, Eye, RotateCw, Search, CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const statusConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  pending: { icon: Clock, color: "text-yellow-500", label: "Pendente" },
  processing: { icon: Loader2, color: "text-blue-500", label: "A processar" },
  processed: { icon: CheckCircle2, color: "text-green-500", label: "Processado" },
  failed: { icon: XCircle, color: "text-destructive", label: "Falhado" },
  requeued: { icon: RotateCw, color: "text-orange-500", label: "Recolocado" },
};

export function MetaLeadsTable() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const { data: leads = [], isLoading } = useMetaLeads({ status: statusFilter || undefined });
  const reprocess = useReprocessLead();

  const filteredLeads = leads.filter((lead: any) => {
    if (!search) return true;
    const norm = lead.normalized_payload_json || {};
    const searchLower = search.toLowerCase();
    return (
      (norm.name || "").toLowerCase().includes(searchLower) ||
      (norm.email || "").toLowerCase().includes(searchLower) ||
      (lead.lead_id_external || "").includes(searchLower)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Leads Meta</h2>
          <p className="text-sm text-muted-foreground">Leads recebidos via Facebook & Instagram Lead Ads</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {["", "pending", "processed", "failed"].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status)}
            >
              {status === "" ? "Todos" : statusConfig[status]?.label || status}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted-foreground p-3">Data</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3">Nome</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3">Email</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3">Formulário</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3">Campanha</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3">Estado</th>
                  <th className="text-right text-xs font-medium text-muted-foreground p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={7} className="text-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                    </td>
                  </tr>
                )}
                {!isLoading && filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                      Nenhum lead encontrado
                    </td>
                  </tr>
                )}
                {filteredLeads.map((lead: any) => {
                  const norm = lead.normalized_payload_json || {};
                  const status = statusConfig[lead.processing_status] || statusConfig.pending;
                  const StatusIcon = status.icon;

                  return (
                    <tr key={lead.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-3 text-sm">
                        {new Date(lead.received_at).toLocaleDateString("pt-PT", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="p-3 text-sm font-medium">{norm.name || "—"}</td>
                      <td className="p-3 text-sm">{norm.email || "—"}</td>
                      <td className="p-3 text-sm text-muted-foreground">{lead.form_id || "—"}</td>
                      <td className="p-3 text-sm text-muted-foreground">{lead.campaign_id || "—"}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <StatusIcon className={`w-4 h-4 ${status.color} ${lead.processing_status === "processing" ? "animate-spin" : ""}`} />
                          <span className="text-xs font-medium">{status.label}</span>
                        </div>
                        {lead.error_message && (
                          <p className="text-xs text-destructive mt-0.5 truncate max-w-[200px]">{lead.error_message}</p>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setSelectedLead(lead)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          {lead.processing_status === "failed" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => reprocess.mutate(lead.id)}
                              disabled={reprocess.isPending}
                            >
                              <RotateCw className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhe do Lead</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">ID Externo:</span>
                  <p className="font-mono text-xs">{selectedLead.lead_id_external}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Plataforma:</span>
                  <p>{selectedLead.platform}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Page ID:</span>
                  <p className="font-mono text-xs">{selectedLead.page_id}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Form ID:</span>
                  <p className="font-mono text-xs">{selectedLead.form_id}</p>
                </div>
                {selectedLead.contact_id && (
                  <div>
                    <span className="text-muted-foreground">Contacto CRM:</span>
                    <p className="font-mono text-xs">{selectedLead.contact_id}</p>
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Dados Normalizados</h4>
                <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-40">
                  {JSON.stringify(selectedLead.normalized_payload_json, null, 2)}
                </pre>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Payload Bruto</h4>
                <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-40">
                  {JSON.stringify(selectedLead.raw_payload_json, null, 2)}
                </pre>
              </div>

              {selectedLead.error_message && (
                <div>
                  <h4 className="text-sm font-medium mb-2 text-destructive">Erro</h4>
                  <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                    {selectedLead.error_message}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
