import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { FileText, Search, Sparkles, Eye } from "lucide-react";
import { useWhatsAppTemplates, type WhatsAppTemplate } from "@/hooks/useWhatsAppTemplates";
import {
  detectQuickVariables,
  renderQuickTemplate,
  resolveQuickVariables,
  QUICK_VARIABLES,
  type QuickVariableContext,
} from "@/lib/whatsappQuickVariables";

interface Props {
  /** Contexto auto-resolvido (contacto/produto/loja/agente). */
  context?: QuickVariableContext;
  /** Chamado quando o utilizador insere o template renderizado. */
  onInsert: (rendered: string) => void;
  /** Texto do botão de trigger. */
  triggerLabel?: string;
  /** Variante visual do botão. */
  triggerVariant?: "default" | "outline" | "ghost" | "secondary";
  /** Filtrar apenas templates marcados com tag "quick". */
  onlyQuick?: boolean;
  className?: string;
}

/**
 * Picker reutilizável para inserir templates WhatsApp num compositor.
 * Usa a tabela `communication_templates` (channel='whatsapp').
 * Renderiza variáveis curtas (`{{nome}}`, `{{produto}}`, ...) com auto-fill
 * do contexto + edição manual antes de inserir.
 */
export function WhatsAppTemplatePicker({
  context,
  onInsert,
  triggerLabel = "Templates",
  triggerVariant = "outline",
  onlyQuick = false,
  className,
}: Props) {
  const { data: templates, isLoading } = useWhatsAppTemplates();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<WhatsAppTemplate | null>(null);
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    let list = (templates || []).filter((t) => t.is_active !== false);
    if (onlyQuick) list = list.filter((t) => (t.tags || []).includes("quick"));
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) => t.name.toLowerCase().includes(q) || t.body.toLowerCase().includes(q),
      );
    }
    return list;
  }, [templates, search, onlyQuick]);

  const ctxWithOverrides: QuickVariableContext = useMemo(
    () => ({ ...(context || {}), overrides: { ...(context?.overrides || {}), ...overrides } }),
    [context, overrides],
  );

  const detected = useMemo(
    () => (selected ? detectQuickVariables(selected.body) : []),
    [selected],
  );

  const autoResolved = useMemo(
    () => resolveQuickVariables(context || {}),
    [context],
  );

  const preview = useMemo(
    () => (selected ? renderQuickTemplate(selected.body, ctxWithOverrides) : ""),
    [selected, ctxWithOverrides],
  );

  function reset() {
    setSelected(null);
    setOverrides({});
    setSearch("");
  }

  function handleInsert() {
    if (!selected) return;
    onInsert(preview);
    setOpen(false);
    reset();
  }

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <PopoverTrigger asChild>
        <Button type="button" variant={triggerVariant} size="sm" className={className}>
          <FileText className="h-4 w-4 mr-2" />
          {triggerLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[520px] p-0" align="start">
        {!selected ? (
          <div>
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar templates..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9"
                  autoFocus
                />
              </div>
            </div>
            <ScrollArea className="h-[360px]">
              {isLoading ? (
                <div className="p-6 text-sm text-muted-foreground">A carregar...</div>
              ) : filtered.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground text-center">
                  Sem templates {onlyQuick ? "rápidos " : ""}para mostrar.
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filtered.map((t) => {
                    const vars = detectQuickVariables(t.body);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelected(t)}
                        className="w-full text-left p-2.5 rounded-md hover:bg-accent transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="font-medium text-sm truncate">{t.name}</div>
                          {t.category && (
                            <Badge variant="secondary" className="text-xs shrink-0">
                              {t.category}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-line">
                          {t.body}
                        </div>
                        {vars.length > 0 && (
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {vars.slice(0, 4).map((v) => (
                              <span key={v} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                                {`{{${v}}}`}
                              </span>
                            ))}
                            {vars.length > 4 && (
                              <span className="text-[10px] text-muted-foreground">+{vars.length - 4}</span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        ) : (
          <div>
            <div className="p-3 border-b flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{selected.name}</div>
                <div className="text-xs text-muted-foreground">
                  {detected.length} variáve{detected.length === 1 ? "l" : "is"} detetada{detected.length === 1 ? "" : "s"}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                Voltar
              </Button>
            </div>

            <ScrollArea className="max-h-[300px]">
              <div className="p-3 space-y-3">
                {detected.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Sparkles className="h-3 w-3" />
                      Variáveis
                    </div>
                    {detected.map((key) => {
                      const def = QUICK_VARIABLES.find((v) => v.key === key);
                      const auto = autoResolved[key] || "";
                      return (
                        <div key={key} className="space-y-1">
                          <Label className="text-xs flex items-center justify-between">
                            <span className="font-mono">{`{{${key}}}`}</span>
                            <span className="text-muted-foreground font-normal">
                              {def?.label || "personalizada"}
                            </span>
                          </Label>
                          <Input
                            value={overrides[key] ?? auto}
                            onChange={(e) =>
                              setOverrides((o) => ({ ...o, [key]: e.target.value }))
                            }
                            placeholder={def?.example || `Valor para ${key}`}
                            className="h-8 text-sm"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                <Separator />

                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Eye className="h-3 w-3" />
                    Pré-visualização
                  </div>
                  <div className="rounded-md bg-muted/40 p-3 text-sm whitespace-pre-line border">
                    {preview || <span className="text-muted-foreground">(vazio)</span>}
                  </div>
                </div>
              </div>
            </ScrollArea>

            <div className="p-3 border-t flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setOpen(false); reset(); }}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleInsert} disabled={!preview.trim()}>
                Inserir
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
