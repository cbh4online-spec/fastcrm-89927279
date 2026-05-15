import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { OrderNotesList } from "@/components/order-notes/OrderNotesList";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Zap } from "lucide-react";

export default function OrderNotesPage() {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Notas de Encomenda
            </h1>
            <p className="text-muted-foreground">
              Gerir e processar encomendas de clientes B2B
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/dashboard/order-notes/quick")}>
              <Zap className="h-4 w-4 mr-1" /> Encomenda Rápida
            </Button>
            <Button onClick={() => navigate("/dashboard/order-notes/create")}>
              <Plus className="h-4 w-4 mr-1" /> Nova Encomenda
            </Button>
          </div>
        </div>

        <OrderNotesList />
      </div>
    </DashboardLayout>
  );
}
