import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Check, ExternalLink, Package, ChevronDown, ChevronUp, Sparkles, FileText, Image as ImageIcon, Globe } from "lucide-react";
import { useProductAIAssistant } from "@/hooks/useProductAIAssistant";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { PriceValidationIndicator } from "./PriceValidationIndicator";
import { CompareSourcesDialog } from "./CompareSourcesDialog";

interface SKUSearchPanelProps {
  sku: string;
  currentPrice?: number;
  onApplyName: (name: string) => void;
  onApplyPrice: (price: number) => void;
  onApplyDescription: (description: string) => void;
  onApplyCategory: (category: string) => void;
  onApplyImages?: (images: string[]) => void;
  onImagesFound?: (images: string[]) => void;
  onApplyAll: (data: {
    name?: string;
    price?: number;
    description?: string;
    category?: string;
    images?: string[];
  }) => void;
}

export function SKUSearchPanel({
  sku,
  currentPrice,
  onApplyName,
  onApplyPrice,
  onApplyDescription,
  onApplyCategory,
  onApplyImages,
  onImagesFound,
  onApplyAll,
}: SKUSearchPanelProps) {
  const [appliedItems, setAppliedItems] = useState<Set<string>>(new Set());
  const [specsOpen, setSpecsOpen] = useState(false);
  const [nameVersion, setNameVersion] = useState<"commercial" | "technical">("commercial");
  const [descVersion, setDescVersion] = useState<"commercial" | "technical">("commercial");
  const [compareOpen, setCompareOpen] = useState(false);
  const { searchBySKU } = useProductAIAssistant();

  // Notify parent when images are found
  useEffect(() => {
    if (searchBySKU.data?.images && searchBySKU.data.images.length > 0 && onImagesFound) {
      onImagesFound(searchBySKU.data.images);
    }
  }, [searchBySKU.data?.images, onImagesFound]);

  const handleSearch = () => {
    if (sku && sku.length >= 3) {
      searchBySKU.mutate(sku);
      setAppliedItems(new Set());
    }
  };

  const getCurrentName = () => {
    if (!searchBySKU.data) return "";
    return nameVersion === "commercial" 
      ? (searchBySKU.data.commercialName || searchBySKU.data.name || searchBySKU.data.technicalName)
      : (searchBySKU.data.technicalName || searchBySKU.data.name);
  };

  const getCurrentDescription = () => {
    if (!searchBySKU.data) return "";
    return descVersion === "commercial"
      ? (searchBySKU.data.commercialDescription || searchBySKU.data.description || searchBySKU.data.technicalDescription)
      : (searchBySKU.data.technicalDescription || searchBySKU.data.description);
  };

  const handleApplyName = () => {
    const name = getCurrentName();
    if (name) {
      onApplyName(name);
      setAppliedItems((prev) => new Set(prev).add("name"));
    }
  };

  const handleApplyPrice = () => {
    if (searchBySKU.data?.suggestedPrice) {
      onApplyPrice(searchBySKU.data.suggestedPrice);
      setAppliedItems((prev) => new Set(prev).add("price"));
    }
  };

  const handleApplyDescription = () => {
    const description = getCurrentDescription();
    if (description) {
      onApplyDescription(description);
      setAppliedItems((prev) => new Set(prev).add("description"));
    }
  };

  const handleApplyCategory = () => {
    if (searchBySKU.data?.category) {
      onApplyCategory(searchBySKU.data.category);
      setAppliedItems((prev) => new Set(prev).add("category"));
    }
  };

  const handleApplyImages = () => {
    if (searchBySKU.data?.images && onApplyImages) {
      onApplyImages(searchBySKU.data.images);
      setAppliedItems((prev) => new Set(prev).add("images"));
    }
  };

  const handleApplyAll = (version: "commercial" | "technical") => {
    if (searchBySKU.data) {
      const name = version === "commercial" 
        ? (searchBySKU.data.commercialName || searchBySKU.data.name)
        : (searchBySKU.data.technicalName || searchBySKU.data.name);
      const description = version === "commercial"
        ? (searchBySKU.data.commercialDescription || searchBySKU.data.description)
        : (searchBySKU.data.technicalDescription || searchBySKU.data.description);
      
      onApplyAll({
        name,
        price: searchBySKU.data.suggestedPrice,
        description,
        category: searchBySKU.data.category,
        images: searchBySKU.data.images,
      });
      setAppliedItems(new Set(["name", "price", "description", "category", "images"]));
    }
  };

  const hasSpecifications = searchBySKU.data?.specifications && 
    Object.values(searchBySKU.data.specifications).some(v => v);

  const hasImages = searchBySKU.data?.images && searchBySKU.data.images.length > 0;

  const hasBothVersions = searchBySKU.data?.commercialName && searchBySKU.data?.technicalName;

  if (!sku || sku.length < 3) {
    return (
      <Card className="p-4 bg-muted/30 border-dashed">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Search className="h-4 w-4" />
          <span className="text-sm">
            Insira um SKU/código para pesquisar na internet
          </span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Pesquisa SKU</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={handleSearch}
          disabled={searchBySKU.isPending}
        >
          {searchBySKU.isPending ? (
            <>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              A pesquisar...
            </>
          ) : (
            <>
              <Search className="h-3 w-3 mr-1" />
              Pesquisar
            </>
          )}
        </Button>
      </div>

      {searchBySKU.isPending ? (
        <div className="flex items-center gap-2 text-muted-foreground py-4 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">A pesquisar "{sku}"...</span>
        </div>
      ) : searchBySKU.data ? (
        searchBySKU.data.found ? (
          <div className="space-y-4">
            {/* Product Found Header */}
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="p-2 bg-primary/10 rounded">
                <Package className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    ✓ Encontrado
                  </Badge>
                  {hasBothVersions && (
                    <Badge variant="outline" className="text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />
                      2 versões
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-mono">{sku}</p>
                {searchBySKU.data.category && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Categoria: {searchBySKU.data.category}
                  </p>
                )}
              </div>
              {searchBySKU.data.priceRange && (searchBySKU.data.priceRange.min > 0 || searchBySKU.data.priceRange.max > 0) && (
                <div className="text-right space-y-1">
                  <p className="text-xs text-muted-foreground">Preço mercado</p>
                  <p className="font-semibold text-sm text-primary">
                    €{searchBySKU.data.priceRange.min} - €{searchBySKU.data.priceRange.max}
                  </p>
                  {currentPrice && currentPrice > 0 && (
                    <PriceValidationIndicator
                      currentPrice={currentPrice}
                      marketMin={searchBySKU.data.priceRange.min}
                      marketMax={searchBySKU.data.priceRange.max}
                      suggestedPrice={searchBySKU.data.suggestedPrice}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Images Gallery */}
            {hasImages && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ImageIcon className="h-3 w-3" />
                    <span>Imagens ({searchBySKU.data.images!.length})</span>
                  </div>
                  {onApplyImages && (
                    <Button
                      type="button"
                      variant={appliedItems.has("images") ? "secondary" : "outline"}
                      size="sm"
                      className="h-6 text-xs"
                      onClick={handleApplyImages}
                    >
                      {appliedItems.has("images") ? <Check className="h-3 w-3 mr-1" /> : <ImageIcon className="h-3 w-3 mr-1" />}
                      {appliedItems.has("images") ? "Adicionadas" : "Usar Imagens"}
                    </Button>
                  )}
                </div>
                <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                  <div className="flex w-max space-x-2 p-2">
                    {searchBySKU.data.images!.slice(0, 6).map((img, idx) => (
                      <a
                        key={idx}
                        href={img}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0"
                      >
                        <div className="h-16 w-16 rounded border bg-muted/50 overflow-hidden hover:border-primary transition-colors">
                          <img
                            src={img}
                            alt={`Produto ${idx + 1}`}
                            className="h-full w-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      </a>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>
            )}

            {/* Name Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FileText className="h-3 w-3" />
                  <span>Nome do Produto</span>
                </div>
                {hasBothVersions && (
                  <Tabs value={nameVersion} onValueChange={(v) => setNameVersion(v as typeof nameVersion)} className="h-6">
                    <TabsList className="h-6">
                      <TabsTrigger value="commercial" className="text-xs h-5 px-2">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Comercial
                      </TabsTrigger>
                      <TabsTrigger value="technical" className="text-xs h-5 px-2">
                        Técnico
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                )}
              </div>
              <div className="bg-muted/50 rounded p-3 text-sm">
                {getCurrentName()}
              </div>
              <Button
                type="button"
                variant={appliedItems.has("name") ? "secondary" : "outline"}
                size="sm"
                className="h-7 text-xs w-full"
                onClick={handleApplyName}
              >
                {appliedItems.has("name") ? <Check className="h-3 w-3 mr-1" /> : null}
                Usar Este Nome
              </Button>
            </div>

            {/* Description Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FileText className="h-3 w-3" />
                  <span>Descrição</span>
                </div>
                {hasBothVersions && (
                  <Tabs value={descVersion} onValueChange={(v) => setDescVersion(v as typeof descVersion)} className="h-6">
                    <TabsList className="h-6">
                      <TabsTrigger value="commercial" className="text-xs h-5 px-2">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Comercial
                      </TabsTrigger>
                      <TabsTrigger value="technical" className="text-xs h-5 px-2">
                        Técnico
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                )}
              </div>
              <div className="bg-muted/50 rounded p-3 text-sm whitespace-pre-line">
                {getCurrentDescription()}
              </div>
              <Button
                type="button"
                variant={appliedItems.has("description") ? "secondary" : "outline"}
                size="sm"
                className="h-7 text-xs w-full"
                onClick={handleApplyDescription}
              >
                {appliedItems.has("description") ? <Check className="h-3 w-3 mr-1" /> : null}
                Usar Esta Descrição
              </Button>
            </div>

            {/* Specifications Collapsible */}
            {hasSpecifications && (
              <Collapsible open={specsOpen} onOpenChange={setSpecsOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between h-8 text-xs">
                    <span className="flex items-center gap-2">
                      📊 Especificações Técnicas
                    </span>
                    {specsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="grid grid-cols-2 gap-2 text-xs bg-muted/50 rounded p-3">
                    {Object.entries(searchBySKU.data.specifications || {}).map(([key, value]) => 
                      value ? (
                        <div key={key} className="flex flex-col">
                          <span className="text-muted-foreground capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                          <span className="font-medium">{value}</span>
                        </div>
                      ) : null
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Sources + Compare Button */}
            <div className="flex items-center justify-between">
              {searchBySKU.data.sources && searchBySKU.data.sources.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs text-muted-foreground">Fontes:</span>
                  {searchBySKU.data.sources.slice(0, 3).map((src, idx) => (
                    <a
                      key={idx}
                      href={src}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline inline-flex items-center gap-0.5"
                    >
                      {new URL(src).hostname.replace('www.', '')}
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  ))}
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setCompareOpen(true)}
              >
                <Globe className="h-3 w-3 mr-1" />
                Comparar Fontes
              </Button>
            </div>

            {/* Apply All Buttons */}
            <div className="flex gap-2 pt-2 border-t">
              {hasBothVersions ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs"
                    onClick={() => handleApplyAll("technical")}
                  >
                    Usar Versão Técnica
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    className="flex-1 h-8 text-xs"
                    onClick={() => handleApplyAll("commercial")}
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    Usar Versão Comercial
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  className="w-full h-8 text-xs"
                  onClick={() => handleApplyAll("commercial")}
                >
                  Usar Tudo
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground py-4 text-center">
            Nenhum resultado encontrado para "{sku}"
          </div>
        )
      ) : searchBySKU.isError ? (
        <div className="text-sm text-destructive py-2">
          Erro na pesquisa. Tente novamente.
        </div>
      ) : null}

      {/* Compare Sources Dialog */}
      <CompareSourcesDialog
        open={compareOpen}
        onOpenChange={setCompareOpen}
        initialSku={sku}
      />
    </Card>
  );
}