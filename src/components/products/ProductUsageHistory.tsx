import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Target,
  CreditCard,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useProductProposals, useProductOpportunities } from "@/hooks/useProductStats";

interface ProductUsageHistoryProps {
  productId: string;
  currency?: string;
}

const proposalStatusLabels: Record<string, string> = {
  draft: "Rascunho",
  published: "Publicada",
  accepted: "Aceita",
  expired: "Expirada",
  rejected: "Rejeitada",
};

const proposalStatusColors: Record<string, string> = {
  draft: "secondary",
  published: "default",
  accepted: "default",
  expired: "destructive",
  rejected: "destructive",
};

export function ProductUsageHistory({
  productId,
  currency = "EUR",
}: ProductUsageHistoryProps) {
  const { data: proposals, isLoading: loadingProposals } = useProductProposals(productId);
  const { data: opportunities, isLoading: loadingOpportunities } = useProductOpportunities(productId);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency,
    }).format(value);
  };

  return (
    <Tabs defaultValue="proposals" className="space-y-4">
      <TabsList>
        <TabsTrigger value="proposals" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Propostas ({proposals?.length || 0})
        </TabsTrigger>
        <TabsTrigger value="opportunities" className="flex items-center gap-2">
          <Target className="h-4 w-4" />
          Oportunidades ({opportunities?.length || 0})
        </TabsTrigger>
        <TabsTrigger value="payments" className="flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Pagamentos
        </TabsTrigger>
      </TabsList>

      <TabsContent value="proposals">
        {loadingProposals ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : !proposals?.length ? (
          <Card className="p-8 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Este produto ainda não foi usado em propostas.</p>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Proposta</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vistas</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proposals.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {format(new Date(item.created_at), "dd/MM/yyyy", { locale: pt })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {item.proposal?.title || "-"}
                    </TableCell>
                    <TableCell>
                      {item.proposal?.opportunity?.lead?.name ||
                        item.proposal?.opportunity?.lead?.company_name ||
                        "-"}
                    </TableCell>
                    <TableCell>{formatCurrency(item.total_price)}</TableCell>
                    <TableCell>{item.proposal?.views_count || 0}</TableCell>
                    <TableCell>
                      {item.proposal?.status && (
                        <Badge
                          variant={
                            proposalStatusColors[item.proposal.status] as any
                          }
                          className={
                            item.proposal.status === "accepted"
                              ? "bg-green-500 hover:bg-green-600"
                              : ""
                          }
                        >
                          {proposalStatusLabels[item.proposal.status]}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="opportunities">
        {loadingOpportunities ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : !opportunities?.length ? (
          <Card className="p-8 text-center text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Este produto ainda não está associado a oportunidades.</p>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Oportunidade</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead>Probabilidade</TableHead>
                  <TableHead>Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {opportunities.map((opp: any) => (
                  <TableRow key={opp.id}>
                    <TableCell className="font-medium">{opp.title}</TableCell>
                    <TableCell>
                      {opp.lead?.name || opp.lead?.company_name || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{opp.stage || "-"}</Badge>
                    </TableCell>
                    <TableCell>
                      {opp.probability ? `${opp.probability}%` : "-"}
                    </TableCell>
                    <TableCell>
                      {opp.value ? formatCurrency(opp.value) : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="payments">
        <Card className="p-8 text-center text-muted-foreground">
          <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <h3 className="font-medium mb-2">Em breve</h3>
          <p className="text-sm">
            Integração com pagamentos Stripe para mostrar transações confirmadas.
          </p>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
