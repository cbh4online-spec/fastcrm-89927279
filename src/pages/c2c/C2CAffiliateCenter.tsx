import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, ExternalLink, Link2, MousePointerClick, TrendingUp, Wallet } from "lucide-react";
import { toast } from "sonner";
import {
  useAffiliateProgram, useMyAffiliate, useJoinAffiliateProgram,
  useAffiliateLinks, useCreateAffiliateLink, useAffiliateAttributions,
  useAffiliateClicks,
} from "@/hooks/useC2CAffiliates";
import { useMyPayouts } from "@/hooks/useC2CPayouts";

export default function C2CAffiliateCenter() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  const { data: program, isLoading: loadingProgram } = useAffiliateProgram(wsId);
  const { data: myAffiliate, isLoading: loadingAffiliate } = useMyAffiliate(wsId);
  const joinMutation = useJoinAffiliateProgram();
  const { data: links = [] } = useAffiliateLinks(myAffiliate?.id);
  const createLinkMutation = useCreateAffiliateLink();
  const { data: attributions = [] } = useAffiliateAttributions(myAffiliate?.id);
  const { data: clicks = [] } = useAffiliateClicks(myAffiliate?.id);
  const { data: payouts = [] } = useMyPayouts(wsId);

  const [targetType, setTargetType] = useState("marketplace_home");
  const [targetId, setTargetId] = useState("");

  const handleJoin = () => {
    if (!program || !wsId) return;
    joinMutation.mutate({ programId: program.id, workspaceId: wsId });
  };

  const handleCreateLink = () => {
    if (!myAffiliate || !wsId) return;
    const baseUrl = `${window.location.origin}/c2c/${currentWorkspace?.slug || wsId}`;
    const url = `${baseUrl}?aff=${myAffiliate.affiliate_code}${targetId ? `&target=${targetId}` : ""}`;
    createLinkMutation.mutate({
      affiliate_id: myAffiliate.id,
      workspace_id: wsId,
      target_type: targetType,
      target_id: targetId || null,
      url,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  const totalEarnings = attributions.reduce((sum: number, a: any) => sum + (a.commission_amount || 0), 0);
  const pendingEarnings = attributions.filter((a: any) => a.status === "held" || a.status === "pending")
    .reduce((sum: number, a: any) => sum + (a.commission_amount || 0), 0);

  if (loadingProgram || loadingAffiliate) {
    return <DashboardLayout><div className="flex justify-center p-12">A carregar...</div></DashboardLayout>;
  }

  if (!program || program.status !== "active") {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Programa de Afiliados</h1>
          <p className="text-muted-foreground">O programa de afiliados não está ativo neste workspace.</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!myAffiliate) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto py-12 text-center space-y-6">
          <h1 className="text-2xl font-bold">Programa de Afiliados</h1>
          <p className="text-muted-foreground">
            Ganhe {program.default_commission_value}{program.default_commission_type === "percent" ? "%" : "€"} por cada venda gerada através dos seus links.
          </p>
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Comissão:</span> {program.default_commission_value}{program.default_commission_type === "percent" ? "%" : "€"}</div>
                <div><span className="text-muted-foreground">Janela cookie:</span> {program.cookie_window_days} dias</div>
                <div><span className="text-muted-foreground">Hold:</span> {program.payout_hold_days} dias</div>
                <div><span className="text-muted-foreground">Modelo:</span> {program.attribution_model}</div>
              </div>
              <Button onClick={handleJoin} disabled={joinMutation.isPending} className="w-full">
                {joinMutation.isPending ? "A inscrever..." : "Inscrever-me como Afiliado"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Centro de Afiliados</h1>
            <p className="text-muted-foreground">Código: <span className="font-mono font-bold">{myAffiliate.affiliate_code}</span></p>
          </div>
          <Badge variant={myAffiliate.status === "active" ? "default" : "destructive"}>{myAffiliate.status}</Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm"><MousePointerClick className="h-4 w-4" /> Cliques</div>
            <p className="text-2xl font-bold mt-1">{myAffiliate.total_clicks}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm"><TrendingUp className="h-4 w-4" /> Conversões</div>
            <p className="text-2xl font-bold mt-1">{myAffiliate.total_conversions}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm"><Wallet className="h-4 w-4" /> Total ganho</div>
            <p className="text-2xl font-bold mt-1">{totalEarnings.toFixed(2)}€</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm"><Wallet className="h-4 w-4" /> Pendente</div>
            <p className="text-2xl font-bold mt-1">{pendingEarnings.toFixed(2)}€</p>
          </CardContent></Card>
        </div>

        <Tabs defaultValue="links">
          <TabsList>
            <TabsTrigger value="links">Links</TabsTrigger>
            <TabsTrigger value="clicks">Cliques</TabsTrigger>
            <TabsTrigger value="commissions">Comissões</TabsTrigger>
            <TabsTrigger value="payouts">Payouts</TabsTrigger>
          </TabsList>

          <TabsContent value="links" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-lg">Gerar novo link</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Select value={targetType} onValueChange={setTargetType}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="marketplace_home">Marketplace Home</SelectItem>
                    <SelectItem value="listing">Anúncio específico</SelectItem>
                    <SelectItem value="seller_profile">Perfil vendedor</SelectItem>
                  </SelectContent>
                </Select>
                {targetType !== "marketplace_home" && (
                  <Input placeholder="ID do target" value={targetId} onChange={e => setTargetId(e.target.value)} className="w-48" />
                )}
                <Button onClick={handleCreateLink} disabled={createLinkMutation.isPending}>
                  <Link2 className="h-4 w-4 mr-1" /> Gerar Link
                </Button>
              </CardContent>
            </Card>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Tipo</TableHead><TableHead>URL</TableHead><TableHead>Criado</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {links.map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell><Badge variant="outline">{l.target_type}</Badge></TableCell>
                    <TableCell className="font-mono text-xs max-w-xs truncate">{l.url}</TableCell>
                    <TableCell className="text-sm">{new Date(l.created_at).toLocaleDateString("pt-PT")}</TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => copyToClipboard(l.url)}><Copy className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="clicks">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Data</TableHead><TableHead>Session</TableHead><TableHead>Referrer</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {clicks.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm">{new Date(c.created_at).toLocaleString("pt-PT")}</TableCell>
                    <TableCell className="font-mono text-xs">{c.session_id?.substring(0, 8)}...</TableCell>
                    <TableCell className="text-xs truncate max-w-xs">{c.referrer_url || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="commissions">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Data</TableHead><TableHead>Valor</TableHead><TableHead>Comissão</TableHead><TableHead>Estado</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {attributions.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-sm">{new Date(a.created_at).toLocaleDateString("pt-PT")}</TableCell>
                    <TableCell>{a.commission_value}{a.commission_type === "percent" ? "%" : "€"}</TableCell>
                    <TableCell className="font-bold">{a.commission_amount?.toFixed(2)}€</TableCell>
                    <TableCell><Badge variant={a.status === "paid" ? "default" : "secondary"}>{a.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="payouts">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Data</TableHead><TableHead>Tipo</TableHead><TableHead>Valor</TableHead><TableHead>Estado</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {payouts.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">{new Date(p.created_at).toLocaleDateString("pt-PT")}</TableCell>
                    <TableCell>{p.payout_type}</TableCell>
                    <TableCell className="font-bold">{p.amount?.toFixed(2)}€</TableCell>
                    <TableCell><Badge variant={p.status === "paid" ? "default" : "secondary"}>{p.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
