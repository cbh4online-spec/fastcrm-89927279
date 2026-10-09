

import {
  beginSearch, getSearchContext, prospectingCorsHeaders, searchJson,
  settleSearch, type SearchContext,
} from "../_shared/prospectingSearchGuard.ts";

interface SerpApiPlace {
  position?: number;
  title?: string;
  place_id?: string;
  data_id?: string;
  data_cid?: string;
  reviews_link?: string;
  photos_link?: string;
  gps_coordinates?: {
    latitude: number;
    longitude: number;
  };
  rating?: number;
  reviews?: number;
  price?: string;
  type?: string;
  types?: string[];
  address?: string;
  open_state?: string;
  hours?: string;
  operating_hours?: Record<string, string>;
  phone?: string;
  website?: string;
  description?: string;
  service_options?: Record<string, boolean>;
  thumbnail?: string;
}

interface SerpApiResponse {
  search_metadata?: {
    status: string;
  };
  local_results?: SerpApiPlace[];
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: prospectingCorsHeaders });
  }

  if (req.method !== "POST") {
    return searchJson({ success: false, error: "Método não permitido" }, 405);
  }

  let context: SearchContext | undefined;
  let operationId: string | undefined;
  let settled = false;

  try {
    const body = await req.json();
    const { query, location, limit = 20, start = 0, workspace_id, request_id } = body;
    if (typeof query !== "string" || !query.trim() || query.length > 200 ||
        (location !== undefined && (typeof location !== "string" || location.length > 100)) ||
        !Number.isInteger(limit) || limit < 1 || limit > 40 ||
        !Number.isInteger(start) || start < 0 || start > 500) {
      return searchJson({ success: false, error: "Parâmetros de pesquisa inválidos" }, 400);
    }

    const auth = await getSearchContext(req, workspace_id);
    if (auth.error) return auth.error;
    context = auth.context!;

    const SERPAPI_API_KEY = Deno.env.get("SERPAPI_API_KEY");
    
    if (!SERPAPI_API_KEY) {
      console.error("SERPAPI_API_KEY not configured");
      return searchJson({ success: false, error: "Chave da API não configurada. Contacte o administrador." }, 503);
    }

    const started = await beginSearch(context, "prospecting_google_local_search", request_id);
    if (started.error) return started.error;
    if (started.reservation?.status === "completed") {
      return searchJson(started.reservation.response);
    }
    operationId = started.reservation?.operation_id;
    if (!operationId) return searchJson({ success: false, error: "Reserva de créditos inválida" }, 503);

    // Build search query with location
    const searchQuery = location ? `${query.trim()} ${location.trim()} Portugal` : `${query.trim()} Portugal`;

    const searchUrl = new URL("https://serpapi.com/search.json");
    searchUrl.searchParams.set("engine", "google_maps");
    searchUrl.searchParams.set("q", searchQuery);
    searchUrl.searchParams.set("type", "search");
    searchUrl.searchParams.set("hl", "pt");  // Portuguese language
    searchUrl.searchParams.set("gl", "pt");  // Portugal country
    searchUrl.searchParams.set("num", String(Math.min(limit, 40)));
    if (start > 0) {
      searchUrl.searchParams.set("start", String(start));
    }
    searchUrl.searchParams.set("api_key", SERPAPI_API_KEY);

    const response = await fetch(searchUrl.toString());
    if (!response.ok) {
      console.error("SerpAPI HTTP error", response.status);
      return searchJson({ success: false, error: "Pesquisa externa indisponível", error_type: "api_error", data: [], count: 0 }, 502);
    }
    const data: SerpApiResponse = await response.json();

    if (data.error) {
      console.error("SerpAPI error:", data.error);
      // Return 200 with structured error to avoid blank screens (resilient pattern)
      const isQuotaError = data.error.toLowerCase().includes("run out") || 
                           data.error.toLowerCase().includes("quota") ||
                           data.error.toLowerCase().includes("limit");
      return searchJson({ 
          success: false, 
          error: isQuotaError 
            ? "Quota de pesquisas esgotada. Contacte o administrador para renovar o plano da API." 
            : data.error,
          error_type: isQuotaError ? "quota_exceeded" : "api_error",
          data: [],
          count: 0,
        }, 502);
    }

    const results = data.local_results || [];
    console.log(`Found ${results.length} places`);

    // Map results to standardized format
    const mappedResults = results.map((place) => {
      // Parse price level
      let priceLevel = "";
      if (place.price) {
        const symbolCount = (place.price.match(/[$€]/g) || []).length;
        if (symbolCount === 1) priceLevel = "€";
        else if (symbolCount === 2) priceLevel = "€€";
        else if (symbolCount === 3) priceLevel = "€€€";
        else if (symbolCount >= 4) priceLevel = "€€€€";
      }

      // Format opening hours
      let openingHours: string | null = null;
      if (place.operating_hours) {
        openingHours = Object.entries(place.operating_hours)
          .map(([day, hours]) => `${day}: ${hours}`)
          .join(" | ");
      } else if (place.hours) {
        openingHours = place.hours;
      }

      return {
        place_id: place.place_id || place.data_cid || `temp_${Date.now()}_${Math.random()}`,
        name: place.title || "Sem nome",
        address: place.address || "",
        phone: place.phone || null,
        website: place.website || null,
        rating: place.rating || null,
        reviewCount: place.reviews || 0,
        priceLevel: priceLevel || null,
        businessType: place.type || (place.types && place.types[0]) || null,
        openingHours: openingHours,
        thumbnail: place.thumbnail || null,
        latitude: place.gps_coordinates?.latitude || null,
        longitude: place.gps_coordinates?.longitude || null,
      };
    });

    const result = { 
        success: true, 
        data: mappedResults,
        count: mappedResults.length,
        query: searchQuery,
      };
    settled = await settleSearch(context, operationId, true, result);
    if (!settled) return searchJson({ success: false, error: "Não foi possível confirmar a pesquisa" }, 503);
    return searchJson(result);
  } catch (error: unknown) {
    console.error("Error in google-local-search:", error);
    const message = error instanceof Error ? error.message : "Erro interno";
    return searchJson({ success: false, error: message }, 500);
  } finally {
    if (context && operationId && !settled) {
      await settleSearch(context, operationId, false);
    }
  }
});
