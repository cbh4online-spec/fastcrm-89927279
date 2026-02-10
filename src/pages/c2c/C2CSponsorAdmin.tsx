import { useState } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAdminSponsorApplications, useUpdateSponsorApplication, type SponsorApplication } from "@/hooks/useSponsorApplications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle, XCircle, Clock, ExternalLink, Globe } from "lucide-react";

const STATUS_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "secondary" },
  approved: { label: "Aprovada", variant: "default" },
  rejected: { label: "Rejeitada", variant: "destructive" },
  active: { label: "Ativa", variant: "default" },
  expired: { label: "Expirada", variant: "outline" },
};

export default function C2CSponsorAdmin() {
  const { currentWorkspace } = useWorkspace();
  const { data: apps = [], isLoading } = useAdminSponsorApplications(currentWorkspace?.id);
  const updateApp = useUpdateSponsorApplication(currentWorkspace?.id);
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; id: string }>({ open: false, id: "" });
  const [rejectReason, setRejectReason] = useState("");

  const handleApprove = (id: string) => {
    updateApp.mutate({ applicationId: id, status: "approved" });
  };

  const handleReject = () => {
    if (!rejectReason.trim()) return;
    updateApp.mutate(
      { applicationId: rejectDialog.id, status: "rejected", rejectionReason: rejectReason },
      { onSuccess: () => { setRejectDialog({ open: false, id: "" }); setRejectReason(""); } }
    );
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">A carregar...</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gestão de Sponsors</h1>
        <p className="text-muted-foreground">Reveja e aprove candidaturas de parceiros/sponsors.</p>
      </div>

      {apps.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhuma candidatura de sponsor recebida.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {apps.map((app) => {
            const badge = STATUS_BADGES[app.status] || STATUS_BADGES.pending;
            return (
              <Card key={app.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{app.company_name}</h3>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                        <Badge variant="outline" className="capitalize">{app.tier}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{app.contact_email}</p>
                      {app.contact_phone && (
                        <p className="text-sm text-muted-foreground">{app.contact_phone}</p>
                      )}
                      {app.website_url && (
                        <a href={app.website_url} target="_blank" rel="noopener noreferrer"
                          className="text-sm text-primary flex items-center gap-1 hover:underline">
                          <Globe className="h-3 w-3" />{app.website_url}
                        </a>
                      )}
                      {app.description && (
                        <p className="text-sm mt-2">{app.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Submetida em {new Date(app.created_at).toLocaleDateString("pt-PT")}
                        {app.amount_paid > 0 && ` · Pago: ${app.amount_paid}€`}
                      </p>
                    </div>

                    {app.status === "pending" && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleApprove(app.id)} disabled={updateApp.isPending}>
                          <CheckCircle className="h-4 w-4 mr-1" /> Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setRejectDialog({ open: true, id: app.id })}
                          disabled={updateApp.isPending}
                        >
                          <XCircle className="h-4 w-4 mr-1" /> Rejeitar
                        </Button>
                      </div>
                    )}
                  </div>

                  {app.status === "rejected" && app.rejection_reason && (
                    <p className="mt-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-2 rounded">
                      Motivo: {app.rejection_reason}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(o) => setRejectDialog({ open: o, id: rejectDialog.id })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Candidatura</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Indique o motivo da rejeição:</p>
            <Input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Motivo da rejeição..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, id: "" })}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectReason.trim() || updateApp.isPending}>
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
