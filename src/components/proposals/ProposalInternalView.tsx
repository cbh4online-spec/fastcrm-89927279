import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Calendar, 
  Phone, 
  Mail, 
  MapPin, 
  User, 
  Building2,
  MessageSquare,
  FileText,
  CreditCard,
  Clock,
  ExternalLink,
  MoreHorizontal,
  Copy,
  CheckSquare,
  TrendingUp,
} from "lucide-react";
import { format, addDays } from "date-fns";
import { pt } from "date-fns/locale";
import type { Proposal } from "@/types/proposal";
import type { PreviewItem } from "./ProposalPreview";
import { PAYMENT_CONDITIONS } from "./proposalConstants";
import { QuickTaskDialog } from "@/components/crm/unified/QuickTaskDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface ProposalInternalViewProps {
  proposal: Proposal;
  items?: (PreviewItem & { 
    is_enabled?: boolean;
    cost_snapshot?: number | null;
    operational_cost_snapshot?: number | null;
  })[];
  onItemToggle?: (itemId: string, enabled: boolean) => void;
  onQuantityChange?: (itemId: string, quantity: number) => void;
  onPriceChange?: (itemId: string, price: number) => void;
}

function formatCurrency(value: number, currency: string = "EUR"): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency,
  }).format(value);
}

