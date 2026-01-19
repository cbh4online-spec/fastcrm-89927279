import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { 
  Sparkles, 
  Globe, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Loader2,
  ArrowRight,
  MapPin,
  Star,
  Clock,
  Image,
  Building2,
  ChevronDown,
  ChevronRight,
  Store,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { useCompanyEnrichment, EnrichmentResult, EnrichmentField } from "@/hooks/useCompanyEnrichment";
import { useGooglePlacesEnrichment, GooglePlaceEnrichmentData, FIELD_CATEGORIES } from "@/hooks/useGooglePlacesEnrichment";
import { useWorkspaceModules } from "@/hooks/useWorkspaceModules";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { cn } from "@/lib/utils";

interface Company {
  id: string;
  name: string;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  industry?: string | null;
  size?: string | null;
  address?: string | null;
  city?: string | null;
  region?: string | null;
  postal_code?: string | null;
  linkedin_url?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  twitter_url?: string | null;
  notes?: string | null;
  google_place_id?: string | null;
  google_rating?: number | null;
  google_reviews_count?: number | null;
  google_maps_url?: string | null;
  google_photo_url?: string | null;
  opening_hours?: unknown | null;
  price_level?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  business_status?: string | null;
}

interface EnrichCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: Company;
  onEnrichmentApplied: (fields: Record<string, unknown>) => void;
}

interface FieldSuggestion {
  fieldKey: string;
  fieldLabel: string;
  currentValue: string | null | undefined;
  suggestedValue: unknown;
  confidence: "high" | "medium" | "low";
  source: string;
  isCritical: boolean;
  selected: boolean;
  category?: string;
  dbKey?: string;
}

type EnrichmentSource = "google" | "website" | "ai";

const FIELD_MAPPING: Record<string, { label: string; dbKey: string; isCritical: boolean }> = {
  industry: { label: "Setor", dbKey: "industry", isCritical: false },
  size: { label: "Dimensão", dbKey: "size", isCritical: false },
  phone: { label: "Telefone", dbKey: "phone", isCritical: false },
  email: { label: "Email", dbKey: "email", isCritical: false },
  address: { label: "Morada", dbKey: "address", isCritical: false },
  description: { label: "Descrição", dbKey: "notes", isCritical: false },
  website: { label: "Website", dbKey: "website", isCritical: false },
};

const SOCIAL_MAPPING: Record<string, { label: string; dbKey: string }> = {
  linkedin: { label: "LinkedIn", dbKey: "linkedin_url" },
  instagram: { label: "Instagram", dbKey: "instagram_url" },
  facebook: { label: "Facebook", dbKey: "facebook_url" },
  twitter: { label: "Twitter/X", dbKey: "twitter_url" },
};

const GOOGLE_FIELD_MAPPING: Record<string, { 
  label: string; 
  dbKey: string; 
  category: string;
  isCritical?: boolean;
}> = {
  name: { label: "Nome", dbKey: "name", category: "basic", isCritical: true },
  phone: { label: "Telefone", dbKey: "phone", category: "basic" },
  website: { label: "Website", dbKey: "website", category: "basic" },
  description: { label: "Descrição", dbKey: "notes", category: "basic" },
  place_id: { label: "Google Place ID", dbKey: "google_place_id", category: "basic" },
  formatted_address: { label: "Morada", dbKey: "address", category: "location" },
  postal_code: { label: "Código Postal", dbKey: "postal_code", category: "location" },
  city: { label: "Cidade", dbKey: "city", category: "location" },
  region: { label: "Região", dbKey: "region", category: "location" },
  latitude: { label: "Latitude", dbKey: "latitude", category: "location" },
  longitude: { label: "Longitude", dbKey: "longitude", category: "location" },
  google_maps_url: { label: "Link Google Maps", dbKey: "google_maps_url", category: "location" },
  rating: { label: "Avaliação Google", dbKey: "google_rating", category: "reviews" },
  reviews_count: { label: "Nº de Reviews", dbKey: "google_reviews_count", category: "reviews" },
  business_status: { label: "Estado do Negócio", dbKey: "business_status", category: "operation" },
  business_type: { label: "Tipo de Negócio", dbKey: "industry", category: "operation" },
  opening_hours_json: { label: "Horário Funcionamento", dbKey: "opening_hours", category: "operation" },
  price_level: { label: "Nível de Preços", dbKey: "price_level", category: "operation" },
  photo_url: { label: "Foto Principal", dbKey: "google_photo_url", category: "media" },
};

