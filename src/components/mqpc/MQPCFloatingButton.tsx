import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { Plus, Zap, ScanText } from "lucide-react";
import { useCRMAnalytics } from "@/hooks/useCRMAnalytics";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function MQPCFloatingButton() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { trackMQPCOpen } = useCRMAnalytics();

  if (!isMobile) return null;

  const go = (path: string) => {
    try {
      trackMQPCOpen();
    } catch {
      /* noop */
    }
    navigate(path);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          // Posicionado ACIMA do MobileBottomNav (h-16 = 64px) + margem segura
          className="fixed right-4 z-50 flex items-center gap-2 bg-primary text-primary-foreground shadow-lg rounded-full px-4 py-3 hover:bg-primary/90 active:scale-95 transition-all bottom-[calc(env(safe-area-inset-bottom,0px)+5rem)]"
          aria-label="Criar produto"
        >
          <Plus className="h-5 w-5" />
          <span className="text-sm font-medium">Produto</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" sideOffset={8} className="w-56">
        <DropdownMenuItem onClick={() => go("/dashboard/products/quick-create")}>
          <Zap className="mr-2 h-4 w-4" />
          Criação rápida
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => go("/dashboard/products/ocr-create")}>
          <ScanText className="mr-2 h-4 w-4" />
          Criar por documento (OCR)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
