import { useState } from "react";
import { Banknote, Plus, Search, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CapabilityGuard } from "@/components/guards/CapabilityGuard";
import {
  useFinanciers, useCreateFinancier, useUpdateFinancier, useRemoveFinancier,
  type Financier, type FinancierInput,
} from "../hooks/useFinanciers";

const emptyForm: FinancierInput = {
  name: "",
  tax_id: "",
  address: "",
  postal_code: "",
  city: "",
  email: "",
  phone: "",
  website: "",
  notes: "",
};

export default function FinanciersPage() {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Financier | null>(null);
  const [creating, setCreating] = useState(false);
  const [removing, setRemoving] = useState<Financier | null>(null);
  const [form, setForm] = useState<FinancierInput>(emptyForm);

  const { data: items = [], isLoading } = useFinanciers(search || undefined);
  const createMut = useCreateFinancier();
  const updateMut = useUpdateFinancier();
  const removeMut = useRemoveFinancier();

  function openCreate() {
    setForm(emptyForm);
    setCreating(true);
  }
  function openEdit(f: Financier) {
    setForm({
      name: f.name,
      tax_id: f.tax_id ?? "",
      address: f.address ?? "",
      postal_code: f.postal_code ?? "",
      city: f.city ?? "",
      email: f.email ?? "",
      phone: f.phone ?? "",
      website: f.website ?? "",
      notes: f.notes ?? "",
    });
    setEditing(f);
  }
  function closeDialogs() {
    setCreating(false);
    setEditing(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (editing) {
      await updateMut.mutateAsync({ id: editing.id, ...form });
    } else {
      await createMut.mutateAsync(form);
    }
    closeDialogs();
  }

  const dialogOpen = creating || !!editing;
  const saving = createMut.isPending || updateMut.isPending;

  return (
    <CapabilityGuard need="rentals.manage">
      <div className="p-6 space-y-6">
        <header className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
              <Banknote className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Financiadoras</h1>
              <p className="text-sm text-muted-foreground">
                Entidades que financiam contratos de renting (ex.: Liquid).
              </p>
            </div>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Nova financiadora
          </Button>
        </header>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome ou NIF…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Card className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>NIF</TableHead>
                <TableHead>Morada</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead className="w-24 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">A carregar…</TableCell></TableRow>
              )}
              {!isLoading && items.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  Ainda não tem financiadoras. Comece por adicionar a primeira.
                </TableCell></TableRow>
              )}
              {items.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.name}</TableCell>
                  <TableCell className="font-mono text-sm">{f.tax_id ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {[f.address, [f.postal_code, f.city].filter(Boolean).join(" ")]
                      .filter(Boolean).join(", ") || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {f.email ?? f.phone ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(f)} aria-label="Editar">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setRemoving(f)} aria-label="Remover">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(o) => !o && closeDialogs()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar financiadora" : "Nova financiadora"}</DialogTitle>
            <DialogDescription>
              Dados de faturação da entidade que financia os contratos.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label htmlFor="name">Razão social *</Label>
                <Input id="name" value={form.name} required
                  onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="tax_id">NIF</Label>
                <Input id="tax_id" value={form.tax_id ?? ""}
                  onChange={(e) => setForm({ ...form, tax_id: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="website">Website</Label>
                <Input id="website" value={form.website ?? ""}
                  onChange={(e) => setForm({ ...form, website: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label htmlFor="address">Morada</Label>
                <Input id="address" value={form.address ?? ""}
                  onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="postal_code">Código postal</Label>
                <Input id="postal_code" value={form.postal_code ?? ""}
                  onChange={(e) => setForm({ ...form, postal_code: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="city">Localidade</Label>
                <Input id="city" value={form.city ?? ""}
                  onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email ?? ""}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" value={form.phone ?? ""}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea id="notes" rows={2} value={form.notes ?? ""}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialogs}>Cancelar</Button>
              <Button type="submit" disabled={saving || !form.name.trim()}>
                {saving ? "A guardar…" : editing ? "Guardar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover financiadora?</AlertDialogTitle>
            <AlertDialogDescription>
              A empresa <strong>{removing?.name}</strong> deixa de aparecer na lista de
              financiadoras. Contratos existentes mantêm-se inalterados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (removing) await removeMut.mutateAsync(removing.id);
                setRemoving(null);
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CapabilityGuard>
  );
}
