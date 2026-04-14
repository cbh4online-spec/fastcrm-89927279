import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Percent, DollarSign, Trash2, TrendingDown, Tag } from "lucide-react";
import { format } from "date-fns";
import { useRenewalDiscounts, useUpdateRenewalDiscount, useDeleteRenewalDiscount } from "@/hooks/useRenewalDiscounts";
import { CreateRenewalDiscountDialog } from "./CreateRenewalDiscountDialog";
import type { RenewalItem, RenewalDiscount } from "@/types/renewal";

interface Props {
  contractId: string;
  items: RenewalItem[];
  currency: string;
}

function isDiscountActive(d: RenewalDiscount): boolean {
  if (!d.is_active) return false;
  const today = new Date().toISOString().split("T")[0];
  if (d.start_date > today) return false;
  if (d.end_date && d.end_date < today) return false;
  if (d.max_cycles && d.cycles_used >= d.max_cycles) return false;
  return true;
}

function isDiscountFuture(d: RenewalDiscount): boolean {
  if (!d.is_active) return false;
  const today = new Date().toISOString().split("T")[0];
  return d.start_date > today;
}

type FilterTab = "all" | "active" | "expired";

export function RenewalDiscountsSection({ contractId, items, currency }: Props) {
  const { data: discounts = [], isLoading } = useRenewalDiscounts(contractId);
  const updateDiscount = useUpdateRenewalDiscount();
  const deleteDiscount = useDeleteRenewalDiscount();
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<FilterTab>("all");

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-PT", { style: "currency", currency: currency || "EUR" }).format(val);

  const activeDiscounts = discounts.filter(isDiscountActive);
  const futureDiscounts = discounts.filter(isDiscountFuture);

  // Calculate total active savings
  const totalSavings = useMemo(() => {
    return activeDiscounts.reduce((sum, d) => {
      const targetItems = d.renewal_item_id
        ? items.filter(i => i.id === d.renewal_item_id)
        : items;
      const base = targetItems.reduce((s, i) => s + i.unit_price * i.qty, 0);
      if (d.discount_type === "percentage") {
        return sum + base * (d.discount_value / 100);
      }
      return sum + Math.min(d.discount_value, base);
    }, 0);
  }, [activeDiscounts, items]);

  // Filter discounts
  const filtered = useMemo(() => {
    if (filter === "active") return discounts.filter(d => isDiscountActive(d) || isDiscountFuture(d));
    if (filter === "expired") return discounts.filter(d => !isDiscountActive(d) && !isDiscountFuture(d));
    return discounts;
  }, [discounts, filter]);

  const toggleActive = (d: RenewalDiscount) => {
    updateDiscount.mutate({ id: d.id, contract_id: d.contract_id, is_active: !d.is_active });
  };

  const getStatusBadge = (d: RenewalDiscount) => {
    if (isDiscountActive(d)) return { label: "Ativo", variant: "default" as const };
    if (isDiscountFuture(d)) return { label: "Agendado", variant: "outline" as const };
    if (!d.is_active) return { label: "Desativado", variant: "secondary" as const };
    return { label: "Expirado", variant: "secondary" as const };
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Descontos & Promoções
              {activeDiscounts.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {activeDiscounts.length} ativo{activeDiscounts.length !== 1 ? "s" : ""}
                </Badge>
              )}
              {futureDiscounts.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {futureDiscounts.length} agendado{futureDiscounts.length !== 1 ? "s" : ""}
                </Badge>
              )}
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowCreate(true)}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar
            </Button>
          </div>

          {/* Savings indicator */}
          {totalSavings > 0 && (
            <div className="flex items-center gap-2 mt-2 p-2 rounded-md bg-primary/5 border border-primary/10">
              <TrendingDown className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                Economia ativa: -{formatCurrency(totalSavings)}/ciclo
              </span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">A carregar...</p>
          ) : discounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="rounded-full bg-muted p-3">
                <Tag className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Nenhum desconto configurado</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Adicione descontos temporários ou permanentes para promoções, onboarding ou retenção.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setShowCreate(true)}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Criar primeiro desconto
              </Button>
            </div>
          ) : (
            <>
              {/* Filters */}
              {discounts.length > 1 && (
                <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterTab)} className="mb-3">
                  <TabsList className="h-8">
                    <TabsTrigger value="all" className="text-xs h-7 px-3">Todos ({discounts.length})</TabsTrigger>
                    <TabsTrigger value="active" className="text-xs h-7 px-3">
                      Ativos ({discounts.filter(d => isDiscountActive(d) || isDiscountFuture(d)).length})
                    </TabsTrigger>
                    <TabsTrigger value="expired" className="text-xs h-7 px-3">
                      Expirados ({discounts.filter(d => !isDiscountActive(d) && !isDiscountFuture(d)).length})
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              )}

              {/* Desktop table */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Desconto</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Ciclos</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((d) => {
                      const status = getStatusBadge(d);
                      const active = isDiscountActive(d);
                      const itemName = d.renewal_item_id
                        ? items.find((i) => i.id === d.renewal_item_id)?.name || "Item"
                        : "Contrato inteiro";
                      return (
                        <TableRow key={d.id} className={!active && !isDiscountFuture(d) ? "opacity-60" : ""}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{d.name}</p>
                              <p className="text-xs text-muted-foreground">{itemName}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {d.discount_type === "percentage" ? (
                                <><Percent className="h-3 w-3" /><span className="font-medium">{d.discount_value}%</span></>
                              ) : (
                                <><DollarSign className="h-3 w-3" /><span className="font-medium">{formatCurrency(d.discount_value)}</span></>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            {format(new Date(d.start_date), "dd/MM/yyyy")}
                            {d.end_date ? ` → ${format(new Date(d.end_date), "dd/MM/yyyy")}` : " → ∞"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {d.max_cycles ? `${d.cycles_used}/${d.max_cycles}` : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={status.variant}
                              className="text-xs cursor-pointer"
                              onClick={() => toggleActive(d)}
                            >
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => deleteDiscount.mutate({ id: d.id, contractId })}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden space-y-2">
                {filtered.map((d) => {
                  const status = getStatusBadge(d);
                  const active = isDiscountActive(d);
                  const itemName = d.renewal_item_id
                    ? items.find((i) => i.id === d.renewal_item_id)?.name || "Item"
                    : "Contrato inteiro";
                  return (
                    <div
                      key={d.id}
                      className={`rounded-lg border p-3 space-y-2 ${!active && !isDiscountFuture(d) ? "opacity-60" : ""}`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">{d.name}</p>
                          <p className="text-xs text-muted-foreground">{itemName}</p>
                        </div>
                        <Badge variant={status.variant} className="text-xs cursor-pointer" onClick={() => toggleActive(d)}>
                          {status.label}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          {d.discount_type === "percentage" ? `${d.discount_value}%` : formatCurrency(d.discount_value)}
                        </span>
                        <span>{format(new Date(d.start_date), "dd/MM/yyyy")}{d.end_date ? ` → ${format(new Date(d.end_date), "dd/MM/yyyy")}` : ""}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {d.max_cycles ? `Ciclos: ${d.cycles_used}/${d.max_cycles}` : "Permanente"}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => deleteDiscount.mutate({ id: d.id, contractId })}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {showCreate && (
        <CreateRenewalDiscountDialog
          open={showCreate}
          onOpenChange={setShowCreate}
          contractId={contractId}
          items={items}
        />
      )}
    </>
  );
}
