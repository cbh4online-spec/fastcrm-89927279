import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Monitor, Smartphone, Tablet, Globe, AlertTriangle, MapPin } from "lucide-react";
import { type DeviceData, type GeoData, getCountryFlag } from "./statsHelpers";

interface Props {
  devices: DeviceData[];
  geo: GeoData[];
}

function DeviceCards({ devices }: { devices: DeviceData[] }) {
  const total = devices.reduce((s, d) => s + d.value, 0) || 1;
  const icons: Record<string, any> = { mobile: Smartphone, desktop: Monitor, tablet: Tablet };
  const labels: Record<string, string> = { mobile: "Mobile", desktop: "Desktop", tablet: "Tablet", desconhecido: "Outro" };

  const best = devices.reduce((b, d) => d.rate > (b?.rate ?? -1) ? d : b, devices[0]);
  const mobileDevice = devices.find(d => d.name === "mobile");
  const desktopDevice = devices.find(d => d.name === "desktop");
  const mobileWarning = mobileDevice && desktopDevice &&
    mobileDevice.value > total * 0.5 && mobileDevice.rate < desktopDevice.rate;

  const displayDevices = ["desktop", "mobile", "tablet"].map(name => {
    const found = devices.find(d => d.name === name);
    return found || { name, value: 0, submissions: 0, rate: 0 };
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {displayDevices.map(device => {
          const Icon = icons[device.name] || Monitor;
          const pct = Math.round((device.value / total) * 100);
          const isBest = device.name === best?.name && device.rate > 0;

          return (
            <Card key={device.name} className={`border-white/[0.08] rounded-xl ${isBest ? "ring-1 ring-emerald-500/30" : ""}`}>
              <CardContent className="pt-4 pb-3 text-center">
                <Icon className={`h-6 w-6 mx-auto mb-2 ${isBest ? "text-emerald-400" : "text-muted-foreground"}`} />
                <p className="text-xs font-medium text-muted-foreground">{labels[device.name] || device.name}</p>
                <p className="text-xl font-bold tabular-nums mt-1">{pct}%</p>
                <p className="text-xs text-muted-foreground tabular-nums">{device.value} visitas</p>
                <p className="text-xs tabular-nums mt-1">
                  <span className={device.rate > 0 ? "text-emerald-400" : "text-muted-foreground"}>
                    {device.rate.toFixed(1)}% conv.
                  </span>
                </p>
                {isBest && <Badge variant="outline" className="text-[10px] mt-1 border-emerald-500/30 text-emerald-400">Melhor</Badge>}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {mobileWarning && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-300/80">
            <strong>Atenção:</strong> {Math.round((mobileDevice!.value / total) * 100)}% do tráfego é mobile mas a conversão mobile ({mobileDevice!.rate.toFixed(1)}%)
            é inferior à desktop ({desktopDevice!.rate.toFixed(1)}%). Verifica a experiência mobile da landing page.
          </p>
        </div>
      )}
    </div>
  );
}

function GeoTable({ geo }: { geo: GeoData[] }) {
  if (geo.length === 0) {
    return (
      <Card className="border-white/[0.08] rounded-xl">
        <CardContent className="py-12">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="relative w-24 h-16 opacity-30">
              <Globe className="h-16 w-16 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Dados geográficos a acumular...</p>
            <p className="text-xs text-muted-foreground">País e cidade são capturados automaticamente em novas visitas</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-white/[0.08] rounded-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <MapPin className="h-4 w-4 text-amber-400" />
          Localização
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>País / Cidade</TableHead>
              <TableHead className="text-right">Visitas</TableHead>
              <TableHead className="text-right">Conversões</TableHead>
              <TableHead className="text-right">Taxa</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {geo.map(g => (
              <TableRow key={g.name}>
                <TableCell className="font-medium">
                  <span className="mr-1.5">{getCountryFlag(g.country)}</span>
                  {g.name}
                </TableCell>
                <TableCell className="text-right tabular-nums">{g.views}</TableCell>
                <TableCell className="text-right tabular-nums">{g.submissions}</TableCell>
                <TableCell className="text-right tabular-nums">{g.rate.toFixed(1)}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function StatsGeoDeviceTab({ devices, geo }: Props) {
  return (
    <div className="space-y-4">
      <Card className="border-white/[0.08] rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-amber-400" />
            Dispositivos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {devices.length > 0 ? (
            <DeviceCards devices={devices} />
          ) : (
            <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
              Sem dados de dispositivo
            </div>
          )}
        </CardContent>
      </Card>

      <GeoTable geo={geo} />
    </div>
  );
}
