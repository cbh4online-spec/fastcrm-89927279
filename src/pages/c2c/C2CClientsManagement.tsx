import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase as _supabase } from "@/integrations/supabase/client";
import { useUpdateBuyerStatus, type C2CBuyer } from "@/hooks/useC2CBuyers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Search, Mail, Phone, ShoppingBag, CalendarDays, Euro, Ban, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

const supabase = _supabase as any;

type TransactionRow = {
  id: string;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  amount_total: number;
  status: string;
  created_at: string;
  c2c_listings?: { title?: string | null } | null;
};

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  paid: "default",
  released: "default",
  escrow: "secondary",
  pending: "secondary",
  disputed: "outline",
  refunded: "outline",
};

export default function C2CClientsManagement() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const [search, setSearch] = useState("");
  const [selectedBuyerId, setSelectedBuyerId] = useState<string | null>(null);
  const updateStatus = useUpdateBuyerStatus();

  // Fetch buyers from c2c_buyers table
  const { data: buyers = [], isLoading: buyersLoading } = useQuery<C2CBuyer[]>({
    queryKey: ["c2c-buyers-admin", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("c2c_buyers")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch transactions for selected buyer
  const { data: selectedTransactions = [] } = useQuery<TransactionRow[]>({
    queryKey: ["c2c-buyer-transactions", selectedBuyerId, workspaceId],
    enabled: !!selectedBuyerId && !!workspaceId,
    queryFn: async () => {
      if (!selectedBuyerId) return [];
      const buyer = buyers.find((b) => b.id === selectedBuyerId);
      if (!buyer) return [];

      const { data, error } = await supabase
        .from("c2c_transactions")
        .select("id, buyer_name, buyer_email, buyer_phone, amount_total, status, created_at, c2c_listings(title)")
        .eq("workspace_id", workspaceId)
        .eq("buyer_id", buyer.user_id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) return [];
      return data || [];
    },
  });

  const filteredBuyers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return buyers;
    return buyers.filter((b) =>
      (b.display_name || "").toLowerCase().includes(term) ||
      (b.phone || "").toLowerCase().includes(term)
    );
  }, [buyers, search]);

  const totalSpent = buyers.reduce((sum, b) => sum + Number(b.total_spent), 0);
  const selectedBuyer = buyers.find((b) => b.id === selectedBuyerId) || null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Gestão de Clientes C2C</h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe compradores, histórico de compras e contactos no marketplace.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" /> Compradores registados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{buyers.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" /> Total de compras
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{buyers.reduce((s, b) => s + b.total_purchases, 0)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Euro className="h-4 w-4" /> Volume total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalSpent.toFixed(2)}€</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Lista de compradores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar por nome ou telefone"
              className="pl-9"
            />
          </div>

          {buyersLoading ? (
            <p className="text-sm text-muted-foreground">A carregar compradores...</p>
          ) : filteredBuyers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum comprador encontrado.</p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Comprador</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Compras</TableHead>
                    <TableHead>Valor total</TableHead>
                    <TableHead>Pontos</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBuyers.map((buyer) => (
                    <TableRow key={buyer.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {buyer.avatar_url ? (
                            <img src={buyer.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                              {(buyer.display_name || "?")[0].toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{buyer.display_name || "Sem nome"}</p>
                            {buyer.is_verified && <Badge variant="secondary" className="text-xs">Verificado</Badge>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {buyer.phone ? (
                          <a href={`tel:${buyer.phone}`} className="flex items-center gap-1 text-xs text-primary hover:underline">
                            <Phone className="h-3 w-3" /> {buyer.phone}
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>{buyer.total_purchases}</TableCell>
                      <TableCell>{Number(buyer.total_spent).toFixed(2)}€</TableCell>
                      <TableCell>{buyer.loyalty_points}</TableCell>
                      <TableCell>
                        <Badge variant={buyer.status === "active" ? "default" : "destructive"}>
                          {buyer.status === "active" ? "Ativo" : "Suspenso"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedBuyerId(selectedBuyerId === buyer.id ? null : buyer.id)}
                          >
                            Histórico
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title={buyer.status === "active" ? "Suspender" : "Reativar"}
                            onClick={() => updateStatus.mutate({
                              buyerId: buyer.id,
                              status: buyer.status === "active" ? "suspended" : "active",
                            })}
                          >
                            {buyer.status === "active" ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedBuyer && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Histórico de {selectedBuyer.display_name || "Comprador"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem transações registadas.</p>
            ) : (
              selectedTransactions.map((tx) => (
                <div key={tx.id} className="border rounded-lg p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{tx.c2c_listings?.title || "Anúncio"}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {format(new Date(tx.created_at), "dd MMM yyyy HH:mm", { locale: pt })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant[tx.status] || "outline"}>{tx.status}</Badge>
                    <p className="font-semibold">{((tx.amount_total || 0) / 100).toFixed(2)}€</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
