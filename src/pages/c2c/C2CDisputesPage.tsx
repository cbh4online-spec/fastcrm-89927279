import { useState } from "react";
import { useC2CDisputes } from "@/hooks/useC2CTransactions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertTriangle, CheckCircle2, Loader2, Gavel, Clock, MessageSquare
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

const statusColors: Record<string, string> = {
  open: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  under_review: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  resolved_buyer: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  resolved_seller: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  escalated: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
};

export default function C2CDisputesPage() {
  const { disputes, isLoading, resolveDispute } = useC2CDisputes();
  const [resolveDialog, setResolveDialog] = useState<any>(null);
  const [resolution, setResolution] = useState("");
  const [resolveStatus, setResolveStatus] = useState("resolved_buyer");

  const open = disputes.filter((d: any) => ["open", "under_review", "escalated"].includes(d.status));
  const resolved = disputes.filter((d: any) => d.status?.startsWith("resolved"));

  const handleResolve = () => {
    if (!resolveDialog) return;
    resolveDispute.mutate({
      id: resolveDialog.id,
      resolution,
      status: resolveStatus,
    });
    setResolveDialog(null);
    setResolution("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Gavel className="h-6 w-6" /> Disputas
        </h1>
        <p className="text-sm text-muted-foreground">{open.length} disputas ativas</p>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">
            Ativas <Badge variant="secondary" className="ml-1.5 text-xs">{open.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="resolved">Resolvidas</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-3 mt-4">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : open.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12 text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Sem disputas ativas</p>
              </CardContent>
            </Card>
          ) : (
            open.map((dispute: any) => (
              <Card key={dispute.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        <span className="font-medium text-sm">{dispute.reason}</span>
                        <Badge className={statusColors[dispute.status] || ""}>{dispute.status}</Badge>
                      </div>
                      {dispute.description && (
                        <p className="text-xs text-muted-foreground">{dispute.description}</p>
                      )}
                      <div className="text-xs text-muted-foreground flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" /> Aberta por: {dispute.opened_by}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(dispute.created_at), { addSuffix: true, locale: pt })}
                        </span>
                      </div>
                      {dispute.evidence_urls?.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {dispute.evidence_urls.map((url: string, i: number) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline">Evidência {i + 1}</a>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button size="sm" onClick={() => setResolveDialog(dispute)}>
                      <Gavel className="h-3.5 w-3.5 mr-1" /> Resolver
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="resolved" className="space-y-3 mt-4">
          {resolved.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sem disputas resolvidas</p>
          ) : (
            resolved.map((d: any) => (
              <div key={d.id} className="p-3 border rounded-lg bg-card flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{d.reason}</span>
                    <Badge className={statusColors[d.status] || ""}>{d.status}</Badge>
                  </div>
                  {d.resolution && <p className="text-xs text-muted-foreground mt-1">{d.resolution}</p>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {d.resolved_at && formatDistanceToNow(new Date(d.resolved_at), { addSuffix: true, locale: pt })}
                </p>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!resolveDialog} onOpenChange={() => setResolveDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resolver Disputa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Decisão</label>
              <Select value={resolveStatus} onValueChange={setResolveStatus}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="resolved_buyer">A favor do comprador</SelectItem>
                  <SelectItem value="resolved_seller">A favor do vendedor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Resolução</label>
              <Textarea
                placeholder="Descreva a resolução..."
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setResolveDialog(null)}>Cancelar</Button>
              <Button onClick={handleResolve} disabled={!resolution}>Confirmar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