export function ProposalInternalView({ 
  proposal, 
  items = [],
  onItemToggle,
  onQuantityChange,
  onPriceChange,
}: ProposalInternalViewProps) {
  const navigate = useNavigate();
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  
  const clientName = proposal.company?.name || proposal.contact?.name || proposal.opportunity?.lead?.name;
  const clientEmail = proposal.company?.email || proposal.contact?.email || proposal.opportunity?.lead?.email;
  const clientAddress = proposal.billing_address || proposal.company?.address || proposal.contact?.address;
  const clientNif = proposal.billing_nif || proposal.company?.tax_id || proposal.contact?.tax_id;
  
  const createdDate = new Date(proposal.created_at);
  const expiryDate = proposal.validity_days 
    ? addDays(createdDate, proposal.validity_days)
    : null;

  const paymentLabel = proposal.payment_conditions 
    ? PAYMENT_CONDITIONS.find(p => p.value === proposal.payment_conditions)?.label || proposal.payment_conditions
    : null;
  
  // Calculate totals only for enabled items
  const enabledItems = items.filter(item => item.is_enabled !== false);
  const itemsTotal = enabledItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  const disabledCount = items.length - enabledItems.length;
  
  // Calculate total cost and margin
  const totalCost = enabledItems.reduce((sum, item) => {
    const directCost = item.cost_snapshot ?? 0;
    const opCost = item.operational_cost_snapshot ?? 0;
    return sum + ((directCost + opCost) * item.quantity);
  }, 0);
  const totalMargin = itemsTotal - totalCost;
  const marginPct = itemsTotal > 0 ? (totalMargin / itemsTotal) * 100 : 0;

  // Navigation and action handlers
  const handleNavigateToOpportunity = () => {
    if (proposal.opportunity?.id) {
      navigate(`/dashboard/opportunities/${proposal.opportunity.id}`);
    }
  };

  const handleNavigateToClient = () => {
    if (proposal.company?.id) {
      navigate(`/dashboard/companies/${proposal.company.id}`);
    } else if (proposal.contact?.id) {
      navigate(`/dashboard/contacts/${proposal.contact.id}`);
    }
  };

  const handleSendEmail = () => {
    if (clientEmail) {
      window.open(`mailto:${clientEmail}?subject=${encodeURIComponent(`Re: ${proposal.title}`)}`);
    }
  };

  const hasClientCRM = !!(proposal.company?.id || proposal.contact?.id);
  const hasOpportunity = !!proposal.opportunity?.id;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Quick Task Dialog - uses opportunity as the related entity */}
      {hasOpportunity && (
        <QuickTaskDialog
          open={showTaskDialog}
          onOpenChange={setShowTaskDialog}
          relatedId={proposal.opportunity!.id}
          relatedType="opportunity"
        />
      )}

      {/* Header Section */}
      <div className="flex items-start justify-between gap-4 bg-card rounded-lg border p-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-primary/10">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-mono text-muted-foreground">
                #{proposal.slug.toUpperCase()}
              </span>
              <Badge variant="outline" className="text-xs">
                {proposal.status === 'draft' ? 'Rascunho' : 
                 proposal.status === 'published' ? 'Publicada' : 
                 proposal.status === 'accepted' ? 'Aceita' : 
                 proposal.status === 'expired' ? 'Expirada' : 'Rejeitada'}
              </Badge>
            </div>
            <h2 className="text-lg font-semibold">{proposal.title}</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {clientEmail && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleSendEmail}>
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
              </TooltipTrigger>
              <TooltipContent>Enviar email para {clientEmail}</TooltipContent>
            </Tooltip>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {hasOpportunity && (
                <DropdownMenuItem onClick={handleNavigateToOpportunity}>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Ver Oportunidade
                </DropdownMenuItem>
              )}
              {hasClientCRM && (
                <DropdownMenuItem onClick={handleNavigateToClient}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ver Ficha CRM
                </DropdownMenuItem>
              )}
              {(hasOpportunity || hasClientCRM) && <DropdownMenuSeparator />}
              {hasOpportunity && (
                <DropdownMenuItem onClick={() => setShowTaskDialog(true)}>
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Criar Tarefa
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Info Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Reference & Validity */}
        <Card className="p-4 space-y-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Referência</p>
            <p className="font-mono font-medium">PROP-{proposal.slug.slice(-8).toUpperCase()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Validade</p>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {format(createdDate, "dd MMM", { locale: pt })} - {expiryDate ? format(expiryDate, "dd MMM yyyy", { locale: pt }) : "Sem limite"}
              </span>
            </div>
          </div>
        </Card>

        {/* Client Info */}
        <Card className="p-4 space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Endereço</p>
          <div className="flex items-start gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">{clientName || "Sem cliente"}</p>
              {clientAddress && <p className="text-muted-foreground">{clientAddress}</p>}
              {clientNif && <p className="text-muted-foreground">NIF: {clientNif}</p>}
            </div>
          </div>
        </Card>

        {/* Contacts */}
        <Card className="p-4 space-y-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Ponto de Contacto</p>
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{clientName || "-"}</span>
            </div>
            {clientEmail && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <Mail className="h-4 w-4" />
                <span>{clientEmail}</span>
              </div>
            )}
          </div>
          {paymentLabel && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Pagamento</p>
              <div className="flex items-center gap-2 text-sm">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span>{paymentLabel}</span>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Items Table */}
      <Card className="overflow-hidden">
        <div className="bg-muted/50 px-4 py-3 border-b flex items-center justify-between">
          <h3 className="font-semibold">Itens da Proposta</h3>
          <div className="flex items-center gap-2">
            {disabledCount > 0 && (
              <Badge variant="secondary" className="text-muted-foreground">
                {disabledCount} desactivado{disabledCount > 1 ? 's' : ''}
              </Badge>
            )}
            <Badge variant="secondary">{items.length} itens</Badge>
          </div>
        </div>
        {items.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14 text-center">Activo</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="w-20 text-center">Qtd.</TableHead>
                <TableHead className="w-28 text-right">Preço</TableHead>
                <TableHead className="w-24 text-right">Custo</TableHead>
                <TableHead className="w-28 text-right">Margem</TableHead>
                <TableHead className="w-28 text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const isEnabled = item.is_enabled !== false;
                const itemDirectCost = item.cost_snapshot ?? 0;
                const itemOpCost = item.operational_cost_snapshot ?? 0;
                const itemUnitCost = itemDirectCost + itemOpCost;
                const itemCost = itemUnitCost * item.quantity;
                const itemSubtotal = item.unit_price * item.quantity;
                const itemMargin = itemSubtotal - itemCost;
                const itemMarginPct = itemSubtotal > 0 ? (itemMargin / itemSubtotal) * 100 : 0;
                
                return (
                  <TableRow 
                    key={item.id} 
                    className={cn(
                      "transition-opacity",
                      !isEnabled && "opacity-50 bg-muted/30"
                    )}
                  >
                    <TableCell className="text-center">
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) => onItemToggle?.(item.id, checked)}
                        className="mx-auto"
                      />
                    </TableCell>
                    <TableCell className="max-w-0">
                      <p className={cn(
                        "font-medium truncate",
                        !isEnabled && "line-through text-muted-foreground"
                      )}>
                        {item.name}
                      </p>
                      {item.description && (
                        <p className={cn(
                          "text-sm text-muted-foreground line-clamp-2",
                          !isEnabled && "line-through"
                        )} title={item.description}>
                          {item.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => onQuantityChange?.(item.id, parseInt(e.target.value) || 1)}
                        className="w-16 h-8 text-center mx-auto"
                        min={1}
                        disabled={!isEnabled}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => onPriceChange?.(item.id, parseFloat(e.target.value) || 0)}
                        className={cn(
                          "w-24 h-8 text-right ml-auto",
                          !isEnabled && "opacity-50"
                        )}
                        min={0}
                        disabled={!isEnabled}
                      />
                    </TableCell>
                    <TableCell className={cn("text-right text-muted-foreground whitespace-nowrap", !isEnabled && "line-through")}>
                      {formatCurrency(itemUnitCost, proposal.currency)}
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-medium whitespace-nowrap",
                      !isEnabled && "line-through text-muted-foreground",
                      isEnabled && itemMarginPct >= 30 ? "text-green-600" : isEnabled && "text-red-600"
                    )}>
                      {formatCurrency(itemMargin, proposal.currency)} ({itemMarginPct.toFixed(0)}%)
                    </TableCell>
                    <TableCell className={cn("text-right font-medium whitespace-nowrap", !isEnabled && "line-through text-muted-foreground")}>
                      {formatCurrency(itemSubtotal, proposal.currency)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={4} className="text-right font-semibold">
                  TOTAL {disabledCount > 0 && <span className="text-xs text-muted-foreground font-normal">(itens activos)</span>}
                </TableCell>
                <TableCell className="text-right text-muted-foreground font-medium">
                  {formatCurrency(totalCost, proposal.currency)}
                </TableCell>
                <TableCell className={cn(
                  "text-right font-semibold",
                  marginPct >= 30 ? "text-green-600" : "text-red-600"
                )}>
                  {formatCurrency(totalMargin, proposal.currency)} ({marginPct.toFixed(0)}%)
                </TableCell>
                <TableCell className="text-right font-bold text-primary text-lg">
                  {formatCurrency(itemsTotal, proposal.currency)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum item adicionado à proposta.</p>
          </div>
        )}
      </Card>

      {/* Notes Section */}
      {proposal.notes && (
        <Card className="p-4">
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Observações
          </h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{proposal.notes}</p>
        </Card>
      )}

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Última atualização: {format(new Date(proposal.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: pt })}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">Solicitar Alteração</Button>
          <Button className="bg-green-600 hover:bg-green-700">Aceitar Proposta</Button>
        </div>
      </div>
    </div>
  );
}
