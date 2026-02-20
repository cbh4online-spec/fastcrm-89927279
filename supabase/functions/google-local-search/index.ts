

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

    const { query, location, limit = 20 } = await req.json();

    console.log("Google Local Search request:", { query, location, limit });

    if (!query) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Termo de pesquisa é obrigatório" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Build search query with location
    const searchQuery = location ? `${query} ${location} Portugal` : `${query} Portugal`;

    const searchUrl = new URL("https://serpapi.com/search.json");
    searchUrl.searchParams.set("engine", "google_maps");
    searchUrl.searchParams.set("q", searchQuery);
    searchUrl.searchParams.set("type", "search");
    searchUrl.searchParams.set("hl", "pt");  // Portuguese language
    searchUrl.searchParams.set("gl", "pt");  // Portugal country
    searchUrl.searchParams.set("num", String(Math.min(limit, 40))); // Max 40 results
    searchUrl.searchParams.set("api_key", SERPAPI_API_KEY);

    console.log("Searching Google Maps for:", searchQuery);
    const response = await fetch(searchUrl.toString());
    const data: SerpApiResponse = await response.json();

    if (data.error) {
      console.error("SerpAPI error:", data.error);
      return new Response(
        JSON.stringify({ success: false, error: data.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: mappedResults,
        count: mappedResults.length,
        query: searchQuery,
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error: unknown) {
    console.error("Error in google-local-search:", error);
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
