import { useParams, Link } from "react-router-dom";
import { getPublicBaseUrl } from "@/utils/getPublicDomain";
import { Helmet } from "react-helmet-async";
import { StoreHeader } from "@/components/store/StoreHeader";
import { StoreCartDrawer } from "@/components/store/StoreCartDrawer";
import { StoreFooter } from "@/components/store/StoreFooter";
import { useMyReferralCode, useMyReferrals, useReferralSettings } from "@/hooks/useStoreReferrals";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Copy, Users, Gift, Check, Share2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export default function StoreReferralPage() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const wsSlug = workspaceSlug || "";
  const [copied, setCopied] = useState(false);

  const { data: workspace } = useQuery({
    queryKey: ["store-workspace-id", wsSlug],
    queryFn: async () => {
      const { data } = await supabase.from("workspaces").select("id, name").eq("slug", wsSlug).single();
      return data;
    },
    enabled: !!wsSlug,
  });

  const wsId = workspace?.id;
  const { data: settings } = useReferralSettings(wsId);
  const { data: myCode, isLoading: loadingCode } = useMyReferralCode(wsId);
  const { data: referrals = [] } = useMyReferrals(wsId);

  const referralUrl = myCode
    ? `${getPublicBaseUrl()}/store/${wsSlug}?ref=${myCode.code}`
    : "";

  const handleCopy = () => {
    if (!referralUrl) return;
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!referralUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Código de Referral - ${workspace?.name || "Loja"}`,
          text: `Use o meu código de referral e ganhe desconto na primeira compra!`,
          url: referralUrl,
        });
      } catch {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  const completedCount = referrals.filter((r) => r.status === "completed").length;
  const pendingCount = referrals.filter((r) => r.status === "pending").length;

  return (
    <>
      <Helmet>
        <title>Programa de Referrals | Loja</title>
      </Helmet>
      <div className="min-h-screen bg-background flex flex-col">
        <StoreHeader workspaceSlug={wsSlug} />
        <StoreCartDrawer workspaceSlug={wsSlug} />

        <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
          <div className="flex items-center gap-4 mb-8">
            <Link to={`/store/${wsSlug}`}>
              <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
            </Link>
            <h1 className="text-2xl font-bold">Programa de Referrals</h1>
          </div>

          {!settings?.is_active ? (
            <div className="text-center py-16 text-muted-foreground space-y-3">
              <Users className="h-16 w-16 mx-auto opacity-20" />
              <p>O programa de referrals não está ativo nesta loja.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* How it works */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Gift className="h-5 w-5 text-primary" />
                    Como funciona
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-3 gap-4 text-center">
                    <div className="space-y-2">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                        <Share2 className="h-5 w-5 text-primary" />
                      </div>
                      <p className="text-sm font-medium">1. Partilhe o seu link</p>
                      <p className="text-xs text-muted-foreground">Envie o link a amigos e família</p>
                    </div>
                    <div className="space-y-2">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <p className="text-sm font-medium">2. Amigo compra</p>
                      <p className="text-xs text-muted-foreground">
                        {settings.referee_discount_percent
                          ? `O amigo ganha ${settings.referee_discount_percent}% de desconto`
                          : settings.referee_discount_amount
                          ? `O amigo ganha €${Number(settings.referee_discount_amount).toFixed(2)} de desconto`
                          : "O amigo faz a primeira compra"}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                        <Gift className="h-5 w-5 text-primary" />
                      </div>
                      <p className="text-sm font-medium">3. Ganha pontos</p>
                      <p className="text-xs text-muted-foreground">
                        Recebe {settings.referrer_reward_points} pontos de fidelidade
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* My Code */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">O Seu Link de Referral</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingCode ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : myCode ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded-lg px-4 py-3 font-mono text-sm break-all">
                          {referralUrl}
                        </div>
                        <Button variant="outline" size="icon" onClick={handleCopy}>
                          {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleShare} className="gap-2" size="sm">
                          <Share2 className="h-4 w-4" />
                          Partilhar
                        </Button>
                        <Badge variant="secondary" className="text-xs">
                          Código: {myCode.code}
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Faça login para obter o seu código de referral.</p>
                  )}
                </CardContent>
              </Card>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-2xl font-bold">{myCode?.uses_count || 0}</p>
                    <p className="text-xs text-muted-foreground">Total de referências</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-2xl font-bold text-green-600">{completedCount}</p>
                    <p className="text-xs text-muted-foreground">Concluídas</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
                    <p className="text-xs text-muted-foreground">Pendentes</p>
                  </CardContent>
                </Card>
              </div>

              {/* History */}
              {referrals.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Histórico de Referências</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Recompensa</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {referrals.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="text-sm">
                              {format(new Date(r.created_at), "d MMM yyyy", { locale: pt })}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={r.status === "completed" ? "default" : r.status === "pending" ? "secondary" : "outline"}
                                className="text-xs"
                              >
                                {r.status === "completed" ? "Concluída" : r.status === "pending" ? "Pendente" : "Expirada"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {r.referrer_rewarded ? (
                                <span className="text-green-600 font-medium">
                                  +{settings.referrer_reward_points} pts
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </main>

        <StoreFooter workspaceSlug={wsSlug} storeName={workspace?.name || "Loja"} />
      </div>
    </>
  );
}
