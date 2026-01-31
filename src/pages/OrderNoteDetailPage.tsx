import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { OrderNoteDetail } from "@/components/order-notes/OrderNoteDetail";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function OrderNoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard/order-notes")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar às Encomendas
        </Button>

        {id && <OrderNoteDetail orderId={id} />}
      </div>
    </DashboardLayout>
  );
}
