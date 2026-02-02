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
  Package,
  Target,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Flag,
  Quote,
  Award,
} from "lucide-react";
import { format, addDays } from "date-fns";
import { pt } from "date-fns/locale";
import type { Proposal, ScopeData, TimelineData, ReferencesData } from "@/types/proposal";
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

// Helper function to truncate text for PDF compatibility (html2canvas doesn't support line-clamp)
const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

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
  // New props for additional sections
  scopeData?: ScopeData;
  timelineData?: TimelineData;
  referencesData?: ReferencesData;
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
  scopeData,
  timelineData,
  referencesData,
}: ProposalClientDocumentProps) {
  const clientName = proposal.company?.name || proposal.contact?.name || proposal.opportunity?.lead?.name;
  const clientEmail = proposal.company?.email || proposal.contact?.email || proposal.opportunity?.lead?.email;
  const clientAddress = proposal.billing_address || proposal.company?.address || proposal.contact?.address;
  const clientNif = proposal.billing_nif || proposal.company?.tax_id || proposal.contact?.tax_id;
  
  const createdDate = new Date(proposal.created_at);
  const expiryDate = proposal.validity_days 
    ? addDays(createdDate, proposal.validity_days)
    : null;

  // Helper para formatar condições de pagamento personalizadas
  const formatPaymentCondition = (value: string): string => {
    // Primeiro, procurar nas opções padrão
    const standardOption = PAYMENT_CONDITIONS.find(p => p.value === value);
    if (standardOption) return standardOption.label;
    
    // Se for valor personalizado, formatar para ser legível
    // Converter underscores para espaços e usar capitalização de frase (apenas primeira letra maiúscula)
    const formatted = value
      .replace(/_/g, ' ')
      .toLowerCase()
      .trim();
    
    // Capitalizar apenas a primeira letra da frase
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const paymentLabel = proposal.payment_conditions 
    ? formatPaymentCondition(proposal.payment_conditions)
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

  // Check if sections have content
  const hasScopeContent = scopeData && (
    scopeData.objectives || 
    scopeData.deliverables?.length > 0 || 
    scopeData.exclusions?.length > 0 || 
    scopeData.assumptions
  );

  const hasTimelineContent = timelineData && timelineData.phases && timelineData.phases.length > 0;

  const hasReferencesContent = referencesData && (
    referencesData.projects?.length > 0 || 
    referencesData.testimonial?.quote || 
    referencesData.certifications?.length > 0
  );

  return (
    <div className="max-w-[210mm] mx-auto">
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
        
        {/* ====== 1. CAPA DA PROPOSTA ====== */}
        <div data-pdf-section="cover" className="flex flex-col relative" style={{ minHeight: '1090px' }}>
          {/* Top section with logo and proposal info */}
          <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-12">
            {/* Logo */}
            <div className="mb-8">
              {workspace?.logo_url ? (
                <img 
                  src={workspace.logo_url} 
                  alt={companyName} 
                  className="h-24 w-auto object-contain"
                />
              ) : (
                <div className="h-24 w-24 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-4xl font-bold text-primary-foreground">{companyName.charAt(0)}</span>
                </div>
              )}
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">PROPOSTA</h1>
            <p className="text-lg text-gray-500 font-mono mb-8">
              Nº {proposal.slug.toUpperCase()}
            </p>

            {/* Divider */}
            <div className="w-24 h-1 bg-primary rounded mb-8"></div>

            {/* Client Section */}
            <div className="text-center mb-8">
              <p className="text-sm text-gray-500 uppercase tracking-wider mb-2 font-medium">
                Preparado para
              </p>
              <h2 className="text-2xl font-semibold text-gray-900 mb-1">
                {clientName || "Cliente"}
              </h2>
              {clientAddress && (
                <p className="text-sm text-gray-600">{clientAddress}</p>
              )}
              {clientNif && (
                <p className="text-sm text-gray-600">NIF: {clientNif}</p>
              )}
            </div>

            {/* Dates */}
            <div className="flex items-center gap-8 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span>Data: {format(createdDate, "dd 'de' MMMM 'de' yyyy", { locale: pt })}</span>
              </div>
              {expiryDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>Válido até: {format(expiryDate, "dd 'de' MMMM 'de' yyyy", { locale: pt })}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer with company contact */}
          <div className="bg-primary text-primary-foreground p-6">
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 text-sm">
              <span className="font-semibold">{companyName}</span>
              {companyWebsite && (
                <span className="flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  {companyWebsite}
                </span>
              )}
              {companyEmail && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {companyEmail}
                </span>
              )}
              {companyPhone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {companyPhone}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ====== 2. ÂMBITO DO PROJECTO ====== */}
        {hasScopeContent && (
          <div data-pdf-section="scope" className="px-4 md:px-8 py-8 border-t">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2 uppercase tracking-wide">
              <Target className="h-5 w-5 text-primary" />
              Âmbito do Projecto
            </h2>
            
            <div className="space-y-6">
              {/* Objectives */}
              {scopeData?.objectives && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Objectivos</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                    {scopeData.objectives}
                  </p>
                </div>
              )}

              {/* Deliverables */}
              {scopeData?.deliverables && scopeData.deliverables.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Entregáveis
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-1.5 ml-1">
                    {scopeData.deliverables.map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-green-600 mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Exclusions */}
              {scopeData?.exclusions && scopeData.exclusions.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    Exclusões
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-1.5 ml-1">
                    {scopeData.exclusions.map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-red-500 mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Assumptions */}
              {scopeData?.assumptions && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Pressupostos
                  </h4>
                  <p className="text-sm text-amber-700 whitespace-pre-wrap">
                    {scopeData.assumptions}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ====== 3. CRONOGRAMA ====== */}
        {hasTimelineContent && (
          <div data-pdf-section="timeline" className="px-4 md:px-8 py-8 border-t">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2 uppercase tracking-wide">
              <Clock className="h-5 w-5 text-primary" />
              Cronograma
            </h2>

            {/* Total Duration */}
            {(() => {
              const totalWeeks = timelineData!.phases.reduce((sum, phase) => {
                if (phase.type === 'phase' && phase.duration) {
                  return sum + Math.ceil(phase.duration / 7);
                }
                return sum;
              }, 0);
              return totalWeeks > 0 ? (
                <div className="mb-4 bg-primary/5 border border-primary/20 rounded-lg p-3 inline-block">
                  <span className="text-sm font-medium text-primary">
                    Duração Total: {totalWeeks} semana{totalWeeks > 1 ? 's' : ''}
                  </span>
                </div>
              ) : null;
            })()}

            {/* Timeline Table */}
            <div className="[&_div.overflow-x-auto]:overflow-visible [&_table]:!min-w-0">
              <Table className="table-fixed w-full">
                <TableHeader>
                  <TableRow className="border-gray-200">
                    <TableHead className="w-[15%] text-gray-600">Semana</TableHead>
                    <TableHead className="w-[55%] text-gray-600">Fase/Marco</TableHead>
                    <TableHead className="w-[30%] text-gray-600">Duração</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timelineData!.phases.map((phase, index) => (
                    <TableRow key={phase.id || index} className="border-gray-100">
                      <TableCell className="text-gray-500 font-mono text-xs py-2">
                        {phase.week || index + 1}
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="flex items-center gap-2">
                          {phase.type === 'milestone' ? (
                            <Flag className="h-4 w-4 text-amber-500 flex-shrink-0" />
                          ) : (
                            <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                          )}
                          <div>
                            <p className={cn(
                              "font-medium text-sm",
                              phase.type === 'milestone' ? "text-amber-700" : "text-gray-900"
                            )}>
                              {phase.type === 'milestone' ? `Marco: ${phase.title}` : phase.title}
                            </p>
                            {phase.description && (
                              <p className="text-xs text-gray-500 mt-0.5">{phase.description}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600 text-xs py-2">
                        {phase.type === 'milestone' ? '-' : 
                          phase.duration ? `${phase.duration} dia${phase.duration > 1 ? 's' : ''}` : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* ====== 4. REFERÊNCIAS E CREDENCIAIS ====== */}
        {hasReferencesContent && (
          <div data-pdf-section="references" className="px-4 md:px-8 py-8 border-t">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2 uppercase tracking-wide">
              <Award className="h-5 w-5 text-primary" />
              Referências e Credenciais
            </h2>

            <div className="space-y-6">
              {/* Similar Projects */}
              {referencesData?.projects && referencesData.projects.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Projectos Similares</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {referencesData.projects.map((project, index) => (
                      <div 
                        key={project.id || index} 
                        className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                      >
                        <h5 className="font-medium text-gray-900 text-sm mb-1">
                          {project.title}
                        </h5>
                        <p className="text-xs text-gray-600">
                          {project.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Testimonial */}
              {referencesData?.testimonial && referencesData.testimonial.quote && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-5">
                  <div className="flex gap-3">
                    <Quote className="h-6 w-6 text-primary/50 flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-gray-700 italic text-sm leading-relaxed mb-3">
                        "{referencesData.testimonial.quote}"
                      </p>
                      <div className="text-sm">
                        <p className="font-semibold text-gray-900">
                          {referencesData.testimonial.author}
                        </p>
                        {(referencesData.testimonial.role || referencesData.testimonial.company) && (
                          <p className="text-gray-500 text-xs">
                            {[referencesData.testimonial.role, referencesData.testimonial.company]
                              .filter(Boolean)
                              .join(' @ ')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Certifications */}
              {referencesData?.certifications && referencesData.certifications.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Certificações</h4>
                  <div className="flex flex-wrap gap-2">
                    {referencesData.certifications.map((cert, index) => (
                      <Badge 
                        key={index} 
                        variant="outline" 
                        className="text-xs bg-white border-gray-300 text-gray-700"
                      >
                        <Award className="h-3 w-3 mr-1" />
                        {cert}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ====== 5. PROPOSTA E CONDIÇÕES DE VENDA ====== */}
        <div data-pdf-section="proposal" className="border-t">
          {/* Section Header */}
          <div className="px-4 md:px-8 pt-8 pb-4">
            <h2 className="text-xl font-bold text-gray-900 uppercase tracking-wide">
              Proposta
            </h2>
          </div>

          {/* Items Table */}
          <div className="px-4 md:px-8 py-4">
            {allowItemToggle && (
              <p className="text-sm text-gray-500 mb-4">
                💡 Pode desmarcar itens que não pretende incluir na proposta.
              </p>
            )}
            {/* Wrapper to override Table overflow for PDF capture */}
            <div className="[&_div.overflow-x-auto]:overflow-visible [&_table]:!min-w-0">
              <Table className="table-fixed w-full">
                <TableHeader>
                  <TableRow className="border-gray-200">
                    {allowItemToggle && (
                      <TableHead className="w-[7%] text-gray-600">Incluir</TableHead>
                    )}
                    <TableHead className="w-[5%] text-gray-600">#</TableHead>
                    <TableHead className={cn(allowItemToggle ? "w-[47%]" : "w-[55%]", "text-gray-600")}>Item</TableHead>
                    <TableHead className="w-[13%] text-right text-gray-600">Preço</TableHead>
                    <TableHead className="w-[8%] text-center text-gray-600">Qtd</TableHead>
                    <TableHead className="w-[12%] text-right text-gray-600">Total</TableHead>
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
                            <TableCell className="py-2">
                              <Switch
                                checked={isEnabled}
                                onCheckedChange={(checked) => onItemToggle?.(item.id, checked)}
                              />
                            </TableCell>
                          )}
                          <TableCell className="text-gray-500 font-mono text-xs py-2">{index + 1}</TableCell>
                          <TableCell className="py-2">
                            <div className="flex items-start gap-2">
                              {/* Product Image with fallback */}
                              {item.image_url ? (
                                <img 
                                  src={item.image_url} 
                                  alt={item.name}
                                  className={cn(
                                    "w-10 h-10 object-cover rounded border border-gray-200 flex-shrink-0",
                                    !isEnabled && "opacity-50"
                                  )}
                                  onError={(e) => {
                                    // Hide broken image and show fallback
                                    e.currentTarget.style.display = 'none';
                                    const fallback = e.currentTarget.nextElementSibling;
                                    if (fallback) fallback.classList.remove('hidden');
                                  }}
                                />
                              ) : null}
                              {/* Fallback - hidden when image loads successfully */}
                              <div className={cn(
                                "w-10 h-10 bg-gray-100 rounded border border-gray-200 flex-shrink-0 flex items-center justify-center",
                                !isEnabled && "opacity-50",
                                item.image_url && "hidden"
                              )}>
                                <Package className="h-5 w-5 text-gray-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={cn("font-medium text-gray-900 text-sm leading-tight", !isEnabled && "line-through text-gray-500")}>
                                  {truncateText(item.name, 60)}
                                </p>
                                {item.description && (
                                  <p className={cn("text-xs text-gray-500 mt-0.5", !isEnabled && "line-through")}>
                                    {truncateText(item.description, 80)}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className={cn("text-right text-gray-700 text-xs py-2", !isEnabled && "line-through text-gray-400")}>
                            {formatCurrency(item.unit_price, proposal.currency)}
                          </TableCell>
                          <TableCell className={cn("text-center text-gray-700 text-xs py-2", !isEnabled && "line-through text-gray-400")}>
                            {item.quantity}
                          </TableCell>
                          <TableCell className={cn("text-right font-medium text-gray-900 text-xs py-2", !isEnabled && "line-through text-gray-400")}>
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
            </div>

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

          {/* Conditions of Sale - Table Format */}
          <div className="bg-gray-50 px-4 md:px-8 py-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 uppercase tracking-wide">
              Condições de Venda
            </h3>
            
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {/* Payment Method */}
                  <tr className="border-b border-gray-100">
                    <td className="px-4 py-3 font-medium text-gray-700 bg-gray-50 w-40">
                      Pagamento
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      Transferência Bancária
                    </td>
                  </tr>
                  
                  {/* IBAN */}
                  {companyIban && (
                    <tr className="border-b border-gray-100">
                      <td className="px-4 py-3 font-medium text-gray-700 bg-gray-50 w-40">
                        IBAN
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                        {companyIban}
                      </td>
                    </tr>
                  )}
                  
                  {/* Payment Conditions */}
                  {paymentLabel && (
                    <tr className="border-b border-gray-100">
                      <td className="px-4 py-3 font-medium text-gray-700 bg-gray-50 w-40">
                        Condições
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {paymentLabel}
                      </td>
                    </tr>
                  )}
                  
                  {/* Tax Info */}
                  <tr className="border-b border-gray-100">
                    <td className="px-4 py-3 font-medium text-gray-700 bg-gray-50 w-40">
                      Imposto
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      IVA 23% (incluído nos valores apresentados)
                    </td>
                  </tr>
                  
                  {/* Delivery Info */}
                  <tr className="border-b border-gray-100">
                    <td className="px-4 py-3 font-medium text-gray-700 bg-gray-50 w-40">
                      Entrega
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      A combinar com o cliente
                    </td>
                  </tr>
                  
                  {/* Validity */}
                  {expiryDate && (
                    <tr>
                      <td className="px-4 py-3 font-medium text-gray-700 bg-gray-50 w-40">
                        Validade
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {proposal.validity_days} dias (até {format(expiryDate, "dd 'de' MMMM 'de' yyyy", { locale: pt })})
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Notes - separate if exists */}
            {proposal.notes && (
              <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Observações</p>
                <p className="text-sm text-gray-600">{proposal.notes}</p>
              </div>
            )}
            
            {/* Additional payment info from workspace */}
            {workspace?.payment_info && (
              <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Informação Adicional</p>
                <p className="text-sm text-gray-600">{workspace.payment_info}</p>
              </div>
            )}

            {/* Signature */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex flex-col md:flex-row md:justify-between gap-8">
                {/* Client Signature */}
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-medium">
                    Aceite do Cliente
                  </p>
                  <div className="w-48 h-16 border-b-2 border-gray-300 mb-2"></div>
                  <p className="text-sm text-gray-600">Data: ___/___/______</p>
                </div>

                {/* Company Signature */}
                <div className="text-right">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-medium">
                    Assinatura
                  </p>
                  <div className="inline-block text-left">
                    <div className="w-48 h-16 border-b-2 border-gray-300 mb-2"></div>
                    {signatureName && (
                      <p className="font-semibold text-gray-900">{signatureName}</p>
                    )}
                    {signatureTitle && (
                      <p className="text-sm text-gray-500">{signatureTitle}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
