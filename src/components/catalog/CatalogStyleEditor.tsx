import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { CatalogSettings } from "@/hooks/useProductCatalogs";

interface StyleTokens {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  headingFont?: string;
  bodyFont?: string;
}

interface Props {
  styleTokens: StyleTokens;
  settings: CatalogSettings;
  onStyleChange: (tokens: StyleTokens) => void;
  onSettingsChange: (settings: CatalogSettings) => void;
}

export function CatalogStyleEditor({ styleTokens, settings, onStyleChange, onSettingsChange }: Props) {
  const updateToken = (key: keyof StyleTokens, value: string) => {
    onStyleChange({ ...styleTokens, [key]: value });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Estilo Visual</h3>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Cor Primária</Label>
          <div className="flex gap-2 items-center">
            <input type="color" value={styleTokens.primaryColor || "#1a1a2e"} onChange={(e) => updateToken("primaryColor", e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
            <Input value={styleTokens.primaryColor || "#1a1a2e"} onChange={(e) => updateToken("primaryColor", e.target.value)} className="text-xs h-8" />
          </div>
        </div>
        <div>
          <Label className="text-xs">Cor Secundária</Label>
          <div className="flex gap-2 items-center">
            <input type="color" value={styleTokens.secondaryColor || "#16213e"} onChange={(e) => updateToken("secondaryColor", e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
            <Input value={styleTokens.secondaryColor || "#16213e"} onChange={(e) => updateToken("secondaryColor", e.target.value)} className="text-xs h-8" />
          </div>
        </div>
        <div>
          <Label className="text-xs">Cor Destaque</Label>
          <div className="flex gap-2 items-center">
            <input type="color" value={styleTokens.accentColor || "#e94560"} onChange={(e) => updateToken("accentColor", e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
            <Input value={styleTokens.accentColor || "#e94560"} onChange={(e) => updateToken("accentColor", e.target.value)} className="text-xs h-8" />
          </div>
        </div>
        <div>
          <Label className="text-xs">Fundo</Label>
          <div className="flex gap-2 items-center">
            <input type="color" value={styleTokens.backgroundColor || "#ffffff"} onChange={(e) => updateToken("backgroundColor", e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
            <Input value={styleTokens.backgroundColor || "#ffffff"} onChange={(e) => updateToken("backgroundColor", e.target.value)} className="text-xs h-8" />
          </div>
        </div>
      </div>

      <h3 className="text-sm font-semibold pt-2">Configurações</h3>

      <div>
        <Label className="text-xs">Produtos por página</Label>
        <Select value={String(settings.products_per_page)} onValueChange={(v) => onSettingsChange({ ...settings, products_per_page: Number(v) as 1 | 2 | 4 })}>
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 produto (destaque)</SelectItem>
            <SelectItem value="2">2 produtos</SelectItem>
            <SelectItem value="4">4 produtos (compacto)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <Label className="text-xs">Mostrar preços</Label>
        <Switch checked={settings.show_prices} onCheckedChange={(v) => onSettingsChange({ ...settings, show_prices: v })} />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-xs">Mostrar descrições</Label>
        <Switch checked={settings.show_descriptions} onCheckedChange={(v) => onSettingsChange({ ...settings, show_descriptions: v })} />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-xs">Marca de água</Label>
        <Switch checked={settings.watermark} onCheckedChange={(v) => onSettingsChange({ ...settings, watermark: v })} />
      </div>
    </div>
  );
}
