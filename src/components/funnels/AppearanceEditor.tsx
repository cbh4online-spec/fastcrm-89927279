import { ColorPicker } from "@/components/ui/color-picker";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Palette, Type, Layout, Sparkles } from "lucide-react";

export interface AppearanceValues {
  primaria: string;
  accent: string;
  background: string;
  text_color: string;
  font_heading: string;
  font_body: string;
  font_size_base: number;
  heading_weight: number;
  border_radius: number;
  padding_style: string;
  cta_style: string;
  shadow: string;
  bg_type: string;
  gradient_from: string;
  gradient_to: string;
  gradient_angle: number;
  overlay_opacity: number;
}

export const defaultAppearance: AppearanceValues = {
  primaria: "#2563eb",
  accent: "#3b82f6",
  background: "#ffffff",
  text_color: "#0f172a",
  font_heading: "Inter",
  font_body: "Inter",
  font_size_base: 16,
  heading_weight: 700,
  border_radius: 12,
  padding_style: "normal",
  cta_style: "filled",
  shadow: "md",
  bg_type: "solid",
  gradient_from: "#2563eb",
  gradient_to: "#7c3aed",
  gradient_angle: 135,
  overlay_opacity: 0,
};

const PALETTE_PRESETS = [
  { name: "Profissional Azul", primaria: "#2563eb", accent: "#3b82f6", background: "#f8fafc", text_color: "#0f172a" },
  { name: "Energia Verde", primaria: "#16a34a", accent: "#22c55e", background: "#f0fdf4", text_color: "#14532d" },
  { name: "Luxo Dourado", primaria: "#b45309", accent: "#f59e0b", background: "#fffbeb", text_color: "#451a03" },
  { name: "Tech Roxo", primaria: "#7c3aed", accent: "#a78bfa", background: "#f5f3ff", text_color: "#1e1b4b" },
  { name: "Coral Moderno", primaria: "#e11d48", accent: "#fb7185", background: "#fff1f2", text_color: "#4c0519" },
  { name: "Neutro Elegante", primaria: "#374151", accent: "#6b7280", background: "#f9fafb", text_color: "#111827" },
];

const FONTS = [
  "Inter", "Poppins", "Montserrat", "Playfair Display", "Roboto",
  "Open Sans", "Lato", "Raleway", "Oswald", "Merriweather",
];

interface AppearanceEditorProps {
  values: AppearanceValues;
  onChange: (values: AppearanceValues) => void;
}

