import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { printLeadChefDocument, type PrintableSection } from "@/utils/leadchef/pdf";
import { toast } from "sonner";

interface Props {
  title: string;
  subtitle?: string;
  sections: PrintableSection[];
  size?: "sm" | "default";
  variant?: "outline" | "ghost" | "default";
  label?: string;
}

export function LeadChefPrintButton({ title, subtitle, sections, size = "sm", variant = "outline", label = "Imprimir / Guardar PDF" }: Props) {
  function handle() {
    try {
      printLeadChefDocument({
        title,
        subtitle,
        sections,
        footer: `Gerado por FastCRM · LeadChef · ${new Date().toLocaleString("pt-PT")}`,
      });
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível abrir a impressão.");
    }
  }
  return (
    <Button size={size} variant={variant} onClick={handle}>
      <Printer className="h-3 w-3 mr-1" />
      {label}
    </Button>
  );
}
