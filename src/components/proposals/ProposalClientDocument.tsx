import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { 
  Globe, 
  Mail, 
  Phone, 
  MapPin,
  Calendar,
  Download,
  Printer,
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
import { cn } from "@/lib/utils";

interface WorkspaceData {
  id: string;
  name: string;
  company_name?: string | null;
  logo_url?: string | null;
  billing_address?: string | null;
  billing_city?: string | null;
  billing_postal_code?: string | null;
  phone?: string | null;
  website?: string | null;
  billing_email?: string | null;
  tax_id?: string | null;
  company_iban?: string | null;
  signature_name?: string | null;
  signature_title?: string | null;
  payment_info?: string | null;
}

interface ProposalClientDocumentProps {
  proposal: Proposal;
  items?: (PreviewItem & { is_enabled?: boolean })[];
  workspace?: WorkspaceData | null;
  showActions?: boolean;
  allowItemToggle?: boolean;
  onItemToggle?: (itemId: string, enabled: boolean) => void;
  onPrint?: () => void;
  onDownload?: () => void;
}

function formatCurrency(value: number, currency: string = "EUR"): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency,
  }).format(value);
}

export function ProposalClientDocument({ 
  proposal, 
  items = [],
  workspace,
  showActions = true,
  allowItemToggle = false,
  onItemToggle,
  onPrint,
  onDownload,
}: ProposalClientDocumentProps) {
  const clientName = proposal.company?.name || proposal.contact?.name || proposal.opportunity?.lead?.name;
  const clientEmail = proposal.company?.email || proposal.contact?.email || proposal.opportunity?.lead?.email;
  const clientAddress = proposal.billing_address || proposal.company?.address || proposal.contact?.address;
  const clientNif = proposal.billing_nif || proposal.company?.tax_id || proposal.contact?.tax_id;
  const clientPhone = proposal.contact?.email; // assuming phone field
  
  const createdDate = new Date(proposal.created_at);
  const expiryDate = proposal.validity_days 
    ? addDays(createdDate, proposal.validity_days)
    : null;

  const paymentLabel = proposal.payment_conditions 
    ? PAYMENT_CONDITIONS.find(p => p.value === proposal.payment_conditions)?.label || proposal.payment_conditions
    : null;
  
  // Calculate totals only for enabled items
  const enabledItems = items.filter(item => item.is_enabled !== false);
  const itemsTotal = enabledItems.reduce((sum, item) => sum + item.total_price, 0);
  const vatRate = 0.23; // 23% IVA
  const vatAmount = itemsTotal * vatRate;
  const totalWithVat = itemsTotal + vatAmount;

  const companyName = workspace?.company_name || workspace?.name || "Empresa";
  const companyAddress = workspace?.billing_address;
  const companyCity = workspace?.billing_city;
  const companyPostalCode = workspace?.billing_postal_code;
  const companyPhone = workspace?.phone;
  const companyWebsite = workspace?.website;
  const companyEmail = workspace?.billing_email;
  const companyIban = workspace?.company_iban;
  const signatureName = workspace?.signature_name;
  const signatureTitle = workspace?.signature_title;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Action Bar */}
      {showActions && (
        <div className="flex items-center justify-end gap-2 mb-4">
          <Button variant="outline" size="sm" onClick={onPrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
          <Button variant="outline" size="sm" onClick={onDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      )}

      {/* Document Card */}
      <Card className="bg-white text-black overflow-hidden shadow-xl print:shadow-none">
        {/* Header with Logo and Company Info */}
        <div className="flex">
          {/* Left Sidebar with Company Info */}
          <div className="w-64 bg-primary p-6 text-primary-foreground flex-shrink-0 print:bg-primary print:text-primary-foreground">
            {/* Logo */}
            <div className="mb-6">
              {workspace?.logo_url ? (
                <img 
                  src={workspace.logo_url} 
                  alt={companyName} 
                  className="h-16 w-auto object-contain bg-white rounded p-2"
                />
              ) : (
                <div className="h-16 w-16 bg-primary-foreground/10 rounded flex items-center justify-center">
                  <span className="text-2xl font-bold">{companyName.charAt(0)}</span>
                </div>
              )}
            </div>

            {/* Company Details */}
            <div className="space-y-4 text-sm">
              <h3 className="font-bold text-lg">{companyName}</h3>
              
              {(companyAddress || companyCity) && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 opacity-75" />
                  <div>
                    {companyAddress && <p>{companyAddress}</p>}
                    {(companyPostalCode || companyCity) && (
                      <p>{[companyPostalCode, companyCity].filter(Boolean).join(" ")}</p>
                    )}
                  </div>
                </div>
              )}

              {companyWebsite && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 flex-shrink-0 opacity-75" />
                  <span>{companyWebsite}</span>
                </div>
              )}

              {companyEmail && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 flex-shrink-0 opacity-75" />
                  <span>{companyEmail}</span>
                </div>
              )}

              {companyPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 flex-shrink-0 opacity-75" />
                  <span>{companyPhone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Side - Document Header */}
          <div className="flex-1 p-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">Proposta</h1>
                <p className="text-sm text-gray-500 font-mono">
                  Nº {proposal.slug.toUpperCase()}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {format(createdDate, "dd 'de' MMMM 'de' yyyy", { locale: pt })}
                </p>
              </div>
              <Badge className="bg-primary/10 text-primary border-0 text-sm font-medium">
                {proposal.status === 'draft' ? 'Rascunho' : 
                 proposal.status === 'published' ? 'Pendente' : 
                 proposal.status === 'accepted' ? 'Aceita' : 
                 proposal.status === 'expired' ? 'Expirada' : 'Rejeitada'}
              </Badge>
            </div>

            {/* Client Info */}
            <div className="mt-8 bg-gray-50 rounded-lg p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-medium">
                Proposta Para
              </p>
              <h3 className="text-lg font-semibold text-gray-900">{clientName || "Cliente"}</h3>
              {clientAddress && <p className="text-sm text-gray-600 mt-1">{clientAddress}</p>}
              {clientNif && <p className="text-sm text-gray-600">NIF: {clientNif}</p>}
              {clientEmail && <p className="text-sm text-gray-600">{clientEmail}</p>}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="px-8 py-6">
          {allowItemToggle && (
            <p className="text-sm text-gray-500 mb-4">
              💡 Pode desmarcar itens que não pretende incluir na proposta.
            </p>
          )}
          <Table>
            <TableHeader>
              <TableRow className="border-gray-200">
                {allowItemToggle && (
                  <TableHead className="w-[5%] text-gray-600">Incluir</TableHead>
                )}
                <TableHead className="w-[5%] text-gray-600">#</TableHead>
                <TableHead className={cn(allowItemToggle ? "w-[45%]" : "w-[50%]", "text-gray-600")}>Item / Descrição</TableHead>
                <TableHead className="w-[15%] text-right text-gray-600">Preço</TableHead>
                <TableHead className="w-[10%] text-center text-gray-600">Qtd.</TableHead>
                <TableHead className="w-[20%] text-right text-gray-600">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length > 0 ? (
                items.map((item, index) => {
                  const isEnabled = item.is_enabled !== false;
                  return (
                    <TableRow 
                      key={item.id} 
                      className={cn(
                        "border-gray-100 transition-opacity",
                        !isEnabled && "opacity-50 bg-gray-50"
                      )}
                    >
                      {allowItemToggle && (
                        <TableCell>
                          <Switch
                            checked={isEnabled}
                            onCheckedChange={(checked) => onItemToggle?.(item.id, checked)}
                          />
                        </TableCell>
                      )}
                      <TableCell className="text-gray-500 font-mono">{index + 1}</TableCell>
                      <TableCell>
                        <p className={cn("font-medium text-gray-900", !isEnabled && "line-through text-gray-500")}>
                          {item.name}
                        </p>
                        {item.description && (
                          <p className={cn("text-sm text-gray-500 mt-0.5", !isEnabled && "line-through")}>
                            {item.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className={cn("text-right text-gray-700", !isEnabled && "line-through text-gray-400")}>
                        {formatCurrency(item.unit_price, proposal.currency)}
                      </TableCell>
                      <TableCell className={cn("text-center text-gray-700", !isEnabled && "line-through text-gray-400")}>
                        {item.quantity}
                      </TableCell>
                      <TableCell className={cn("text-right font-medium text-gray-900", !isEnabled && "line-through text-gray-400")}>
                        {formatCurrency(item.total_price, proposal.currency)}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={allowItemToggle ? 6 : 5} className="text-center text-gray-500 py-8">
                    {proposal.title}
                    {proposal.price && (
                      <p className="mt-2 font-semibold text-lg">
                        {formatCurrency(proposal.price, proposal.currency)}
                      </p>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Totals */}
          {items.length > 0 && (
            <div className="flex justify-end mt-6">
              <div className="w-72 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(itemsTotal, proposal.currency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">IVA (23%):</span>
                  <span>{formatCurrency(vatAmount, proposal.currency)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-primary">{formatCurrency(totalWithVat, proposal.currency)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-8 py-6 border-t mt-4">
          <div className="grid grid-cols-2 gap-8">
            {/* Payment Info */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Métodos de Pagamento</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p>• Transferência Bancária</p>
                {companyIban && <p className="font-mono text-xs">IBAN: {companyIban}</p>}
                {paymentLabel && <p>• Condições: {paymentLabel}</p>}
                {workspace?.payment_info && <p>{workspace.payment_info}</p>}
              </div>
            </div>

            {/* Signature */}
            <div className="text-right">
              <div className="inline-block text-left">
                <div className="w-32 h-16 border-b-2 border-gray-300 mb-2"></div>
                {signatureName && (
                  <p className="font-semibold text-gray-900">{signatureName}</p>
                )}
                {signatureTitle && (
                  <p className="text-sm text-gray-500">{signatureTitle}</p>
                )}
              </div>
            </div>
          </div>

          {/* Validity Note */}
          {expiryDate && (
            <div className="mt-6 pt-4 border-t text-center">
              <p className="text-xs text-gray-500">
                Esta proposta é válida até {format(expiryDate, "dd 'de' MMMM 'de' yyyy", { locale: pt })}.
                {proposal.notes && ` ${proposal.notes}`}
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