export function AppearanceEditor({ values, onChange }: AppearanceEditorProps) {
  const update = <K extends keyof AppearanceValues>(key: K, val: AppearanceValues[K]) => {
    onChange({ ...values, [key]: val });
  };

  const applyPreset = (preset: typeof PALETTE_PRESETS[0]) => {
    onChange({
      ...values,
      primaria: preset.primaria,
      accent: preset.accent,
      background: preset.background,
      text_color: preset.text_color,
    });
  };

  const bgStyle = values.bg_type === "gradient"
    ? { background: `linear-gradient(${values.gradient_angle}deg, ${values.gradient_from}, ${values.gradient_to})` }
    : { backgroundColor: values.background };

  const shadowMap: Record<string, string> = {
    none: "none", sm: "0 1px 3px rgba(0,0,0,0.1)", md: "0 4px 12px rgba(0,0,0,0.1)", lg: "0 10px 30px rgba(0,0,0,0.15)",
  };

  const paddingMap: Record<string, string> = { compact: "16px", normal: "32px", spacious: "48px" };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Editor */}
      <div>
        <Accordion type="multiple" defaultValue={["cores", "tipografia", "layout", "background"]} className="space-y-2">
          {/* A. Paleta de Cores */}
          <AccordionItem value="cores" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">Paleta de Cores</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <div className="grid grid-cols-2 gap-4">
                <ColorPicker label="Primária" value={values.primaria} onChange={(v) => update("primaria", v)} />
                <ColorPicker label="Accent" value={values.accent} onChange={(v) => update("accent", v)} />
                <ColorPicker label="Fundo" value={values.background} onChange={(v) => update("background", v)} presets={["#ffffff", "#f8fafc", "#f0fdf4", "#fffbeb", "#f5f3ff", "#fff1f2", "#f9fafb", "#0f172a"]} />
                <ColorPicker label="Texto" value={values.text_color} onChange={(v) => update("text_color", v)} presets={["#0f172a", "#1e1b4b", "#14532d", "#451a03", "#4c0519", "#111827", "#374151", "#ffffff"]} />
              </div>
              <div>
                <Label className="text-xs font-medium mb-2 block">Paletas Rápidas</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PALETTE_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => applyPreset(p)}
                      className="flex items-center gap-2 p-2 rounded-md border border-input hover:bg-accent/50 transition-colors text-left"
                    >
                      <div className="flex gap-0.5">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: p.primaria }} />
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: p.accent }} />
                        <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: p.background }} />
                      </div>
                      <span className="text-xs truncate">{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* B. Tipografia */}
          <AccordionItem value="tipografia" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Type className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">Tipografia</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Font Títulos</Label>
                  <Select value={values.font_heading} onValueChange={(v) => update("font_heading", v)}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FONTS.map((f) => <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Font Corpo</Label>
                  <Select value={values.font_body} onValueChange={(v) => update("font_body", v)}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FONTS.map((f) => <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tamanho Base: {values.font_size_base}px</Label>
                <Slider min={14} max={20} step={1} value={[values.font_size_base]} onValueChange={([v]) => update("font_size_base", v)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Peso dos Títulos: {values.heading_weight}</Label>
                <Slider min={400} max={900} step={100} value={[values.heading_weight]} onValueChange={([v]) => update("heading_weight", v)} />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* C. Layout */}
          <AccordionItem value="layout" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Layout className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">Layout & Espaçamento</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Border Radius: {values.border_radius}px</Label>
                <Slider min={0} max={24} step={2} value={[values.border_radius]} onValueChange={([v]) => update("border_radius", v)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Padding</Label>
                <Select value={values.padding_style} onValueChange={(v) => update("padding_style", v)}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compact" className="text-xs">Compacto</SelectItem>
                    <SelectItem value="normal" className="text-xs">Normal</SelectItem>
                    <SelectItem value="spacious" className="text-xs">Espaçoso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Estilo do CTA</Label>
                <Select value={values.cta_style} onValueChange={(v) => update("cta_style", v)}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="filled" className="text-xs">Preenchido</SelectItem>
                    <SelectItem value="outline" className="text-xs">Contorno</SelectItem>
                    <SelectItem value="gradient" className="text-xs">Gradiente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Sombra</Label>
                <Select value={values.shadow} onValueChange={(v) => update("shadow", v)}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs">Nenhuma</SelectItem>
                    <SelectItem value="sm" className="text-xs">Subtil</SelectItem>
                    <SelectItem value="md" className="text-xs">Média</SelectItem>
                    <SelectItem value="lg" className="text-xs">Forte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* D. Background */}
          <AccordionItem value="background" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">Background & Efeitos</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo de Fundo</Label>
                <Select value={values.bg_type} onValueChange={(v) => update("bg_type", v)}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solid" className="text-xs">Cor Sólida</SelectItem>
                    <SelectItem value="gradient" className="text-xs">Gradiente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {values.bg_type === "gradient" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <ColorPicker label="De" value={values.gradient_from} onChange={(v) => update("gradient_from", v)} presets={[]} />
                    <ColorPicker label="Para" value={values.gradient_to} onChange={(v) => update("gradient_to", v)} presets={[]} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Ângulo: {values.gradient_angle}°</Label>
                    <Slider min={0} max={360} step={15} value={[values.gradient_angle]} onValueChange={([v]) => update("gradient_angle", v)} />
                  </div>
                </>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs">Opacidade Overlay: {values.overlay_opacity}%</Label>
                <Slider min={0} max={100} step={5} value={[values.overlay_opacity]} onValueChange={([v]) => update("overlay_opacity", v)} />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Preview */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-muted px-4 py-2 border-b">
          <span className="text-xs font-medium text-muted-foreground">Pré-visualização</span>
        </div>
        <div
          className="p-6 min-h-[400px] transition-all duration-300"
          style={{
            ...bgStyle,
            color: values.text_color,
            fontSize: `${values.font_size_base}px`,
            fontFamily: values.font_body,
          }}
        >
          {values.overlay_opacity > 0 && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ backgroundColor: `rgba(0,0,0,${values.overlay_opacity / 100})` }}
            />
          )}
          <div className="space-y-6 relative">
            {/* Hero */}
            <div className="space-y-3">
              <h2
                className="text-2xl"
                style={{ fontFamily: values.font_heading, fontWeight: values.heading_weight, color: values.text_color }}
              >
                Título de Exemplo Premium
              </h2>
              <p style={{ color: values.text_color, opacity: 0.7, fontFamily: values.font_body }}>
                Subtítulo com a descrição da oferta e proposta de valor única.
              </p>
            </div>

            {/* Card example */}
            <div
              className="border p-4"
              style={{
                borderRadius: `${values.border_radius}px`,
                boxShadow: shadowMap[values.shadow],
                backgroundColor: values.bg_type === "gradient" ? "rgba(255,255,255,0.9)" : values.background,
              }}
            >
              <h3
                className="text-lg mb-2"
                style={{ fontFamily: values.font_heading, fontWeight: values.heading_weight, color: values.text_color }}
              >
                Card de Conteúdo
              </h3>
              <p className="text-sm" style={{ color: values.text_color, opacity: 0.6, fontFamily: values.font_body }}>
                Exemplo de conteúdo dentro de um card com as definições actuais de design.
              </p>
            </div>

            {/* CTA */}
            <div>
              {values.cta_style === "filled" && (
                <button
                  className="px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{
                    backgroundColor: values.primaria,
                    borderRadius: `${values.border_radius}px`,
                    boxShadow: shadowMap[values.shadow],
                  }}
                >
                  Botão CTA Exemplo
                </button>
              )}
              {values.cta_style === "outline" && (
                <button
                  className="px-6 py-3 text-sm font-semibold border-2 transition-opacity hover:opacity-90"
                  style={{
                    borderColor: values.primaria,
                    color: values.primaria,
                    borderRadius: `${values.border_radius}px`,
                    backgroundColor: "transparent",
                  }}
                >
                  Botão CTA Exemplo
                </button>
              )}
              {values.cta_style === "gradient" && (
                <button
                  className="px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{
                    background: `linear-gradient(135deg, ${values.primaria}, ${values.accent})`,
                    borderRadius: `${values.border_radius}px`,
                    boxShadow: shadowMap[values.shadow],
                  }}
                >
                  Botão CTA Exemplo
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
