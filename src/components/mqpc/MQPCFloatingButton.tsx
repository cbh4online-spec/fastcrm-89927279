import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { Plus } from "lucide-react";
import { useCRMAnalytics } from "@/hooks/useCRMAnalytics";

export function MQPCFloatingButton() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { trackMQPCOpen } = useCRMAnalytics();

  if (!isMobile) return null;

  return (
    <button
      onClick={() => {
        trackMQPCOpen();
        navigate("/mobile/products/quick-create");
      }}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-primary text-primary-foreground shadow-lg rounded-full px-4 py-3 hover:bg-primary/90 active:scale-95 transition-all"
    >
      <Plus className="h-5 w-5" />
      <span className="text-sm font-medium">Produto</span>
    </button>
  );
}
