import { MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LocationMapEmbedProps {
  location: string;
  height?: number;
  showHeader?: boolean;
}

export function LocationMapEmbed({ location, height = 250, showHeader = true }: LocationMapEmbedProps) {
  if (!location) return null;

  const encodedLocation = encodeURIComponent(location);
  const embedUrl = `https://www.google.com/maps?q=${encodedLocation}&output=embed`;

  const mapIframe = (
    <iframe
      title={`Mapa - ${location}`}
      src={embedUrl}
      width="100%"
      height={height}
      style={{ border: 0, borderRadius: "0.5rem" }}
      allowFullScreen
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
    />
  );

  if (!showHeader) return mapIframe;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          Localização
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-2">{location}</p>
        {mapIframe}
      </CardContent>
    </Card>
  );
}
