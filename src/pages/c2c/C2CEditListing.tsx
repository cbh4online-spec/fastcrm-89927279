import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useC2CListingDetail, useUpdateC2CListing, useC2CCategories } from "@/hooks/useC2CListings";
import { useAnalyzePhoto, useGenerateTitle, useGenerateDescription, useSuggestPrice, useSuggestCategory, useGenerateListingImage, useGenerate360 } from "@/hooks/useC2CListingAI";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { ArrowLeft, ImagePlus, X, Sparkles, TrendingUp, Loader2, Wand2, Zap, Camera, Video, RotateCw, Save } from "lucide-react";
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
  const [photos360, setPhotos360] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
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
  const generateImage = useGenerateListingImage();
  const generate360 = useGenerate360();

  const isAnyAILoading = analyzePhoto.isPending || generateTitle.isPending || generateDescription.isPending || suggestPrice.isPending || suggestCategory.isPending || generateImage.isPending || generate360.isPending;

  useEffect(() => {
    if (listing) {
      setTitle(listing.title);
      setDescription(listing.description);
      setPrice(String(listing.price));
      setCondition(listing.condition);
      setCategoryId(listing.category_id || "");
      setLocation(listing.location || "");
      setPhotos(listing.photos || []);
      setPhotos360((listing as any).photos_360 || []);
      setVideos((listing as any).videos || []);
      if ((listing as any).cpc_is_active) {
        setCpcEnabled(true);
        setCpcBid(String((listing as any).cpc_bid || "0.10"));
        setCpcDailyBudget(String((listing as any).cpc_daily_budget || "5.00"));
      }
    }
  }, [listing]);

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

  const handlePhoto360Upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !workspaceId) return;
    setUploading(true);
    try {
      const newPhotos: string[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop();
        const path = `${workspaceId}/c2c/360/${crypto.randomUUID()}.${ext}`;
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
      setPhotos360((prev) => [...prev, ...newPhotos]);
    } catch {
      toast.error("Erro ao carregar fotos 360°");
    } finally {
      setUploading(false);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !workspaceId) return;
    setUploading(true);
    try {
      const newVideos: string[] = [];
      for (const file of Array.from(files)) {
        if (file.size > 50 * 1024 * 1024) {
          toast.error("Vídeo demasiado grande (máx 50MB)");
          continue;
        }
        const ext = file.name.split(".").pop();
        const path = `${workspaceId}/c2c/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("c2c-videos").upload(path, file);
        if (uploadError) {
          toast.error("Erro ao carregar vídeo");
          continue;
        }
        const { data: urlData } = supabase.storage.from("c2c-videos").getPublicUrl(path);
        newVideos.push(urlData.publicUrl);
      }
      setVideos((prev) => [...prev, ...newVideos]);
    } catch {
      toast.error("Erro ao carregar vídeo");
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateAIImages = () => {
    if (!title.trim()) {
      toast.error("Introduz um título primeiro para gerar imagens.");
      return;
    }
    generateImage.mutate(
      { title, description, condition, count: 3 },
      {
        onSuccess: (images) => {
          setPhotos((prev) => [...prev, ...images]);
          toast.success(`${images.length} imagem(ns) gerada(s) com IA!`);
        },
      }
    );
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
          toast.success("Anúncio atualizado com IA!");
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

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim() || !price || !id) {
      toast.error("Preenche título, descrição e preço.");
      return;
    }
    const updateData: any = {
      id,
      title: title.trim(),
      description: description.trim(),
      price: Number(price),
      condition: condition as any,
      category_id: categoryId || null,
      location: location || null,
      photos,
      photos_360: photos360,
      videos,
    };
    if (cpcEnabled) {
      updateData.cpc_bid = Number(cpcBid);
      updateData.cpc_daily_budget = Number(cpcDailyBudget);
      updateData.cpc_is_active = true;
    } else {
      updateData.cpc_is_active = false;
    }
    await updateListing.mutateAsync(updateData);
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

        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">Editar Anúncio</h1>
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
          {/* Media Section with Tabs */}
          <div>
            <Label className="mb-2 block">Media</Label>
            <Tabs defaultValue="photos" className="w-full">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="photos" className="gap-1.5">
                  <Camera className="h-3.5 w-3.5" />
                  Fotos {photos.length > 0 && `(${photos.length})`}
                </TabsTrigger>
                <TabsTrigger value="360" className="gap-1.5">
                  <RotateCw className="h-3.5 w-3.5" />
                  360° {photos360.length > 0 && `(${photos360.length})`}
                </TabsTrigger>
                <TabsTrigger value="video" className="gap-1.5">
                  <Video className="h-3.5 w-3.5" />
                  Vídeo {videos.length > 0 && `(${videos.length})`}
                </TabsTrigger>
              </TabsList>

              {/* Photos Tab */}
              <TabsContent value="photos" className="mt-3">
                <div className="flex flex-wrap gap-3">
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

                {analyzePhoto.isPending && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 animate-pulse">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm font-medium text-primary">A analisar a tua foto com IA...</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mt-3">
                  {photos.length > 0 && !analyzePhoto.isPending && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAnalyzeWithAI}
                      disabled={isAnyAILoading}
                      className="gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
                    >
                      <Wand2 className="h-4 w-4" />
                      Preencher tudo com IA
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateAIImages}
                    disabled={generateImage.isPending || !title.trim()}
                    className="gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
                  >
                    {generateImage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Gerar fotos com IA
                  </Button>
                </div>

                {generateImage.isPending && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 animate-pulse">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm font-medium text-primary">A gerar imagens com IA (pode demorar ~30s)...</span>
                  </div>
                )}
              </TabsContent>

              {/* 360° Tab */}
              <TabsContent value="360" className="mt-3">
                <p className="text-xs text-muted-foreground mb-3">
                  Gera automaticamente vistas 360° a partir de uma foto ou carrega manualmente.
                </p>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const refImage = photos[0];
                    if (!refImage) {
                      toast.error("Carrega pelo menos uma foto primeiro.");
                      return;
                    }
                    generate360.mutate(
                      { image: refImage, title, description },
                      {
                        onSuccess: (images) => {
                          setPhotos360(images);
                          toast.success(`${images.length} vistas 360° geradas com IA!`);
                        },
                      }
                    );
                  }}
                  disabled={generate360.isPending || !photos.length}
                  className="gap-1.5 border-primary/30 text-primary hover:bg-primary/5 mb-3"
                >
                  {generate360.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Gerar 360° com IA
                </Button>

                {generate360.isPending && (
                  <div className="mb-3 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 animate-pulse">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm font-medium text-primary">A gerar vistas 360° com IA (pode demorar ~30s)...</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  {photos360.map((photo, i) => (
                    <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border">
                      <img src={photo} alt="" className="w-full h-full object-cover" />
                      <div className="absolute bottom-0 left-0 right-0 bg-background/80 text-center">
                        <span className="text-[10px] font-medium">360°</span>
                      </div>
                      <button
                        onClick={() => setPhotos360(photos360.filter((_, idx) => idx !== i))}
                        className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <label className="w-24 h-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors gap-1">
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhoto360Upload} disabled={uploading} />
                    <RotateCw className="h-5 w-5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Manual</span>
                  </label>
                </div>
              </TabsContent>

              {/* Video Tab */}
              <TabsContent value="video" className="mt-3">
                <p className="text-xs text-muted-foreground mb-3">
                  Adiciona um vídeo curto do produto (máx 50MB).
                </p>
                <div className="flex flex-wrap gap-3">
                  {videos.map((video, i) => (
                    <div key={i} className="relative w-40 h-24 rounded-lg overflow-hidden border bg-muted">
                      <video src={video} className="w-full h-full object-cover" muted />
                      <button
                        onClick={() => setVideos(videos.filter((_, idx) => idx !== i))}
                        className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <div className="absolute bottom-1 left-1 bg-background/80 rounded px-1.5 py-0.5">
                        <span className="text-[10px] font-medium">Vídeo</span>
                      </div>
                    </div>
                  ))}
                  <label className="w-40 h-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors gap-1">
                    <input type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} disabled={uploading} />
                    <Video className="h-5 w-5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Adicionar vídeo</span>
                  </label>
                </div>
              </TabsContent>
            </Tabs>
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

          <Button className="w-full gap-2" size="lg" onClick={handleSubmit} disabled={updateListing.isPending}>
            {updateListing.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar Alterações
          </Button>
        </div>
      </div>
    </div>
  );
}
