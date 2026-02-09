import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAdminStoreCategories, useCreateStoreCategory, useToggleStoreCategory, useDeleteStoreCategory } from "@/hooks/useAdminStoreCategories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FolderOpen, Plus, Trash2 } from "lucide-react";

export default function StoreCategoriesPage() {
  const { data: categories = [], isLoading } = useAdminStoreCategories();
  const createCategory = useCreateStoreCategory();
  const toggleCategory = useToggleStoreCategory();
  const deleteCategory = useDeleteStoreCategory();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = () => {
    if (!name.trim()) return;
    const slug = name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    createCategory.mutate({ name: name.trim(), slug, description: description.trim() || undefined }, {
      onSuccess: () => { setOpen(false); setName(""); setDescription(""); },
    });
  };

  return (
    <>
      <Helmet><title>Categorias da Loja | FastCRM</title></Helmet>
      <DashboardLayout>
        <main className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2"><FolderOpen className="h-6 w-6" /> Categorias da Loja</h1>
              <p className="text-sm text-muted-foreground">Organizar produtos por categorias</p>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" /> Nova Categoria</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nova Categoria</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome *</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Acessórios" />
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição opcional" />
                  </div>
                  <Button onClick={handleCreate} disabled={!name.trim() || createCategory.isPending} className="w-full">
                    Criar Categoria
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">A carregar...</TableCell></TableRow>
                ) : categories.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Sem categorias</TableCell></TableRow>
                ) : categories.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground font-mono">{cat.slug}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{cat.description || "—"}</TableCell>
                    <TableCell>
                      <Switch checked={cat.is_active} onCheckedChange={(v) => toggleCategory.mutate({ id: cat.id, is_active: v })} />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteCategory.mutate(cat.id)}>
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
