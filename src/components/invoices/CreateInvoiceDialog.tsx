import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCreateInvoice, type CreateInvoiceItemInput } from "@/hooks/useInvoices";
import { useCompanies } from "@/hooks/useCompanies";
import { useContacts } from "@/hooks/useContacts";
import { useProducts } from "@/hooks/useProducts";
import { Loader2, Building2 } from "lucide-react";
import { InvoiceProductSelector } from "./InvoiceProductSelector";
import { InvoiceItemsCart, type InvoiceCartItem } from "./InvoiceItemsCart";
import type { Product } from "@/types/product";

// Helper function to convert payment conditions to days
function getPaymentDays(paymentCondition: string | null | undefined): number {
  if (!paymentCondition) return 30; // Default: 30 dias
  
  const daysMap: Record<string, number> = {
    'Pronto Pagamento': 0,
    '15 dias': 15,
    '30 dias': 30,
    '45 dias': 45,
    '60 dias': 60,
    '90 dias': 90,
  };
  
  return daysMap[paymentCondition] ?? 30;
}

// Helper function to calculate due date from issue date and payment days
function calculateDueDate(issueDateStr: string, paymentDays: number): string {
  const issueDateObj = new Date(issueDateStr);
  const dueDateObj = new Date(issueDateObj);
  dueDateObj.setDate(dueDateObj.getDate() + paymentDays);
  return dueDateObj.toISOString().split("T")[0];
}

interface CreateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCompanyId?: string;
  defaultContactId?: string;
  defaultOpportunityId?: string;
}

