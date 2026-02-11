import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateC2CListing, useC2CCategories } from "@/hooks/useC2CListings";
import { useAnalyzePhoto, useGenerateTitle, useGenerateDescription, useSuggestPrice, useSuggestCategory } from "@/hooks/useC2CListingAI";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { ArrowLeft, ImagePlus, X, Sparkles, TrendingUp, Loader2, Wand2, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function C2CCreateListing() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const { data: categories = [] } = useC2CCategories(workspaceId);
  const createListing = useCreateC2CListing(workspaceId);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState("used");
  const [categoryId, setCategoryId] = useState("");
  const [location, setLocation] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // CPC State
  const [cpcEnabled, setCpcEnabled] = useState(false);
  const [cpcBid, setCpcBid] = useState("0.10");
  const [cpcDailyBudget, setCpcDailyBudget] = useState("5.00");

  // Price suggestion state
  const [priceSuggestion, setPriceSuggestion] = useState<{
    min_price: number;
    max_price: number;
    suggested_price: number;
    price_assessment: string;
    reasoning: string;
  } | null>(null);

  // AI hooks
  const analyzePhoto = useAnalyzePhoto();
  const generateTitle = useGenerateTitle();
  const generateDescription = useGenerateDescription();
  const suggestPrice = useSuggestPrice();
  const suggestCategory = useSuggestCategory();

  const isAnyAILoading = analyzePhoto.isPending || generateTitle.isPending || generateDescription.isPending || suggestPrice.isPending || suggestCategory.isPending;

  // Progress calculation
  const progress = useMemo(() => {
    let score = 0;
    if (photos.length > 0) score += 25;
    if (title.trim().length >= 10) score += 25;
    if (description.trim().length >= 30) score += 25;
    if (price && Number(price) > 0) score += 25;
    return score;
  }, [photos, title, description, price]);

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

  const handleAnalyzeWithAI = async () => {
    const firstPhoto = photos[0];
    analyzePhoto.mutate(
      { image: firstPhoto, title: title || undefined, categories },
      {
        onSuccess: (data) => {
          if (data.title) setTitle(data.title);
          if (data.description) setDescription(data.description);
          if (data.suggested_price) setPrice(String(data.suggested_price));
          if (data.condition) setCondition(data.condition);
          if (data.category_id) setCategoryId(data.category_id);
          if (data.suggested_price_min && data.suggested_price_max) {
            setPriceSuggestion({
              min_price: data.suggested_price_min,
              max_price: data.suggested_price_max,
              suggested_price: data.suggested_price,
              price_assessment: "competitive",
              reasoning: "Baseado na análise IA do produto",
            });
          }
          toast.success("Anúncio preenchido com IA!");
        },
      }
    );
  };

  const handleGenerateTitle = () => {
    generateTitle.mutate(
      { title, description, condition },
      { onSuccess: (t) => { setTitle(t); toast.success("Título gerado!"); } }
    );
  };

  const handleGenerateDescription = () => {
    generateDescription.mutate(
      { title, description, condition, price: price ? Number(price) : undefined },
      { onSuccess: (d) => { setDescription(d); toast.success("Descrição gerada!"); } }
    );
  };

  const handleSuggestPrice = () => {
    suggestPrice.mutate(
      { title, description, condition, price: price ? Number(price) : undefined },
      { onSuccess: (data) => { setPriceSuggestion(data); setPrice(String(data.suggested_price)); toast.success("Preço sugerido!"); } }
    );
  };

  const handleSuggestCategory = () => {
    suggestCategory.mutate(
      { title, description, categories },
      { onSuccess: (catId) => { setCategoryId(catId); toast.success("Categoria sugerida!"); } }
    );
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim() || !price) {
      toast.error("Preenche título, descrição e preço.");
      return;
    }
    const listingData: any = {
      title: title.trim(),
      description: description.trim(),
      price: Number(price),
      currency: "EUR",
      condition: condition as any,
      category_id: categoryId || null,
      photos,
      location: location || null,
      status: "active",
    };
    if (cpcEnabled) {
      listingData.cpc_bid = Number(cpcBid);
      listingData.cpc_daily_budget = Number(cpcDailyBudget);
      listingData.cpc_is_active = true;
    }
    await createListing.mutateAsync(listingData);
    navigate("/dashboard/c2c");
  };

  const priceAssessmentLabel = (assessment: string) => {
    switch (assessment) {
      case "below_market": return { text: "Abaixo do mercado", color: "text-green-600 bg-green-50 border-green-200" };
      case "competitive": return { text: "Competitivo", color: "text-blue-600 bg-blue-50 border-blue-200" };
      case "above_market": return { text: "Acima do mercado", color: "text-orange-600 bg-orange-50 border-orange-200" };
      default: return { text: "", color: "" };
    }
  };

  const estimatedClicks = cpcBid && cpcDailyBudget && Number(cpcBid) > 0
    ? Math.floor(Number(cpcDailyBudget) / Number(cpcBid))
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>

        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">Criar Anúncio</h1>
          <Button
            variant="default"
            size="sm"
            onClick={handleAnalyzeWithAI}
            disabled={isAnyAILoading || (!photos.length && !title)}
            className="gap-1.5"
          >
            {analyzePhoto.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            Assistente IA
          </Button>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Completude do anúncio</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

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

          {/* Title */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="title">Título *</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGenerateTitle}
                disabled={generateTitle.isPending || (!title && !description)}
                className="h-7 px-2 gap-1 text-xs"
              >
                {generateTitle.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                Gerar com IA
              </Button>
            </div>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: iPhone 14 Pro Max 256GB" />
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="description">Descrição *</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGenerateDescription}
                disabled={generateDescription.isPending || !title}
                className="h-7 px-2 gap-1 text-xs"
              >
                {generateDescription.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                Gerar com IA
              </Button>
            </div>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descreve o produto em detalhe..." rows={5} />
          </div>

          {/* Price + Condition */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="price">Preço (€) *</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSuggestPrice}
                  disabled={suggestPrice.isPending || !title}
                  className="h-7 px-2 gap-1 text-xs"
                >
                  {suggestPrice.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <TrendingUp className="h-3 w-3" />}
                  Sugerir
                </Button>
              </div>
              <Input id="price" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
              {priceSuggestion && (
                <div className="mt-2 space-y-1">
                  <span className={`inline-block text-xs px-2 py-0.5 rounded-full border ${priceAssessmentLabel(priceSuggestion.price_assessment).color}`}>
                    {priceAssessmentLabel(priceSuggestion.price_assessment).text}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    Mercado: {priceSuggestion.min_price}€ - {priceSuggestion.max_price}€ • Sugerido: {priceSuggestion.suggested_price}€
                  </p>
                  <p className="text-xs text-muted-foreground">{priceSuggestion.reasoning}</p>
                </div>
              )}
            </div>
            <div>
              <Label className="mb-1 block">Condição</Label>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger>
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

          {/* Category + Location */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Categoria</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSuggestCategory}
                  disabled={suggestCategory.isPending || !title}
                  className="h-7 px-2 gap-1 text-xs"
                >
                  {suggestCategory.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  Auto
                </Button>
              </div>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
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
              <Label htmlFor="location" className="mb-1 block">Localização</Label>
              <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex: Lisboa" />
            </div>
          </div>

          {/* CPC Boost Section */}
          <div className="rounded-lg border p-4 space-y-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">Impulsionar Anúncio</p>
                  <p className="text-xs text-muted-foreground">Sistema de leilão CPC – paga por clique</p>
                </div>
              </div>
              <Switch checked={cpcEnabled} onCheckedChange={setCpcEnabled} />
            </div>

            {cpcEnabled && (
              <div className="space-y-3 pt-2 border-t">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="cpc-bid" className="text-xs">Lance por clique (€)</Label>
                    <Input
                      id="cpc-bid"
                      type="number"
                      min="0.05"
                      step="0.01"
                      value={cpcBid}
                      onChange={(e) => setCpcBid(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cpc-budget" className="text-xs">Orçamento diário (€)</Label>
                    <Input
                      id="cpc-budget"
                      type="number"
                      min="1"
                      step="0.50"
                      value={cpcDailyBudget}
                      onChange={(e) => setCpcDailyBudget(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
                {estimatedClicks > 0 && (
                  <p className="text-xs text-muted-foreground bg-primary/5 rounded-md p-2">
                    💡 Com {cpcBid}€/clique e {cpcDailyBudget}€/dia, estima-se ~<strong>{estimatedClicks} cliques/dia</strong>
                  </p>
                )}
              </div>
            )}
          </div>

          <Button className="w-full" size="lg" onClick={handleSubmit} disabled={createListing.isPending}>
            {createListing.isPending ? "A publicar..." : "Publicar Anúncio"}
          </Button>
        </div>
      </div>
    </div>
  );
}
