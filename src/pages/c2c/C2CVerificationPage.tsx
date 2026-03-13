import { useState } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useVerificationRequests, useReviewVerification } from "@/hooks/useC2CVerification";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  ShieldCheck, CheckCircle2, XCircle, Clock, Loader2, ExternalLink, FileText, User
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export default function C2CVerificationPage() {
  const { currentWorkspace } = useWorkspace();
  const { data: requests = [], isLoading } = useVerificationRequests(currentWorkspace?.id);
  const reviewMutation = useReviewVerification();
  const [rejectDialog, setRejectDialog] = useState<{ id: string; sellerId: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const pending = requests.filter((r: any) => r.status === "pending");
  const reviewed = requests.filter((r: any) => r.status !== "pending");

  const handleApprove = (req: any) => {
    reviewMutation.mutate({ requestId: req.id, status: "approved", sellerId: req.seller_id });
  };

  const handleReject = () => {
    if (!rejectDialog) return;
    reviewMutation.mutate({
      requestId: rejectDialog.id,
      status: "rejected",
      rejectionReason,
      sellerId: rejectDialog.sellerId,
    });
    setRejectDialog(null);
    setRejectionReason("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="h-6 w-6" /> Verificação de Vendedores
        </h1>
        <p className="text-sm text-muted-foreground">{pending.length} pedidos pendentes</p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pendentes <Badge variant="secondary" className="ml-1.5 text-xs">{pending.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="reviewed">Processados</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3 mt-4">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : pending.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12 text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Sem pedidos pendentes</p>
              </CardContent>
            </Card>
          ) : (
            pending.map((req: any) => (
              <Card key={req.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">
                          {req.c2c_sellers?.display_name || "Vendedor"}
                        </span>
                        <Badge className={statusColors.pending}>{req.status}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p><FileText className="h-3 w-3 inline mr-1" /> Tipo: {req.document_type}</p>
                        {req.business_name && <p>Empresa: {req.business_name}</p>}
                        {req.tax_id && <p>NIF: {req.tax_id}</p>}
                        {req.notes && <p>Notas: {req.notes}</p>}
                      </div>
                      {req.document_urls?.length > 0 && (
                        <div className="flex gap-2">
                          {req.document_urls.map((url: string, i: number) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-primary flex items-center gap-1 hover:underline">
                              <ExternalLink className="h-3 w-3" /> Doc {i + 1}
                            </a>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(req.created_at), { addSuffix: true, locale: pt })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline"
                        className="text-green-600 border-green-200 hover:bg-green-50"
                        onClick={() => handleApprove(req)}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Aprovar
                      </Button>
                      <Button size="sm" variant="outline"
                        className="text-destructive border-destructive/20 hover:bg-destructive/5"
                        onClick={() => setRejectDialog({ id: req.id, sellerId: req.seller_id })}>
                        <XCircle className="h-3.5 w-3.5 mr-1" /> Rejeitar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="reviewed" className="space-y-3 mt-4">
          {reviewed.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sem histórico</p>
          ) : (
            reviewed.map((req: any) => (
              <div key={req.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{req.c2c_sellers?.display_name || "Vendedor"}</span>
                    <Badge className={statusColors[req.status] || ""}>{req.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{req.document_type}</p>
                  {req.rejection_reason && (
                    <p className="text-xs text-destructive mt-1">Motivo: {req.rejection_reason}</p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(req.reviewed_at || req.created_at), { addSuffix: true, locale: pt })}
                </p>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rejeitar verificação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Motivo da rejeição..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setRejectDialog(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleReject}>Confirmar rejeição</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
