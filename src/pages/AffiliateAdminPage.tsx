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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Settings, Users, Wallet, TrendingUp, Plus, Check, X, Loader2 } from "lucide-react";
import { useAffiliatePrograms, useUpsertAffiliateProgram, useAffiliateSettings, useUpsertAffiliateSettings } from "@/hooks/useAffiliatePrograms";
import { useAllAffiliates, useUpdateAffiliateStatus, useAllConversions, useUpdateConversionStatus, useAllPayouts, useCreatePayout, useUpdatePayoutStatus } from "@/hooks/useAffiliates";

export default function AffiliateAdminPage() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  const { data: settings } = useAffiliateSettings();
  const upsertSettings = useUpsertAffiliateSettings();
  const { data: programs = [] } = useAffiliatePrograms();
  const upsertProgram = useUpsertAffiliateProgram();
  const [affiliateFilter, setAffiliateFilter] = useState("all");
  const { data: affiliates = [] } = useAllAffiliates(affiliateFilter);
  const updateStatus = useUpdateAffiliateStatus();
  const [convFilter, setConvFilter] = useState("all");
  const { data: conversions = [] } = useAllConversions(convFilter);
  const updateConversion = useUpdateConversionStatus();
  const { data: payouts = [] } = useAllPayouts();
  const createPayout = useCreatePayout();
  const updatePayout = useUpdatePayoutStatus();

  const [programForm, setProgramForm] = useState<any>(null);
  const [payoutForm, setPayoutForm] = useState<any>(null);

  const saveProgramForm = () => {
    if (!programForm) return;
    upsertProgram.mutate(programForm);
    setProgramForm(null);
  };

  const handleCreatePayout = () => {
    if (!payoutForm) return;
    createPayout.mutate(payoutForm);
    setPayoutForm(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Gestão de Afiliados</h1>
          <p className="text-muted-foreground">Programas, afiliados, conversões e payouts</p>
        </div>

        <Tabs defaultValue="programs">
          <TabsList className="flex-wrap">
            <TabsTrigger value="programs"><Settings className="h-4 w-4 mr-1" /> Programas</TabsTrigger>
            <TabsTrigger value="affiliates"><Users className="h-4 w-4 mr-1" /> Afiliados ({(affiliates as any[]).length})</TabsTrigger>
            <TabsTrigger value="conversions"><TrendingUp className="h-4 w-4 mr-1" /> Conversões</TabsTrigger>
            <TabsTrigger value="payouts"><Wallet className="h-4 w-4 mr-1" /> Payouts</TabsTrigger>
            <TabsTrigger value="settings"><Settings className="h-4 w-4 mr-1" /> Configurações</TabsTrigger>
          </TabsList>

          {/* Programs */}
          <TabsContent value="programs" className="space-y-4">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setProgramForm({ name: "", commission_type: "percent", default_commission_percent: 10, cookie_duration_days: 30, is_active: true, allows_sub_affiliates: false, sub_affiliate_commission_percent: 5, applicable_modules: ["store"] })}>
                <Plus className="h-4 w-4 mr-1" /> Novo Programa
              </Button>
            </div>
            {programForm && (
              <Card>
                <CardHeader><CardTitle className="text-base">{programForm.id ? "Editar" : "Novo"} Programa</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div><Label>Nome</Label><Input value={programForm.name} onChange={e => setProgramForm((f: any) => ({ ...f, name: e.target.value }))} /></div>
                  <div><Label>Tipo comissão</Label>
                    <Select value={programForm.commission_type} onValueChange={v => setProgramForm((f: any) => ({ ...f, commission_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="percent">Percentagem</SelectItem><SelectItem value="fixed">Fixo (€)</SelectItem><SelectItem value="hybrid">Híbrido</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div><Label>Comissão %</Label><Input type="number" value={programForm.default_commission_percent ?? ""} onChange={e => setProgramForm((f: any) => ({ ...f, default_commission_percent: parseFloat(e.target.value) }))} /></div>
                  <div><Label>Comissão fixa €</Label><Input type="number" value={programForm.default_commission_fixed ?? ""} onChange={e => setProgramForm((f: any) => ({ ...f, default_commission_fixed: parseFloat(e.target.value) }))} /></div>
                  <div><Label>Cookie (dias)</Label><Input type="number" value={programForm.cookie_duration_days} onChange={e => setProgramForm((f: any) => ({ ...f, cookie_duration_days: parseInt(e.target.value) }))} /></div>
                  <div className="flex items-center gap-2"><Switch checked={programForm.allows_sub_affiliates} onCheckedChange={v => setProgramForm((f: any) => ({ ...f, allows_sub_affiliates: v }))} /><Label>Multinível</Label></div>
                  {programForm.allows_sub_affiliates && <div><Label>Comissão nível 2 (%)</Label><Input type="number" value={programForm.sub_affiliate_commission_percent} onChange={e => setProgramForm((f: any) => ({ ...f, sub_affiliate_commission_percent: parseFloat(e.target.value) }))} /></div>}
                  <div className="col-span-2 flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setProgramForm(null)}>Cancelar</Button>
                    <Button onClick={saveProgramForm} disabled={upsertProgram.isPending}>Guardar</Button>
                  </div>
                </CardContent>
              </Card>
            )}
            {(programs as any[]).map((p: any) => (
              <Card key={p.id}>
                <CardContent className="pt-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <div className="flex gap-3 text-sm text-muted-foreground mt-1">
                      <span>{p.default_commission_percent}%</span>
                      <span>Cookie: {p.cookie_duration_days}d</span>
                      {p.allows_sub_affiliates && <span>Multinível: {p.sub_affiliate_commission_percent}%</span>}
                      <span>Módulos: {p.applicable_modules?.join(", ")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "Ativo" : "Inativo"}</Badge>
                    <Button size="sm" variant="outline" onClick={() => setProgramForm(p)}>Editar</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Affiliates */}
          <TabsContent value="affiliates" className="space-y-4">
            <div className="flex gap-2">
              {["all", "pending", "active", "suspended"].map(s => (
                <Button key={s} size="sm" variant={affiliateFilter === s ? "default" : "outline"} onClick={() => setAffiliateFilter(s)}>{s === "all" ? "Todos" : s}</Button>
              ))}
            </div>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Nome</TableHead><TableHead>Email</TableHead><TableHead>Código</TableHead><TableHead>Programa</TableHead>
                <TableHead>Cliques</TableHead><TableHead>Conv.</TableHead><TableHead>Receita</TableHead><TableHead>Estado</TableHead><TableHead>Ações</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {(affiliates as any[]).map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.full_name}</TableCell>
                    <TableCell className="text-sm">{a.email}</TableCell>
                    <TableCell className="font-mono text-xs">{a.affiliate_code}</TableCell>
                    <TableCell className="text-sm">{a.affiliate_programs?.name || "—"}</TableCell>
                    <TableCell>{a.total_clicks}</TableCell>
                    <TableCell>{a.total_conversions}</TableCell>
                    <TableCell>€{Number(a.total_revenue ?? 0).toFixed(2)}</TableCell>
                    <TableCell><Badge variant={a.status === "active" ? "default" : a.status === "pending" ? "secondary" : "destructive"}>{a.status}</Badge></TableCell>
                    <TableCell className="flex gap-1">
                      {a.status === "pending" && <>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateStatus.mutate({ id: a.id, status: "active" })}><Check className="h-4 w-4 text-green-600" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateStatus.mutate({ id: a.id, status: "rejected" })}><X className="h-4 w-4 text-red-600" /></Button>
                      </>}
                      {a.status === "active" && <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: a.id, status: "suspended" })}>Suspender</Button>}
                      {a.status === "suspended" && <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: a.id, status: "active" })}>Reativar</Button>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          {/* Conversions */}
          <TabsContent value="conversions" className="space-y-4">
            <div className="flex gap-2">
              {["all", "pending", "approved", "rejected", "paid"].map(s => (
                <Button key={s} size="sm" variant={convFilter === s ? "default" : "outline"} onClick={() => setConvFilter(s)}>{s === "all" ? "Todos" : s}</Button>
              ))}
            </div>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Data</TableHead><TableHead>Afiliado</TableHead><TableHead>Módulo</TableHead><TableHead>Valor</TableHead>
                <TableHead>Comissão</TableHead><TableHead>Nível</TableHead><TableHead>Estado</TableHead><TableHead>Ações</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {(conversions as any[]).map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm">{new Date(c.converted_at).toLocaleDateString("pt-PT")}</TableCell>
                    <TableCell className="text-sm">{c.affiliates?.full_name || "—"} <span className="text-xs text-muted-foreground">({c.affiliates?.affiliate_code})</span></TableCell>
                    <TableCell><Badge variant="outline">{c.source_module}</Badge></TableCell>
                    <TableCell>€{c.gross_amount?.toFixed(2)}</TableCell>
                    <TableCell className="font-bold">€{c.commission_amount?.toFixed(2)}</TableCell>
                    <TableCell>{c.level}</TableCell>
                    <TableCell><Badge variant={c.status === "approved" || c.status === "paid" ? "default" : c.status === "rejected" ? "destructive" : "secondary"}>{c.status}</Badge></TableCell>
                    <TableCell className="flex gap-1">
                      {c.status === "pending" && <>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateConversion.mutate({ id: c.id, status: "approved" })}><Check className="h-4 w-4 text-green-600" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateConversion.mutate({ id: c.id, status: "rejected" })}><X className="h-4 w-4 text-red-600" /></Button>
                      </>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          {/* Payouts */}
          <TabsContent value="payouts" className="space-y-4">
            <div className="flex justify-end">
              <Dialog>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Novo Payout</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Criar Payout</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Afiliado</Label>
                      <Select onValueChange={v => setPayoutForm((f: any) => ({ ...f, affiliate_id: v }))}>
                        <SelectTrigger><SelectValue placeholder="Selecionar afiliado" /></SelectTrigger>
                        <SelectContent>
                          {(affiliates as any[]).filter((a: any) => a.status === "active").map((a: any) => (
                            <SelectItem key={a.id} value={a.id}>{a.full_name} ({a.affiliate_code})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Valor (€)</Label><Input type="number" onChange={e => setPayoutForm((f: any) => ({ ...f, amount: parseFloat(e.target.value) }))} /></div>
                    <div><Label>Método</Label>
                      <Select onValueChange={v => setPayoutForm((f: any) => ({ ...f, method: v }))}>
                        <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">Manual</SelectItem>
                          <SelectItem value="bank_transfer">Transferência bancária</SelectItem>
                          <SelectItem value="stripe">Stripe</SelectItem>
                          <SelectItem value="credit">Crédito na plataforma</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Nota</Label><Input onChange={e => setPayoutForm((f: any) => ({ ...f, reference_note: e.target.value }))} /></div>
                    <Button className="w-full" onClick={handleCreatePayout} disabled={!payoutForm?.affiliate_id || !payoutForm?.amount}>Criar Payout</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Data</TableHead><TableHead>Afiliado</TableHead><TableHead>Valor</TableHead><TableHead>Método</TableHead><TableHead>Estado</TableHead><TableHead>Ações</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {(payouts as any[]).map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">{new Date(p.created_at).toLocaleDateString("pt-PT")}</TableCell>
                    <TableCell>{p.affiliates?.full_name || "—"}</TableCell>
                    <TableCell className="font-bold">€{p.amount?.toFixed(2)}</TableCell>
                    <TableCell>{p.method}</TableCell>
                    <TableCell><Badge variant={p.status === "completed" ? "default" : p.status === "failed" ? "destructive" : "secondary"}>{p.status}</Badge></TableCell>
                    <TableCell>
                      {p.status === "pending" && <Button size="sm" onClick={() => updatePayout.mutate({ id: p.id, status: "completed" })}>Marcar pago</Button>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          {/* Settings */}
          <TabsContent value="settings">
            <Card>
              <CardHeader><CardTitle>Configurações Gerais</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div><Label>Auto-aprovar afiliados</Label><p className="text-xs text-muted-foreground">Novos afiliados são activados automaticamente</p></div>
                  <Switch checked={settings?.auto_approve_affiliates ?? false} onCheckedChange={v => upsertSettings.mutate({ auto_approve_affiliates: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <div><Label>Registo público activado</Label><p className="text-xs text-muted-foreground">Qualquer pessoa pode candidatar-se</p></div>
                  <Switch checked={settings?.registration_enabled ?? true} onCheckedChange={v => upsertSettings.mutate({ registration_enabled: v })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Cookie padrão (dias)</Label><Input type="number" defaultValue={settings?.default_cookie_days ?? 30} onBlur={e => upsertSettings.mutate({ default_cookie_days: parseInt(e.target.value) })} /></div>
                  <div><Label>Payout mínimo (€)</Label><Input type="number" defaultValue={settings?.min_payout_amount ?? 50} onBlur={e => upsertSettings.mutate({ min_payout_amount: parseFloat(e.target.value) })} /></div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
