import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Upload, Search, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  type LeadChefProductRow,
  useUpsertLeadChefProduct,
} from "@/hooks/leadchef/useLeadChefProducts";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workspaceId: string | undefined;
  product?: LeadChefProductRow | null;
}

const BUCKET = "leadchef-products";

export function LeadChefProductDialog({ open, onOpenChange, workspaceId, product }: Props) {
  const upsert = useUpsertLeadChefProduct(workspaceId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [points, setPoints] = useState<string>("0");
  const [price, setPrice] = useState<string>("0");
  const [promo, setPromo] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState<string>("0");
  const [category, setCategory] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{ url: string; thumb: string }[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setName(product?.name ?? "");
      setPoints(String(product?.points ?? 0));
      setPrice(String(product?.price ?? 0));
      setPromo(product?.promo ?? false);
      setIsActive(product?.is_active ?? true);
      setSortOrder(String(product?.sort_order ?? 0));
      setCategory(product?.category ?? "");
      setImageUrl(product?.image_url ?? "");
      setSearchQuery(product?.name ?? "");
      setSearchResults([]);
      setSearchOpen(false);
    }
  }, [open, product]);

  const handleUpload = async (file: File) => {
    if (!workspaceId) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Ficheiro deve ser uma imagem.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem demasiado grande (máx 5MB).");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${workspaceId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      setImageUrl(data.publicUrl);
      toast.success("Imagem carregada");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao carregar imagem");
    } finally {
      setUploading(false);
    }
  };

  const runSearch = async () => {
    const q = (searchQuery || name).trim();
    if (!q) {
      toast.info("Escreve um termo para pesquisar.");
      return;
    }
    setSearching(true);
    setSearchOpen(true);
    try {
      const { data, error } = await supabase.functions.invoke("leadchef-image-search", {
        body: { query: q },
      });
      if (error) throw error;
      const imgs = (data?.images ?? []) as { url: string; thumb: string }[];
      setSearchResults(imgs);
      if (imgs.length === 0) toast.info("Sem resultados. Tenta outro termo.");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro na pesquisa");
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const submit = async () => {
    if (!name.trim()) return;
    await upsert.mutateAsync({
      id: product?.id,
      name,
      points: Number(points) || 0,
      price: Number(price) || 0,
      promo,
      is_active: isActive,
      sort_order: Number(sortOrder) || 0,
      category: category || null,
      image_url: imageUrl || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "Editar produto" : "Novo produto"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Imagem</Label>
            <div className="mt-1 flex items-start gap-3">
              <div className="h-20 w-20 shrink-0 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden relative">
                {imageUrl ? (
                  <>
                    <img
                      src={imageUrl}
                      alt="Pré-visualização"
                      className="h-full w-full object-cover"
                      onError={() => toast.error("URL de imagem inválido")}
                    />
                    <button
                      type="button"
                      onClick={() => setImageUrl("")}
                      className="absolute top-0.5 right-0.5 rounded-full bg-black/60 text-white p-0.5"
                      aria-label="Remover imagem"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </>
                ) : (
                  <ImageIcon className="h-6 w-6 text-slate-300" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-1" />
                    )}
                    Carregar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={searchOnline}
                  >
                    <Search className="h-4 w-4 mr-1" />
                    Pesquisar
                  </Button>
                </div>
                <Input
                  placeholder="ou cola URL da imagem"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="text-xs"
                />
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="p-name">Nome</Label>
            <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="p-pts">Pontos</Label>
              <Input id="p-pts" type="number" min={0} value={points} onChange={(e) => setPoints(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="p-price">Preço (€)</Label>
              <Input id="p-price" type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="p-cat">Categoria (opcional)</Label>
            <Input id="p-cat" value={category} onChange={(e) => setCategory(e.target.value)} maxLength={60} />
          </div>
          <div>
            <Label htmlFor="p-sort">Ordem</Label>
            <Input id="p-sort" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Promoção</p>
              <p className="text-xs text-muted-foreground">Marca o produto como promo.</p>
            </div>
            <Switch checked={promo} onCheckedChange={setPromo} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Ativo</p>
              <p className="text-xs text-muted-foreground">Mostrar na lista de consulta.</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={upsert.isPending || !name.trim()}>
            {upsert.isPending ? "A guardar…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
