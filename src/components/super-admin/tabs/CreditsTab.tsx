import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Edit, Save, X, RefreshCw, Coins, Zap } from "lucide-react";

interface CreditPackage {
  id: string;
  name: string;
  credits_amount: number;
  price: number;
  currency: string;
  description: string | null;
  discount_percent: number;
  is_active: boolean;
  stripe_price_id: string | null;
}

const CONSUMPTION_TABLE = [
  { action: "Account Brief — Análise completa", credits: 5 },
  { action: "Account Brief — Re-análise", credits: 3 },
  { action: "Lead Enricher — Enriquecimento", credits: 2 },
  { action: "Prospecção — Pesquisa", credits: 3 },
  { action: "AI Copilot — Interação", credits: 1 },
  { action: "AI Sales Coach — Sessão", credits: 2 },
  { action: "AI Suggestions — Sugestão", credits: 1 },
  { action: "AI Profiles — Perfil", credits: 2 },
  { action: "Conversational Engine — Conversa", credits: 1 },
  { action: "Knowledge Base AI — Query", credits: 1 },
  { action: "AI Document OCR — Documento", credits: 3 },
  { action: "IMO AI — Avaliação", credits: 2 },
  { action: "Email IA — Geração", credits: 1 },
  { action: "SEO — Análise de página", credits: 2 },
];

export function CreditsTab() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ credits_amount: 0, price: 0, name: "" });

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ["admin-credit-packages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_packages")
        .select("*")
        .order("credits_amount");
      if (error) throw error;
      return data as CreditPackage[];
    },
  });

  const updatePackage = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; credits_amount: number; price: number; name: string }) => {
      const { error } = await supabase.from("credit_packages").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-credit-packages"] });
      toast.success("Pacote atualizado");
      setEditingId(null);
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  const startEdit = (pkg: CreditPackage) => {
    setEditValues({ credits_amount: pkg.credits_amount, price: pkg.price, name: pkg.name });
    setEditingId(pkg.id);
  };

  return (
    <div className="space-y-6">
      {/* Credit Packages */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Coins className="h-4 w-4" />
              Pacotes de Créditos IA
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-credit-packages"] })}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {packages.map((pkg) => {
                const isEditing = editingId === pkg.id;
                const pricePerCredit = pkg.price / pkg.credits_amount;

                return (
                  <Card key={pkg.id} className={`relative ${!pkg.is_active ? "opacity-60" : ""}`}>
                    <CardContent className="pt-4 space-y-3">
                      {isEditing ? (
                        <>
                          <Input value={editValues.name} onChange={(e) => setEditValues((p) => ({ ...p, name: e.target.value }))} className="h-8 text-sm font-medium" />
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-muted-foreground">Créditos</label>
                              <Input type="number" value={editValues.credits_amount} onChange={(e) => setEditValues((p) => ({ ...p, credits_amount: parseInt(e.target.value) || 0 }))} className="h-8 text-sm" />
                            </div>
                            <div>
                              <label className="text-[10px] text-muted-foreground">Preço (€)</label>
                              <Input type="number" step="0.01" value={editValues.price} onChange={(e) => setEditValues((p) => ({ ...p, price: parseFloat(e.target.value) || 0 }))} className="h-8 text-sm" />
                            </div>
                          </div>
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updatePackage.mutate({ id: pkg.id, ...editValues })}>
                              <Save className="h-3.5 w-3.5 text-green-600" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-sm">{pkg.name}</h3>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(pkg)}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="text-center py-2">
                            <div className="text-3xl font-bold text-primary">{pkg.credits_amount.toLocaleString("pt-PT")}</div>
                            <div className="text-xs text-muted-foreground">créditos</div>
                          </div>
                          <div className="flex items-baseline justify-center gap-1">
                            <span className="text-xl font-bold">{pkg.price}€</span>
                          </div>
                          <div className="text-center text-[10px] text-muted-foreground">
                            {pricePerCredit.toFixed(3)}€ / crédito
                          </div>
                          {pkg.description && (
                            <p className="text-xs text-muted-foreground text-center">{pkg.description}</p>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Consumption Reference Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4" />
            Tabela de Consumo de Créditos (Referência)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Operação</TableHead>
                <TableHead className="text-center w-[120px]">Créditos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {CONSUMPTION_TABLE.map((row) => (
                <TableRow key={row.action}>
                  <TableCell className="text-sm">{row.action}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="font-mono">{row.credits}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
