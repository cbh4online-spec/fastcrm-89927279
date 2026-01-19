import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GooglePlaceResult {
  id: string;
  displayName: {
    text: string;
    languageCode: string;
  };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
  primaryType?: string;
  primaryTypeDisplayName?: {
    text: string;
    languageCode: string;
  };
  editorialSummary?: {
    text: string;
    languageCode: string;
  };
  regularOpeningHours?: {
    openNow?: boolean;
    periods?: Array<{
      open: { day: number; hour: number; minute: number };
      close?: { day: number; hour: number; minute: number };
    }>;
    weekdayDescriptions?: string[];
  };
  photos?: Array<{
    name: string;
    widthPx: number;
    heightPx: number;
    authorAttributions: Array<{ displayName: string; uri: string }>;
  }>;
  priceLevel?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  addressComponents?: Array<{
    longText: string;
    shortText: string;
    types: string[];
    languageCode: string;
  }>;
}

interface SearchResponse {
  places?: GooglePlaceResult[];
}

const GOOGLE_PLACES_FIELDS = [
  "id",
  "displayName",
  "formattedAddress",
  "nationalPhoneNumber",
  "internationalPhoneNumber",
  "websiteUri",
  "googleMapsUri",
  "rating",
  "userRatingCount",
  "businessStatus",
  "primaryType",
  "primaryTypeDisplayName",
  "editorialSummary",
  "regularOpeningHours",
  "photos",
  "priceLevel",
  "location",
  "addressComponents",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");
    
    if (!GOOGLE_PLACES_API_KEY) {
      console.error("GOOGLE_PLACES_API_KEY not configured");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Chave da API Google Places não configurada" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const { companyName, city, address, placeId } = await req.json();

    console.log("Google Places enrichment request:", { companyName, city, address, placeId });

    let places: GooglePlaceResult[] = [];

    // If we have a placeId, fetch that specific place
    if (placeId) {
      const detailsUrl = `https://places.googleapis.com/v1/places/${placeId}`;
      
      const detailsResponse = await fetch(detailsUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
          "X-Goog-FieldMask": GOOGLE_PLACES_FIELDS.join(","),
        },
      });

      if (detailsResponse.ok) {
        const place = await detailsResponse.json();
        places = [place];
      }
    } else {
      // Search for places by name
      const searchQuery = [companyName, city, address].filter(Boolean).join(", ");
      
      const searchUrl = "https://places.googleapis.com/v1/places:searchText";
      
      const searchResponse = await fetch(searchUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
          "X-Goog-FieldMask": `places.${GOOGLE_PLACES_FIELDS.join(",places.")}`,
        },
        body: JSON.stringify({
          textQuery: searchQuery,
          languageCode: "pt",
          maxResultCount: 5,
        }),
      });

      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        console.error("Google Places API error:", errorText);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Erro ao pesquisar no Google Places" 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }

      const searchData: SearchResponse = await searchResponse.json();
      places = searchData.places || [];
    }

    console.log(`Found ${places.length} places`);

    // Transform places to our enrichment format
    const enrichmentResults = places.map((place) => {
      // Extract address components
      const addressComponents: Record<string, string> = {};
      if (place.addressComponents) {
        for (const comp of place.addressComponents) {
          if (comp.types.includes("postal_code")) {
            addressComponents.postal_code = comp.longText;
          }
          if (comp.types.includes("locality")) {
            addressComponents.city = comp.longText;
          }
          if (comp.types.includes("administrative_area_level_1")) {
            addressComponents.region = comp.longText;
          }
          if (comp.types.includes("country")) {
            addressComponents.country = comp.longText;
          }
        }
      }

      // Format opening hours as readable text
      let openingHoursText: string | null = null;
      let openingHoursJson: object | null = null;
      if (place.regularOpeningHours) {
        openingHoursText = place.regularOpeningHours.weekdayDescriptions?.join("\n") || null;
        openingHoursJson = {
          weekdayDescriptions: place.regularOpeningHours.weekdayDescriptions,
          openNow: place.regularOpeningHours.openNow,
          periods: place.regularOpeningHours.periods,
        };
      }

      // Get first photo URL if available
      let photoUrl: string | null = null;
      if (place.photos && place.photos.length > 0) {
        const photoName = place.photos[0].name;
        photoUrl = `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=400&maxWidthPx=400&key=${GOOGLE_PLACES_API_KEY}`;
      }

      return {
        place_id: place.id,
        name: place.displayName?.text || null,
        formatted_address: place.formattedAddress || null,
        phone: place.nationalPhoneNumber || place.internationalPhoneNumber || null,
        website: place.websiteUri || null,
        google_maps_url: place.googleMapsUri || null,
        rating: place.rating || null,
        reviews_count: place.userRatingCount || null,
        business_status: place.businessStatus || null,
        business_type: place.primaryTypeDisplayName?.text || place.primaryType || null,
        description: place.editorialSummary?.text || null,
        opening_hours_text: openingHoursText,
        opening_hours_json: openingHoursJson,
        photo_url: photoUrl,
        price_level: place.priceLevel || null,
        latitude: place.location?.latitude || null,
        longitude: place.location?.longitude || null,
        postal_code: addressComponents.postal_code || null,
        city: addressComponents.city || null,
        region: addressComponents.region || null,
        country: addressComponents.country || null,
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
