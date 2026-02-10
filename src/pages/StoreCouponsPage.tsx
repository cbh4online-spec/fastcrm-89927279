import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useStoreCoupons, useCreateStoreCoupon, useToggleCoupon, useDeleteStoreCoupon } from "@/hooks/useStoreCoupons";
import { useStoreCategories } from "@/hooks/useStoreProducts";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Ticket, Plus, Trash2, Users, Tag, ShieldCheck, Info } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CouponForm {
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: string;
  min_order_amount: string;
  max_uses: string;
  valid_until: string;
  single_use_per_customer: boolean;
  category_ids: string[];
  max_discount_amount: string;
  description: string;
}

const defaultForm: CouponForm = {
  code: "",
  discount_type: "percentage",
  discount_value: "",
  min_order_amount: "",
  max_uses: "",
  valid_until: "",
  single_use_per_customer: false,
  category_ids: [],
  max_discount_amount: "",
  description: "",
};

export default function StoreCouponsPage() {
  const { data: coupons = [], isLoading } = useStoreCoupons();
  const createCoupon = useCreateStoreCoupon();
  const toggleCoupon = useToggleCoupon();
  const deleteCoupon = useDeleteStoreCoupon();
  const { currentWorkspace } = useWorkspace();
  const { data: categories = [] } = useStoreCategories(currentWorkspace?.id || "");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CouponForm>(defaultForm);

  const handleCreate = () => {
    if (!form.code.trim() || !form.discount_value) return;
    createCoupon.mutate(
      {
        code: form.code,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        min_order_amount: form.min_order_amount ? Number(form.min_order_amount) : 0,
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        valid_until: form.valid_until || null,
        single_use_per_customer: form.single_use_per_customer,
        category_ids: form.category_ids.length > 0 ? form.category_ids : null,
        max_discount_amount: form.max_discount_amount ? Number(form.max_discount_amount) : null,
        description: form.description || null,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setForm(defaultForm);
        },
      }
    );
  };

  const toggleCategory = (catId: string) => {
    setForm((p) => ({
      ...p,
      category_ids: p.category_ids.includes(catId) ? p.category_ids.filter((id) => id !== catId) : [...p.category_ids, catId],
    }));
  };

  const getCategoryNames = (ids: string[] | null) => {
    if (!ids || ids.length === 0) return null;
    return ids
      .map((id) => categories.find((c: any) => c.id === id)?.name)
      .filter(Boolean)
      .join(", ");
  };

  return (
    <>
      <Helmet>
        <title>Cupões de Desconto | FastCRM</title>
      </Helmet>
      <DashboardLayout>
        <main className="p-6 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Ticket className="h-6 w-6" /> Cupões de Desconto
              </h1>
              <p className="text-sm text-muted-foreground">Criar e gerir cupões com regras avançadas</p>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" /> Novo Cupão
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh]">
                <DialogHeader>
                  <DialogTitle>Novo Cupão</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] pr-4">
                  <div className="space-y-4 pb-2">
                    {/* Code */}
                    <div className="space-y-2">
                      <Label>Código *</Label>
                      <Input value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="DESCONTO10" />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label>Descrição (interna)</Label>
                      <Textarea
                        value={form.description}
                        onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                        placeholder="Campanha de verão, 10% para novos clientes..."
                        rows={2}
                      />
                    </div>

                    {/* Type & Value */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Tipo</Label>
                        <Select value={form.discount_type} onValueChange={(v: "percentage" | "fixed") => setForm((p) => ({ ...p, discount_type: v }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Percentagem (%)</SelectItem>
                            <SelectItem value="fixed">Valor fixo (€)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Valor *</Label>
                        <Input
                          type="number"
                          value={form.discount_value}
                          onChange={(e) => setForm((p) => ({ ...p, discount_value: e.target.value }))}
                          placeholder={form.discount_type === "percentage" ? "10" : "5.00"}
                        />
                      </div>
                    </div>

                    {/* Max discount for percentage */}
                    {form.discount_type === "percentage" && (
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5">
                          Desconto máximo (€)
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3.5 w-3.5 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>Limita o valor máximo do desconto em percentagem</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </Label>
                        <Input
                          type="number"
                          value={form.max_discount_amount}
                          onChange={(e) => setForm((p) => ({ ...p, max_discount_amount: e.target.value }))}
                          placeholder="Sem limite"
                        />
                      </div>
                    )}

                    {/* Min order & Max uses */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Encomenda mínima (€)</Label>
                        <Input
                          type="number"
                          value={form.min_order_amount}
                          onChange={(e) => setForm((p) => ({ ...p, min_order_amount: e.target.value }))}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Máximo de usos (total)</Label>
                        <Input
                          type="number"
                          value={form.max_uses}
                          onChange={(e) => setForm((p) => ({ ...p, max_uses: e.target.value }))}
                          placeholder="Ilimitado"
                        />
                      </div>
                    </div>

                    {/* Validity */}
                    <div className="space-y-2">
                      <Label>Válido até</Label>
                      <Input type="date" value={form.valid_until} onChange={(e) => setForm((p) => ({ ...p, valid_until: e.target.value }))} />
                    </div>

                    {/* Single use per customer */}
                    <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                      <Switch
                        checked={form.single_use_per_customer}
                        onCheckedChange={(v) => setForm((p) => ({ ...p, single_use_per_customer: v }))}
                        id="single-use"
                      />
                      <div>
                        <Label htmlFor="single-use" className="cursor-pointer flex items-center gap-1.5">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          Uso único por cliente
                        </Label>
                        <p className="text-xs text-muted-foreground mt-0.5">Cada cliente só pode usar este cupão uma vez</p>
                      </div>
                    </div>

                    {/* Category filter */}
                    {categories.length > 0 && (
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5">
                          <Tag className="h-4 w-4 text-muted-foreground" />
                          Categorias específicas
                        </Label>
                        <p className="text-xs text-muted-foreground">Deixe vazio para aplicar a todas as categorias</p>
                        <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-lg p-3">
                          {categories.map((cat: any) => (
                            <label key={cat.id} className="flex items-center gap-2 text-sm cursor-pointer">
                              <Checkbox checked={form.category_ids.includes(cat.id)} onCheckedChange={() => toggleCategory(cat.id)} />
                              {cat.name}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button onClick={handleCreate} disabled={!form.code.trim() || !form.discount_value || createCoupon.isPending} className="w-full">
                      Criar Cupão
                    </Button>
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>

          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Desconto</TableHead>
                  <TableHead>Regras</TableHead>
                  <TableHead>Usos</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      A carregar...
                    </TableCell>
                  </TableRow>
                ) : coupons.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Sem cupões
                    </TableCell>
                  </TableRow>
                ) : (
                  coupons.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div>
                          <span className="font-mono font-semibold">{c.code}</span>
                          {c.description && <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">{c.description}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant="secondary">{c.discount_type === "percentage" ? `${c.discount_value}%` : `€${c.discount_value.toFixed(2)}`}</Badge>
                          {c.max_discount_amount && (
                            <p className="text-[10px] text-muted-foreground">máx. €{c.max_discount_amount.toFixed(2)}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {c.min_order_amount > 0 && (
                            <Badge variant="outline" className="text-[10px]">
                              Mín. €{c.min_order_amount.toFixed(2)}
                            </Badge>
                          )}
                          {c.single_use_per_customer && (
                            <Badge variant="outline" className="text-[10px]">
                              <Users className="h-3 w-3 mr-0.5" />
                              Uso único
                            </Badge>
                          )}
                          {c.category_ids && c.category_ids.length > 0 && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="text-[10px]">
                                    <Tag className="h-3 w-3 mr-0.5" />
                                    {c.category_ids.length} cat.
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>{getCategoryNames(c.category_ids) || "Categorias"}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {!c.min_order_amount && !c.single_use_per_customer && (!c.category_ids || c.category_ids.length === 0) && (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {c.used_count}
                        {c.max_uses ? ` / ${c.max_uses}` : ""}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.valid_until ? format(new Date(c.valid_until), "dd MMM yyyy", { locale: pt }) : "Sem limite"}
                      </TableCell>
                      <TableCell>
                        <Switch checked={c.is_active} onCheckedChange={(v) => toggleCoupon.mutate({ id: c.id, is_active: v })} />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteCoupon.mutate(c.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </main>
      </DashboardLayout>
    </>
  );
}
