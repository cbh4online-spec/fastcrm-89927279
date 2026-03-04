import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy, Gift, Mail, Users } from "lucide-react";
import { toast } from "sonner";
import { useReferralProgram, useMyReferrals, useCreateReferral, useMyReferralAttributions } from "@/hooks/useC2CReferrals";

export default function C2CReferralCenter() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const [email, setEmail] = useState("");

  const { data: program, isLoading } = useReferralProgram(wsId);
  const { data: referrals = [] } = useMyReferrals(wsId);
  const { data: attributions = [] } = useMyReferralAttributions(wsId);
  const createMutation = useCreateReferral();

  const handleCreate = () => {
    if (!program || !wsId) return;
    createMutation.mutate({ programId: program.id, workspaceId: wsId, email: email || undefined });
    setEmail("");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  const totalRewards = attributions.reduce((sum: number, a: any) => sum + (a.reward_amount || 0), 0);
  const statusCounts = {
    invited: referrals.filter((r: any) => r.status === "invited").length,
    signed_up: referrals.filter((r: any) => r.status === "signed_up").length,
    qualified: referrals.filter((r: any) => r.status === "qualified").length,
    rewarded: referrals.filter((r: any) => r.status === "rewarded").length,
  };

  if (isLoading) {
    return <DashboardLayout><div className="flex justify-center p-12">A carregar...</div></DashboardLayout>;
  }

  if (!program || program.status !== "active") {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Programa de Referências</h1>
          <p className="text-muted-foreground">O programa de referências não está ativo neste workspace.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Centro de Referências</h1>
          <p className="text-muted-foreground">
            Convide amigos e ganhe {program.reward_value}{program.reward_type === "percent_discount" ? "%" : "€"} por cada {program.trigger_event === "first_purchase" ? "primeira compra" : program.trigger_event === "signup" ? "registo" : "primeira venda"}.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm"><Mail className="h-4 w-4" /> Convites</div>
            <p className="text-2xl font-bold mt-1">{referrals.length}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm"><Users className="h-4 w-4" /> Registos</div>
            <p className="text-2xl font-bold mt-1">{statusCounts.signed_up + statusCounts.qualified + statusCounts.rewarded}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm"><Gift className="h-4 w-4" /> Qualificados</div>
            <p className="text-2xl font-bold mt-1">{statusCounts.qualified + statusCounts.rewarded}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm"><Gift className="h-4 w-4" /> Total ganho</div>
            <p className="text-2xl font-bold mt-1">{totalRewards.toFixed(2)}€</p>
          </CardContent></Card>
        </div>

        {/* Create referral */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Criar convite</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Input placeholder="Email (opcional)" value={email} onChange={e => setEmail(e.target.value)} className="w-64" />
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              <Mail className="h-4 w-4 mr-1" /> Gerar Convite
            </Button>
          </CardContent>
        </Card>

        {/* Referrals list */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Meus convites</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Código</TableHead><TableHead>Email</TableHead><TableHead>Estado</TableHead><TableHead>Data</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {referrals.map((r: any) => {
                  const shareUrl = `${window.location.origin}/c2c/${currentWorkspace?.slug || wsId}?ref=${r.referral_code}`;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-sm">{r.referral_code}</TableCell>
                      <TableCell className="text-sm">{r.referred_email || "—"}</TableCell>
                      <TableCell><Badge variant={r.status === "rewarded" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
                      <TableCell className="text-sm">{new Date(r.created_at).toLocaleDateString("pt-PT")}</TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => copyToClipboard(shareUrl)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Attributions */}
        {attributions.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Recompensas</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Data</TableHead><TableHead>Valor</TableHead><TableHead>Estado</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {attributions.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-sm">{new Date(a.created_at).toLocaleDateString("pt-PT")}</TableCell>
                      <TableCell className="font-bold">{a.reward_amount?.toFixed(2)}€</TableCell>
                      <TableCell><Badge variant={a.status === "paid" ? "default" : "secondary"}>{a.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
