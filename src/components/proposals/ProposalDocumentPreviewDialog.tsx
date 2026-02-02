import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { X, Printer, Download, ArrowLeft, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProposalClientDocument } from "./ProposalClientDocument";
import type { Proposal, ScopeData, TimelineData, ReferencesData } from "@/types/proposal";
import type { PreviewItem } from "./ProposalPreview";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// Placeholder SVG as Data URL for failed images
const PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,' + btoa(`
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
  <rect width="40" height="40" fill="#f3f4f6" rx="4"/>
  <rect x="8" y="12" width="24" height="16" fill="#e5e7eb" rx="2"/>
  <path d="M14 22l4-4 3 3 5-5 6 6" stroke="#9ca3af" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="16" cy="17" r="2" fill="#9ca3af"/>
</svg>
`);

// Function to convert image URL to Data URL
const convertImageToDataUrl = (imgSrc: string): Promise<string | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    const timeoutId = setTimeout(() => {
      resolve(null);
    }, 5000);
    
    img.onload = () => {
      clearTimeout(timeoutId);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 40;
        canvas.height = img.naturalHeight || 40;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve(null);
        }
      } catch (e) {
        // CORS or other error
        console.warn('Failed to convert image to data URL:', imgSrc, e);
        resolve(null);
      }
    };
    
    img.onerror = () => {
      clearTimeout(timeoutId);
      resolve(null);
    };
    
    // Add cache buster
    try {
      const url = new URL(imgSrc, window.location.href);
      url.searchParams.set('_t', Date.now().toString());
      img.src = url.toString();
    } catch {
      img.src = imgSrc;
    }
  });
};

interface WorkspaceData {
  id: string;
  name: string;
  company_name?: string | null;
  logo_url?: string | null;
  billing_address?: string | null;
  billing_city?: string | null;
  billing_postal_code?: string | null;
  phone?: string | null;
  website?: string | null;
  billing_email?: string | null;
  tax_id?: string | null;
  company_iban?: string | null;
  signature_name?: string | null;
  signature_title?: string | null;
  payment_info?: string | null;
}

interface ProposalDocumentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: Proposal;
  items: (PreviewItem & { is_enabled?: boolean })[];
  workspace: WorkspaceData | null;
  // New props for additional sections
  scopeData?: ScopeData;
  timelineData?: TimelineData;
  referencesData?: ReferencesData;
}

// A4 dimensions at 96 DPI
const A4_HEIGHT_PX = 1123;

export function ProposalDocumentPreviewDialog({
  open,
  onOpenChange,
  proposal,
  items,
  workspace,
  scopeData,
  timelineData,
  referencesData,
}: ProposalDocumentPreviewDialogProps) {
  const documentRef = React.useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [pageCount, setPageCount] = React.useState(1);
  const { toast } = useToast();

  // Calculate page count based on document height
  React.useEffect(() => {
    const calculatePages = () => {
      if (documentRef.current && open) {
        // Small delay to ensure content is rendered
        setTimeout(() => {
          if (documentRef.current) {
            const docHeight = documentRef.current.scrollHeight;
            const pages = Math.ceil(docHeight / A4_HEIGHT_PX);
            setPageCount(Math.max(1, pages));
          }
        }, 100);
      }
    };

    calculatePages();
    
    // Recalculate when window resizes
    window.addEventListener('resize', calculatePages);
    return () => window.removeEventListener('resize', calculatePages);
  }, [open, proposal, items]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    if (!documentRef.current) return;
    
    setIsGenerating(true);
    
    try {
      // Dynamic imports for PDF generation
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf")
      ]);

      // A4 dimensions in mm
      const A4_WIDTH_MM = 210;
      const A4_HEIGHT_MM = 297;
      const MARGIN = 10;
      const CONTENT_WIDTH_MM = A4_WIDTH_MM - (MARGIN * 2);
      const PAGE_CONTENT_HEIGHT = A4_HEIGHT_MM - (MARGIN * 2);

      // 1. Find all sections marked with data-pdf-section
      const sections = Array.from(
        documentRef.current.querySelectorAll('[data-pdf-section]')
      ) as HTMLElement[];

      if (sections.length === 0) {
        throw new Error('No sections found for PDF generation');
      }

      // 2. Capture each section individually
      interface SectionData {
        canvas: HTMLCanvasElement;
        heightMM: number;
        name: string | null;
        forceNewPage: boolean;
      }

      const sectionData: SectionData[] = [];

      for (const section of sections) {
        const sectionName = section.getAttribute('data-pdf-section');

        // Wait for images in this section to load
        const images = section.querySelectorAll('img');
        await Promise.all(
          Array.from(images).map(img =>
            img.complete ? Promise.resolve() :
              new Promise(resolve => {
                img.onload = resolve;
                img.onerror = resolve;
              })
          )
        );

        const canvas = await html2canvas(section, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          imageTimeout: 10000,
          onclone: async (_clonedDoc, element) => {
            // Convert all images to Data URLs to avoid CORS issues
            const clonedImages = element.querySelectorAll('img');

            await Promise.all(
              Array.from(clonedImages).map(async (img) => {
                const src = img.getAttribute('src');
                if (src && !src.startsWith('data:')) {
                  const dataUrl = await convertImageToDataUrl(src);
                  if (dataUrl) {
                    img.src = dataUrl;
                  } else {
                    img.src = PLACEHOLDER_IMAGE;
                  }
                }
                img.removeAttribute('crossOrigin');
              })
            );
          },
        });

        // Calculate height in mm based on scale and content width
        const widthPx = canvas.width / 2; // scale: 2
        const heightPx = canvas.height / 2;
        const scaleFactor = CONTENT_WIDTH_MM / widthPx;
        const heightMM = heightPx * scaleFactor;

        sectionData.push({
          canvas,
          heightMM,
          name: sectionName,
          forceNewPage: sectionName === 'cover', // Cover always on separate page
        });
      }

      // 3. Create PDF with intelligent page breaks
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      let currentY = MARGIN;
      let isFirstSection = true;

      for (const { canvas, heightMM, name, forceNewPage } of sectionData) {
        const remainingSpace = PAGE_CONTENT_HEIGHT - (currentY - MARGIN);

        // Force new page after cover or if section doesn't fit
        if (!isFirstSection && (forceNewPage || heightMM > remainingSpace)) {
          pdf.addPage();
          currentY = MARGIN;
        }

        // If section is larger than a page, we need to slice it
        if (heightMM > PAGE_CONTENT_HEIGHT) {
          let sliceStartMM = 0;
          let isFirstSlice = true;
          const MIN_SLICE_HEIGHT_MM = 30; // ~80px, evitar páginas quase vazias

          while (sliceStartMM < heightMM) {
            const remainingHeight = heightMM - sliceStartMM;
            
            // Se o restante for menor que o mínimo e não é a primeira fatia, não criar nova página
            if (remainingHeight < MIN_SLICE_HEIGHT_MM && !isFirstSlice) {
              break;
            }
            
            const sliceHeightMM = Math.min(PAGE_CONTENT_HEIGHT, remainingHeight);
            const sliceStartPx = (sliceStartMM / heightMM) * canvas.height;
            const sliceHeightPx = (sliceHeightMM / heightMM) * canvas.height;

            // Create canvas for this slice
            const sliceCanvas = document.createElement('canvas');
            sliceCanvas.width = canvas.width;
            sliceCanvas.height = Math.ceil(sliceHeightPx);
            const ctx = sliceCanvas.getContext('2d');

            if (ctx) {
              ctx.drawImage(
                canvas,
                0, sliceStartPx,
                canvas.width, sliceHeightPx,
                0, 0,
                canvas.width, sliceHeightPx
              );

              if (!isFirstSlice) {
                pdf.addPage();
                currentY = MARGIN;
              }

              pdf.addImage(
                sliceCanvas.toDataURL('image/jpeg', 0.95),
                'JPEG',
                MARGIN,
                MARGIN,
                CONTENT_WIDTH_MM,
                sliceHeightMM
              );
            }

            sliceStartMM += sliceHeightMM;
            isFirstSlice = false;
          }

          // Set currentY for next section
          const lastSliceHeight = heightMM % PAGE_CONTENT_HEIGHT;
          currentY = MARGIN + (lastSliceHeight > 0 ? lastSliceHeight : PAGE_CONTENT_HEIGHT);
        } else {
          // Section fits on current page
          pdf.addImage(
            canvas.toDataURL('image/jpeg', 0.95),
            'JPEG',
            MARGIN,
            currentY,
            CONTENT_WIDTH_MM,
            heightMM
          );
          currentY += heightMM;
        }

        // After cover, always start new page
        if (name === 'cover') {
          pdf.addPage();
          currentY = MARGIN;
        }

        isFirstSection = false;
      }

      pdf.save(`proposta-${proposal.slug}.pdf`);

      toast({
        title: "PDF gerado",
        description: "O documento foi exportado com sucesso.",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Ocorreu um erro ao exportar o documento.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay 
          className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" 
        />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            "fixed inset-0 z-50 bg-muted/95 data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "flex flex-col"
          )}
        >
          {/* Hidden title for accessibility */}
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>Pré-visualização da Proposta</DialogPrimitive.Title>
          </VisuallyHidden.Root>
          {/* Header Bar */}
          <div className="flex-shrink-0 bg-background border-b shadow-sm print:hidden">
            <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto w-full">
              {/* Left - Back button */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onOpenChange(false)}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>

              {/* Center - Title */}
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-md bg-primary/10">
                  <Eye className="h-4 w-4 text-primary" />
                </div>
                <div className="text-center">
                  <h2 className="font-semibold text-sm">Pré-visualização do Documento</h2>
                  <p className="text-xs text-muted-foreground">
                    Assim ficará para o cliente
                  </p>
                </div>
              </div>

              {/* Right - Actions */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleDownload}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  PDF
                </Button>
                <DialogPrimitive.Close asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <X className="h-4 w-4" />
                    <span className="sr-only">Fechar</span>
                  </Button>
                </DialogPrimitive.Close>
              </div>
            </div>
          </div>

          {/* Document Preview Area */}
          <ScrollArea className="flex-1">
            <div className="py-8 px-4 print:py-0 print:px-0">
              <div className="max-w-[210mm] mx-auto">
                {/* Preview indicator banner - hidden on print */}
                <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-3 text-center print:hidden">
                  <p className="text-sm text-amber-800">
                    <Eye className="h-4 w-4 inline mr-2" />
                    Esta é uma pré-visualização. O cliente verá exactamente este documento.
                  </p>
                </div>

                {/* Page counter indicator */}
                {pageCount > 1 && (
                  <div className="mb-4 text-center print:hidden">
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium">
                      📄 Documento com {pageCount} página{pageCount > 1 ? 's' : ''}
                    </span>
                  </div>
                )}

                {/* The actual document - this is what gets captured for PDF */}
                <div className="relative">
                  <div 
                    ref={documentRef} 
                    className="bg-white shadow-lg"
                    style={{ width: '794px', margin: '0 auto' }}
                  >
                    <ProposalClientDocument
                      proposal={proposal}
                      items={items}
                      workspace={workspace}
                      showActions={false}
                      allowItemToggle={false}
                      scopeData={scopeData}
                      timelineData={timelineData}
                      referencesData={referencesData}
                    />
                  </div>
                  
                  {/* Page break indicators */}
                  {pageCount > 1 && Array.from({ length: pageCount - 1 }).map((_, i) => (
                    <div 
                      key={i}
                      className="absolute left-0 right-0 flex items-center justify-center pointer-events-none print:hidden"
                      style={{ 
                        top: `${(i + 1) * A4_HEIGHT_PX}px`,
                        transform: 'translateY(-50%)'
                      }}
                    >
                      <div className="flex items-center gap-3 bg-amber-100 border border-amber-300 rounded-full px-4 py-1.5 shadow-sm">
                        <div className="h-px w-8 bg-amber-400" />
                        <span className="text-xs font-medium text-amber-700">
                          Página {i + 2}
                        </span>
                        <div className="h-px w-8 bg-amber-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
