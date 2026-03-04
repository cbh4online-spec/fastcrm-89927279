import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Download, RefreshCw, Settings, Users, Wallet, Shield } from "lucide-react";
import { useAffiliateProgram, useUpsertAffiliateProgram, useAllAffiliates, useAllAttributions } from "@/hooks/useC2CAffiliates";
import { useReferralProgram, useUpsertReferralProgram, useAllReferrals } from "@/hooks/useC2CReferrals";
import { usePayouts, useExecutePayout, useProcessPayouts, useExportPayoutsCSV } from "@/hooks/useC2CPayouts";

export default function C2CAffiliateAdmin() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  // Affiliate program
  const { data: affProgram } = useAffiliateProgram(wsId);
  const upsertAffProgram = useUpsertAffiliateProgram();
  const { data: affiliates = [] } = useAllAffiliates(wsId);
  const { data: attributions = [] } = useAllAttributions(wsId);

  // Referral program
  const { data: refProgram } = useReferralProgram(wsId);
  const upsertRefProgram = useUpsertReferralProgram();
  const { data: referrals = [] } = useAllReferrals(wsId);

  // Payouts
  const { data: payouts = [] } = usePayouts(wsId);
  const executePayout = useExecutePayout();
  const processPayouts = useProcessPayouts();
  const exportCSV = useExportPayoutsCSV();

  // Form state for affiliate program
  const [affForm, setAffForm] = useState<any>(null);
  const [refForm, setRefForm] = useState<any>(null);

  const initAffForm = () => setAffForm(affProgram || {
    workspace_id: wsId, name: "Programa de Afiliados", status: "active",
    default_commission_type: "percent", default_commission_value: 10,
    cookie_window_days: 30, attribution_model: "last_click", payout_hold_days: 14,
  });

  const initRefForm = () => setRefForm(refProgram || {
    workspace_id: wsId, name: "Programa de Referências", status: "active",
    reward_type: "credit", reward_value: 5, trigger_event: "first_purchase", hold_days: 7,
  });

  const saveAffProgram = () => {
    if (!affForm || !wsId) return;
    upsertAffProgram.mutate({ ...affForm, workspace_id: wsId });
    setAffForm(null);
  };

  const saveRefProgram = () => {
    if (!refForm || !wsId) return;
    upsertRefProgram.mutate({ ...refForm, workspace_id: wsId });
    setRefForm(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Admin Afiliados & Referências</h1>
            <p className="text-muted-foreground">Gerir programas, afiliados e payouts</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => processPayouts.mutate()} disabled={processPayouts.isPending}>
              <RefreshCw className="h-4 w-4 mr-1" /> Processar Payouts
            </Button>
            <Button variant="outline" onClick={() => wsId && exportCSV.mutate(wsId)}>
              <Download className="h-4 w-4 mr-1" /> Exportar CSV
            </Button>
          </div>
        </div>

        <Tabs defaultValue="affiliate-config">
          <TabsList className="flex-wrap">
            <TabsTrigger value="affiliate-config"><Settings className="h-4 w-4 mr-1" /> Config. Afiliados</TabsTrigger>
            <TabsTrigger value="referral-config"><Settings className="h-4 w-4 mr-1" /> Config. Referências</TabsTrigger>
            <TabsTrigger value="affiliates"><Users className="h-4 w-4 mr-1" /> Afiliados ({affiliates.length})</TabsTrigger>
            <TabsTrigger value="payouts"><Wallet className="h-4 w-4 mr-1" /> Payouts ({payouts.length})</TabsTrigger>
            <TabsTrigger value="fraud"><Shield className="h-4 w-4 mr-1" /> Anti-Fraude</TabsTrigger>
          </TabsList>

          {/* Affiliate Config */}
          <TabsContent value="affiliate-config">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Programa de Afiliados</CardTitle>
                {!affForm && <Button size="sm" onClick={initAffForm}>{affProgram ? "Editar" : "Criar"}</Button>}
              </CardHeader>
              <CardContent>
                {affForm ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Nome</Label><Input value={affForm.name} onChange={e => setAffForm({ ...affForm, name: e.target.value })} /></div>
                    <div><Label>Estado</Label>
                      <Select value={affForm.status} onValueChange={v => setAffForm({ ...affForm, status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="active">Ativo</SelectItem><SelectItem value="paused">Pausado</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div><Label>Tipo comissão</Label>
                      <Select value={affForm.default_commission_type} onValueChange={v => setAffForm({ ...affForm, default_commission_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="percent">Percentagem</SelectItem><SelectItem value="fixed">Fixo (€)</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div><Label>Valor comissão</Label><Input type="number" value={affForm.default_commission_value} onChange={e => setAffForm({ ...affForm, default_commission_value: parseFloat(e.target.value) })} /></div>
                    <div><Label>Cookie window (dias)</Label><Input type="number" value={affForm.cookie_window_days} onChange={e => setAffForm({ ...affForm, cookie_window_days: parseInt(e.target.value) })} /></div>
                    <div><Label>Hold days</Label><Input type="number" value={affForm.payout_hold_days} onChange={e => setAffForm({ ...affForm, payout_hold_days: parseInt(e.target.value) })} /></div>
                    <div><Label>Modelo atribuição</Label>
                      <Select value={affForm.attribution_model} onValueChange={v => setAffForm({ ...affForm, attribution_model: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="last_click">Last Click</SelectItem><SelectItem value="first_click">First Click</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setAffForm(null)}>Cancelar</Button>
                      <Button onClick={saveAffProgram} disabled={upsertAffProgram.isPending}>Guardar</Button>
                    </div>
                  </div>
                ) : affProgram ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Estado:</span> <Badge>{affProgram.status}</Badge></div>
                    <div><span className="text-muted-foreground">Comissão:</span> {affProgram.default_commission_value}{affProgram.default_commission_type === "percent" ? "%" : "€"}</div>
                    <div><span className="text-muted-foreground">Cookie:</span> {affProgram.cookie_window_days}d</div>
                    <div><span className="text-muted-foreground">Hold:</span> {affProgram.payout_hold_days}d</div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Nenhum programa configurado. Clique em "Criar" para começar.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Referral Config */}
          <TabsContent value="referral-config">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Programa de Referências</CardTitle>
                {!refForm && <Button size="sm" onClick={initRefForm}>{refProgram ? "Editar" : "Criar"}</Button>}
              </CardHeader>
              <CardContent>
                {refForm ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Nome</Label><Input value={refForm.name} onChange={e => setRefForm({ ...refForm, name: e.target.value })} /></div>
                    <div><Label>Estado</Label>
                      <Select value={refForm.status} onValueChange={v => setRefForm({ ...refForm, status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="active">Ativo</SelectItem><SelectItem value="paused">Pausado</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div><Label>Tipo recompensa</Label>
                      <Select value={refForm.reward_type} onValueChange={v => setRefForm({ ...refForm, reward_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="credit">Crédito (€)</SelectItem>
                          <SelectItem value="percent_discount">% Desconto</SelectItem>
                          <SelectItem value="fixed_cash">Fixo (€)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Valor</Label><Input type="number" value={refForm.reward_value} onChange={e => setRefForm({ ...refForm, reward_value: parseFloat(e.target.value) })} /></div>
                    <div><Label>Trigger</Label>
                      <Select value={refForm.trigger_event} onValueChange={v => setRefForm({ ...refForm, trigger_event: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="signup">Registo</SelectItem>
                          <SelectItem value="first_purchase">Primeira compra</SelectItem>
                          <SelectItem value="first_sale">Primeira venda</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Hold days</Label><Input type="number" value={refForm.hold_days} onChange={e => setRefForm({ ...refForm, hold_days: parseInt(e.target.value) })} /></div>
                    <div className="col-span-2 flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setRefForm(null)}>Cancelar</Button>
                      <Button onClick={saveRefProgram} disabled={upsertRefProgram.isPending}>Guardar</Button>
                    </div>
                  </div>
                ) : refProgram ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Estado:</span> <Badge>{refProgram.status}</Badge></div>
                    <div><span className="text-muted-foreground">Recompensa:</span> {refProgram.reward_value}{refProgram.reward_type === "percent_discount" ? "%" : "€"}</div>
                    <div><span className="text-muted-foreground">Trigger:</span> {refProgram.trigger_event}</div>
                    <div><span className="text-muted-foreground">Hold:</span> {refProgram.hold_days}d</div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Nenhum programa configurado.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Affiliates List */}
          <TabsContent value="affiliates">
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Código</TableHead><TableHead>User ID</TableHead><TableHead>Cliques</TableHead>
                    <TableHead>Conversões</TableHead><TableHead>Ganhos</TableHead><TableHead>Estado</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {affiliates.map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-mono text-sm">{a.affiliate_code}</TableCell>
                        <TableCell className="text-xs">{a.user_id?.substring(0, 8)}...</TableCell>
                        <TableCell>{a.total_clicks}</TableCell>
                        <TableCell>{a.total_conversions}</TableCell>
                        <TableCell className="font-bold">{a.total_earnings?.toFixed(2)}€</TableCell>
                        <TableCell><Badge variant={a.status === "active" ? "default" : "destructive"}>{a.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payouts */}
          <TabsContent value="payouts">
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Data</TableHead><TableHead>User</TableHead><TableHead>Tipo</TableHead>
                    <TableHead>Valor</TableHead><TableHead>Método</TableHead><TableHead>Estado</TableHead><TableHead>Ações</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {payouts.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-sm">{new Date(p.created_at).toLocaleDateString("pt-PT")}</TableCell>
                        <TableCell className="text-xs">{p.user_id?.substring(0, 8)}...</TableCell>
                        <TableCell><Badge variant="outline">{p.payout_type}</Badge></TableCell>
                        <TableCell className="font-bold">{p.amount?.toFixed(2)}€</TableCell>
                        <TableCell>{p.method}</TableCell>
                        <TableCell><Badge variant={p.status === "paid" ? "default" : p.status === "failed" ? "destructive" : "secondary"}>{p.status}</Badge></TableCell>
                        <TableCell className="flex gap-1">
                          {p.status === "queued" && (
                            <>
                              <Button size="sm" variant="default" onClick={() => wsId && executePayout.mutate({ action: "mark_paid", payoutId: p.id, workspaceId: wsId })}>Pagar</Button>
                              <Button size="sm" variant="destructive" onClick={() => wsId && executePayout.mutate({ action: "reverse", payoutId: p.id, workspaceId: wsId })}>Reverter</Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Anti-Fraud */}
          <TabsContent value="fraud">
            <div className="grid gap-4">
              <Card>
                <CardHeader><CardTitle className="text-lg">Deteção de fraude</CardTitle></CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-muted-foreground">Total atribuições revertidas</p>
                      <p className="text-2xl font-bold">{attributions.filter((a: any) => a.status === "reversed").length}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Payouts falhados</p>
                      <p className="text-2xl font-bold">{payouts.filter((p: any) => p.status === "failed" || p.status === "reversed").length}</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground">
                    A proteção anti-fraude bloqueia automaticamente self-referrals, self-affiliates e limita cliques por IP (max 10/hora).
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
