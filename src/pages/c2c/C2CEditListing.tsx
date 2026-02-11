import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useC2CListingDetail, useUpdateC2CListing, useC2CCategories } from "@/hooks/useC2CListings";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { ArrowLeft, ImagePlus, X, Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function C2CEditListing() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const { data: listing, isLoading } = useC2CListingDetail(id);
  const { data: categories = [] } = useC2CCategories(workspaceId);
  const updateListing = useUpdateC2CListing();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState("used");
  const [categoryId, setCategoryId] = useState("");
  const [location, setLocation] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (listing) {
      setTitle(listing.title);
      setDescription(listing.description);
      setPrice(String(listing.price));
      setCondition(listing.condition);
      setCategoryId(listing.category_id || "");
      setLocation(listing.location || "");
      setPhotos(listing.photos || []);
    }
  }, [listing]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !workspaceId) return;
    setUploading(true);
    try {
      const newPhotos: string[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop();
        const path = `${workspaceId}/c2c/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("c2c-photos").upload(path, file);
        if (uploadError) {
          const reader = new FileReader();
          const dataUrl = await new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          newPhotos.push(dataUrl);
        } else {
          const { data: urlData } = supabase.storage.from("c2c-photos").getPublicUrl(path);
          newPhotos.push(urlData.publicUrl);
        }
      }
      setPhotos((prev) => [...prev, ...newPhotos]);
    } catch {
      toast.error("Erro ao carregar fotos");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim() || !price || !id) {
      toast.error("Preenche título, descrição e preço.");
      return;
    }
    await updateListing.mutateAsync({
      id,
      title: title.trim(),
      description: description.trim(),
      price: Number(price),
      condition: condition as any,
      category_id: categoryId || null,
      location: location || null,
      photos,
    });
    navigate("/dashboard/c2c/my-listings");
  };

  if (isLoading) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">A carregar...</div>;
  if (!listing) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Anúncio não encontrado</div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>

        <h1 className="text-2xl font-bold mb-6">Editar Anúncio</h1>

        <div className="space-y-5">
          {/* Photos */}
          <div>
            <Label>Fotos</Label>
            <div className="flex flex-wrap gap-3 mt-2">
              {photos.map((photo, i) => (
                <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border">
                  <img src={photo} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setPhotos(photos.filter((_, idx) => idx !== i))}
                    className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <label className="w-24 h-24 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
                <ImagePlus className="h-6 w-6 text-muted-foreground" />
              </label>
            </div>
          </div>

          <div>
            <Label htmlFor="title">Título *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
          </div>

          <div>
            <Label htmlFor="description">Descrição *</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className="mt-1" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Preço (€) *</Label>
              <Input id="price" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="mb-1 block">Condição</Label>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Novo</SelectItem>
                  <SelectItem value="like_new">Como novo</SelectItem>
                  <SelectItem value="used">Usado</SelectItem>
                  <SelectItem value="for_parts">Para peças</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Categoria</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="location">Localização</Label>
              <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1" />
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={updateListing.isPending} className="w-full gap-2" size="lg">
            {updateListing.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar Alterações
          </Button>
        </div>
      </div>
    </div>
  );
}
