import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageElementGate } from "@/components/shared/PageElementGate";
import { OrderNotesList } from "@/components/order-notes/OrderNotesList";
import { Button } from "@/components/ui/button";
import { Plus, Zap } from "lucide-react";
import { DocumentListLayout } from "@/components/documents/listing";

export default function OrderNotesPage() {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <DocumentListLayout
        title="Notas de Encomenda"
        primaryAction={
          <PageElementGate kind="action" id="new-order-note"><Button
            onClick={() => navigate("/dashboard/order-notes/create")}
            className="gap-2 rounded-full bg-primary px-5 text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Nova Encomenda
          </Button></PageElementGate>
        }
        secondaryAction={
          <PageElementGate kind="action" id="quick-order-note"><Button
            variant="outline"
            onClick={() => navigate("/dashboard/order-notes/quick")}
            className="gap-2 rounded-full"
          >
            <Zap className="h-4 w-4" /> Encomenda Rápida
          </Button></PageElementGate>
        }
      >
        <OrderNotesList />
      </DocumentListLayout>
    </DashboardLayout>
  );
}
