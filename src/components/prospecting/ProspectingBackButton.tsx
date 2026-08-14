import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface ProspectingBackButtonProps {
  /** Rota de destino. Por omissão, o hub de Prospecção. */
  to?: string;
  label?: string;
  className?: string;
}

/**
 * Botão "Voltar" para as páginas de prospecção.
 * Navega sempre para uma rota conhecida (evita sair da aplicação quando não há histórico).
 */
export function ProspectingBackButton({
  to = "/dashboard/prospecting",
  label = "Voltar",
  className,
}: ProspectingBackButtonProps) {
  const navigate = useNavigate();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={className ?? "-ml-2 h-8 rounded-full text-muted-foreground hover:text-foreground"}
      onClick={() => navigate(to)}
      aria-label={`${label} para Prospecção`}
    >
      <ArrowLeft className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );
}
