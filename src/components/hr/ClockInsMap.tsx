import { useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import type { HRWorkSession } from "@/hooks/hr/useHRTimeEntries";

// Fix default marker icons in Leaflet + bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const COLORS = [
  "#2563eb", "#dc2626", "#16a34a", "#9333ea", "#ea580c",
  "#0891b2", "#be185d", "#65a30d", "#7c3aed", "#c2410c",
];

function createColorIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width: 24px; height: 24px; border-radius: 50%;
      background: ${color}; border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14],
  });
}

interface Props {
  sessions: HRWorkSession[];
}

export default function ClockInsMap({ sessions }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  const sessionsWithGps = useMemo(
    () => sessions.filter((s) => s.clock_in_lat != null && s.clock_in_lng != null),
    [sessions]
  );

  const employeeColors = useMemo(() => {
    const map = new Map<string, string>();
    const uniqueIds = [...new Set(sessionsWithGps.map((s) => s.employee_id))];
    uniqueIds.forEach((id, i) => map.set(id, COLORS[i % COLORS.length]));
    return map;
  }, [sessionsWithGps]);

  const center = useMemo<[number, number]>(() => {
    if (sessionsWithGps.length === 0) return [39.3999, -8.2245]; // Portugal center
    const avgLat = sessionsWithGps.reduce((a, s) => a + s.clock_in_lat!, 0) / sessionsWithGps.length;
    const avgLng = sessionsWithGps.reduce((a, s) => a + s.clock_in_lng!, 0) / sessionsWithGps.length;
    return [avgLat, avgLng];
  }, [sessionsWithGps]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Mapa de Registos
          <Badge variant="secondary" className="text-xs ml-1">
            {sessionsWithGps.length} com GPS
          </Badge>
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </Button>
      </CardHeader>
      {!collapsed && (
        <CardContent className="pt-0">
          {sessionsWithGps.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
              <MapPin className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-sm">Sem registos com localização neste período</p>
            </div>
          ) : (
            <div className="rounded-lg overflow-hidden border" style={{ height: 400 }}>
              <MapContainer
                center={center}
                zoom={13}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {sessionsWithGps.map((s) => {
                  const color = employeeColors.get(s.employee_id) || COLORS[0];
                  return (
                    <Marker
                      key={s.id}
                      position={[s.clock_in_lat!, s.clock_in_lng!]}
                      icon={createColorIcon(color)}
                    >
                      <Popup>
                        <div className="text-sm space-y-1 min-w-[160px]">
                          <p className="font-semibold">{s.hr_employees?.full_name || "—"}</p>
                          <p>{format(new Date(s.session_date + "T00:00:00"), "dd/MM/yyyy", { locale: pt })}</p>
                          {s.clock_in_at && (
                            <p>Entrada: {format(new Date(s.clock_in_at), "HH:mm")}</p>
                          )}
                          {s.clock_in_location_name && (
                            <p className="text-muted-foreground">{s.clock_in_location_name}</p>
                          )}
                          <Badge variant={s.status === "complete" ? "default" : "secondary"} className="text-[10px]">
                            {s.status === "complete" ? "Completo" : "Incompleto"}
                          </Badge>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
