import { useState } from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { 
  Calendar, 
  Clock, 
  Plus, 
  Activity, 
  User, 
  Building2,
  Hash,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { 
  useConsumptionLogs, 
  useCreateConsumptionLog, 
  useConsumptionStats 
} from "@/hooks/useConsumptionLogs";
import { 
  ConsumptionType, 
  CONSUMPTION_TYPE_LABELS, 
  CONSUMPTION_SOURCE_LABELS,
  ConsumptionSource
} from "@/types/consumptionLog";
import { AcquiredProduct } from "@/types/acquiredProduct";

interface ConsumptionLogsPanelProps {
  acquiredProduct: AcquiredProduct;
  contactId?: string;
  companyId?: string;
}

export function ConsumptionLogsPanel({ 
  acquiredProduct, 
  contactId, 
  companyId 
}: ConsumptionLogsPanelProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [consumptionType, setConsumptionType] = useState<ConsumptionType>('session');
  const [quantity, setQuantity] = useState("1");
  const [consumptionDate, setConsumptionDate] = useState(
    new Date().toISOString().slice(0, 16) // datetime-local format
  );
  const [notes, setNotes] = useState("");

  const { data: logs, isLoading: logsLoading } = useConsumptionLogs(acquiredProduct.id);
  const { data: stats } = useConsumptionStats(acquiredProduct.id);
  const createLog = useCreateConsumptionLog();

  const handleSubmit = async () => {
    await createLog.mutateAsync({
      contactId,
      companyId,
      productId: acquiredProduct.product_id,
      acquiredProductId: acquiredProduct.id,
      consumptionType,
      quantity: parseInt(quantity) || 1,
      consumptionDate: new Date(consumptionDate).toISOString(),
      notes: notes || undefined,
    });

    // Reset form
    setQuantity("1");
    setConsumptionDate(new Date().toISOString().slice(0, 16));
    setNotes("");
    setIsDialogOpen(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Histórico de Consumo
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1">
                <Plus className="h-4 w-4" />
                Registar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registar Consumo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm font-medium">{acquiredProduct.product?.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {acquiredProduct.consumed_quantity || 0} / {acquiredProduct.purchased_quantity || acquiredProduct.quantity || 0} consumidos
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de Consumo</Label>
                    <Select 
                      value={consumptionType} 
                      onValueChange={(v) => setConsumptionType(v as ConsumptionType)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CONSUMPTION_TYPE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Quantidade</Label>
                    <Input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Data e Hora</Label>
                  <Input
                    type="datetime-local"
                    value={consumptionDate}
                    onChange={(e) => setConsumptionDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Observações (opcional)</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notas sobre este consumo..."
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSubmit} disabled={createLog.isPending}>
                    {createLog.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Registar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats summary */}
        {stats && stats.logCount > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-4 p-3 rounded-lg bg-muted/30">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.totalConsumed}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.logCount}</p>
              <p className="text-xs text-muted-foreground">Registos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">
                {stats.avgFrequencyDays ? `${stats.avgFrequencyDays}d` : '-'}
              </p>
              <p className="text-xs text-muted-foreground">Média</p>
            </div>
          </div>
        )}

        {/* Logs list */}
        {logsLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !logs || logs.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Sem registos de consumo</p>
            <p className="text-xs">Clique em "Registar" para adicionar</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-3">
            <div className="space-y-2">
              {logs.map((log) => (
                <div 
                  key={log.id} 
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
                >
                  <div className="p-2 rounded-full bg-primary/10 shrink-0">
                    <Activity className="h-3 w-3 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-xs">
                        {CONSUMPTION_TYPE_LABELS[log.consumption_type as ConsumptionType] || log.consumption_type}
                      </Badge>
                      <span className="text-sm font-medium">
                        ×{log.quantity}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {CONSUMPTION_SOURCE_LABELS[log.source as ConsumptionSource] || log.source}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(log.consumption_date), "d MMM yyyy", { locale: pt })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(log.consumption_date), "HH:mm")}
                      </span>
                    </div>
                    {log.notes && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
                        <FileText className="h-3 w-3 mt-0.5 shrink-0" />
                        {log.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

// Compact version for inline use in product cards
interface ConsumptionQuickLogProps {
  acquiredProduct: AcquiredProduct;
  contactId?: string;
  companyId?: string;
  onSuccess?: () => void;
}

export function ConsumptionQuickLog({ 
  acquiredProduct, 
  contactId, 
  companyId,
  onSuccess 
}: ConsumptionQuickLogProps) {
  const createLog = useCreateConsumptionLog();

  const handleQuickLog = async () => {
    await createLog.mutateAsync({
      contactId,
      companyId,
      productId: acquiredProduct.product_id,
      acquiredProductId: acquiredProduct.id,
      consumptionType: 'session',
      quantity: 1,
    });
    onSuccess?.();
  };

  return (
    <Button 
      size="sm" 
      variant="outline" 
      onClick={handleQuickLog}
      disabled={createLog.isPending}
      className="gap-1"
    >
      {createLog.isPending ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Plus className="h-3 w-3" />
      )}
      +1
    </Button>
  );
}
