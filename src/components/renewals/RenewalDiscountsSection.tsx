import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Percent, DollarSign, Trash2 } from "lucide-react";
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

export function RenewalDiscountsSection({ contractId, items, currency }: Props) {
  const { data: discounts = [], isLoading } = useRenewalDiscounts(contractId);
  const updateDiscount = useUpdateRenewalDiscount();
  const deleteDiscount = useDeleteRenewalDiscount();
  const [showCreate, setShowCreate] = useState(false);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-PT", { style: "currency", currency: currency || "EUR" }).format(val);

  const activeDiscounts = discounts.filter(isDiscountActive);
  const inactiveDiscounts = discounts.filter((d) => !isDiscountActive(d));

  const toggleActive = (d: RenewalDiscount) => {
    updateDiscount.mutate({ id: d.id, contract_id: d.contract_id, is_active: !d.is_active });
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Descontos & Promoções
              {activeDiscounts.length > 0 && (
                <Badge variant="secondary" className="text-xs">{activeDiscounts.length} ativo{activeDiscounts.length !== 1 ? "s" : ""}</Badge>
              )}
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowCreate(true)}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">A carregar...</p>
          ) : discounts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum desconto configurado</p>
          ) : (
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
                {discounts.map((d) => {
                  const active = isDiscountActive(d);
                  const itemName = d.renewal_item_id
                    ? items.find((i) => i.id === d.renewal_item_id)?.name || "Item"
                    : "Contrato inteiro";
                  return (
                    <TableRow key={d.id} className={!active ? "opacity-60" : ""}>
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
                          variant={active ? "default" : "secondary"}
                          className="text-xs cursor-pointer"
                          onClick={() => toggleActive(d)}
                        >
                          {active ? "Ativo" : d.is_active ? "Expirado" : "Desativado"}
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
