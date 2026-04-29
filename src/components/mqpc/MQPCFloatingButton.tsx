import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { Plus } from "lucide-react";
import { useCRMAnalytics } from "@/hooks/useCRMAnalytics";

export function MQPCFloatingButton() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { trackMQPCOpen } = useCRMAnalytics();

  if (!isMobile) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Telemetria não pode bloquear navegação se falhar
    try {
      trackMQPCOpen();
    } catch {
      /* noop */
    }
    navigate("/dashboard/products/quick-create");
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      // Posicionado ACIMA do MobileBottomNav (h-16 = 64px) + margem segura
      // para evitar que o tap colida com as tabs "Início"/"Mais" do nav.
      className="fixed right-4 z-50 flex items-center gap-2 bg-primary text-primary-foreground shadow-lg rounded-full px-4 py-3 hover:bg-primary/90 active:scale-95 transition-all bottom-[calc(env(safe-area-inset-bottom,0px)+5rem)]"
      aria-label="Criar produto rápido"
    >
      <Plus className="h-5 w-5" />
      <span className="text-sm font-medium">Produto</span>
    </button>
  );
}
