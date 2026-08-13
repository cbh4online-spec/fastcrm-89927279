import { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { X, Search, Minus, Plus, Check, ScanLine, CloudOff, ChevronRight, Camera } from "lucide-react";
import { toast } from "sonner";
import {
  useStockCount, useStockCountItems, useStockCountProgress, useSubmitStockCountItem,
  type StockCountItem,
} from "@/hooks/useStockCounts";

/**
 * Modo de contagem full-screen, desenhado para telemóvel:
 * um item de cada vez, teclado numérico grande e leitura de código de barras.
 */
export default function StockCountModePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: count } = useStockCount(id);
  const { data: items = [], isLoading } = useStockCountItems(id);
  const stats = useStockCountProgress(items);
  const { submit, pendingCount } = useSubmitStockCountItem(id);

  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [qty, setQty] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [scanning, setScanning] = useState(false);
  const qtyRef = useRef<HTMLInputElement>(null);

  const pendingItems = useMemo(() => items.filter((i) => i.counted_qty === null), [items]);

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = q
      ? items.filter((i) => i.product_name.toLowerCase().includes(q) || (i.sku || "").toLowerCase().includes(q))
      : pendingItems;
    return base.slice(0, 40);
  }, [items, pendingItems, search]);

  const active: StockCountItem | undefined = useMemo(
    () => items.find((i) => i.id === activeId),
    [items, activeId],
  );

  // Seleciona automaticamente o primeiro por contar quando não há nada ativo
  useEffect(() => {
    if (!activeId && pendingItems.length > 0 && !search) setActiveId(pendingItems[0].id);
  }, [activeId, pendingItems, search]);

  useEffect(() => {
    setQty(active?.counted_qty != null ? String(active.counted_qty) : "");
    setNotes(active?.notes || "");
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickNext = () => {
    const remaining = items.filter((i) => i.counted_qty === null && i.id !== activeId);
    setActiveId(remaining[0]?.id ?? null);
    setSearch("");
  };

  const handleSave = async () => {
    if (!active) return;
    const parsed = Math.trunc(Number(qty));
    if (qty === "" || Number.isNaN(parsed) || parsed < 0) {
      toast.error("Introduza uma quantidade válida");
      return;
    }
    await submit({ productId: active.product_id, qty: parsed, notes: notes || null });
    pickNext();
  };

  const bump = (delta: number) => {
    const current = qty === "" ? 0 : Number(qty);
    setQty(String(Math.max(0, current + delta)));
  };

  /* ─────────── Leitura de código de barras ─────────── */
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopScan = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  };

  const startScan = async () => {
    const Detector = (window as any).BarcodeDetector;
    if (!Detector) {
      toast.info("Este dispositivo não suporta leitura por câmara. Use a pesquisa por SKU.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setScanning(true);
      setTimeout(async () => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        const detector = new Detector();
        const tick = async () => {
          if (!streamRef.current || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes?.length) {
              const value = String(codes[0].rawValue || "").trim();
              const match = items.find((i) => (i.sku || "").toLowerCase() === value.toLowerCase());
              stopScan();
              if (match) {
                setActiveId(match.id);
                setSearch("");
                toast.success(`Encontrado: ${match.product_name}`);
                qtyRef.current?.focus();
              } else {
                setSearch(value);
                toast.warning(`Código ${value} não está nesta contagem`);
              }
              return;
            }
          } catch {
            /* frame inválido — continuar */
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }, 150);
    } catch {
      toast.error("Não foi possível aceder à câmara");
    }
  };

  useEffect(() => () => stopScan(), []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <Helmet><title>Modo contagem | FastCRM</title></Helmet>

      {/* Cabeçalho */}
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Button variant="ghost" size="icon" aria-label="Sair do modo contagem" onClick={() => navigate(`/dashboard/stock-counts/${id}`)}>
          <X className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate text-sm">{count?.name || "Contagem"}</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden max-w-[180px]">
              <div className="h-full bg-primary transition-all" style={{ width: `${stats.progress}%` }} />
            </div>
            <span className="text-[11px] text-muted-foreground tabular-nums">{stats.counted}/{stats.total}</span>
          </div>
        </div>
        {pendingCount > 0 && (
          <Badge variant="outline" className="gap-1 shrink-0">
            <CloudOff className="h-3 w-3" /> {pendingCount}
          </Badge>
        )}
      </header>

      {/* Pesquisa + scanner */}
      <div className="flex gap-2 px-4 py-3 border-b border-border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Procurar por nome ou SKU..."
            className="pl-9 h-12 rounded-xl"
            aria-label="Procurar produto"
          />
        </div>
        <Button variant="outline" className="h-12 w-12 rounded-xl p-0" onClick={startScan} aria-label="Ler código de barras">
          <ScanLine className="h-5 w-5" />
        </Button>
      </div>

      {/* Scanner */}
      {scanning && (
        <div className="relative border-b border-border bg-black">
          <video ref={videoRef} className="w-full h-56 object-cover" muted playsInline />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-2/3 h-20 border-2 border-primary rounded-lg" />
          </div>
          <Button size="sm" variant="secondary" className="absolute top-2 right-2" onClick={stopScan}>
            <Camera className="h-4 w-4 mr-1" /> Parar
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
          </div>
        ) : stats.total === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-16 px-6">
            Esta contagem não tem linhas. Volte ao detalhe e atualize as linhas.
          </p>
        ) : (
          <>
            {/* Item ativo */}
            {active ? (
              <section className="p-4 border-b border-border">
                <p className="text-lg font-semibold leading-snug">{active.product_name}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {active.sku && (
                    <code className="font-mono text-xs bg-muted rounded px-2 py-1">{active.sku}</code>
                  )}
                  {!count?.blind_count && (
                    <span className="text-xs text-muted-foreground">Sistema: {active.expected_qty}</span>
                  )}
                  {active.counted_qty !== null && (
                    <Badge variant="secondary" className="gap-1"><Check className="h-3 w-3" /> Já contado</Badge>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <Button variant="outline" className="h-16 w-16 rounded-2xl shrink-0" onClick={() => bump(-1)} aria-label="Diminuir">
                    <Minus className="h-6 w-6" />
                  </Button>
                  <Input
                    ref={qtyRef}
                    value={qty}
                    onChange={(e) => setQty(e.target.value.replace(/[^\d]/g, ""))}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="0"
                    aria-label="Quantidade contada"
                    className="h-16 text-center text-3xl font-semibold tabular-nums rounded-2xl"
                  />
                  <Button variant="outline" className="h-16 w-16 rounded-2xl shrink-0" onClick={() => bump(1)} aria-label="Aumentar">
                    <Plus className="h-6 w-6" />
                  </Button>
                </div>

                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Nota (opcional)"
                  rows={2}
                  maxLength={300}
                  className="mt-3 rounded-xl"
                />

                <Button className="w-full h-14 rounded-2xl mt-3 text-base gap-2" onClick={handleSave}>
                  <Check className="h-5 w-5" /> Guardar e seguinte
                </Button>
              </section>
            ) : (
              <div className="p-6 text-center space-y-3">
                <Check className="h-10 w-10 mx-auto text-emerald-600" />
                <p className="text-sm text-muted-foreground">Todos os itens desta contagem foram contados.</p>
                <Button variant="outline" className="rounded-full" onClick={() => navigate(`/dashboard/stock-counts/${id}`)}>
                  Rever e fechar
                </Button>
              </div>
            )}

            {/* Lista */}
            <ul className="divide-y divide-border">
              {results.map((i) => (
                <li key={i.id}>
                  <button
                    type="button"
                    onClick={() => { setActiveId(i.id); setSearch(""); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 active:bg-muted transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{i.product_name}</p>
                      <p className="text-[11px] text-muted-foreground font-mono truncate">{i.sku || "sem SKU"}</p>
                    </div>
                    {i.counted_qty !== null && (
                      <Badge variant="secondary" className="tabular-nums shrink-0">{i.counted_qty}</Badge>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                </li>
              ))}
              {results.length === 0 && (
                <li className="px-4 py-8 text-center text-sm text-muted-foreground">Sem resultados.</li>
              )}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
