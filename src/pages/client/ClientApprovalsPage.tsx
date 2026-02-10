import { useState } from "react";
import { ClientLayout } from "@/components/client-portal/ClientLayout";
import { useClientPermissions } from "@/hooks/client-portal/useClientPermissions";
import { useClientApprovals, ApprovalRequest } from "@/hooks/client-portal/useClientApprovals";
import { Navigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Clock, Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

const TYPE_LABELS: Record<string, string> = {
  purchase: "Compra",
  refund: "Reembolso",
  upgrade: "Upgrade",
};

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  pending: { label: "Pendente", icon: Clock, className: "bg-amber-100 text-amber-800" },
  approved: { label: "Aprovado", icon: CheckCircle, className: "bg-green-100 text-green-800" },
  rejected: { label: "Rejeitado", icon: XCircle, className: "bg-red-100 text-red-800" },
};

export default function ClientApprovalsPage() {
  const { canApprove, isLoading: permLoading } = useClientPermissions();
  const { approvals, isLoading, decide, isDeciding } = useClientApprovals();
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [decisionReason, setDecisionReason] = useState("");
  const [tab, setTab] = useState("pending");

  if (permLoading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </ClientLayout>
    );
  }

  if (!canApprove) {
    return <Navigate to="/client/dashboard" replace />;
  }

  const filtered = approvals.filter((a) => {
    if (tab === "pending") return a.status === "pending";
    if (tab === "decided") return a.status !== "pending";
    return true;
  });

  const handleDecision = (status: "approved" | "rejected") => {
    if (!selectedRequest) return;
    decide(
      { requestId: selectedRequest.id, status, reason: decisionReason },
      {
        onSuccess: () => {
          toast.success(status === "approved" ? "Pedido aprovado" : "Pedido rejeitado");
          setSelectedRequest(null);
          setDecisionReason("");
        },
        onError: (err: Error) => {
          toast.error("Erro", { description: err.message });
        },
      }
    );
  };

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CheckCircle className="h-6 w-6" />
            Aprovações
          </h1>
          <p className="text-muted-foreground">Gerir pedidos de aprovação da sua empresa</p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              Pendentes
              {approvals.filter((a) => a.status === "pending").length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {approvals.filter((a) => a.status === "pending").length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="decided">Decididos</TabsTrigger>
            <TabsTrigger value="all">Todos</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-4">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  {tab === "pending" ? "Sem aprovações pendentes" : "Sem registos"}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {filtered.map((req) => {
                  const statusCfg = STATUS_CONFIG[req.status];
                  const StatusIcon = statusCfg.icon;

                  return (
                    <Card key={req.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-4 flex-1">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${statusCfg.className}`}>
                            <StatusIcon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{TYPE_LABELS[req.approval_type] || req.approval_type}</p>
                              <Badge variant="outline" className={statusCfg.className}>
                                {statusCfg.label}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Por {req.requester?.name} · {format(new Date(req.created_at), "d MMM yyyy, HH:mm", { locale: pt })}
                            </p>
                            {req.request_reason && (
                              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                {req.request_reason}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {req.total_value !== null && (
                            <span className="font-semibold text-lg">
                              {new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(req.total_value)}
                            </span>
                          )}

                          {req.status === "pending" && (
                            <Button variant="outline" size="sm" onClick={() => setSelectedRequest(req)}>
                              Decidir
                            </Button>
                          )}

                          {req.status !== "pending" && req.decider && (
                            <span className="text-xs text-muted-foreground">
                              por {req.decider.name}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Decision Dialog */}
        <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Decidir Aprovação</DialogTitle>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <p><strong>Tipo:</strong> {TYPE_LABELS[selectedRequest.approval_type]}</p>
                  <p><strong>Solicitado por:</strong> {selectedRequest.requester?.name}</p>
                  {selectedRequest.total_value !== null && (
                    <p><strong>Valor:</strong> {new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(selectedRequest.total_value)}</p>
                  )}
                  {selectedRequest.request_reason && (
                    <p><strong>Motivo:</strong> {selectedRequest.request_reason}</p>
                  )}
                </div>

                <div>
                  <Textarea
                    placeholder="Comentário (opcional)"
                    value={decisionReason}
                    onChange={(e) => setDecisionReason(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    className="flex-1"
                    variant="default"
                    onClick={() => handleDecision("approved")}
                    disabled={isDeciding}
                  >
                    {isDeciding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                    Aprovar
                  </Button>
                  <Button
                    className="flex-1"
                    variant="destructive"
                    onClick={() => handleDecision("rejected")}
                    disabled={isDeciding}
                  >
                    {isDeciding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                    Rejeitar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ClientLayout>
  );
}