function getConfidenceColor(confidence: "high" | "medium" | "low") {
  switch (confidence) {
    case "high":
      return "bg-green-500/10 text-green-600 border-green-500/20";
    case "medium":
      return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
    case "low":
      return "bg-red-500/10 text-red-600 border-red-500/20";
  }
}

function getConfidenceLabel(confidence: "high" | "medium" | "low") {
  switch (confidence) {
    case "high":
      return "Alta";
    case "medium":
      return "Média";
    case "low":
      return "Baixa";
  }
}

function getCategoryIcon(category: string) {
  switch (category) {
    case "basic":
      return Building2;
    case "location":
      return MapPin;
    case "reviews":
      return Star;
    case "operation":
      return Clock;
    case "media":
      return Image;
    default:
      return Building2;
  }
}

function formatDisplayValue(value: unknown, maxLength: number = 80): string {
  if (value === null || value === undefined) return "(vazio)";
  if (typeof value === "object") {
    if (Array.isArray(value)) return value.join(", ");
    return JSON.stringify(value).slice(0, 50) + "...";
  }
  const strValue = String(value);
  if (strValue.length > maxLength) {
    return strValue.slice(0, maxLength) + "...";
  }
  return strValue;
}

export function EnrichCompanyDialog({
  open,
  onOpenChange,
  company,
  onEnrichmentApplied,
}: EnrichCompanyDialogProps) {
  const { currentWorkspace } = useWorkspace();
  const { isModuleInstalled } = useWorkspaceModules();
  const enrichMutation = useCompanyEnrichment();
  const googlePlaces = useGooglePlacesEnrichment();
  
  const [step, setStep] = useState<"source" | "loading" | "select-place" | "review" | "applying">("source");
  const [source, setSource] = useState<EnrichmentSource>("google");
  const [progress, setProgress] = useState(0);
  const [suggestions, setSuggestions] = useState<FieldSuggestion[]>([]);
  const [enrichmentResult, setEnrichmentResult] = useState<EnrichmentResult | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["basic", "location", "reviews", "operation", "media"]));

  const isGoogleModuleInstalled = isModuleInstalled('google-local-services');

  useEffect(() => {
    if (open) {
      setStep("source");
      setProgress(0);
      setSuggestions([]);
      setEnrichmentResult(null);
      googlePlaces.reset();
      // Default to google if module installed, otherwise website
      setSource(isGoogleModuleInstalled ? "google" : "website");
    }
  }, [open, isGoogleModuleInstalled]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const startGoogleEnrichment = async () => {
    setStep("loading");
    setProgress(20);

    const results = await googlePlaces.searchPlaces({
      companyName: company.name,
      city: company.city || undefined,
      address: company.address || undefined,
    });

    setProgress(100);

    if (results.length === 0) {
      toast.info("Nenhum resultado encontrado no Google Places");
      setStep("source");
      return;
    }

    if (results.length === 1) {
      // Single result - go directly to review
      processGooglePlaceResult(results[0]);
    } else {
      // Multiple results - let user choose
      setStep("select-place");
    }
  };

  const processGooglePlaceResult = (place: GooglePlaceEnrichmentData) => {
    googlePlaces.setSelectedPlace(place);
    
    const newSuggestions: FieldSuggestion[] = [];

    Object.entries(GOOGLE_FIELD_MAPPING).forEach(([sourceKey, mapping]) => {
      const suggestedValue = place[sourceKey as keyof GooglePlaceEnrichmentData];
      
      if (suggestedValue === null || suggestedValue === undefined) return;
      if (typeof suggestedValue === "string" && suggestedValue.trim() === "") return;

      const currentValue = company[mapping.dbKey as keyof Company];
      const hasCurrentValue = currentValue !== null && currentValue !== undefined && currentValue !== "";
      const isCritical = mapping.isCritical || false;

      newSuggestions.push({
        fieldKey: sourceKey,
        fieldLabel: mapping.label,
        currentValue: currentValue as string | null,
        suggestedValue,
        confidence: "high",
        source: "Google Places",
        isCritical,
        selected: !hasCurrentValue && !isCritical,
        category: mapping.category,
        dbKey: mapping.dbKey,
      });
    });

    setSuggestions(newSuggestions);
    setStep("review");

    if (newSuggestions.length === 0) {
      toast.info("Não foram encontrados novos dados para esta empresa");
    }
  };

  const startWebsiteEnrichment = async () => {
    if (!company.website && !company.email) {
      toast.error("A empresa precisa ter website ou email para usar esta fonte");
      return;
    }

    setStep("loading");
    setProgress(10);

    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 10, 90));
    }, 500);

    try {
      const result = await enrichMutation.mutateAsync({
        website: company.website || undefined,
        email: company.email || undefined,
        companyName: company.name,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!result) {
        toast.error("Não foi possível obter dados de enriquecimento");
        setStep("source");
        return;
      }

      setEnrichmentResult(result);
      processWebsiteResult(result);
    } catch (error) {
      clearInterval(progressInterval);
      console.error("Enrichment error:", error);
      toast.error("Erro ao enriquecer dados");
      setStep("source");
    }
  };

  const processWebsiteResult = (result: EnrichmentResult) => {
    const newSuggestions: FieldSuggestion[] = [];

    Object.entries(FIELD_MAPPING).forEach(([key, mapping]) => {
      const enrichedField = result[key as keyof EnrichmentResult] as EnrichmentField | undefined;
      if (enrichedField?.value) {
        const currentValue = company[mapping.dbKey as keyof Company] as string | null | undefined;
        const hasCurrentValue = currentValue && currentValue.trim() !== "";
        
        newSuggestions.push({
          fieldKey: mapping.dbKey,
          fieldLabel: mapping.label,
          currentValue,
          suggestedValue: enrichedField.value,
          confidence: enrichedField.confidence,
          source: enrichedField.source,
          isCritical: mapping.isCritical,
          selected: !hasCurrentValue && !mapping.isCritical,
          category: "basic",
          dbKey: mapping.dbKey,
        });
      }
    });

    if (result.socialLinks) {
      Object.entries(SOCIAL_MAPPING).forEach(([key, mapping]) => {
        const socialUrl = result.socialLinks?.[key as keyof typeof result.socialLinks];
        if (socialUrl) {
          const currentValue = company[mapping.dbKey as keyof Company] as string | null | undefined;
          const hasCurrentValue = currentValue && currentValue.trim() !== "";
          
          newSuggestions.push({
            fieldKey: mapping.dbKey,
            fieldLabel: mapping.label,
            currentValue,
            suggestedValue: socialUrl,
            confidence: "medium",
            source: "website links",
            isCritical: false,
            selected: !hasCurrentValue,
            category: "basic",
            dbKey: mapping.dbKey,
          });
        }
      });
    }

    setSuggestions(newSuggestions);
    setStep("review");

    if (newSuggestions.length === 0) {
      toast.info("Não foram encontrados novos dados para esta empresa");
    }
  };

  const startEnrichment = async () => {
    if (source === "google") {
      await startGoogleEnrichment();
    } else {
      await startWebsiteEnrichment();
    }
  };

  const toggleSuggestion = (index: number) => {
    setSuggestions((prev) =>
      prev.map((s, i) =>
        i === index ? { ...s, selected: !s.selected } : s
      )
    );
  };

  const selectAll = () => {
    setSuggestions((prev) =>
      prev.map((s) => ({ ...s, selected: !s.isCritical }))
    );
  };

  const deselectAll = () => {
    setSuggestions((prev) =>
      prev.map((s) => ({ ...s, selected: false }))
    );
  };

  const selectCategory = (category: string) => {
    setSuggestions((prev) =>
      prev.map((s) => 
        s.category === category && !s.isCritical 
          ? { ...s, selected: true } 
          : s
      )
    );
  };

  const applySelectedFields = async () => {
    const selectedSuggestions = suggestions.filter((s) => s.selected);
    
    if (selectedSuggestions.length === 0) {
      toast.warning("Selecione pelo menos um campo para aplicar");
      return;
    }

    setStep("applying");

    try {
      const fieldsToApply: Record<string, unknown> = {};
      selectedSuggestions.forEach((s) => {
        const dbKey = s.dbKey || s.fieldKey;
        fieldsToApply[dbKey] = s.suggestedValue;
      });

      const { error: updateError } = await supabase
        .from("companies")
        .update(fieldsToApply)
        .eq("id", company.id);

      if (updateError) throw updateError;

      if (currentWorkspace) {
        const { data: userData } = await supabase.auth.getUser();
        
        const fieldsSuggested: Record<string, { value: unknown; confidence: string }> = {};
        suggestions.forEach((s) => {
          fieldsSuggested[s.fieldKey] = {
            value: s.suggestedValue,
            confidence: s.confidence,
          };
        });
        
        await supabase.from("company_enrichment_logs").insert([{
          company_id: company.id,
          workspace_id: currentWorkspace.id,
          enriched_by: userData.user?.id || "",
          source: source === "google" ? "google_places" : (company.website || company.email || "unknown"),
          fields_suggested: fieldsSuggested as unknown as Record<string, never>,
          fields_applied: fieldsToApply as unknown as Record<string, never>,
        }]);
      }

      toast.success(`${selectedSuggestions.length} campo(s) atualizado(s) com sucesso`);
      onEnrichmentApplied(fieldsToApply);
      onOpenChange(false);
    } catch (error) {
      console.error("Error applying enrichment:", error);
      toast.error("Erro ao aplicar alterações");
      setStep("review");
    }
  };

  const selectedCount = suggestions.filter((s) => s.selected).length;

  // Group suggestions by category
  const groupedSuggestions = suggestions.reduce((acc, suggestion) => {
    const category = suggestion.category || "basic";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(suggestion);
    return acc;
  }, {} as Record<string, FieldSuggestion[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Enriquecer Dados da Empresa
          </DialogTitle>
          <DialogDescription>
            Escolha a fonte de dados para enriquecer as informações de {company.name}
          </DialogDescription>
        </DialogHeader>

        {/* Step: Source Selection */}
        {step === "source" && (
          <div className="space-y-4 py-4">
            <RadioGroup 
              value={source} 
              onValueChange={(v) => setSource(v as EnrichmentSource)}
              className="space-y-3"
            >
              {/* Google Places Option */}
              <div className={cn(
                "relative flex items-start gap-4 p-4 rounded-lg border-2 transition-colors cursor-pointer",
                source === "google" 
                  ? "border-primary bg-primary/5" 
                  : "border-muted hover:border-muted-foreground/30",
                !isGoogleModuleInstalled && "opacity-60"
              )}>
                <RadioGroupItem 
                  value="google" 
                  id="source-google" 
                  disabled={!isGoogleModuleInstalled}
                  className="mt-1"
                />
                <Label htmlFor="source-google" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <MapPin className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold">Google Places</p>
                      <p className="text-sm text-muted-foreground">
                        Dados verificados do Google Maps
                      </p>
                    </div>
                    {isGoogleModuleInstalled && (
                      <Badge variant="secondary" className="ml-auto">
                        <Star className="h-3 w-3 mr-1" />
                        Recomendado
                      </Badge>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">Telefone</Badge>
                    <Badge variant="outline" className="text-xs">Morada</Badge>
                    <Badge variant="outline" className="text-xs">Avaliação</Badge>
                    <Badge variant="outline" className="text-xs">Horário</Badge>
                    <Badge variant="outline" className="text-xs">+10</Badge>
                  </div>
                </Label>
                {!isGoogleModuleInstalled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        window.open("/dashboard/marketplace", "_blank");
                      }}
                    >
                      <Store className="h-4 w-4 mr-2" />
                      Ativar Módulo Google Local
                      <ExternalLink className="h-3 w-3 ml-2" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Website Option */}
              <div className={cn(
                "flex items-start gap-4 p-4 rounded-lg border-2 transition-colors cursor-pointer",
                source === "website" 
                  ? "border-primary bg-primary/5" 
                  : "border-muted hover:border-muted-foreground/30"
              )}>
                <RadioGroupItem value="website" id="source-website" className="mt-1" />
                <Label htmlFor="source-website" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <Globe className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold">Análise de Website</p>
                      <p className="text-sm text-muted-foreground">
                        Extrai dados do website da empresa
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">Setor</Badge>
                    <Badge variant="outline" className="text-xs">Redes Sociais</Badge>
                    <Badge variant="outline" className="text-xs">Descrição</Badge>
                  </div>
                  {!company.website && !company.email && (
                    <p className="mt-2 text-xs text-yellow-600 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Requer website ou email configurado
                    </p>
                  )}
                </Label>
              </div>
            </RadioGroup>

            <Separator />

            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Building2 className="h-6 w-6 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{company.name}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {company.website || company.city || "Pesquisa por nome"}
                </p>
              </div>
            </div>

            <Button
              onClick={startEnrichment}
              className="w-full"
              disabled={
                (source === "google" && !isGoogleModuleInstalled) ||
                (source === "website" && !company.website && !company.email)
              }
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Iniciar Análise
            </Button>
          </div>
        )}

        {/* Step: Loading */}
        {step === "loading" && (
          <div className="space-y-4 py-8">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {source === "google" 
                  ? `A pesquisar "${company.name}" no Google Places...`
                  : `A analisar ${company.website || company.email}...`
                }
              </p>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {/* Step: Select Place (Google multiple results) */}
        {step === "select-place" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Encontrámos {googlePlaces.searchResults.length} resultados. Selecione a empresa correta:
            </p>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {googlePlaces.searchResults.map((place, index) => (
                  <div
                    key={place.place_id || index}
                    className={cn(
                      "p-4 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50",
                      googlePlaces.selectedPlace?.place_id === place.place_id && "border-primary bg-primary/5"
                    )}
                    onClick={() => processGooglePlaceResult(place)}
                  >
                    <div className="flex items-start gap-3">
                      {place.photo_url ? (
                        <img 
                          src={place.photo_url} 
                          alt={place.name || ""} 
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                          <Building2 className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold">{place.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {place.formatted_address}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          {place.rating && (
                            <span className="text-sm flex items-center gap-1">
                              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                              {place.rating} ({place.reviews_count})
                            </span>
                          )}
                          {place.business_type && (
                            <Badge variant="secondary" className="text-xs">
                              {place.business_type}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <Button variant="outline" onClick={() => setStep("source")} className="w-full">
              Voltar
            </Button>
          </div>
        )}

        {/* Step: Review */}
        {step === "review" && (
          <div className="space-y-4">
            {suggestions.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <XCircle className="h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Não foram encontrados novos dados para esta empresa
                </p>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Fechar
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {suggestions.length} campo(s) encontrado(s) via {source === "google" ? "Google Places" : "Website"}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={selectAll}>
                      Selecionar todos
                    </Button>
                    <Button variant="ghost" size="sm" onClick={deselectAll}>
                      Limpar
                    </Button>
                  </div>
                </div>

                <ScrollArea className="h-[320px] pr-4">
                  <div className="space-y-4">
                    {Object.entries(FIELD_CATEGORIES).map(([categoryKey, categoryInfo]) => {
                      const categorySuggestions = groupedSuggestions[categoryKey] || [];
                      if (categorySuggestions.length === 0) return null;

                      const isExpanded = expandedCategories.has(categoryKey);
                      const CategoryIcon = getCategoryIcon(categoryKey);
                      const categorySelected = categorySuggestions.filter(s => s.selected).length;

                      return (
                        <div key={categoryKey} className="border rounded-lg overflow-hidden">
                          <div 
                            className="flex items-center justify-between p-3 bg-muted/50 cursor-pointer hover:bg-muted/80"
                            onClick={() => toggleCategory(categoryKey)}
                          >
                            <div className="flex items-center gap-2">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                              <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium text-sm">{categoryInfo.label}</span>
                              <Badge variant="secondary" className="text-xs">
                                {categorySelected}/{categorySuggestions.length}
                              </Badge>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                selectCategory(categoryKey);
                              }}
                            >
                              Selecionar grupo
                            </Button>
                          </div>
                          
                          {isExpanded && (
                            <div className="p-2 space-y-2">
                              {categorySuggestions.map((suggestion) => {
                                const suggestionIndex = suggestions.findIndex(
                                  s => s.fieldKey === suggestion.fieldKey && s.category === suggestion.category
                                );
                                return (
                                  <div
                                    key={`${suggestion.category}-${suggestion.fieldKey}`}
                                    className={cn(
                                      "p-3 rounded-lg border transition-colors",
                                      suggestion.selected
                                        ? "bg-primary/5 border-primary/30"
                                        : "bg-background border-transparent hover:border-muted"
                                    )}
                                  >
                                    <div className="flex items-start gap-3">
                                      <Checkbox
                                        checked={suggestion.selected}
                                        onCheckedChange={() => toggleSuggestion(suggestionIndex)}
                                        disabled={suggestion.isCritical}
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="font-medium text-sm">
                                            {suggestion.fieldLabel}
                                          </span>
                                          <Badge
                                            variant="outline"
                                            className={cn("text-xs", getConfidenceColor(suggestion.confidence))}
                                          >
                                            {getConfidenceLabel(suggestion.confidence)}
                                          </Badge>
                                        </div>

                                        <div className="mt-1.5 space-y-1">
                                          <div className="flex items-start gap-2 text-xs">
                                            <span className="text-muted-foreground w-10 flex-shrink-0">Atual:</span>
                                            <span className={cn(
                                              "break-words min-w-0",
                                              suggestion.currentValue 
                                                ? "text-foreground" 
                                                : "text-muted-foreground italic"
                                            )}>
                                              {formatDisplayValue(suggestion.currentValue)}
                                            </span>
                                          </div>
                                          <div className="flex items-start gap-2 text-xs">
                                            <span className="text-muted-foreground w-10 flex-shrink-0">Novo:</span>
                                            <ArrowRight className="h-3 w-3 text-primary flex-shrink-0 mt-0.5" />
                                            <span className="text-primary font-medium break-words min-w-0 max-w-[300px]">
                                              {formatDisplayValue(suggestion.suggestedValue)}
                                            </span>
                                          </div>
                                        </div>

                                        {suggestion.currentValue && !suggestion.isCritical && (
                                          <div className="mt-1.5 flex items-center gap-1 text-xs text-yellow-600">
                                            <AlertTriangle className="h-3 w-3" />
                                            Substituirá valor existente
                                          </div>
                                        )}

                                        {suggestion.isCritical && (
                                          <div className="mt-1.5 flex items-center gap-1 text-xs text-red-600">
                                            <XCircle className="h-3 w-3" />
                                            Campo crítico - não editável
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>

                <Separator />

                <div className="flex items-center justify-between">
                  <p className="text-sm">
                    <span className="font-medium">{selectedCount}</span> de{" "}
                    <span className="font-medium">{suggestions.length}</span> selecionados
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep("source")}>
                      Voltar
                    </Button>
                    <Button
                      onClick={applySelectedFields}
                      disabled={selectedCount === 0}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Aplicar Selecionados
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step: Applying */}
        {step === "applying" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              A aplicar alterações...
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
