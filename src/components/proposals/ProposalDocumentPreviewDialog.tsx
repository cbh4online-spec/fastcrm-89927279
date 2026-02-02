import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, Printer, Download, ArrowLeft, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProposalClientDocument } from "./ProposalClientDocument";
import type { Proposal } from "@/types/proposal";
import type { PreviewItem } from "./ProposalPreview";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

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
}

export function ProposalDocumentPreviewDialog({
  open,
  onOpenChange,
  proposal,
  items,
  workspace,
}: ProposalDocumentPreviewDialogProps) {
  const documentRef = React.useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const { toast } = useToast();

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    if (!documentRef.current) return;
    
    setIsGenerating(true);
    
    try {
      // 1. Wait for all images to load
      const images = documentRef.current.querySelectorAll('img');
      await Promise.all(
        Array.from(images).map(img => 
          img.complete ? Promise.resolve() : 
          new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
          })
        )
      );
      
      // 2. Give extra time for rendering
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Dynamic imports for PDF generation
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf")
      ]);
      
      // Get actual dimensions
      const docWidth = documentRef.current.scrollWidth;
      const docHeight = documentRef.current.scrollHeight;
      
      // Capture the document as canvas with full dimensions
      const canvas = await html2canvas(documentRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: docWidth,
        height: docHeight,
        windowWidth: docWidth,
        windowHeight: docHeight,
        imageTimeout: 5000,
        onclone: (clonedDoc) => {
          // Remove crossOrigin from images in clone to avoid CORS issues
          const images = clonedDoc.querySelectorAll('img');
          images.forEach(img => {
            img.removeAttribute('crossOrigin');
          });
        },
      });
      
      // A4 dimensions in mm
      const a4Width = 210;
      const a4Height = 297;
      const margin = 10;
      const contentWidth = a4Width - (margin * 2);
      
      // Calculate dimensions to fit A4 width
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Create PDF
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      
      // Calculate how many pages we need
      const pageContentHeight = a4Height - (margin * 2);
      const totalPages = Math.ceil(imgHeight / pageContentHeight);
      
      // Create a temporary canvas for each page slice
      for (let page = 0; page < totalPages; page++) {
        if (page > 0) {
          doc.addPage();
        }
        
        // Calculate the slice of the original canvas for this page
        const sourceY = (page * pageContentHeight * canvas.width) / imgWidth;
        const sourceHeight = Math.min(
          (pageContentHeight * canvas.width) / imgWidth,
          canvas.height - sourceY
        );
        
        // Create a temporary canvas for this page slice
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sourceHeight;
        const ctx = pageCanvas.getContext('2d');
        
        if (ctx) {
          ctx.drawImage(
            canvas,
            0, sourceY,
            canvas.width, sourceHeight,
            0, 0,
            canvas.width, sourceHeight
          );
          
          const sliceHeight = (sourceHeight * imgWidth) / canvas.width;
          doc.addImage(
            pageCanvas.toDataURL("image/jpeg", 0.95),
            "JPEG",
            margin,
            margin,
            imgWidth,
            sliceHeight
          );
        }
      }
      
      doc.save(`proposta-${proposal.slug}.pdf`);
      
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
          className={cn(
            "fixed inset-0 z-50 bg-muted/95 data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "flex flex-col"
          )}
        >
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

                {/* The actual document - this is what gets captured for PDF */}
                <div 
                  ref={documentRef} 
                  className="bg-white"
                  style={{ width: '794px', margin: '0 auto' }}
                >
                  <ProposalClientDocument
                    proposal={proposal}
                    items={items}
                    workspace={workspace}
                    showActions={false}
                    allowItemToggle={false}
                  />
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
