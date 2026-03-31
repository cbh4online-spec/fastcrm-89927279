import { useState } from "react";
import { useC2CModeration } from "@/hooks/useC2CModeration";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  escalated: "bg-purple-100 text-purple-800",
};

export default function C2CModerationPage() {
  const { queue, isLoading, reviewItem, pendingCount } = useC2CModeration();
  const [rejectReasonMap, setRejectReasonMap] = useState<Record<string, string>>({});
  const [showRejectInput, setShowRejectInput] = useState<string | null>(null);

  const pending = queue.filter((q: any) => q.status === "pending");
  const reviewed = queue.filter((q: any) => q.status !== "pending");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6" /> Moderação
          </h1>
          <p className="text-sm text-muted-foreground">{pendingCount} itens pendentes</p>
        </div>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pendentes <Badge variant="secondary" className="ml-1.5 text-xs">{pendingCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="reviewed">Revisados</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3 mt-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">A carregar...</p>
          ) : pending.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12 text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Sem itens pendentes de moderação</p>
              </CardContent>
            </Card>
          ) : (
            pending.map((item: any) => (
              <Card key={item.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">{item.entity_type}</Badge>
                        <Badge className={statusColors[item.status] || ""}>{item.status}</Badge>
                      </div>
                      <p className="text-sm font-medium text-foreground">{item.reason}</p>
                      {item.report_details && (
                        <p className="text-xs text-muted-foreground mt-1">{item.report_details}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: pt })}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-200 hover:bg-green-50"
                          onClick={() => reviewItem.mutate({ id: item.id, action: "none", status: "approved" })}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive border-destructive/20 hover:bg-destructive/5"
                          onClick={() => setShowRejectInput(showRejectInput === item.id ? null : item.id)}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Rejeitar
                        </Button>
                      </div>
                      {showRejectInput === item.id && (
                        <div className="flex gap-2 items-center">
                          <Input
                            placeholder="Motivo da rejeição..."
                            value={rejectReasonMap[item.id] || ""}
                            onChange={(e) => setRejectReasonMap(prev => ({ ...prev, [item.id]: e.target.value }))}
                            className="h-8 text-sm"
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-8 text-xs shrink-0"
                            onClick={() => {
                              reviewItem.mutate({
                                id: item.id,
                                action: "removed",
                                status: "rejected",
                                notes: rejectReasonMap[item.id] || "Rejeitado sem motivo",
                              } as any);
                              setShowRejectInput(null);
                            }}
                          >
                            Confirmar
                          </Button>
                        </div>
                      )}
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
            reviewed.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{item.entity_type}</Badge>
                    <Badge className={statusColors[item.status] || ""}>{item.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{item.reason}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {item.action_taken && `Ação: ${item.action_taken}`}
                </p>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
