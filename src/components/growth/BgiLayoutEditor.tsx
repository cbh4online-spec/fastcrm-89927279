import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, GripVertical, Loader2, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import type { IndicatorDefinition } from "@/lib/bgi/indicatorCatalog";
import { isSupportedFormula } from "@/lib/bgi/formatIndicator";
import { MAX_VISIBLE_INDICATORS, orderIndicators, type DashboardLayout } from "@/lib/bgi/dashboardLayout";
import { useBgiSettings } from "@/hooks/useBgiSettings";

interface Props { indicators: IndicatorDefinition[]; layout: DashboardLayout }

export function BgiLayoutEditor({ indicators, layout }: Props) {
  const { saveLayout } = useBgiSettings();
  const [open, setOpen] = useState(false);
  const [order, setOrder] = useState<string[]>([]);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [dragId, setDragId] = useState<string | null>(null);

  const initial = useMemo(() => ({
    order: orderIndicators(indicators, layout.order).map((i) => i.id),
    hidden: new Set(layout.hidden.filter((h) => indicators.some((i) => i.id === h))),
  }), [indicators, layout]);

  useEffect(() => { if (open) { setOrder(initial.order); setHidden(new Set(initial.hidden)); } }, [open, initial]);

  const byId = useMemo(() => new Map(indicators.map((i) => [i.id, i])), [indicators]);
  const dirty = order.join() !== initial.order.join() || [...hidden].sort().join() !== [...initial.hidden].sort().join();
  const visibleCount = order.filter((id) => !hidden.has(id)).length;

  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length) return;
    setOrder((o) => { const n = [...o]; const [x] = n.splice(from, 1); n.splice(to, 0, x); return n; });
  };
  const close = (next: boolean) => {
    if (!next && dirty && !window.confirm("Tem alterações por guardar. Sair sem guardar?")) return;
    setOpen(next);
  };
  const submit = () => saveLayout.mutate({ order, hidden: [...hidden] }, {
    onSuccess: () => { toast.success("Painel guardado"); setOpen(false); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível guardar"),
  });

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <SlidersHorizontal className="h-4 w-4 mr-2" /> Personalizar painel
      </Button>
      <Sheet open={open} onOpenChange={close}>
        <SheetContent className="w-full sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle>Personalizar painel</SheetTitle>
            <SheetDescription>Escolha e ordene os indicadores. Aplica-se a toda a organização. {visibleCount}/{MAX_VISIBLE_INDICATORS} visíveis.</SheetDescription>
          </SheetHeader>
          <ol className="flex-1 overflow-y-auto space-y-2 py-4">
            {order.map((id, idx) => {
              const i = byId.get(id); if (!i) return null;
              return (
                <li key={id} draggable onDragStart={() => setDragId(id)} onDragEnd={() => setDragId(null)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => { if (dragId) move(order.indexOf(dragId), idx); }}
                  className={`flex items-center gap-2 rounded-lg border border-border p-2 ${dragId === id ? "opacity-50" : ""}`}>
                  <GripVertical className="h-4 w-4 text-muted-foreground hidden sm:block cursor-grab" aria-hidden />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{i.name}</p>
                    {!isSupportedFormula(i.formula) && <Badge variant="outline" className="text-[10px]">Em breve</Badge>}
                  </div>
                  <Button size="icon" variant="ghost" aria-label={`Subir ${i.name}`} disabled={idx === 0} onClick={() => move(idx, idx - 1)}><ArrowUp className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" aria-label={`Descer ${i.name}`} disabled={idx === order.length - 1} onClick={() => move(idx, idx + 1)}><ArrowDown className="h-4 w-4" /></Button>
                  <Switch aria-label={`Mostrar ${i.name}`} checked={!hidden.has(id)}
                    onCheckedChange={(v) => setHidden((h) => { const n = new Set(h); v ? n.delete(id) : n.add(id); return n; })} />
                </li>
              );
            })}
          </ol>
          <SheetFooter className="gap-2 sm:justify-between">
            <Button variant="ghost" onClick={() => { setOrder(indicators.map((i) => i.id)); setHidden(new Set()); }}>Repor padrão</Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => close(false)}>Cancelar</Button>
              <Button disabled={!dirty || saveLayout.isPending} onClick={submit}>
                {saveLayout.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
