import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
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
          <Button
            onClick={() => navigate("/dashboard/order-notes/create")}
            className="gap-2 rounded-full bg-primary px-5 text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Nova Encomenda
          </Button>
        }
        secondaryAction={
          <Button
            variant="outline"
            onClick={() => navigate("/dashboard/order-notes/quick")}
            className="gap-2 rounded-full"
          >
            <Zap className="h-4 w-4" /> Encomenda Rápida
          </Button>
        }
      >
        <OrderNotesList />
      </DocumentListLayout>
    </DashboardLayout>
  );
}
