import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { OrderNotesList } from "@/components/order-notes/OrderNotesList";
import { FileText } from "lucide-react";

export default function OrderNotesPage() {
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
        </div>

        <OrderNotesList />
      </div>
    </DashboardLayout>
  );
}
