import { Button } from "@/components/ui/button";
import { useOrderNotePDF } from "@/hooks/useOrderNotePDF";
import type { OrderNote } from "@/types/order-note";
import { FileDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface OrderNotePDFProps {
  order: OrderNote;
  workspaceName?: string;
}

export function OrderNotePDF({ order, workspaceName }: OrderNotePDFProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { generatePDF } = useOrderNotePDF({ workspaceName });

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      generatePDF(order);
      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      toast.error("Erro ao gerar PDF");
      console.error("PDF generation error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleDownload}
      disabled={isGenerating}
    >
      {isGenerating ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <FileDown className="h-4 w-4 mr-2" />
      )}
      Exportar PDF
    </Button>
  );
}
