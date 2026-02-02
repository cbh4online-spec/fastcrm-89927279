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
      // Dynamic imports for PDF generation
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf")
      ]);
      
      // Capture the document as canvas
      const canvas = await html2canvas(documentRef.current, {
        scale: 2, // Higher resolution
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
      
      // A4 dimensions in mm
      const a4Width = 210;
      const a4Height = 297;
      
      // Calculate dimensions to fit A4
      const imgWidth = a4Width;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Create PDF
      const doc = new jsPDF({
        orientation: imgHeight > a4Height ? "portrait" : "portrait",
        unit: "mm",
        format: "a4",
      });
      
      // Add pages if content is taller than one page
      const pageHeight = a4Height - 20; // margins
      let heightLeft = imgHeight;
      let position = 10; // top margin
      
      // Add image to first page
      doc.addImage(
        canvas.toDataURL("image/jpeg", 0.95),
        "JPEG",
        10, // left margin
        position,
        imgWidth - 20, // width minus margins
        imgHeight
      );
      
      heightLeft -= pageHeight;
      
      // Add additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10;
        doc.addPage();
        doc.addImage(
          canvas.toDataURL("image/jpeg", 0.95),
          "JPEG",
          10,
          position,
          imgWidth - 20,
          imgHeight
        );
        heightLeft -= pageHeight;
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
                <div ref={documentRef}>
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
