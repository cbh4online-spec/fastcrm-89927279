import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlignLeft, AlignCenter, AlignRight, AlignJustify, X } from "lucide-react";
import type { VisualSelection } from "./BuilderVisualEditor";
import type { BuilderPatch } from "../lib/builderHtmlPatch";
import { BlockAIRefactorButton } from "./BlockAIRefactorButton";

interface Props {
  selection: VisualSelection | null;
  fullHtml: string;
  onPatch: (patch: BuilderPatch) => void;
  onClear: () => void;
}

const FONT_WEIGHTS = ["300", "400", "500", "600", "700", "800"];
const ALIGN: Array<{ value: string; icon: typeof AlignLeft }> = [
  { value: "left", icon: AlignLeft },
  { value: "center", icon: AlignCenter },
  { value: "right", icon: AlignRight },
  { value: "justify", icon: AlignJustify },
];

function px(value: string | undefined): string {
  if (!value) return "";
  const m = value.match(/^(-?\d+(?:\.\d+)?)/);
  return m ? m[1] : "";
}

function toPx(n: string): string {
  if (!n.trim()) return "";
  return /^-?\d+(?:\.\d+)?$/.test(n.trim()) ? `${n.trim()}px` : n.trim();
}

function normalizeColor(value: string | undefined): string {
  if (!value) return "#000000";
  if (value.startsWith("#")) return value.length === 7 ? value : "#000000";
  return "#000000";
}

