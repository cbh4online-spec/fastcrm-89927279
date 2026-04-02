import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CatalogBulkPriceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string | undefined;
  onComplete: () => void;
}

export function CatalogBulkPriceModal({ open, onOpenChange, onComplete }: CatalogBulkPriceModalProps) {
  const { t } = useTranslation("procurement");
  const navigate = useNavigate();

  const handleGoToImport = useCallback(() => {
    onOpenChange(false);
    navigate("/dashboard/procurement/price-import");
  }, [navigate, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("importCatalogPrices")}</DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            A importação de preços em lote foi integrada no motor oficial de importação,
            com matching inteligente, perfis reutilizáveis e auditoria completa.
          </p>
        </DialogHeader>

        <div className="py-4 text-center">
          <p className="text-sm text-muted-foreground">
            Use o wizard de importação para carregar e processar tabelas de preços dos seus fornecedores.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
          <Button onClick={handleGoToImport}>
            Ir para Importação <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
