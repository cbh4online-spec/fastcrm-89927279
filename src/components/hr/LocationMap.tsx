import { ExternalLink, MapPin } from "lucide-react";

interface LocationMapProps {
  lat: number | null;
  lng: number | null;
  address?: string | null;
  label?: string;
}

export function LocationMap({ lat, lng, address, label = "Localização" }: LocationMapProps) {
  if (!lat || !lng) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <MapPin className="h-3 w-3" />
        <span>Localização não disponível</span>
      </div>
    );
  }

  const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;

  return (
    <div className="space-y-1">
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <MapPin className="h-3 w-3" />
        {address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`}
        <ExternalLink className="h-3 w-3" />
      </a>
      <iframe
        src={`https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d1000!2d${lng}!3d${lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2spt!4v1`}
        className="w-full h-[150px] rounded-lg border"
        loading="lazy"
        title={label}
      />
    </div>
  );
}
