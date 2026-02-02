import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, Printer, Download, ArrowLeft, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProposalClientDocument } from "./ProposalClientDocument";
import type { Proposal } from "@/types/proposal";
import type { PreviewItem } from "./ProposalPreview";
import { cn } from "@/lib/utils";

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
  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    // Dynamic import for PDF generation
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    
    // Simple PDF with proposal info
    doc.setFontSize(20);
    doc.text(`Proposta: ${proposal.title}`, 20, 30);
    doc.setFontSize(12);
    doc.text(`Nº: ${proposal.slug.toUpperCase()}`, 20, 45);
    doc.text(`Cliente: ${proposal.company?.name || proposal.contact?.name || proposal.opportunity?.lead?.name || '-'}`, 20, 55);
    
    // Items
    let yPos = 75;
    doc.setFontSize(14);
    doc.text("Itens:", 20, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    items.filter(i => i.is_enabled !== false).forEach((item, idx) => {
      doc.text(`${idx + 1}. ${item.name} - ${item.quantity}x ${item.unit_price.toFixed(2)}€ = ${item.total_price.toFixed(2)}€`, 20, yPos);
      yPos += 8;
    });
    
    // Total
    const total = items.filter(i => i.is_enabled !== false).reduce((sum, i) => sum + i.total_price, 0);
    yPos += 10;
    doc.setFontSize(12);
    doc.text(`Total (s/IVA): ${total.toFixed(2)}€`, 20, yPos);
    doc.text(`IVA (23%): ${(total * 0.23).toFixed(2)}€`, 20, yPos + 10);
    doc.setFontSize(14);
    doc.text(`Total: ${(total * 1.23).toFixed(2)}€`, 20, yPos + 25);
    
    doc.save(`proposta-${proposal.slug}.pdf`);
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
          <div className="flex-shrink-0 bg-background border-b shadow-sm">
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
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
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
            <div className="py-8 px-4">
              <div className="max-w-[210mm] mx-auto">
                {/* Preview indicator banner */}
                <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                  <p className="text-sm text-amber-800">
                    <Eye className="h-4 w-4 inline mr-2" />
                    Esta é uma pré-visualização. O cliente verá exactamente este documento.
                  </p>
                </div>

                {/* The actual document */}
                <ProposalClientDocument
                  proposal={proposal}
                  items={items}
                  workspace={workspace}
                  showActions={false}
                  allowItemToggle={false}
                />
              </div>
            </div>
          </ScrollArea>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
