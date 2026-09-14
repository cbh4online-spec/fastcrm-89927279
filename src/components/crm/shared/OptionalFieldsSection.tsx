import type { ReactNode } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

interface OptionalFieldsSectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  label?: string;
}

/**
 * Secção recolhível "Campos opcionais" partilhada pelos formulários
 * de Contactos, Leads e Empresas (criação e edição).
 */
export function OptionalFieldsSection({
  open,
  onOpenChange,
  children,
  label = "Campos opcionais",
}: OptionalFieldsSectionProps) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="w-full justify-between">
          {label}
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 pt-2">{children}</CollapsibleContent>
    </Collapsible>
  );
}
