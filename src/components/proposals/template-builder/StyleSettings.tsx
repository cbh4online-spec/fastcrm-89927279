import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface TemplateStyles {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  fontHeading: string;
  fontBody: string;
  spacing: "compact" | "normal" | "spacious";
  logoUrl: string;
}

const defaultStyles: TemplateStyles = {
  primaryColor: "#2563eb",
  secondaryColor: "#7c3aed",
  backgroundColor: "#ffffff",
  textColor: "#1f2937",
  fontHeading: "Inter",
  fontBody: "Inter",
  spacing: "normal",
  logoUrl: "",
};

const stylePresets = [
  {
    name: "Profissional",
    styles: { primaryColor: "#1e40af", secondaryColor: "#3b82f6", backgroundColor: "#ffffff", textColor: "#1f2937" },
  },
  {
    name: "Moderno",
    styles: { primaryColor: "#7c3aed", secondaryColor: "#a855f7", backgroundColor: "#fafafa", textColor: "#18181b" },
  },
  {
    name: "Minimalista",
    styles: { primaryColor: "#171717", secondaryColor: "#525252", backgroundColor: "#ffffff", textColor: "#262626" },
  },
  {
    name: "Quente",
    styles: { primaryColor: "#dc2626", secondaryColor: "#f97316", backgroundColor: "#fffbeb", textColor: "#292524" },
  },
];

const fonts = [
  "Inter", "Georgia", "Arial", "Helvetica", "Times New Roman", "Verdana", "Trebuchet MS", "Palatino",
];

interface StyleSettingsProps {
  styles: TemplateStyles;
  onChange: (styles: TemplateStyles) => void;
}

export function StyleSettings({ styles, onChange }: StyleSettingsProps) {
  const s = { ...defaultStyles, ...styles };

  const update = (partial: Partial<TemplateStyles>) => {
    onChange({ ...s, ...partial });
  };

  return (
    <div className="space-y-4">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Estilos
      </Label>

      {/* Presets */}
      <div>
        <p className="text-[11px] text-muted-foreground mb-1.5">Presets</p>
        <div className="grid grid-cols-2 gap-1.5">
          {stylePresets.map((preset) => (
            <Button
              key={preset.name}
              variant="outline"
              size="sm"
              className="text-[11px] h-7"
              onClick={() => update(preset.styles)}
            >
              <div
                className="w-3 h-3 rounded-full mr-1.5 border"
                style={{ backgroundColor: preset.styles.primaryColor }}
              />
              {preset.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Colors */}
      <div className="space-y-2">
        <p className="text-[11px] text-muted-foreground">Cores</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { key: "primaryColor", label: "Primária" },
            { key: "secondaryColor", label: "Secundária" },
            { key: "backgroundColor", label: "Fundo" },
            { key: "textColor", label: "Texto" },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center gap-1.5">
              <input
                type="color"
                value={(s as Record<string, string>)[key]}
                onChange={(e) => update({ [key]: e.target.value } as Partial<TemplateStyles>)}
                className="w-6 h-6 rounded border cursor-pointer"
              />
              <span className="text-[11px]">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Typography */}
      <div className="space-y-2">
        <p className="text-[11px] text-muted-foreground">Tipografia</p>
        <Select value={s.fontHeading} onValueChange={(v) => update({ fontHeading: v })}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Título" />
          </SelectTrigger>
          <SelectContent>
            {fonts.map((f) => (
              <SelectItem key={f} value={f} style={{ fontFamily: f }}>
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={s.fontBody} onValueChange={(v) => update({ fontBody: v })}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Corpo" />
          </SelectTrigger>
          <SelectContent>
            {fonts.map((f) => (
              <SelectItem key={f} value={f} style={{ fontFamily: f }}>
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Spacing */}
      <div className="space-y-2">
        <p className="text-[11px] text-muted-foreground">Espaçamento</p>
        <div className="flex gap-1">
          {(["compact", "normal", "spacious"] as const).map((sp) => (
            <Button
              key={sp}
              variant={s.spacing === sp ? "default" : "outline"}
              size="sm"
              className="flex-1 text-[11px] h-7"
              onClick={() => update({ spacing: sp })}
            >
              {sp === "compact" ? "Compacto" : sp === "normal" ? "Normal" : "Espaçoso"}
            </Button>
          ))}
        </div>
      </div>

      {/* Logo */}
      <div className="space-y-1.5">
        <p className="text-[11px] text-muted-foreground">Logo URL</p>
        <Input
          value={s.logoUrl}
          onChange={(e) => update({ logoUrl: e.target.value })}
          placeholder="https://..."
          className="h-8 text-xs"
        />
      </div>
    </div>
  );
}

export { defaultStyles };
