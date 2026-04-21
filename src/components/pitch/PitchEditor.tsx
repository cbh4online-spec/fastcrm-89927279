import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ChevronLeft, ChevronRight, Maximize2, Download, PanelLeftClose, PanelLeftOpen, Loader2 } from 'lucide-react';
import { PitchSlideCanvas } from './PitchSlideCanvas';
import { PitchCustomizationPanel } from './PitchCustomizationPanel';
import { PitchSlideEditor } from './PitchSlideEditor';
import { PitchPresenterMode } from './PitchPresenterMode';
import { PITCH_SLIDES, getActiveSlides } from './slides';
import { usePitchConfig } from '@/hooks/usePitchConfig';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function PitchEditor() {
  const config = usePitchConfig();
  const { tokens } = config;
  const [index, setIndex] = useState(0);
  const [presenting, setPresenting] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [exporting, setExporting] = useState(false);

  const activeSlides = getActiveSlides(tokens.enabledSlides);
  const total = activeSlides.length;
  const safeIndex = Math.min(index, total - 1);
  const Slide = activeSlides[safeIndex].component;

  const enterPresent = async () => {
    try { await document.documentElement.requestFullscreen(); } catch { /* ignore */ }
    setPresenting(true);
  };

  const exitPresent = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    setPresenting(false);
  };

  const handleExport = async (opts?: { force?: boolean }) => {
    if (!tokens.companyName.trim()) {
      toast.error('Indica o nome da empresa antes de exportar.');
      return;
    }
    if (!opts?.force) {
      const { findMissingPrices, summarizeMissing } = await import('@/lib/pitch/validatePricing');
      const missing = findMissingPrices(tokens);
      if (missing.length > 0) {
        toast.warning(
          `${missing.length} módulo(s) sem preço: ${summarizeMissing(missing)}`,
          {
            description: 'Define o preço no painel do slide ou clica em "Exportar mesmo assim".',
            duration: 8000,
            action: {
              label: 'Exportar mesmo assim',
              onClick: () => handleExport({ force: true }),
            },
          }
        );
        return;
      }
    }
    setExporting(true);
    try {
      const { exportPitchToPptx } = await import('@/lib/pitch/exportPptx');
      await exportPitchToPptx(tokens);
      toast.success('Apresentação .pptx descarregada.');
    } catch (e) {
      console.error(e);
      toast.error('Falha ao gerar .pptx. Tenta novamente.');
    } finally {
      setExporting(false);
    }
  };

  if (presenting) {
    return <PitchPresenterMode tokens={tokens} index={index} setIndex={setIndex} onExit={exitPresent} />;
  }

  return (
    <div className="flex h-full bg-muted/30">
      <aside
        className={cn(
          'border-r bg-card transition-all duration-200 overflow-hidden flex-shrink-0',
          panelOpen ? 'w-[360px]' : 'w-0'
        )}
      >
        <div className="h-full flex flex-col">
          <Tabs defaultValue="client" className="h-full flex flex-col">
            <TabsList className="m-3 grid grid-cols-2">
              <TabsTrigger value="client">Cliente</TabsTrigger>
              <TabsTrigger value="slide">Slide atual</TabsTrigger>
            </TabsList>
            <TabsContent value="client" className="flex-1 overflow-hidden mt-0">
              <PitchCustomizationPanel config={config} />
            </TabsContent>
            <TabsContent value="slide" className="flex-1 overflow-hidden mt-0">
              <PitchSlideEditor config={config} currentIndex={index} onSelectSlide={setIndex} />
            </TabsContent>
          </Tabs>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b bg-card">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setPanelOpen((o) => !o)} title={panelOpen ? 'Fechar painel' : 'Abrir painel'}>
              {panelOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
            </Button>
            <div className="text-sm font-medium text-muted-foreground">
              {activeSlides[safeIndex].title}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" disabled={safeIndex === 0} onClick={() => setIndex(safeIndex - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-3 text-sm font-mono tabular-nums">{safeIndex + 1} / {total}</div>
            <Button variant="outline" size="icon" disabled={safeIndex === total - 1} onClick={() => setIndex(safeIndex + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={exporting} onClick={handleExport}>
              {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Exportar .pptx
            </Button>
            <Button onClick={enterPresent} size="sm">
              <Maximize2 className="h-4 w-4 mr-2" /> Apresentar
            </Button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
          <div className="w-full max-w-[1600px]" style={{ aspectRatio: '16 / 9' }}>
            <PitchSlideCanvas>
              <Slide tokens={tokens} pageNumber={safeIndex + 1} total={total} />
            </PitchSlideCanvas>
          </div>
        </div>

        <div className="border-t bg-card overflow-x-auto">
          <div className="flex gap-2 p-3">
            {activeSlides.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setIndex(i)}
                className={cn(
                  'flex-shrink-0 w-32 rounded-md border-2 overflow-hidden transition',
                  i === safeIndex ? 'border-primary shadow-md' : 'border-transparent opacity-60 hover:opacity-100'
                )}
              >
                <div className="bg-white" style={{ aspectRatio: '16 / 9' }}>
                  <PitchSlideCanvas>
                    <s.component tokens={tokens} pageNumber={i + 1} total={total} />
                  </PitchSlideCanvas>
                </div>
                <div className="text-[10px] text-center py-1 bg-card text-muted-foreground truncate px-1">
                  {i + 1}. {s.title}
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
