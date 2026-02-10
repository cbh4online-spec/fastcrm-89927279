import { useState, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAdminStoreCategories, useCreateStoreCategory, useToggleStoreCategory, useDeleteStoreCategory } from "@/hooks/useAdminStoreCategories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FolderOpen, Plus, Trash2, ImagePlus, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function StoreCategoriesPage() {
  const { data: categories = [], isLoading } = useAdminStoreCategories();
  const createCategory = useCreateStoreCategory();
  const toggleCategory = useToggleStoreCategory();
  const deleteCategory = useDeleteStoreCategory();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null);

  const handleCreate = () => {
    if (!name.trim()) return;
    const slug = name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    createCategory.mutate({ name: name.trim(), slug, description: description.trim() || undefined }, {
      onSuccess: () => { setOpen(false); setName(""); setDescription(""); },
    });
  };

  const handleImageUpload = async (categoryId: string, file: File) => {
    setUploading(categoryId);
    try {
      const ext = file.name.split(".").pop();
      const path = `${categoryId}.${ext}`;

      // Remove old image if exists
      await supabase.storage.from("store-category-images").remove([path]);

      const { error: uploadError } = await supabase.storage
        .from("store-category-images")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("store-category-images")
        .getPublicUrl(path);

      const imageUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("store_categories")
        .update({ image_url: imageUrl })
        .eq("id", categoryId);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ["admin-store-categories"] });
      queryClient.invalidateQueries({ queryKey: ["store-categories-db"] });
      toast.success("Imagem atualizada");
    } catch (e: any) {
      toast.error("Erro ao carregar imagem: " + e.message);
    } finally {
      setUploading(null);
      setUploadTargetId(null);
    }
  };

  const handleRemoveImage = async (categoryId: string, imageUrl: string) => {
    setUploading(categoryId);
    try {
      // Extract path from URL
      const urlParts = imageUrl.split("/store-category-images/");
      if (urlParts[1]) {
        const filePath = urlParts[1].split("?")[0];
        await supabase.storage.from("store-category-images").remove([filePath]);
      }

      const { error } = await supabase
        .from("store_categories")
        .update({ image_url: null })
        .eq("id", categoryId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["admin-store-categories"] });
      queryClient.invalidateQueries({ queryKey: ["store-categories-db"] });
      toast.success("Imagem removida");
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setUploading(null);
    }
  };

  return (
    <>
      <Helmet><title>Categorias da Loja | FastCRM</title></Helmet>
      <DashboardLayout>
        <main className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2"><FolderOpen className="h-6 w-6" /> Categorias da Loja</h1>
              <p className="text-sm text-muted-foreground">Organizar produtos por categorias com imagens visuais</p>
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

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && uploadTargetId) {
                handleImageUpload(uploadTargetId, file);
              }
              e.target.value = "";
            }}
          />

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Imagem</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">A carregar...</TableCell></TableRow>
                ) : categories.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Sem categorias</TableCell></TableRow>
                ) : categories.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell>
                      <div className="relative group">
                        {uploading === cat.id ? (
                          <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          </div>
                        ) : cat.image_url ? (
                          <div className="relative w-14 h-14 rounded-lg overflow-hidden">
                            <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                              <button
                                onClick={() => {
                                  setUploadTargetId(cat.id);
                                  fileInputRef.current?.click();
                                }}
                                className="p-1 rounded bg-white/20 hover:bg-white/30 transition-colors"
                              >
                                <ImagePlus className="h-3.5 w-3.5 text-white" />
                              </button>
                              <button
                                onClick={() => handleRemoveImage(cat.id, cat.image_url!)}
                                className="p-1 rounded bg-white/20 hover:bg-white/30 transition-colors"
                              >
                                <X className="h-3.5 w-3.5 text-white" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setUploadTargetId(cat.id);
                              fileInputRef.current?.click();
                            }}
                            className="w-14 h-14 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary/50 hover:bg-muted/50 transition-colors"
                          >
                            <ImagePlus className="h-5 w-5 text-muted-foreground/50" />
                          </button>
                        )}
                      </div>
                    </TableCell>
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