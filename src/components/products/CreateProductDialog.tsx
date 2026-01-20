import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Package, ChevronDown, ChevronRight, TrendingUp, Percent, Layers, Info, BarChart3, Sparkles, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useCreateProduct, useUpdateProduct } from "@/hooks/useProducts";
import type { Product, ProductType, BillingType, ConsumptionModel, RecommendedFrequency } from "@/types/product";
import { consumptionModelLabels, recommendedFrequencyLabels } from "@/types/product";
import { AIProductAssistant } from "./AIProductAssistant";
import { SKUSearchPanel } from "./SKUSearchPanel";
import { ProductImageGenerator } from "./ProductImageGenerator";
import { ProductImageGalleryManager } from "./ProductImageGalleryManager";
import { ProductSpecificationsEditor } from "./ProductSpecificationsEditor";
import { ProductVideoSearch } from "./ProductVideoSearch";
import { ProductImage360Viewer } from "./ProductImage360Viewer";
import { useProductCategoriesList } from "@/hooks/useProductCategories";

const DRAFT_STORAGE_KEY = "product-form-draft";

interface ProductFormDraft {
  name: string;
  productType: ProductType;
  category: string;
  basePrice: string;
  currency: string;
  billingType: BillingType;
  shortDescription: string;
  sku: string;
  directCost: string;
  operationalCost: string;
  commissionDefault: string;
  taxRateEstimate: string;
  targetMargin: string;
  bundlePriceMode: "auto" | "manual";
  consumptionModel: ConsumptionModel;
  includedQuantity: string;
  recommendedFrequency: RecommendedFrequency | "";
  typicalDurationDays: string;
  isTrackable: boolean;
  productImages: string[];
  savedAt: number;
}

interface CreateProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product;
}

