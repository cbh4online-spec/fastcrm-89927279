import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface GooglePlaceEnrichmentData {
  place_id: string | null;
  name: string | null;
  formatted_address: string | null;
  phone: string | null;
  website: string | null;
  google_maps_url: string | null;
  rating: number | null;
  reviews_count: number | null;
  business_status: string | null;
  business_type: string | null;
  description: string | null;
  opening_hours_text: string | null;
  opening_hours_json: object | null;
  photo_url: string | null;
  price_level: string | null;
  latitude: number | null;
  longitude: number | null;
  postal_code: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
}

export interface GooglePlacesSearchInput {
  companyName: string;
  city?: string;
  address?: string;
  placeId?: string;
}

// Map of Google Places fields to company DB fields
export const GOOGLE_PLACES_FIELD_MAPPING: Record<string, {
  label: string;
  dbKey: string;
  category: "basic" | "location" | "reviews" | "operation" | "media";
  isCritical?: boolean;
}> = {
  name: { label: "Nome", dbKey: "name", category: "basic", isCritical: true },
  phone: { label: "Telefone", dbKey: "phone", category: "basic" },
  website: { label: "Website", dbKey: "website", category: "basic" },
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
  description: { label: "Descrição", dbKey: "notes", category: "basic" },
  photo_url: { label: "Foto Principal", dbKey: "google_photo_url", category: "media" },
  place_id: { label: "Google Place ID", dbKey: "google_place_id", category: "basic" },
};

export const FIELD_CATEGORIES = {
  basic: { label: "Informações Básicas", icon: "Building2" },
  location: { label: "Localização", icon: "MapPin" },
  reviews: { label: "Avaliações Google", icon: "Star" },
  operation: { label: "Operação", icon: "Clock" },
  media: { label: "Média", icon: "Image" },
  context: { label: "Contexto Empresarial", icon: "Sparkles" },
  social: { label: "Redes Sociais", icon: "Globe" },
};

export function useGooglePlacesEnrichment() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<GooglePlaceEnrichmentData[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<GooglePlaceEnrichmentData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const searchPlaces = async (input: GooglePlacesSearchInput): Promise<GooglePlaceEnrichmentData[]> => {
    setIsLoading(true);
    setError(null);
    setSearchResults([]);
    setSelectedPlace(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("google-places-enrich", {
        body: input,
      });

      if (fnError) {
        throw new Error(fnError.message || "Erro ao pesquisar no Google Places");
      }

      if (!data.success) {
        throw new Error(data.error || "Erro ao pesquisar no Google Places");
      }

      const results = data.data as GooglePlaceEnrichmentData[];
      setSearchResults(results);

      if (results.length === 0) {
        toast.info("Nenhum resultado encontrado no Google Places");
      } else if (results.length === 1) {
        setSelectedPlace(results[0]);
      }

      return results;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      setError(message);
      toast.error(message);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const getEnrichmentFields = (place: GooglePlaceEnrichmentData, currentCompany: Record<string, unknown>) => {
    const fields: Array<{
      fieldKey: string;
      dbKey: string;
      label: string;
      category: "basic" | "location" | "reviews" | "operation" | "media";
      currentValue: unknown;
      suggestedValue: unknown;
      isCritical: boolean;
      hasConflict: boolean;
      selected: boolean;
    }> = [];

    Object.entries(GOOGLE_PLACES_FIELD_MAPPING).forEach(([sourceKey, mapping]) => {
      const suggestedValue = place[sourceKey as keyof GooglePlaceEnrichmentData];
      
      // Skip null/undefined values
      if (suggestedValue === null || suggestedValue === undefined) return;
      
      // Skip empty strings
      if (typeof suggestedValue === "string" && suggestedValue.trim() === "") return;

      const currentValue = currentCompany[mapping.dbKey];
      const hasCurrentValue = currentValue !== null && currentValue !== undefined && currentValue !== "";
      const isCritical = mapping.isCritical || false;

      fields.push({
        fieldKey: sourceKey,
        dbKey: mapping.dbKey,
        label: mapping.label,
        category: mapping.category,
        currentValue,
        suggestedValue,
        isCritical,
        hasConflict: hasCurrentValue,
        // Pre-select if no current value and not critical
        selected: !hasCurrentValue && !isCritical,
      });
    });

    return fields;
  };

  const reset = () => {
    setSearchResults([]);
    setSelectedPlace(null);
    setError(null);
    setIsLoading(false);
  };

  return {
    isLoading,
    searchResults,
    selectedPlace,
    error,
    searchPlaces,
    setSelectedPlace,
    getEnrichmentFields,
    reset,
  };
}