export function BuilderPropertiesPanel({ selection, fullHtml, onPatch, onClear }: Props) {
  if (!selection) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6 text-xs text-muted-foreground">
        <div className="rounded-full bg-muted p-3 mb-3">
          <AlignLeft className="h-4 w-4" />
        </div>
        <p className="font-medium text-sm text-foreground mb-1">Nenhum elemento seleccionado</p>
        <p>Clica num elemento no editor visual para editar as suas propriedades.</p>
      </div>
    );
  }

  const { bid, tag, attrs, computed, text } = selection;

  const setStyle = (styles: Record<string, string | null>) =>
    onPatch({ type: "style", bid, styles });
  const setAttr = (name: string, value: string | null) =>
    onPatch({ type: "attr", bid, name, value });
  const setText = (value: string) => onPatch({ type: "text", bid, value });

  const isImage = tag === "img";
  const isLink = tag === "a";

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-background/60 backdrop-blur shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] uppercase tracking-wide font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0">
            {tag}
          </span>
          <span className="text-xs text-muted-foreground truncate">#{bid}</span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClear} aria-label="Desseleccionar">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Tabs defaultValue="content" className="flex-1 min-h-0 flex flex-col">
        <TabsList className="grid grid-cols-3 m-2 mb-0 shrink-0">
          <TabsTrigger value="content" className="text-xs">Conteúdo</TabsTrigger>
          <TabsTrigger value="typography" className="text-xs">Texto</TabsTrigger>
          <TabsTrigger value="layout" className="text-xs">Layout</TabsTrigger>
        </TabsList>

        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
          <TabsContent value="content" className="space-y-3 m-0">
            {text !== null && !isImage && (
              <Field label="Texto">
                <textarea
                  className="w-full text-sm rounded-md border bg-background px-2 py-1.5 min-h-[80px] resize-y"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              </Field>
            )}

            {isImage && (
              <>
                <Field label="URL da imagem (src)">
                  <Input value={attrs.src || ""} onChange={(e) => setAttr("src", e.target.value)} />
                </Field>
                <Field label="Texto alternativo (alt)">
                  <Input value={attrs.alt || ""} onChange={(e) => setAttr("alt", e.target.value)} />
                </Field>
              </>
            )}

            {isLink && (
              <Field label="Link (href)">
                <Input value={attrs.href || ""} onChange={(e) => setAttr("href", e.target.value)} />
              </Field>
            )}

            {("title" in attrs || isLink || isImage) && (
              <Field label="Title">
                <Input value={attrs.title || ""} onChange={(e) => setAttr("title", e.target.value)} />
              </Field>
            )}
          </TabsContent>

          <TabsContent value="typography" className="space-y-3 m-0">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Cor texto">
                <ColorInput
                  value={normalizeColor(computed.color)}
                  onChange={(v) => setStyle({ color: v })}
                  onClear={() => setStyle({ color: null })}
                />
              </Field>
              <Field label="Fundo">
                <ColorInput
                  value={normalizeColor(computed.backgroundColor)}
                  onChange={(v) => setStyle({ backgroundColor: v })}
                  onClear={() => setStyle({ backgroundColor: null })}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Field label="Tamanho (px)">
                <Input
                  type="number"
                  value={px(computed.fontSize)}
                  onChange={(e) => setStyle({ fontSize: toPx(e.target.value) })}
                />
              </Field>
              <Field label="Peso">
                <select
                  className="w-full h-9 rounded-md border bg-background px-2 text-sm"
                  value={computed.fontWeight || "400"}
                  onChange={(e) => setStyle({ fontWeight: e.target.value })}
                >
                  {FONT_WEIGHTS.map((w) => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Alinhamento">
              <div className="flex gap-1">
                {ALIGN.map(({ value, icon: Icon }) => (
                  <Button
                    key={value}
                    type="button"
                    variant={computed.textAlign === value ? "secondary" : "outline"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setStyle({ textAlign: value })}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </Button>
                ))}
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-2">
              <Field label="Line-height">
                <Input
                  value={computed.lineHeight === "normal" ? "" : px(computed.lineHeight)}
                  placeholder="auto"
                  onChange={(e) => setStyle({ lineHeight: e.target.value ? toPx(e.target.value) : null })}
                />
              </Field>
              <Field label="Letter-spacing">
                <Input
                  value={computed.letterSpacing === "normal" ? "" : px(computed.letterSpacing)}
                  placeholder="0"
                  onChange={(e) => setStyle({ letterSpacing: e.target.value ? toPx(e.target.value) : null })}
                />
              </Field>
            </div>
          </TabsContent>

          <TabsContent value="layout" className="space-y-4 m-0">
            <div>
              <Label className="text-xs mb-2 block">Padding (px)</Label>
              <BoxInput
                values={{
                  top: px(computed.paddingTop),
                  right: px(computed.paddingRight),
                  bottom: px(computed.paddingBottom),
                  left: px(computed.paddingLeft),
                }}
                onChange={(side, v) =>
                  setStyle({ [`padding${cap(side)}`]: v ? toPx(v) : null })
                }
              />
            </div>
            <Separator />
            <div>
              <Label className="text-xs mb-2 block">Margin (px)</Label>
              <BoxInput
                values={{
                  top: px(computed.marginTop),
                  right: px(computed.marginRight),
                  bottom: px(computed.marginBottom),
                  left: px(computed.marginLeft),
                }}
                onChange={(side, v) =>
                  setStyle({ [`margin${cap(side)}`]: v ? toPx(v) : null })
                }
              />
            </div>
            <Separator />
            <Field label="Border radius (px)">
              <Input
                type="number"
                value={px(computed.borderRadius)}
                onChange={(e) => setStyle({ borderRadius: e.target.value ? toPx(e.target.value) : null })}
              />
            </Field>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ColorInput({ value, onChange, onClear }: { value: string; onChange: (v: string) => void; onClear: () => void }) {
  return (
    <div className="flex items-center gap-1">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-12 rounded-md border bg-background cursor-pointer"
      />
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-9 text-xs flex-1" />
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onClear} aria-label="Limpar cor">
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

type Side = "top" | "right" | "bottom" | "left";
function BoxInput({
  values,
  onChange,
}: {
  values: Record<Side, string>;
  onChange: (side: Side, v: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1.5 items-center max-w-[220px] mx-auto">
      <div />
      <Input
        type="number"
        value={values.top}
        onChange={(e) => onChange("top", e.target.value)}
        className="h-8 text-xs text-center"
        placeholder="0"
      />
      <div />
      <Input
        type="number"
        value={values.left}
        onChange={(e) => onChange("left", e.target.value)}
        className="h-8 text-xs text-center"
        placeholder="0"
      />
      <div className="text-[10px] text-muted-foreground text-center">px</div>
      <Input
        type="number"
        value={values.right}
        onChange={(e) => onChange("right", e.target.value)}
        className="h-8 text-xs text-center"
        placeholder="0"
      />
      <div />
      <Input
        type="number"
        value={values.bottom}
        onChange={(e) => onChange("bottom", e.target.value)}
        className="h-8 text-xs text-center"
        placeholder="0"
      />
      <div />
    </div>
  );
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
