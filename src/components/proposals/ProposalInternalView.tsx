import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
} from "lucide-react";
import { format, addDays } from "date-fns";
import { pt } from "date-fns/locale";
import type { Proposal } from "@/types/proposal";
import type { PreviewItem } from "./ProposalPreview";
import { PAYMENT_CONDITIONS } from "./proposalConstants";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";

interface ProposalInternalViewProps {
  proposal: Proposal;
  items?: PreviewItem[];
  onItemToggle?: (itemId: string, enabled: boolean) => void;
  onQuantityChange?: (itemId: string, quantity: number) => void;
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
}: ProposalInternalViewProps) {
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
    
  const itemsTotal = items.reduce((sum, item) => sum + item.total_price, 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
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
          <Button variant="outline" size="sm">
            <Phone className="h-4 w-4 mr-2" />
            Agendar Chamada
          </Button>
          <Button variant="outline" size="sm">
            <MessageSquare className="h-4 w-4 mr-2" />
            Mensagem
          </Button>
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
          <Badge variant="secondary">{items.length} itens</Badge>
        </div>
        {items.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[5%]"></TableHead>
                <TableHead className="w-[45%]">Item</TableHead>
                <TableHead className="w-[10%] text-center">Status</TableHead>
                <TableHead className="w-[10%] text-center">Qtd.</TableHead>
                <TableHead className="w-[15%] text-right">Preço</TableHead>
                <TableHead className="w-[15%] text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Checkbox 
                      checked={true}
                      onCheckedChange={(checked) => onItemToggle?.(item.id, !!checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{item.name}</p>
                    {item.description && (
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-muted-foreground">-</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => onQuantityChange?.(item.id, parseInt(e.target.value) || 1)}
                      className="w-16 h-8 text-center mx-auto"
                      min={1}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.unit_price, proposal.currency)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.total_price, proposal.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={5} className="text-right font-semibold">
                  TOTAL
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
