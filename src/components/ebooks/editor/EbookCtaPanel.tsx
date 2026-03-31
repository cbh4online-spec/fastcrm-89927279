import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, MousePointerClick, AlertTriangle } from "lucide-react";
import { useEbookCtas, useCreateEbookCta, useUpdateEbookCta, useDeleteEbookCta, type EbookCta } from "@/hooks/useEbookCtas";

interface EbookCtaPanelProps {
  ebookId: string;
  workspaceId: string;
  chapters: { id: string; title: string }[];
}

const CTA_TYPES = [
  { value: "link", label: "Link externo" },
  { value: "external_link", label: "Link externo" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "booking", label: "Agendamento" },
  { value: "form", label: "Formulário" },
  { value: "contact", label: "Contacto" },
  { value: "internal", label: "Página interna" },
];

const STYLE_VARIANTS = [
  { value: "default", label: "Padrão" },
  { value: "prominent", label: "Destaque" },
  { value: "subtle", label: "Subtil" },
];

function needsUrl(type: string): boolean {
  return ["link", "external_link", "internal", "booking", "whatsapp"].includes(type);
}

export function EbookCtaPanel({ ebookId, workspaceId, chapters }: EbookCtaPanelProps) {
  const { data: ctas = [], isLoading } = useEbookCtas(ebookId);
  const createCta = useCreateEbookCta();
  const updateCta = useUpdateEbookCta();
  const deleteCta = useDeleteEbookCta();
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState("link");
  const [newUrl, setNewUrl] = useState("");
  const [newPosition, setNewPosition] = useState("end");
  const [newWhatsapp, setNewWhatsapp] = useState("");
  const [newBookingLink, setNewBookingLink] = useState("");
  const [newStyleVariant, setNewStyleVariant] = useState("default");

  const handleAdd = () => {
    if (!newLabel.trim()) return;
    createCta.mutate({
      ebook_id: ebookId,
      workspace_id: workspaceId,
      label: newLabel,
      cta_type: newType,
      target_url: newUrl || null,
      position: newPosition,
      is_active: true,
      sort_order: ctas.length,
      chapter_id: null,
      whatsapp_number: newWhatsapp || undefined,
      booking_link: newBookingLink || undefined,
      style_variant: newStyleVariant,
    } as any);
    setNewLabel("");
    setNewUrl("");
    setNewWhatsapp("");
    setNewBookingLink("");
    setAdding(false);
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <MousePointerClick className="h-3.5 w-3.5 text-muted-foreground" /> CTAs
          </span>
          <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => setAdding(true)}>
            <Plus className="h-3 w-3" /> Adicionar
          </Button>
        </div>

        {adding && (
          <div className="space-y-2 p-2 rounded-md border border-border/40 bg-muted/30">
            <Input placeholder="Label do CTA" value={newLabel} onChange={e => setNewLabel(e.target.value)} className="h-7 text-xs" />
            <Select value={newType} onValueChange={setNewType}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CTA_TYPES.filter(t => t.value !== "external_link").map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Type-specific fields */}
            {newType === "whatsapp" && (
              <Input placeholder="Número WhatsApp (ex: 351912345678)" value={newWhatsapp} onChange={e => setNewWhatsapp(e.target.value)} className="h-7 text-xs" />
            )}
            {newType === "booking" && (
              <Input placeholder="Link de agendamento" value={newBookingLink} onChange={e => setNewBookingLink(e.target.value)} className="h-7 text-xs" />
            )}
            {needsUrl(newType) && newType !== "whatsapp" && newType !== "booking" && (
              <Input placeholder="URL de destino" value={newUrl} onChange={e => setNewUrl(e.target.value)} className="h-7 text-xs" />
            )}

            <Select value={newPosition} onValueChange={setNewPosition}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="end">Final do eBook</SelectItem>
                <SelectItem value="inline">Inline</SelectItem>
                {chapters.map(ch => (
                  <SelectItem key={ch.id} value={`after_${ch.id}`}>Após: {ch.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={newStyleVariant} onValueChange={setNewStyleVariant}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STYLE_VARIANTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs flex-1" onClick={handleAdd} disabled={createCta.isPending}>Guardar</Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAdding(false)}>Cancelar</Button>
            </div>
          </div>
        )}

        {isLoading && <p className="text-xs text-muted-foreground">A carregar...</p>}

        {ctas.map((cta) => {
          const hasUrlIssue = cta.is_active && needsUrl(cta.cta_type) && !cta.target_url?.trim() && !(cta as any).whatsapp_number?.trim() && !(cta as any).booking_link?.trim();
          return (
            <div key={cta.id} className={`flex items-center gap-2 p-2 rounded-md border bg-card/50 ${hasUrlIssue ? "border-amber-500/50" : "border-border/30"}`}>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{cta.label}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {CTA_TYPES.find(t => t.value === cta.cta_type)?.label || cta.cta_type} • {cta.position === "end" ? "Final" : cta.position}
                </p>
                {hasUrlIssue && (
                  <p className="text-[10px] text-amber-500 flex items-center gap-1 mt-0.5">
                    <AlertTriangle className="h-2.5 w-2.5" /> Sem URL válido
                  </p>
                )}
              </div>
              <label className="shrink-0">
                <input
                  type="checkbox"
                  checked={cta.is_active}
                  onChange={(e) => updateCta.mutate({ id: cta.id, ebook_id: cta.ebook_id, is_active: e.target.checked })}
                  className="rounded border-border"
                />
              </label>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => deleteCta.mutate({ id: cta.id, ebookId: cta.ebook_id })}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          );
        })}

        {!isLoading && ctas.length === 0 && !adding && (
          <p className="text-xs text-muted-foreground text-center py-4">Nenhum CTA configurado</p>
        )}
      </div>
    </ScrollArea>
  );
}
