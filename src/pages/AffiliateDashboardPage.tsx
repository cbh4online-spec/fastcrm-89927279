import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy, Link2, MousePointerClick, TrendingUp, Wallet, Bell, CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useMyAffiliate, useAffiliateLinks, useCreateAffiliateLink, useAffiliateConversions, useAffiliatePayouts, useAffiliateNotifications, usePayoutMethods, useUpsertPayoutMethod, useRegisterAffiliate } from "@/hooks/useAffiliates";
import { useAffiliatePrograms } from "@/hooks/useAffiliatePrograms";

export default function AffiliateDashboardPage() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const { data: myAffiliate, isLoading } = useMyAffiliate(wsId);
  const { data: programs = [] } = useAffiliatePrograms();
  const { data: links = [] } = useAffiliateLinks(myAffiliate?.id);
  const { data: conversions = [] } = useAffiliateConversions(myAffiliate?.id);
  const { data: payouts = [] } = useAffiliatePayouts(myAffiliate?.id);
  const { data: notifications = [] } = useAffiliateNotifications(myAffiliate?.id);
  const { data: payoutMethods = [] } = usePayoutMethods(myAffiliate?.id);
  const createLink = useCreateAffiliateLink();
  const registerAffiliate = useRegisterAffiliate();
  const upsertPayoutMethod = useUpsertPayoutMethod();

  const [linkUrl, setLinkUrl] = useState("");
  const [linkCampaign, setLinkCampaign] = useState("");
  const [regForm, setRegForm] = useState({ full_name: "", email: "", phone: "", company_name: "", website_url: "", parent_code: "" });

  const balance = myAffiliate?.affiliate_balances?.[0] ?? myAffiliate?.affiliate_balances;
  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); toast.success("Copiado!"); };

  if (isLoading) return <DashboardLayout><div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div></DashboardLayout>;

  // Registration form
  if (!myAffiliate) {
    const activeProgram = programs.find((p: any) => p.is_active);
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto py-12 space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Programa de Afiliados</h1>
            <p className="text-muted-foreground mt-2">Ganhe comissões por cada venda gerada através dos seus links de referência.</p>
          </div>
          {activeProgram && (
            <Card>
              <CardHeader><CardTitle className="text-lg">{activeProgram.name}</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Comissão:</span> {activeProgram.default_commission_percent}%</div>
                <div><span className="text-muted-foreground">Cookie:</span> {activeProgram.cookie_duration_days} dias</div>
                {activeProgram.allows_sub_affiliates && <div className="col-span-2"><span className="text-muted-foreground">Sub-afiliados:</span> {activeProgram.sub_affiliate_commission_percent}% (nível 2)</div>}
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader><CardTitle>Inscrever-me</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Nome completo *</Label><Input value={regForm.full_name} onChange={e => setRegForm(f => ({ ...f, full_name: e.target.value }))} /></div>
              <div><Label>Email *</Label><Input type="email" value={regForm.email} onChange={e => setRegForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Telefone</Label><Input value={regForm.phone} onChange={e => setRegForm(f => ({ ...f, phone: e.target.value }))} /></div>
                <div><Label>Empresa</Label><Input value={regForm.company_name} onChange={e => setRegForm(f => ({ ...f, company_name: e.target.value }))} /></div>
              </div>
              <div><Label>Website</Label><Input value={regForm.website_url} onChange={e => setRegForm(f => ({ ...f, website_url: e.target.value }))} /></div>
              <div><Label>Código de referência (opcional)</Label><Input placeholder="Código de quem te referiu" value={regForm.parent_code} onChange={e => setRegForm(f => ({ ...f, parent_code: e.target.value }))} /></div>
              <Button className="w-full" disabled={registerAffiliate.isPending || !regForm.full_name || !regForm.email} onClick={() => wsId && registerAffiliate.mutate({ workspace_id: wsId, program_id: activeProgram?.id, ...regForm })}>
                {registerAffiliate.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Submeter candidatura
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (myAffiliate.status === "pending") {
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto py-12 text-center space-y-4">
          <h1 className="text-2xl font-bold">Candidatura em análise</h1>
          <p className="text-muted-foreground">A sua candidatura está a ser avaliada. Receberá uma notificação quando for aprovada.</p>
          <Badge variant="secondary" className="text-lg px-4 py-2">Pendente</Badge>
        </div>
      </DashboardLayout>
    );
  }

  const handleCreateLink = () => {
    if (!linkUrl || !wsId) return;
    const affUrl = linkUrl.includes("?") ? `${linkUrl}&aff=${myAffiliate.affiliate_code}` : `${linkUrl}?aff=${myAffiliate.affiliate_code}`;
    createLink.mutate({ affiliate_id: myAffiliate.id, workspace_id: wsId, target_url: affUrl, campaign_name: linkCampaign || null, utm_source: "affiliate", utm_medium: "referral", utm_campaign: linkCampaign || null });
    setLinkUrl(""); setLinkCampaign("");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Painel de Afiliado</h1>
            <p className="text-muted-foreground">Código: <span className="font-mono font-bold">{myAffiliate.affiliate_code}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={() => copyToClipboard(myAffiliate.affiliate_code)}><Copy className="h-3 w-3" /></Button>
            </p>
          </div>
          <Badge variant={myAffiliate.status === "active" ? "default" : "destructive"}>{myAffiliate.status}</Badge>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card><CardContent className="pt-4"><div className="flex items-center gap-2 text-muted-foreground text-xs"><MousePointerClick className="h-4 w-4" /> Cliques</div><p className="text-2xl font-bold mt-1">{myAffiliate.total_clicks}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center gap-2 text-muted-foreground text-xs"><TrendingUp className="h-4 w-4" /> Conversões</div><p className="text-2xl font-bold mt-1">{myAffiliate.total_conversions}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center gap-2 text-muted-foreground text-xs"><Wallet className="h-4 w-4" /> Total ganho</div><p className="text-2xl font-bold mt-1">€{(balance?.total_earned ?? 0).toFixed(2)}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center gap-2 text-muted-foreground text-xs"><Wallet className="h-4 w-4" /> Disponível</div><p className="text-2xl font-bold text-green-600 mt-1">€{(balance?.available_balance ?? 0).toFixed(2)}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center gap-2 text-muted-foreground text-xs"><CreditCard className="h-4 w-4" /> Pago</div><p className="text-2xl font-bold mt-1">€{(balance?.total_paid ?? 0).toFixed(2)}</p></CardContent></Card>
        </div>

        <Tabs defaultValue="links">
          <TabsList className="flex-wrap">
            <TabsTrigger value="links"><Link2 className="h-4 w-4 mr-1" /> Links</TabsTrigger>
            <TabsTrigger value="conversions"><TrendingUp className="h-4 w-4 mr-1" /> Conversões</TabsTrigger>
            <TabsTrigger value="payouts"><Wallet className="h-4 w-4 mr-1" /> Payouts</TabsTrigger>
            <TabsTrigger value="notifications"><Bell className="h-4 w-4 mr-1" /> Notificações</TabsTrigger>
          </TabsList>

          <TabsContent value="links" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Gerar novo link</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Input placeholder="URL de destino" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} className="flex-1 min-w-[200px]" />
                <Input placeholder="Campanha (opcional)" value={linkCampaign} onChange={e => setLinkCampaign(e.target.value)} className="w-40" />
                <Button onClick={handleCreateLink} disabled={!linkUrl || createLink.isPending}><Link2 className="h-4 w-4 mr-1" /> Gerar</Button>
              </CardContent>
            </Card>
            <Table>
              <TableHeader><TableRow><TableHead>URL</TableHead><TableHead>Campanha</TableHead><TableHead>Cliques</TableHead><TableHead>Conv.</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {(links as any[]).map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-mono text-xs max-w-xs truncate">{l.target_url}</TableCell>
                    <TableCell>{l.campaign_name || "—"}</TableCell>
                    <TableCell>{l.click_count}</TableCell>
                    <TableCell>{l.conversion_count}</TableCell>
                    <TableCell><Button size="icon" variant="ghost" onClick={() => copyToClipboard(l.target_url)}><Copy className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
                {(links as any[]).length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Sem links. Crie o seu primeiro link acima.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="conversions">
            <Table>
              <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Módulo</TableHead><TableHead>Valor bruto</TableHead><TableHead>Comissão</TableHead><TableHead>Nível</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
              <TableBody>
                {(conversions as any[]).map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm">{new Date(c.converted_at).toLocaleDateString("pt-PT")}</TableCell>
                    <TableCell><Badge variant="outline">{c.source_module}</Badge></TableCell>
                    <TableCell>€{c.gross_amount?.toFixed(2)}</TableCell>
                    <TableCell className="font-bold">€{c.commission_amount?.toFixed(2)}</TableCell>
                    <TableCell>{c.level === 1 ? "Direto" : "Sub-afiliado"}</TableCell>
                    <TableCell><Badge variant={c.status === "approved" || c.status === "paid" ? "default" : c.status === "rejected" ? "destructive" : "secondary"}>{c.status}</Badge></TableCell>
                  </TableRow>
                ))}
                {(conversions as any[]).length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Sem conversões registadas.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="payouts">
            <Table>
              <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Valor</TableHead><TableHead>Método</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
              <TableBody>
                {(payouts as any[]).map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">{new Date(p.created_at).toLocaleDateString("pt-PT")}</TableCell>
                    <TableCell className="font-bold">€{p.amount?.toFixed(2)}</TableCell>
                    <TableCell>{p.method}</TableCell>
                    <TableCell><Badge variant={p.status === "completed" ? "default" : p.status === "failed" ? "destructive" : "secondary"}>{p.status}</Badge></TableCell>
                  </TableRow>
                ))}
                {(payouts as any[]).length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Sem pagamentos.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="notifications">
            <div className="space-y-2">
              {(notifications as any[]).map((n: any) => (
                <Card key={n.id} className={n.is_read ? "opacity-60" : ""}>
                  <CardContent className="py-3 flex items-start gap-3">
                    <Badge variant="outline" className="shrink-0 mt-0.5">{n.type}</Badge>
                    <div><p className="text-sm font-medium">{n.title}</p>{n.body && <p className="text-xs text-muted-foreground">{n.body}</p>}</div>
                    <span className="text-xs text-muted-foreground ml-auto">{new Date(n.created_at).toLocaleDateString("pt-PT")}</span>
                  </CardContent>
                </Card>
              ))}
              {(notifications as any[]).length === 0 && <p className="text-center text-muted-foreground py-6">Sem notificações.</p>}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
