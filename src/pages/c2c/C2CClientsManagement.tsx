import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase as _supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Search, Mail, Phone, ShoppingBag, CalendarDays } from "lucide-react";
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

type ClientItem = {
  key: string;
  name: string;
  email: string;
  phone: string;
  ordersCount: number;
  totalSpentCents: number;
  lastPurchaseAt: string;
  transactions: TransactionRow[];
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
  const [selectedClientKey, setSelectedClientKey] = useState<string | null>(null);

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["c2c-clients-management", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      if (!workspaceId) return [] as TransactionRow[];
      const { data, error } = await supabase
        .from("c2c_transactions")
        .select("id, buyer_name, buyer_email, buyer_phone, amount_total, status, created_at, c2c_listings(title)")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) throw error;
      return (data || []) as TransactionRow[];
    },
  });

  const clients = useMemo<ClientItem[]>(() => {
    const map = new Map<string, ClientItem>();

    for (const tx of transactions) {
      const email = tx.buyer_email?.trim() || "";
      const phone = tx.buyer_phone?.trim() || "";
      const name = tx.buyer_name?.trim() || "Cliente";
      const key = email || phone || tx.id;

      if (!map.has(key)) {
        map.set(key, {
          key,
          name,
          email,
          phone,
          ordersCount: 0,
          totalSpentCents: 0,
          lastPurchaseAt: tx.created_at,
          transactions: [],
        });
      }

      const item = map.get(key)!;
      item.ordersCount += 1;
      item.totalSpentCents += tx.amount_total || 0;
      if (new Date(tx.created_at).getTime() > new Date(item.lastPurchaseAt).getTime()) {
        item.lastPurchaseAt = tx.created_at;
      }
      item.transactions.push(tx);
    }

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.lastPurchaseAt).getTime() - new Date(a.lastPurchaseAt).getTime()
    );
  }, [transactions]);

  const filteredClients = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return clients;

    return clients.filter((client) =>
      client.name.toLowerCase().includes(term) ||
      client.email.toLowerCase().includes(term) ||
      client.phone.toLowerCase().includes(term)
    );
  }, [clients, search]);

  const selectedClient = filteredClients.find((item) => item.key === selectedClientKey) || null;
  const totalRevenue = transactions.reduce((sum, tx) => sum + (tx.amount_total || 0), 0);

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
              <Users className="h-4 w-4" /> Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{clients.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" /> Transações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{transactions.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Volume transacionado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{(totalRevenue / 100).toFixed(2)}€</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Lista de clientes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Pesquisar por nome, email ou telefone"
              className="pl-9"
            />
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">A carregar clientes...</p>
          ) : filteredClients.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem clientes para este filtro.</p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Compras</TableHead>
                    <TableHead>Valor total</TableHead>
                    <TableHead>Última compra</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow key={client.key}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{client.name}</p>
                          <p className="text-xs text-muted-foreground">ID: {client.key}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-xs">
                          {client.email && (
                            <a href={`mailto:${client.email}`} className="flex items-center gap-1 text-primary hover:underline">
                              <Mail className="h-3 w-3" /> {client.email}
                            </a>
                          )}
                          {client.phone && (
                            <a href={`tel:${client.phone}`} className="flex items-center gap-1 text-primary hover:underline">
                              <Phone className="h-3 w-3" /> {client.phone}
                            </a>
                          )}
                          {!client.email && !client.phone && <span className="text-muted-foreground">Sem contacto</span>}
                        </div>
                      </TableCell>
                      <TableCell>{client.ordersCount}</TableCell>
                      <TableCell>{(client.totalSpentCents / 100).toFixed(2)}€</TableCell>
                      <TableCell>
                        {format(new Date(client.lastPurchaseAt), "dd MMM yyyy", { locale: pt })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedClientKey((current) => (current === client.key ? null : client.key))}
                        >
                          Histórico
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedClient && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Histórico de {selectedClient.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedClient.transactions.map((tx) => (
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
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
