/**
 * Auditoria prévia de conformidade de feeds.
 *
 * Corre as regras do canal (Google Merchant / Meta Catalog / OpenAI) sem gerar
 * nem publicar o feed, para que o utilizador veja o que seria rejeitado antes
 * de submeter o URL ao canal externo.
 */
import { useMemo } from "react";
import { AlertTriangle, CheckCircle2, Info, ShieldCheck, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAICommerceProducts } from "@/hooks/useAICommerce";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { auditFeed } from "@/lib/ai-commerce/feeds";
import type { CommerceFeed } from "@/lib/ai-commerce/types";

interface Props {
  feed: CommerceFeed | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Requisitos da loja exigidos pelo Google Merchant Center para aprovar a conta. */
const STORE_REQUIREMENTS = [
  "Política de devoluções visível na loja",
  "Termos e condições publicados",
  "Dados da empresa (NIF e morada) no rodapé",
  "Custos de envio e prazos indicados antes do pagamento",
];

export function FeedComplianceAuditDialog({ feed, open, onOpenChange }: Props) {
  const { currentWorkspace } = useWorkspace();
  const { data: rows, isLoading } = useAICommerceProducts();

  const audit = useMemo(() => {
    if (!feed || !rows) return null;
    const eligibleRows = rows.filter((r) => r.ai?.ai_commerce_enabled);
    return auditFeed(
      feed.channel,
      eligibleRows.map((r) => ({ product: r.product, ai: r.ai })),
      {
        baseUrl: window.location.origin,
        workspaceSlug: currentWorkspace?.slug || "",
        language: feed.language,
        country: feed.country,
      },
    );
  }, [feed, rows, currentWorkspace?.slug]);

  const readyPct = audit && audit.total > 0 ? Math.round((audit.eligible / audit.total) * 100) : 0;
  const band = readyPct >= 95 ? "ok" : readyPct >= 70 ? "warn" : "bad";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
            Auditoria de conformidade{feed ? ` — ${feed.name}` : ""}
          </DialogTitle>
          <DialogDescription>
            Verificação das regras do canal antes de submeter o ficheiro. Nada é publicado nesta ação.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !audit ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <ScrollArea className="max-h-[65vh] pr-3">
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-base">{audit.channelLabel}</CardTitle>
                    <Badge
                      variant={band === "ok" ? "default" : band === "warn" ? "secondary" : "destructive"}
                    >
                      {readyPct}% elegíveis
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Progress value={readyPct} aria-label="Percentagem de produtos elegíveis" />
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border p-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                        Prontos para anúncios
                      </div>
                      <p className="mt-1 text-2xl font-bold">{audit.eligible}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <XCircle className="h-3.5 w-3.5" aria-hidden />
                        Bloqueados
                      </div>
                      <p className="mt-1 text-2xl font-bold text-destructive">{audit.blocked}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                        Com avisos
                      </div>
                      <p className="mt-1 text-2xl font-bold">{audit.withWarnings}</p>
                    </div>
                  </div>
                  {audit.total === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Nenhum produto tem o AI Commerce ativo. Ative-o nos produtos que quer anunciar.
                    </p>
                  )}
                </CardContent>
              </Card>

              {audit.errorGroups.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-destructive">Impedimentos</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {audit.errorGroups.map((g) => (
                      <div key={g.message} className="flex items-start justify-between gap-3 text-sm">
                        <span className="text-foreground">{g.message}</span>
                        <Badge variant="destructive">{g.count}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {audit.warningGroups.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Melhorias recomendadas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {audit.warningGroups.map((g) => (
                      <div key={g.message} className="flex items-start justify-between gap-3 text-sm">
                        <span className="text-muted-foreground">{g.message}</span>
                        <Badge variant="secondary">{g.count}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {audit.blocked > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Produtos bloqueados</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead>Motivos</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {audit.products
                          .filter((p) => !p.eligible)
                          .slice(0, 50)
                          .map((p) => (
                            <TableRow key={p.product_id}>
                              <TableCell>
                                <div className="font-medium">{p.name}</div>
                                <div className="text-xs text-muted-foreground">{p.sku || "sem referência"}</div>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {p.errors.join(" · ")}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Info className="h-4 w-4" aria-hidden />
                    Requisitos da loja (aprovação da conta)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    {STORE_REQUIREMENTS.map((req) => (
                      <li key={req} className="flex items-start gap-2">
                        <span aria-hidden>•</span>
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
