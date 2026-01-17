import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Crown, 
  CircleDollarSign, 
  Calendar, 
  Users, 
  Percent,
  Plus,
  Layers
} from "lucide-react";
import { 
  SaasPricingTable,
  pricingTypeLabels,
  targetSegmentLabels
} from "@/hooks/useSaasPricingTables";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface SaasPricingDetailSheetProps {
  pricingTable: SaasPricingTable | null;
  onClose: () => void;
}

export function SaasPricingDetailSheet({ pricingTable, onClose }: SaasPricingDetailSheetProps) {
  if (!pricingTable) return null;

  const formatCurrency = (value: number, currency = "EUR") => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency,
    }).format(value);
  };

  return (
    <Sheet open={!!pricingTable} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            {pricingTable.is_default && (
              <Crown className="h-5 w-5 text-amber-500" />
            )}
            <SheetTitle>{pricingTable.name}</SheetTitle>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Overview */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              {pricingTypeLabels[pricingTable.pricing_type]}
            </Badge>
            {pricingTable.target_segment && (
              <Badge variant="secondary">
                {targetSegmentLabels[pricingTable.target_segment] || pricingTable.target_segment}
              </Badge>
            )}
            <Badge variant={pricingTable.is_active ? "default" : "secondary"}>
              {pricingTable.is_active ? "Ativo" : "Inativo"}
            </Badge>
          </div>

          {pricingTable.description && (
            <p className="text-sm text-muted-foreground">
              {pricingTable.description}
            </p>
          )}

          <Separator />

          {/* Pricing Info */}
          <div className="grid grid-cols-2 gap-4">
            {pricingTable.base_price !== null && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CircleDollarSign className="h-4 w-4" />
                    Preço Base
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <span className="text-2xl font-bold">
                    {formatCurrency(pricingTable.base_price)}
                  </span>
                </CardContent>
              </Card>
            )}

            {pricingTable.discount_percent !== null && pricingTable.discount_percent > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Desconto
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <span className="text-2xl font-bold text-emerald-600">
                    {pricingTable.discount_percent}%
                  </span>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Validity */}
          {(pricingTable.valid_from || pricingTable.valid_until) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Período de Validade
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm">
                  {pricingTable.valid_from && (
                    <span>
                      {format(new Date(pricingTable.valid_from), "dd MMM yyyy", { locale: pt })}
                    </span>
                  )}
                  {pricingTable.valid_from && pricingTable.valid_until && (
                    <span className="text-muted-foreground">→</span>
                  )}
                  {pricingTable.valid_until && (
                    <span>
                      {format(new Date(pricingTable.valid_until), "dd MMM yyyy", { locale: pt })}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Target Segment */}
          {pricingTable.target_segment && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Segmento Alvo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-sm">
                  {targetSegmentLabels[pricingTable.target_segment] || pricingTable.target_segment}
                </span>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Modules / Plans in this table */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Planos/Módulos Associados
              </h3>
              <Button size="sm" variant="outline" className="gap-2">
                <Plus className="h-3 w-3" />
                Adicionar
              </Button>
            </div>
            
            <Card className="p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhum plano ou módulo associado a esta tabela.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Adicione planos para definir preços específicos.
              </p>
            </Card>
          </div>

          {/* Meta info */}
          <div className="text-xs text-muted-foreground pt-4 border-t">
            <div className="flex justify-between">
              <span>Prioridade: {pricingTable.priority}</span>
              <span>
                Criado: {format(new Date(pricingTable.created_at), "dd/MM/yyyy", { locale: pt })}
              </span>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
