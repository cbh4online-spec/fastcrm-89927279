import { Sparkles } from "lucide-react";
import { ClientLayout } from "@/components/client-portal/ClientLayout";
import { DiagnosticAssistant } from "@/components/client-portal/DiagnosticAssistant";
import { useClientAuth } from "@/hooks/client-portal/useClientAuth";

export default function ClientAssistantPage() {
  const { clientUser } = useClientAuth();

  return (
    <ClientLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Copilot B2B</h1>
            <p className="text-muted-foreground">
              Produtos, encomendas, contratos, faturas — pergunte o que precisar
            </p>
          </div>
        </div>

        {/* Assistant */}
        <DiagnosticAssistant workspaceId={clientUser?.workspace_id} />
      </div>
    </ClientLayout>
  );
}