export function CreateInvoiceDialog({
  open,
  onOpenChange,
  defaultCompanyId,
  defaultContactId,
  defaultOpportunityId,
}: CreateInvoiceDialogProps) {
  const createInvoice = useCreateInvoice();
  const { companies } = useCompanies();
  const { contacts } = useContacts();
  const { data: products } = useProducts();

  // Initialize clientType based on whether we have defaults
  const [clientType, setClientType] = useState<"company" | "contact" | "manual">(
    defaultContactId ? "contact" : defaultCompanyId ? "company" : "company"
  );
  const [selectedCompanyId, setSelectedCompanyId] = useState(defaultCompanyId || "");
  const [selectedContactId, setSelectedContactId] = useState(defaultContactId || "");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientTaxId, setClientTaxId] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");
  const [cartItems, setCartItems] = useState<InvoiceCartItem[]>([]);

  // Re-initialize when dialog opens with defaults
  useEffect(() => {
    if (open) {
      if (defaultContactId) {
        setClientType("contact");
        setSelectedContactId(defaultContactId);
      } else if (defaultCompanyId) {
        setClientType("company");
        setSelectedCompanyId(defaultCompanyId);
      }
    }
  }, [open, defaultContactId, defaultCompanyId]);

  const selectedCompany = companies?.find((c) => c.id === selectedCompanyId);
  const selectedContact = contacts?.find((c) => c.id === selectedContactId);
  
  // Get contacts that belong to selected company
  const companyContacts = useMemo(() => {
    if (!selectedCompanyId || !contacts) return [];
    return contacts.filter(c => c.company_id === selectedCompanyId);
  }, [selectedCompanyId, contacts]);
  
  // Get the company associated with the selected contact
  const selectedContactCompany = selectedContact?.company_id 
    ? companies?.find(c => c.id === selectedContact.company_id) 
    : null;

  // Auto-select contact when company has only one contact
  useEffect(() => {
    if (clientType === "company" && selectedCompanyId && companyContacts.length === 1) {
      setSelectedContactId(companyContacts[0].id);
    }
  }, [selectedCompanyId, companyContacts, clientType]);

  // Auto-fill fields when company is selected
  useEffect(() => {
    if (clientType === "company" && selectedCompany) {
      // Auto-fill NIF/VAT
      setClientTaxId(selectedCompany.tax_id || "");
      
      // Auto-fill address (combine address, postal_code, city)
      const companyData = selectedCompany as any;
      const fullAddress = [
        selectedCompany.address,
        companyData.postal_code,
        companyData.city
      ].filter(Boolean).join(", ");
      setClientAddress(fullAddress || "");
      
      // Auto-fill email
      setClientEmail(selectedCompany.email || "");
      
      // Calculate due date based on company payment conditions
      const paymentDays = getPaymentDays((selectedCompany as any).payment_conditions);
      setDueDate(calculateDueDate(issueDate, paymentDays));
    }
  }, [selectedCompany, clientType, issueDate]);

  // Auto-fill fields when contact is selected (use company data for billing)
  useEffect(() => {
    if (clientType === "contact" && selectedContact) {
      if (selectedContactCompany) {
        // Use company data for billing
        setClientTaxId(selectedContactCompany.tax_id || "");
        
        // Build full address from company
        const companyData = selectedContactCompany as any;
        const fullAddress = [
          selectedContactCompany.address,
          companyData.postal_code,
          companyData.city
        ].filter(Boolean).join(", ");
        setClientAddress(fullAddress || "");
        
        // Use company email or fallback to contact email
        setClientEmail(selectedContactCompany.email || selectedContact.email || "");
        
        // Calculate due date based on company payment conditions
        const paymentDays = getPaymentDays((selectedContactCompany as any).payment_conditions);
        setDueDate(calculateDueDate(issueDate, paymentDays));
      } else {
        // Contact without company - use contact data
        setClientEmail(selectedContact.email || "");
        setClientTaxId((selectedContact as any).tax_id || "");
        setClientAddress("");
        
        // Use contact's payment conditions if available
        const paymentDays = getPaymentDays((selectedContact as any).payment_conditions);
        setDueDate(calculateDueDate(issueDate, paymentDays));
      }
    }
  }, [selectedContact, selectedContactCompany, clientType, issueDate]);

  // Clear auto-filled fields when client type changes (but not on initial load with defaults)
  const [hasInitialized, setHasInitialized] = useState(false);
  useEffect(() => {
    if (!hasInitialized) {
      setHasInitialized(true);
      return; // Skip clearing on first render
    }
    setClientTaxId("");
    setClientAddress("");
    setClientEmail("");
    setSelectedCompanyId("");
    setSelectedContactId("");
    setClientName("");
    // Reset due date to default 30 days
    setDueDate(calculateDueDate(issueDate, 30));
  }, [clientType]);

  // Cart handlers for POS-style product selection
  const handleAddProduct = (product: Product) => {
    const existingItem = cartItems.find(item => item.product_id === product.id);
    if (existingItem) {
      setCartItems(cartItems.map(item =>
        item.product_id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCartItems([...cartItems, {
        id: crypto.randomUUID(),
        product_id: product.id,
        name: product.name,
        description: product.name,
        quantity: 1,
        unit_price: product.base_price || 0,
        discount_percent: 0,
        tax_rate: 23,
      }]);
    }
  };

  const handleRemoveProduct = (productId: string) => {
    setCartItems(cartItems.filter(item => item.product_id !== productId));
  };

  const handleRemoveItem = (itemId: string) => {
    setCartItems(cartItems.filter(item => item.id !== itemId));
  };

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    setCartItems(cartItems.map(item =>
      item.id === itemId ? { ...item, quantity } : item
    ));
  };

  const handleUpdatePrice = (itemId: string, price: number) => {
    setCartItems(cartItems.map(item =>
      item.id === itemId ? { ...item, unit_price: price } : item
    ));
  };

  const handleUpdateDiscount = (itemId: string, discount: number) => {
    setCartItems(cartItems.map(item =>
      item.id === itemId ? { ...item, discount_percent: discount } : item
    ));
  };

  const handleUpdateTaxRate = (itemId: string, taxRate: number) => {
    setCartItems(cartItems.map(item =>
      item.id === itemId ? { ...item, tax_rate: taxRate } : item
    ));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const getSelectedProductIds = () => {
    return cartItems.map(item => item.product_id).filter(Boolean) as string[];
  };

  const calculateItemTotal = (item: InvoiceCartItem) => {
    const discountMultiplier = 1 - item.discount_percent / 100;
    return item.quantity * item.unit_price * discountMultiplier;
  };

  const subtotal = cartItems.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  const taxAmount = cartItems.reduce(
    (sum, item) => sum + (calculateItemTotal(item) * item.tax_rate) / 100,
    0
  );
  const total = subtotal + taxAmount;

  const getClientInfo = () => {
    if (clientType === "company" && selectedCompany) {
      return {
        name: selectedCompany.name,
        email: clientEmail || selectedCompany.email || "",
        address: clientAddress || selectedCompany.address || "",
        company_id: selectedCompany.id,
        contact_id: selectedContactId || undefined,
      };
    }
    if (clientType === "contact" && selectedContact) {
      const billingCompany = selectedContactCompany;
      return {
        name: billingCompany?.name || selectedContact.name,
        email: clientEmail || billingCompany?.email || selectedContact.email || "",
        address: clientAddress || billingCompany?.address || "",
        contact_id: selectedContact.id,
        company_id: billingCompany?.id,
      };
    }
    return {
      name: clientName,
      email: clientEmail,
      address: clientAddress,
    };
  };

  const handleSubmit = async () => {
    const clientInfo = getClientInfo();

    if (!clientInfo.name) {
      return;
    }

    const invoiceItems: CreateInvoiceItemInput[] = cartItems
      .filter((item) => item.description || item.name)
      .map((item) => ({
        product_id: item.product_id,
        description: item.description || item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percent: item.discount_percent,
        tax_rate: item.tax_rate,
      }));

    await createInvoice.mutateAsync({
      company_id: clientInfo.company_id,
      contact_id: clientInfo.contact_id,
      opportunity_id: defaultOpportunityId,
      client_name: clientInfo.name,
      client_email: clientInfo.email,
      client_address: clientInfo.address,
      client_tax_id: clientTaxId,
      issue_date: issueDate,
      due_date: dueDate,
      notes,
      items: invoiceItems,
    });

    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setClientType("company");
    setSelectedCompanyId("");
    setSelectedContactId("");
    setClientName("");
    setClientEmail("");
    setClientAddress("");
    setClientTaxId("");
    setIssueDate(new Date().toISOString().split("T")[0]);
    setDueDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
    setNotes("");
    setCartItems([]);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Nova Fatura</DialogTitle>
          <DialogDescription>
            Crie uma nova fatura para enviar ao cliente.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          <div className="space-y-6">
            {/* Client Selection */}
            <div className="space-y-4">
              <Label>Tipo de Cliente</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={clientType === "company" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setClientType("company")}
                >
                  Empresa
                </Button>
                <Button
                  type="button"
                  variant={clientType === "contact" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setClientType("contact")}
                >
                  Contacto
                </Button>
                <Button
                  type="button"
                  variant={clientType === "manual" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setClientType("manual")}
                >
                  Manual
                </Button>
              </div>

              {clientType === "company" && (
                <div className="space-y-3">
                  <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar empresa" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies?.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Optional contact selector when company is selected */}
                  {selectedCompanyId && (
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">
                        Contacto responsável (opcional)
                      </Label>
                      <Select 
                        value={selectedContactId || "_none"} 
                        onValueChange={(val) => setSelectedContactId(val === "_none" ? "" : val)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar contacto que fez o pedido" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">Nenhum</SelectItem>
                          {contacts
                            ?.filter(c => c.company_id === selectedCompanyId)
                            .map((contact) => (
                              <SelectItem key={contact.id} value={contact.id}>
                                {contact.name}
                                {(contact as any).job_title && ` - ${(contact as any).job_title}`}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      {contacts?.filter(c => c.company_id === selectedCompanyId).length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          Sem contactos associados a esta empresa
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {clientType === "contact" && (
                <div className="space-y-3">
                  <Select value={selectedContactId} onValueChange={setSelectedContactId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar contacto (decisor)" />
                    </SelectTrigger>
                    <SelectContent>
                      {contacts?.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.name}
                          {contact.company && ` - ${contact.company}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Show billing company info when contact is selected */}
                  {selectedContact && selectedContactCompany && (
                    <div className="p-3 bg-muted/50 rounded-lg border space-y-1">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Building2 className="h-4 w-4" />
                        <span>Faturar a:</span>
                      </div>
                      <p className="text-sm font-medium">{selectedContactCompany.name}</p>
                      {selectedContactCompany.tax_id && (
                        <p className="text-xs text-muted-foreground">
                          NIF: {selectedContactCompany.tax_id}
                        </p>
                      )}
                      {(selectedContactCompany.address || (selectedContactCompany as any).city) && (
                        <p className="text-xs text-muted-foreground">
                          {[selectedContactCompany.address, (selectedContactCompany as any).postal_code, (selectedContactCompany as any).city].filter(Boolean).join(", ")}
                        </p>
                      )}
                      {(selectedContactCompany as any).payment_conditions && (
                        <p className="text-xs text-muted-foreground">
                          Condições: {(selectedContactCompany as any).payment_conditions}
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Show warning if contact has no company */}
                  {selectedContact && !selectedContactCompany && (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <p className="text-xs text-yellow-700 dark:text-yellow-300">
                        Este contacto não tem empresa associada. Os dados de faturação serão do próprio contacto.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {clientType === "manual" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nome do Cliente *</Label>
                    <Input
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Nome da empresa ou pessoa"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Morada</Label>
                    <Input
                      value={clientAddress}
                      onChange={(e) => setClientAddress(e.target.value)}
                      placeholder="Morada completa"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>NIF / VAT Number</Label>
                <Input
                  value={clientTaxId}
                  onChange={(e) => setClientTaxId(e.target.value)}
                  placeholder="PT123456789"
                />
              </div>
            </div>

            <Separator />

            {/* Dates */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Data de Emissão</Label>
                <Input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Data de Vencimento</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            <Separator />

            {/* Invoice Items - POS Style */}
            <div className="space-y-4">
              <Label>Itens da Fatura</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Product Selector */}
                <div>
                  <InvoiceProductSelector
                    selectedProductIds={getSelectedProductIds()}
                    onAddProduct={handleAddProduct}
                    onRemoveProduct={handleRemoveProduct}
                  />
                </div>
                
                {/* Cart */}
                <div>
                  <InvoiceItemsCart
                    items={cartItems}
                    onUpdateQuantity={handleUpdateQuantity}
                    onUpdatePrice={handleUpdatePrice}
                    onUpdateDiscount={handleUpdateDiscount}
                    onUpdateTaxRate={handleUpdateTaxRate}
                    onRemoveItem={handleRemoveItem}
                    onClear={handleClearCart}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas ou observações para o cliente"
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createInvoice.isPending}
              >
                {createInvoice.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar Fatura
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
