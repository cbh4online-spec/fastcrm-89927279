import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  place_id_search?: string;
  provider_id?: string;
  rating?: number;
  reviews?: number;
  price?: string;
  type?: string;
  types?: string[];
  type_id?: string;
  type_ids?: string[];
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
  place_results?: SerpApiPlace;
  error?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SERPAPI_API_KEY = Deno.env.get("SERPAPI_API_KEY");
    
    if (!SERPAPI_API_KEY) {
      console.error("SERPAPI_API_KEY not configured");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Chave da API não configurada. Contacte o administrador." 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const { companyName, city, address, placeId } = await req.json();

    console.log("Google Local enrichment request:", { companyName, city, address, placeId });

    if (!companyName && !placeId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Nome da empresa ou Place ID é obrigatório" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    let results: SerpApiPlace[] = [];

    if (placeId) {
      // Search by place ID for more details
      const searchUrl = new URL("https://serpapi.com/search.json");
      searchUrl.searchParams.set("engine", "google_maps");
      searchUrl.searchParams.set("place_id", placeId);
      searchUrl.searchParams.set("api_key", SERPAPI_API_KEY);

      console.log("Fetching place details for:", placeId);
      const response = await fetch(searchUrl.toString());
      const data: SerpApiResponse = await response.json();

      if (data.error) {
        console.error("SerpAPI error:", data.error);
        return new Response(
          JSON.stringify({ success: false, error: data.error }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (data.place_results) {
        results = [data.place_results];
      }
    } else {
      // Text search
      const query = [companyName, city, address].filter(Boolean).join(", ");
      const searchUrl = new URL("https://serpapi.com/search.json");
      searchUrl.searchParams.set("engine", "google_maps");
      searchUrl.searchParams.set("q", query);
      searchUrl.searchParams.set("type", "search");
      searchUrl.searchParams.set("api_key", SERPAPI_API_KEY);

      console.log("Searching for:", query);
      const response = await fetch(searchUrl.toString());
      const data: SerpApiResponse = await response.json();

      if (data.error) {
        console.error("SerpAPI error:", data.error);
        return new Response(
          JSON.stringify({ success: false, error: data.error }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      results = data.local_results || [];
    }

    console.log(`Found ${results.length} places`);

    // Map results to enrichment format
    const enrichmentResults = results.map((place) => {
      // Parse address components if available
      let parsedCity = "";
      let postalCode = "";
      let region = "";
      let country = "";
      
      if (place.address) {
        // Try to extract postal code from address (common formats)
        const postalMatch = place.address.match(/\b\d{4,8}(?:[-\s]\d{3,4})?\b/);
        if (postalMatch) {
          postalCode = postalMatch[0];
        }
        
        // Split address to get city (usually varies by country)
        const addressParts = place.address.split(",").map(p => p.trim());
        if (addressParts.length >= 2) {
          if (addressParts.length === 2) {
            parsedCity = addressParts[0];
            country = addressParts[1];
          } else if (addressParts.length === 3) {
            parsedCity = addressParts[1];
            country = addressParts[2];
          } else {
            parsedCity = addressParts[addressParts.length - 3] || "";
            region = addressParts[addressParts.length - 2] || "";
            country = addressParts[addressParts.length - 1] || "";
          }
        }
      }

      // Map price level
      let priceLevel = "";
      if (place.price) {
        const dollarCount = (place.price.match(/[$€]/g) || []).length;
        if (dollarCount === 1) priceLevel = "PRICE_LEVEL_INEXPENSIVE";
        else if (dollarCount === 2) priceLevel = "PRICE_LEVEL_MODERATE";
        else if (dollarCount === 3) priceLevel = "PRICE_LEVEL_EXPENSIVE";
        else if (dollarCount >= 4) priceLevel = "PRICE_LEVEL_VERY_EXPENSIVE";
      }

      // Format opening hours
      let openingHoursText: string | null = null;
      let openingHoursJson: object | null = null;
      if (place.operating_hours) {
        openingHoursJson = place.operating_hours;
        openingHoursText = Object.entries(place.operating_hours)
          .map(([day, hours]) => `${day}: ${hours}`)
          .join("\n");
      } else if (place.hours) {
        openingHoursText = place.hours;
      }

      return {
        place_id: place.place_id || place.data_cid || null,
        name: place.title || null,
        formatted_address: place.address || null,
        phone: place.phone || null,
        website: place.website || null,
        google_maps_url: place.place_id 
          ? `https://www.google.com/maps/place/?q=place_id:${place.place_id}`
          : null,
        rating: place.rating || null,
        reviews_count: place.reviews || null,
        business_status: place.open_state || "OPERATIONAL",
        business_type: place.type || (place.types && place.types[0]) || null,
        description: place.description || null,
        opening_hours_text: openingHoursText,
        opening_hours_json: openingHoursJson,
        photo_url: place.thumbnail || null,
        price_level: priceLevel || null,
        latitude: place.gps_coordinates?.latitude || null,
        longitude: place.gps_coordinates?.longitude || null,
        postal_code: postalCode || null,
        city: parsedCity || null,
        region: region || null,
        country: country || null,
      };
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: enrichmentResults,
        count: enrichmentResults.length,
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error: unknown) {
    console.error("Error in google-places-enrich:", error);
    const message = error instanceof Error ? error.message : "Erro interno";
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
