import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProductAIAssistant } from "@/hooks/useProductAIAssistant";
import { Search, Loader2, PackageCheck, ArrowRight, SkipForward, ImageIcon, Tag, DollarSign, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface SKUSearchResult {
  found: boolean;
  technicalName?: string;
  technicalDescription?: string;
  commercialName?: string;
  commercialDescription?: string;
  name?: string;
  description?: string;
  priceRange?: { min: number; max: number };
  suggestedPrice?: number;
  category?: string;
  imageUrl?: string;
  images?: string[];
  source?: string;
  sources?: string[];
  specifications?: Record<string, string | undefined>;
}

interface MQPCStepSKUProps {
  onSKUResult: (result: SKUSearchResult, sku: string) => void;
  onSkip: () => void;
}

export function MQPCStepSKU({ onSKUResult, onSkip }: MQPCStepSKUProps) {
  const { searchBySKU } = useProductAIAssistant();
  const [skuInput, setSkuInput] = useState("");
  const [searchResult, setSearchResult] = useState<SKUSearchResult | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    const sku = skuInput.trim();
    if (!sku) {
      toast.error("Introduza um SKU ou referência");
      return;
    }

    try {
      const result = await searchBySKU.mutateAsync(sku);
      setSearchResult(result);
      setSearched(true);
    } catch (err: any) {
      toast.error("Erro na pesquisa: " + err.message);
      setSearched(true);
      setSearchResult({ found: false });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !searchBySKU.isPending) {
      handleSearch();
    }
  };

  const displayName = searchResult?.commercialName || searchResult?.name || "";
  const displayPrice = searchResult?.suggestedPrice;
  const imageCount = searchResult?.images?.length || (searchResult?.imageUrl ? 1 : 0);

  return (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <h2 className="text-lg font-semibold">SKU / Referência</h2>
        <p className="text-sm text-muted-foreground">
          Introduza o SKU para preencher automaticamente com IA
        </p>
      </div>

      {/* Search input */}
      <div className="flex gap-2">
        <Input
          placeholder="Ex: DS-2CD2143G2-I"
          value={skuInput}
          onChange={(e) => setSkuInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={searchBySKU.isPending}
          autoFocus
          className="flex-1"
        />
        <Button
          onClick={handleSearch}
          disabled={searchBySKU.isPending || !skuInput.trim()}
          size="icon"
          className="shrink-0 h-10 w-10"
        >
          {searchBySKU.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Loading state */}
      {searchBySKU.isPending && (
        <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">A pesquisar informações do produto...</p>
        </div>
      )}

      {/* Result found */}
      {searched && searchResult?.found && !searchBySKU.isPending && (
        <div className="space-y-4">
          <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <PackageCheck className="h-4 w-4" />
              <span className="text-sm font-medium">Produto encontrado</span>
            </div>

            {displayName && (
              <div className="flex items-start gap-2">
                <Tag className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <p className="text-sm font-medium">{displayName}</p>
              </div>
            )}

            {displayPrice != null && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="text-sm">Preço sugerido: <span className="font-semibold">{displayPrice.toFixed(2)}€</span></p>
              </div>
            )}

            {searchResult.category && (
              <p className="text-xs text-muted-foreground">Categoria: {searchResult.category}</p>
            )}

            {imageCount > 0 && (
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="text-xs text-muted-foreground">{imageCount} imagem(ns) encontrada(s)</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Button
              onClick={() => onSKUResult(searchResult, skuInput.trim())}
              className="w-full h-12 text-base gap-2"
            >
              <PackageCheck className="h-5 w-5" />
              Usar estes dados
            </Button>
            <Button
              variant="ghost"
              onClick={onSkip}
              className="w-full text-muted-foreground"
            >
              Ignorar e continuar manualmente
            </Button>
          </div>
        </div>
      )}

      {/* Not found */}
      {searched && !searchResult?.found && !searchBySKU.isPending && (
        <div className="space-y-4">
          <div className="rounded-xl border border-dashed p-4 text-center space-y-2">
            <AlertCircle className="h-6 w-6 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Não foram encontrados dados para este SKU
            </p>
          </div>
          <Button
            onClick={onSkip}
            className="w-full h-12 text-base gap-2"
          >
            Continuar manualmente
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Skip button (always visible when no result shown) */}
      {!searched && !searchBySKU.isPending && (
        <Button
          variant="ghost"
          onClick={onSkip}
          className="w-full text-muted-foreground gap-2"
        >
          <SkipForward className="h-4 w-4" />
          Não tenho SKU, continuar manualmente
        </Button>
      )}
    </div>
  );
}

export type { SKUSearchResult };
