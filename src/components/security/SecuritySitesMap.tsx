import { useState, useCallback, useMemo } from "react";
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from "@react-google-maps/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, ExternalLink, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Site {
  id: string;
  site_name: string;
  address_line_1?: string | null;
  locality?: string | null;
  district?: string | null;
  postal_code?: string | null;
  establishment_type?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  onsite_responsible_name?: string | null;
}

interface SecuritySitesMapProps {
  sites: Site[];
}

const containerStyle = { width: "100%", height: "400px", borderRadius: "0.5rem" };

const defaultCenter = { lat: 39.5, lng: -8.0 }; // Portugal center

export function SecuritySitesMap({ sites }: SecuritySitesMapProps) {
  const navigate = useNavigate();
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
  });

  const sitesWithCoords = useMemo(
    () => sites.filter((s) => s.latitude != null && s.longitude != null),
    [sites]
  );

  const center = useMemo(() => {
    if (sitesWithCoords.length === 0) return defaultCenter;
    const avgLat = sitesWithCoords.reduce((sum, s) => sum + (s.latitude || 0), 0) / sitesWithCoords.length;
    const avgLng = sitesWithCoords.reduce((sum, s) => sum + (s.longitude || 0), 0) / sitesWithCoords.length;
    return { lat: avgLat, lng: avgLng };
  }, [sitesWithCoords]);

  const onMapClick = useCallback(() => setSelectedSite(null), []);

  if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            Mapa de Locais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm gap-2">
            <MapPin className="h-8 w-8 opacity-40" />
            <p>Chave Google Maps não configurada</p>
            <p className="text-xs">Configure VITE_GOOGLE_MAPS_API_KEY para ativar o mapa.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loadError) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Erro ao carregar o mapa.
        </CardContent>
      </Card>
    );
  }

  if (!isLoaded) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (sitesWithCoords.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            Mapa de Locais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm gap-2">
            <MapPin className="h-8 w-8 opacity-40" />
            <p>Nenhum local com coordenadas GPS</p>
            <p className="text-xs">Adicione latitude e longitude aos locais para os ver no mapa.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          Mapa de Locais
          <Badge variant="secondary" className="ml-auto text-xs">
            {sitesWithCoords.length} no mapa
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-hidden rounded-b-lg">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={sitesWithCoords.length === 1 ? 14 : 7}
          onClick={onMapClick}
          options={{
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
          }}
        >
          {sitesWithCoords.map((site) => (
            <MarkerF
              key={site.id}
              position={{ lat: site.latitude!, lng: site.longitude! }}
              onClick={() => setSelectedSite(site)}
            />
          ))}

          {selectedSite && (
            <InfoWindowF
              position={{ lat: selectedSite.latitude!, lng: selectedSite.longitude! }}
              onCloseClick={() => setSelectedSite(null)}
            >
              <div className="p-1 min-w-[180px]">
                <p className="font-semibold text-sm">{selectedSite.site_name}</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {[selectedSite.address_line_1, selectedSite.locality, selectedSite.district]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                {selectedSite.establishment_type && (
                  <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                    {selectedSite.establishment_type}
                  </span>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full mt-2 text-xs h-7"
                  onClick={() => navigate(`/dashboard/security/sites/${selectedSite.id}`)}
                >
                  <ExternalLink className="h-3 w-3 mr-1" /> Ver detalhe
                </Button>
              </div>
            </InfoWindowF>
          )}
        </GoogleMap>
      </CardContent>
    </Card>
  );
}