export function CreateProductDialog({
  open,
  onOpenChange,
  product,
}: CreateProductDialogProps) {
  const [name, setName] = useState("");
  const [productType, setProductType] = useState<ProductType>("simple");
  const [category, setCategory] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [billingType, setBillingType] = useState<BillingType>("one-off");
  const [shortDescription, setShortDescription] = useState("");
  const [sku, setSku] = useState("");
  const [directCost, setDirectCost] = useState("");
  const [operationalCost, setOperationalCost] = useState("");
  const [commissionDefault, setCommissionDefault] = useState("");
  const [taxRateEstimate, setTaxRateEstimate] = useState("");
  const [targetMargin, setTargetMargin] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [bundlePriceMode, setBundlePriceMode] = useState<"auto" | "manual">("auto");
  // Consumption model fields
  const [consumptionModel, setConsumptionModel] = useState<ConsumptionModel>("units");
  const [includedQuantity, setIncludedQuantity] = useState("");
  const [recommendedFrequency, setRecommendedFrequency] = useState<RecommendedFrequency | "">("");
  const [typicalDurationDays, setTypicalDurationDays] = useState("");
  const [isTrackable, setIsTrackable] = useState(true);
  const [showConsumption, setShowConsumption] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(true);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [skuFoundImages, setSkuFoundImages] = useState<string[]>([]);
  const [specifications, setSpecifications] = useState<Record<string, string>>({});
  const [suggestedSpecs, setSuggestedSpecs] = useState<Record<string, string>>({});
  const [isSpecsAutoFilled, setIsSpecsAutoFilled] = useState(false);
  const [demoVideoUrl, setDemoVideoUrl] = useState("");
  const [hasDraft, setHasDraft] = useState(false);

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const { data: existingCategories } = useProductCategoriesList();

  const isEditing = !!product;
  const isLoading = createProduct.isPending || updateProduct.isPending;
  const isBundle = productType === "composite";

  // Calculate margins in real-time
  const price = parseFloat(basePrice) || 0;
  const cost = parseFloat(directCost) || 0;
  const opCost = parseFloat(operationalCost) || 0;
  const grossMargin = price - cost;
  const grossMarginPct = price > 0 ? (grossMargin / price) * 100 : 0;
  const contributionMargin = price - cost - opCost;
  const contributionMarginPct = price > 0 ? (contributionMargin / price) * 100 : 0;

  // Save draft to sessionStorage whenever form changes (only for new products)
  const saveDraft = useCallback(() => {
    if (isEditing) return;
    
    const hasContent = name || sku || basePrice || shortDescription || category;
    if (!hasContent) return;
    
    const draft: ProductFormDraft = {
      name,
      productType,
      category,
      basePrice,
      currency,
      billingType,
      shortDescription,
      sku,
      directCost,
      operationalCost,
      commissionDefault,
      taxRateEstimate,
      targetMargin,
      bundlePriceMode,
      consumptionModel,
      includedQuantity,
      recommendedFrequency,
      typicalDurationDays,
      isTrackable,
      productImages,
      savedAt: Date.now(),
    };
    
    sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  }, [
    isEditing, name, productType, category, basePrice, currency, billingType,
    shortDescription, sku, directCost, operationalCost, commissionDefault,
    taxRateEstimate, targetMargin, bundlePriceMode, consumptionModel,
    includedQuantity, recommendedFrequency, typicalDurationDays, isTrackable, productImages
  ]);

  // Load draft or product data on open
  useEffect(() => {
    if (!open) return;
    
    if (product) {
      setName(product.name);
      setProductType(product.product_type);
      setCategory(product.category || "");
      setBasePrice(product.base_price.toString());
      setCurrency(product.currency);
      setBillingType(product.billing_type);
      setShortDescription(product.short_description || "");
      setSku(product.sku || "");
      setDirectCost(product.direct_cost?.toString() || "");
      setOperationalCost(product.operational_cost?.toString() || "");
      setCommissionDefault(product.commission_default?.toString() || "");
      setTaxRateEstimate(product.tax_rate_estimate_pct?.toString() || "");
      setTargetMargin(product.target_margin_pct?.toString() || "");
      setBundlePriceMode((product.bundle_price_mode as "auto" | "manual") || "auto");
      setShowAdvanced(
        !!product.direct_cost ||
          !!product.operational_cost ||
          !!product.commission_default ||
          !!product.tax_rate_estimate_pct ||
          !!product.target_margin_pct
      );
      // Consumption model fields
      setConsumptionModel(product.consumption_model || "units");
      setIncludedQuantity(product.included_quantity?.toString() || "");
      setRecommendedFrequency(product.recommended_frequency || "");
      setTypicalDurationDays(product.typical_duration_days?.toString() || "");
      setIsTrackable(product.is_trackable ?? true);
      setShowConsumption(
        !!product.consumption_model ||
          !!product.included_quantity ||
          !!product.recommended_frequency ||
          !!product.typical_duration_days
      );
      // Technical specifications
      setSpecifications(product.specifications || {});
      setIsSpecsAutoFilled(false);
      // Demo video
      setDemoVideoUrl(product.demo_video_url || "");
      setHasDraft(false);
    } else {
      // Try to load draft
      const savedDraft = sessionStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        try {
          const draft: ProductFormDraft = JSON.parse(savedDraft);
          // Only restore if saved within last 30 minutes
          if (Date.now() - draft.savedAt < 30 * 60 * 1000) {
            setName(draft.name);
            setProductType(draft.productType);
            setCategory(draft.category);
            setBasePrice(draft.basePrice);
            setCurrency(draft.currency);
            setBillingType(draft.billingType);
            setShortDescription(draft.shortDescription);
            setSku(draft.sku);
            setDirectCost(draft.directCost);
            setOperationalCost(draft.operationalCost);
            setCommissionDefault(draft.commissionDefault);
            setTaxRateEstimate(draft.taxRateEstimate);
            setTargetMargin(draft.targetMargin);
            setBundlePriceMode(draft.bundlePriceMode);
            setConsumptionModel(draft.consumptionModel);
            setIncludedQuantity(draft.includedQuantity);
            setRecommendedFrequency(draft.recommendedFrequency);
            setTypicalDurationDays(draft.typicalDurationDays);
            setIsTrackable(draft.isTrackable);
            setProductImages(draft.productImages || []);
            setHasDraft(true);
            return;
          }
        } catch {
          // Invalid draft, ignore
        }
      }
      // No valid draft, reset form
      resetForm();
      setHasDraft(false);
    }
  }, [product, open]);

  // Auto-save draft on changes (debounced via effect cleanup)
  useEffect(() => {
    if (!open || isEditing) return;
    const timeout = setTimeout(saveDraft, 500);
    return () => clearTimeout(timeout);
  }, [open, saveDraft, isEditing]);

  const clearDraft = () => {
    sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    setHasDraft(false);
    resetForm();
  };

  const resetForm = () => {
    setName("");
    setProductType("simple");
    setCategory("");
    setBasePrice("");
    setCurrency("EUR");
    setBillingType("one-off");
    setShortDescription("");
    setSku("");
    setDirectCost("");
    setOperationalCost("");
    setCommissionDefault("");
    setTaxRateEstimate("");
    setTargetMargin("");
    setShowAdvanced(false);
    setBundlePriceMode("auto");
    // Reset consumption fields
    setConsumptionModel("units");
    setIncludedQuantity("");
    setRecommendedFrequency("");
    setTypicalDurationDays("");
    setIsTrackable(true);
    setShowConsumption(false);
    setProductImages([]);
    setSkuFoundImages([]);
    setSpecifications({});
    setDemoVideoUrl("");
    setIsSpecsAutoFilled(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data: any = {
      name,
      product_type: productType,
      category: category || undefined,
      base_price: parseFloat(basePrice) || 0,
      currency,
      billing_type: billingType,
      short_description: shortDescription || undefined,
      sku: sku || undefined,
      images: productImages.length > 0 ? productImages : undefined,
      specifications: Object.keys(specifications).length > 0 ? specifications : undefined,
      demo_video_url: demoVideoUrl || undefined,
      direct_cost: directCost ? parseFloat(directCost) : undefined,
      operational_cost: operationalCost ? parseFloat(operationalCost) : undefined,
      commission_default: commissionDefault ? parseFloat(commissionDefault) : undefined,
      tax_rate_estimate_pct: taxRateEstimate ? parseFloat(taxRateEstimate) : undefined,
      target_margin_pct: targetMargin ? parseFloat(targetMargin) : undefined,
    };

    // Bundle specific fields
    if (productType === "composite") {
      data.bundle_price_mode = bundlePriceMode;
    }

    // Consumption model fields
    data.consumption_model = consumptionModel;
    data.included_quantity = includedQuantity ? parseInt(includedQuantity) : undefined;
    data.recommended_frequency = recommendedFrequency || undefined;
    data.typical_duration_days = typicalDurationDays ? parseInt(typicalDurationDays) : undefined;
    data.is_trackable = isTrackable;

    if (isEditing) {
      await updateProduct.mutateAsync({ id: product.id, ...data });
    } else {
      await createProduct.mutateAsync(data);
    }

    // Clear draft after successful save
    sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    setHasDraft(false);
    onOpenChange(false);
  };

  // For bundles in auto mode, price is optional (calculated from components)
  const isValid = name.trim() && (isBundle && bundlePriceMode === "auto" ? true : parseFloat(basePrice) >= 0);

  const getMarginColor = (pct: number) => {
    if (pct < 0) return "text-destructive";
    if (pct >= 30) return "text-green-600";
    if (pct >= 15) return "text-yellow-600";
    return "text-destructive";
  };

  // AI Assistant handlers
  const handleApplyCategory = (cat: string) => setCategory(cat);
  const handleApplyPrice = (price: number) => setBasePrice(price.toString());
  const handleApplyDescription = (desc: string) => setShortDescription(desc);
  const handleApplyProductType = (type: ProductType) => setProductType(type);
  const handleApplyName = (newName: string) => setName(newName);
  const handleApplySpecifications = (specs: Record<string, string>) => {
    // Separate specs that have values vs empty ones
    const filledSpecs: Record<string, string> = {};
    const emptySpecs: Record<string, string> = {};
    
    Object.entries(specs).forEach(([key, value]) => {
      if (value) {
        filledSpecs[key] = value;
      } else {
        emptySpecs[key] = value;
      }
    });
    
    // Apply filled specs directly
    setSpecifications(prev => ({ ...prev, ...filledSpecs }));
    
    // Store any additional found specs as suggestions (for specs not yet in specifications)
    setSuggestedSpecs(prev => {
      const newSuggested = { ...prev };
      Object.entries(filledSpecs).forEach(([key, value]) => {
        // Only suggest if not already in specifications
        if (!specifications[key]) {
          newSuggested[key] = value;
        }
      });
      return newSuggested;
    });
    
    setIsSpecsAutoFilled(true);
  };
  const handleApplyAll = (data: { name?: string; price?: number; description?: string; category?: string; images?: string[]; specifications?: Record<string, string> }) => {
    if (data.name) setName(data.name);
    if (data.price) setBasePrice(data.price.toString());
    if (data.description) setShortDescription(data.description);
    if (data.category) setCategory(data.category);
    if (data.images && data.images.length > 0) {
      // Store found images for gallery selection
      setSkuFoundImages(prev => {
        const allImages = [...prev, ...data.images!];
        return [...new Set(allImages)];
      });
    }
    if (data.specifications && Object.keys(data.specifications).length > 0) {
      // Apply specs and also set as suggestions for the editor
      handleApplySpecifications(data.specifications);
    }
  };

  const handleApplyImages = (images: string[]) => {
    // Store found images for gallery selection
    setSkuFoundImages(prev => {
      const allImages = [...prev, ...images];
      return [...new Set(allImages)];
    });
  };

  const handleSkuImagesFound = (images: string[]) => {
    // Store SKU found images without auto-applying
    setSkuFoundImages(images);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              {isBundle ? (
                <Layers className="h-5 w-5 text-primary" />
              ) : (
                <Package className="h-5 w-5" />
              )}
              {isEditing ? "Editar Produto" : "Criar Produto"}
            </DialogTitle>
            {hasDraft && !isEditing && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-destructive"
                onClick={clearDraft}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Limpar rascunho
              </Button>
            )}
          </div>
          {hasDraft && !isEditing && (
            <p className="text-xs text-muted-foreground mt-1">
              📝 Rascunho restaurado automaticamente
            </p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form - Left Side */}
            <div className="lg:col-span-2 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome do produto"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={productType} onValueChange={(v) => setProductType(v as ProductType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="simple">Simples</SelectItem>
                      <SelectItem value="formacao">Formação</SelectItem>
                      <SelectItem value="sessions">Sessões</SelectItem>
                      <SelectItem value="physical">Produto Físico</SelectItem>
                      <SelectItem value="programa">
                        <span className="flex items-center gap-2">
                          <Layers className="h-4 w-4" />
                          Programa / Pack
                        </span>
                      </SelectItem>
                      <SelectItem value="recurring">Recorrente</SelectItem>
                      <SelectItem value="composite">
                        <span className="flex items-center gap-2">
                          <Layers className="h-4 w-4" />
                          Bundle / Composto
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Cobrança</Label>
                  <Select value={billingType} onValueChange={(v) => setBillingType(v as BillingType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one-off">Único</SelectItem>
                      <SelectItem value="recurring">Recorrente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Bundle specific options */}
              {isBundle && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Bundles são compostos por outros produtos. Depois de criar, adicione componentes na aba "Componentes".
                  </AlertDescription>
                </Alert>
              )}

              {isBundle && (
                <div className="space-y-2">
                  <Label>Modo de Preço</Label>
                  <Select value={bundlePriceMode} onValueChange={(v) => setBundlePriceMode(v as "auto" | "manual")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Automático (soma dos componentes)</SelectItem>
                      <SelectItem value="manual">Manual (preço fixo)</SelectItem>
                    </SelectContent>
                  </Select>
                  {bundlePriceMode === "auto" && (
                    <p className="text-xs text-muted-foreground">
                      O preço será calculado automaticamente com base nos componentes.
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="basePrice">
                    {isBundle ? "Preço do Bundle" : "Preço Base"} {bundlePriceMode === "manual" || !isBundle ? "*" : ""}
                  </Label>
                  <Input
                    id="basePrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    placeholder={isBundle && bundlePriceMode === "auto" ? "Calculado automaticamente" : "0.00"}
                    disabled={isBundle && bundlePriceMode === "auto"}
                    required={!isBundle || bundlePriceMode === "manual"}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Moeda</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="BRL">BRL (R$)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Input
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="ex: Formação, Consultoria, Software"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição curta</Label>
                <Textarea
                  id="description"
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  placeholder="Breve descrição do produto"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku">Código interno (SKU)</Label>
                <Input
                  id="sku"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="Código EAN, referência, etc."
                />
              </div>

              {/* Product Images Gallery */}
              <ProductImageGalleryManager
                images={productImages}
                onImagesChange={setProductImages}
                skuImages={skuFoundImages}
                maxImages={10}
              />

              {/* Technical Specifications Editor */}
              <ProductSpecificationsEditor
                specifications={specifications}
                onChange={(specs) => {
                  setSpecifications(specs);
                  // Remove from suggested when added to specifications
                  const newSuggested = { ...suggestedSpecs };
                  Object.keys(specs).forEach(key => {
                    delete newSuggested[key];
                  });
                  setSuggestedSpecs(newSuggested);
                }}
                suggestedCategory={category}
                isAutoFilled={isSpecsAutoFilled}
                suggestedSpecs={suggestedSpecs}
              />

              {/* AI Image Generator */}
              <ProductImageGenerator
                productName={name}
                category={category}
                description={shortDescription}
                images={productImages}
                onImagesChange={setProductImages}
                maxImages={10}
              />

              {/* 360° Viewer - Only show if we have enough images */}
              {productImages.length >= 3 && (
                <ProductImage360Viewer
                  images={productImages}
                  productName={name}
                />
              )}

              {/* Video Search */}
              <ProductVideoSearch
                productName={name}
                sku={sku}
                videoUrl={demoVideoUrl}
                onVideoChange={setDemoVideoUrl}
              />

              <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                <CollapsibleTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" className="w-full justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Custos e Margens
                    </span>
                    {showAdvanced ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-4">
                  <p className="text-xs text-muted-foreground">
                    {isBundle
                      ? "Para bundles, os custos podem ser calculados automaticamente a partir dos componentes."
                      : "Define custos para calcular margens automaticamente."}
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="directCost">Custo Direto</Label>
                      <Input
                        id="directCost"
                        type="number"
                        min="0"
                        step="0.01"
                        value={directCost}
                        onChange={(e) => setDirectCost(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="operationalCost">Custo Operacional</Label>
                      <Input
                        id="operationalCost"
                        type="number"
                        min="0"
                        step="0.01"
                        value={operationalCost}
                        onChange={(e) => setOperationalCost(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="commission">Comissão (%)</Label>
                      <Input
                        id="commission"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={commissionDefault}
                        onChange={(e) => setCommissionDefault(e.target.value)}
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="taxRate">Imposto (%)</Label>
                      <Input
                        id="taxRate"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={taxRateEstimate}
                        onChange={(e) => setTaxRateEstimate(e.target.value)}
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="targetMargin">Margem Alvo (%)</Label>
                      <Input
                        id="targetMargin"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={targetMargin}
                        onChange={(e) => setTargetMargin(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Real-time margin preview */}
                  {price > 0 && (cost > 0 || opCost > 0) && (
                    <Card className="p-4 bg-muted/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Percent className="h-4 w-4" />
                        <span className="text-sm font-medium">Margens calculadas</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Margem Bruta</p>
                          <p className={`font-semibold ${getMarginColor(grossMarginPct)}`}>
                            {new Intl.NumberFormat("pt-PT", {
                              style: "currency",
                              currency,
                            }).format(grossMargin)}{" "}
                            ({grossMarginPct.toFixed(1)}%)
                          </p>
                        </div>
                        {opCost > 0 && (
                          <div>
                            <p className="text-muted-foreground">Margem Contribuição</p>
                            <p className={`font-semibold ${getMarginColor(contributionMarginPct)}`}>
                              {new Intl.NumberFormat("pt-PT", {
                                style: "currency",
                                currency,
                              }).format(contributionMargin)}{" "}
                              ({contributionMarginPct.toFixed(1)}%)
                            </p>
                          </div>
                        )}
                      </div>
                    </Card>
                  )}
                </CollapsibleContent>
              </Collapsible>

              {/* Consumption Model Section */}
              <Collapsible open={showConsumption} onOpenChange={setShowConsumption}>
                <CollapsibleTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" className="w-full justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Modelo de Consumo
                    </span>
                    {showConsumption ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-4">
                  <p className="text-xs text-muted-foreground">
                    Define como este produto é consumido. A IA usa estes dados para prever e sugerir ações.
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Modelo de Consumo</Label>
                      <Select value={consumptionModel} onValueChange={(v) => setConsumptionModel(v as ConsumptionModel)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sessions">{consumptionModelLabels.sessions}</SelectItem>
                          <SelectItem value="units">{consumptionModelLabels.units}</SelectItem>
                          <SelectItem value="time">{consumptionModelLabels.time}</SelectItem>
                          <SelectItem value="free">{consumptionModelLabels.free}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="includedQuantity">
                        {consumptionModel === "sessions" ? "Sessões Incluídas" : 
                         consumptionModel === "units" ? "Unidades Incluídas" : 
                         "Quantidade Incluída"}
                      </Label>
                      <Input
                        id="includedQuantity"
                        type="number"
                        min="0"
                        value={includedQuantity}
                        onChange={(e) => setIncludedQuantity(e.target.value)}
                        placeholder={consumptionModel === "free" ? "Ilimitado" : "ex: 10"}
                        disabled={consumptionModel === "free"}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Frequência Recomendada</Label>
                      <Select 
                        value={recommendedFrequency} 
                        onValueChange={(v) => setRecommendedFrequency(v as RecommendedFrequency)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">{recommendedFrequencyLabels.daily}</SelectItem>
                          <SelectItem value="weekly">{recommendedFrequencyLabels.weekly}</SelectItem>
                          <SelectItem value="biweekly">{recommendedFrequencyLabels.biweekly}</SelectItem>
                          <SelectItem value="monthly">{recommendedFrequencyLabels.monthly}</SelectItem>
                          <SelectItem value="quarterly">{recommendedFrequencyLabels.quarterly}</SelectItem>
                          <SelectItem value="yearly">{recommendedFrequencyLabels.yearly}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="typicalDuration">Duração Típica (dias)</Label>
                      <Input
                        id="typicalDuration"
                        type="number"
                        min="0"
                        value={typicalDurationDays}
                        onChange={(e) => setTypicalDurationDays(e.target.value)}
                        placeholder="ex: 30, 90, 365"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <div className="space-y-0.5">
                      <Label htmlFor="trackable">Rastreável</Label>
                      <p className="text-xs text-muted-foreground">
                        Permite acompanhar uso e consumo deste produto
                      </p>
                    </div>
                    <Switch
                      id="trackable"
                      checked={isTrackable}
                      onCheckedChange={setIsTrackable}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* AI Assistant Panel - Right Side */}
            <div className="space-y-4">
              <Collapsible open={showAIPanel} onOpenChange={setShowAIPanel}>
                <CollapsibleTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Assistente IA
                    </span>
                    {showAIPanel ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-2">
                  <AIProductAssistant
                    productName={name}
                    currentCategory={category}
                    currentProductType={productType}
                    existingCategories={existingCategories}
                    onApplyCategory={handleApplyCategory}
                    onApplyExistingCategory={(cat) => setCategory(cat.name)}
                    onApplyPrice={handleApplyPrice}
                    onApplyDescription={handleApplyDescription}
                    onApplyProductType={handleApplyProductType}
                  />
                  
                  <SKUSearchPanel
                    sku={sku}
                    currentPrice={parseFloat(basePrice) || undefined}
                    onApplyName={handleApplyName}
                    onApplyPrice={handleApplyPrice}
                    onApplyDescription={handleApplyDescription}
                    onApplyCategory={handleApplyCategory}
                    onApplyImages={handleApplyImages}
                    onImagesFound={handleSkuImagesFound}
                    onApplySpecifications={handleApplySpecifications}
                    onApplyAll={handleApplyAll}
                  />
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!isValid || isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? "Guardar" : "Criar Produto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}