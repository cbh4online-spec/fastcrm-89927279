/**
 * Definições pessoais de chamadas WhatsApp (número de saída + dispositivo preferido).
 */
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, MessageCircle, Save } from "lucide-react";
import { useMyWhatsAppCallSettings, useSaveMyWhatsAppCallSettings } from "@/hooks/useWhatsAppCall";
import { Skeleton } from "@/components/ui/skeleton";

export function WhatsAppCallSettingsCard() {
  const { data, isLoading } = useMyWhatsAppCallSettings();
  const save = useSaveMyWhatsAppCallSettings();
  const [number, setNumber] = useState("");
  const [device, setDevice] = useState<"auto" | "desktop" | "mobile">("auto");

  useEffect(() => {
    if (data) {
      setNumber(data.from_number ?? "");
      setDevice((data.preferred_device as "auto" | "desktop" | "mobile") ?? "auto");
    }
  }, [data]);

  return (
    <Card className="p-6 sm:p-8 rounded-2xl border border-border/60 shadow-sm space-y-6">
      <header className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-emerald-600" />
          Chamadas por WhatsApp
        </h2>
        <p className="text-sm text-muted-foreground">
          Indique o seu número WhatsApp de saída. É usado para identificar quem ligou nos registos de chamada guardados
          na ficha do cliente. A chamada é sempre feita a partir da sua app WhatsApp.
        </p>
      </header>

      {isLoading ? (
        <Skeleton className="h-10 w-full" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label htmlFor="wa-from">O meu número WhatsApp</Label>
            <Input
              id="wa-from"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="+351 912 345 678"
              maxLength={24}
            />
          </div>
          <div className="space-y-2">
            <Label>Dispositivo preferido</Label>
            <Select value={device} onValueChange={(v) => setDevice(v as "auto" | "desktop" | "mobile")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Automático (detetar)</SelectItem>
                <SelectItem value="desktop">WhatsApp Desktop / Web</SelectItem>
                <SelectItem value="mobile">Telemóvel</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => save.mutate({ from_number: number.trim() || null, preferred_device: device })}
          disabled={save.isPending || isLoading}
        >
          {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Guardar
        </Button>
      </div>
    </Card>
  );
}
