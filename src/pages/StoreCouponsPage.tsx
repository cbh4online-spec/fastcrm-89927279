import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useStoreCoupons, useCreateStoreCoupon, useToggleCoupon, useDeleteStoreCoupon } from "@/hooks/useStoreCoupons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Ticket, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export default function StoreCouponsPage() {
  const { data: coupons = [], isLoading } = useStoreCoupons();
  const createCoupon = useCreateStoreCoupon();
  const toggleCoupon = useToggleCoupon();
  const deleteCoupon = useDeleteStoreCoupon();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    code: "",
    discount_type: "percentage" as "percentage" | "fixed",
    discount_value: "",
    min_order_amount: "",
    max_uses: "",
    valid_until: "",
  });

  const handleCreate = () => {
    if (!form.code.trim() || !form.discount_value) return;
    createCoupon.mutate({
      code: form.code,
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      min_order_amount: form.min_order_amount ? Number(form.min_order_amount) : 0,
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      valid_until: form.valid_until || null,
    }, {
      onSuccess: () => {
        setOpen(false);
        setForm({ code: "", discount_type: "percentage", discount_value: "", min_order_amount: "", max_uses: "", valid_until: "" });
      },
    });
  };

  return (
    <>
      <Helmet><title>Cupões de Desconto | FastCRM</title></Helmet>
      <DashboardLayout>
        <main className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2"><Ticket className="h-6 w-6" /> Cupões de Desconto</h1>
              <p className="text-sm text-muted-foreground">Criar e gerir cupões para a loja online</p>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" /> Novo Cupão</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Novo Cupão</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Código *</Label>
                    <Input value={form.code} onChange={(e) => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="DESCONTO10" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select value={form.discount_type} onValueChange={(v: "percentage" | "fixed") => setForm(p => ({ ...p, discount_type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentagem (%)</SelectItem>
                          <SelectItem value="fixed">Valor fixo (€)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Valor *</Label>
                      <Input type="number" value={form.discount_value} onChange={(e) => setForm(p => ({ ...p, discount_value: e.target.value }))} placeholder={form.discount_type === "percentage" ? "10" : "5.00"} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Encomenda mínima (€)</Label>
                      <Input type="number" value={form.min_order_amount} onChange={(e) => setForm(p => ({ ...p, min_order_amount: e.target.value }))} placeholder="0" />
                    </div>
                    <div className="space-y-2">
                      <Label>Máximo de usos</Label>
                      <Input type="number" value={form.max_uses} onChange={(e) => setForm(p => ({ ...p, max_uses: e.target.value }))} placeholder="Ilimitado" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Válido até</Label>
                    <Input type="date" value={form.valid_until} onChange={(e) => setForm(p => ({ ...p, valid_until: e.target.value }))} />
                  </div>
                  <Button onClick={handleCreate} disabled={!form.code.trim() || !form.discount_value || createCoupon.isPending} className="w-full">
                    Criar Cupão
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Desconto</TableHead>
                  <TableHead>Mín. Encomenda</TableHead>
                  <TableHead>Usos</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">A carregar...</TableCell></TableRow>
                ) : coupons.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Sem cupões</TableCell></TableRow>
                ) : coupons.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono font-semibold">{c.code}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {c.discount_type === "percentage" ? `${c.discount_value}%` : `€${c.discount_value.toFixed(2)}`}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{c.min_order_amount > 0 ? `€${c.min_order_amount.toFixed(2)}` : "—"}</TableCell>
                    <TableCell className="text-sm">{c.used_count}{c.max_uses ? ` / ${c.max_uses}` : ""}</TableCell>
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
                ))}
              </TableBody>
            </Table>
          </div>
        </main>
      </DashboardLayout>
    </>
  );
}
