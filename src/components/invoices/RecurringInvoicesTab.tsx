import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, ArrowRight } from "lucide-react";

export function RecurringInvoicesTab() {
  const navigate = useNavigate();

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <RefreshCw className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Faturas recorrentes integradas nas Renovações</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
          A gestão de cobranças recorrentes está integrada no módulo de Renovações, 
          onde pode criar contratos com subscrições Stripe, acompanhar pagamentos 
          e gerar faturas automaticamente.
        </p>
        <Button className="gap-2" onClick={() => navigate("/dashboard/renewals")}>
          Ir para Renovações
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
