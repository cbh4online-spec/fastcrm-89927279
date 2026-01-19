import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Plus, 
  MoreHorizontal, 
  Play, 
  Pause, 
  Trash2, 
  Edit,
  RefreshCw,
  Calendar,
  Clock,
  AlertCircle
} from "lucide-react";
import { CreateRecurringInvoiceDialog } from "./CreateRecurringInvoiceDialog";

interface RecurringInvoice {
  id: string;
  clientName: string;
  description: string;
  amount: number;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  nextDate: string;
  status: 'active' | 'paused' | 'cancelled';
  createdCount: number;
}

const frequencyLabels = {
  weekly: 'Semanal',
  monthly: 'Mensal',
  quarterly: 'Trimestral',
  yearly: 'Anual',
};

const statusConfig = {
  active: { label: 'Ativa', variant: 'default' as const, color: 'text-green-600' },
  paused: { label: 'Pausada', variant: 'secondary' as const, color: 'text-yellow-600' },
  cancelled: { label: 'Cancelada', variant: 'destructive' as const, color: 'text-red-600' },
};

// Mock data - will be replaced with real data
const mockRecurringInvoices: RecurringInvoice[] = [];

export function RecurringInvoicesTab() {
  const [recurringInvoices] = useState<RecurringInvoice[]>(mockRecurringInvoices);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-PT');
  };

  if (recurringInvoices.length === 0) {
    return (
      <>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <RefreshCw className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sem faturas recorrentes</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
              Crie faturas recorrentes para automatizar a cobrança de clientes com pagamentos regulares.
            </p>
            <Button className="gap-2" onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Criar Fatura Recorrente
            </Button>
          </CardContent>
        </Card>
        <CreateRecurringInvoiceDialog 
          open={isDialogOpen} 
          onOpenChange={setIsDialogOpen}
        />
      </>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Ativas</p>
              <p className="text-2xl font-bold text-green-600">
                {recurringInvoices.filter(r => r.status === 'active').length}
              </p>
            </div>
            <Play className="h-8 w-8 text-green-500/50" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Próxima Emissão</p>
              <p className="text-2xl font-bold">
                {recurringInvoices.filter(r => r.status === 'active').length > 0 
                  ? formatDate(recurringInvoices.filter(r => r.status === 'active')[0]?.nextDate || '')
                  : '-'
                }
              </p>
            </div>
            <Calendar className="h-8 w-8 text-blue-500/50" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Valor Mensal</p>
              <p className="text-2xl font-bold">
                {formatCurrency(
                  recurringInvoices
                    .filter(r => r.status === 'active' && r.frequency === 'monthly')
                    .reduce((sum, r) => sum + r.amount, 0)
                )}
              </p>
            </div>
            <Clock className="h-8 w-8 text-purple-500/50" />
          </div>
        </Card>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Faturas Recorrentes</h3>
          <p className="text-sm text-muted-foreground">
            {recurringInvoices.length} configurações
          </p>
        </div>
        <Button className="gap-2" onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Nova Recorrente
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Frequência</TableHead>
                <TableHead>Próxima Data</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Emitidas</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recurringInvoices.map((recurring) => (
                <TableRow key={recurring.id}>
                  <TableCell className="font-medium">{recurring.clientName}</TableCell>
                  <TableCell className="text-muted-foreground">{recurring.description}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{frequencyLabels[recurring.frequency]}</Badge>
                  </TableCell>
                  <TableCell>{formatDate(recurring.nextDate)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(recurring.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusConfig[recurring.status].variant}>
                      {statusConfig[recurring.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {recurring.createdCount}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="gap-2">
                          <Edit className="h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        {recurring.status === 'active' ? (
                          <DropdownMenuItem className="gap-2">
                            <Pause className="h-4 w-4" />
                            Pausar
                          </DropdownMenuItem>
                        ) : recurring.status === 'paused' ? (
                          <DropdownMenuItem className="gap-2">
                            <Play className="h-4 w-4" />
                            Ativar
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="gap-2 text-destructive">
                          <Trash2 className="h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <CreateRecurringInvoiceDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen}
      />
    </div>
  );
}
