import { useState } from "react";
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
import { Plus, Trash2, Loader2 } from "lucide-react";

interface CreateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCompanyId?: string;
  defaultContactId?: string;
}

interface InvoiceItemForm {
  id: string;
  product_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  tax_rate: number;
}

export function CreateInvoiceDialog({
  open,
  onOpenChange,
  defaultCompanyId,
  defaultContactId,
}: CreateInvoiceDialogProps) {
  const createInvoice = useCreateInvoice();
  const { companies } = useCompanies();
  const { contacts } = useContacts();
  const { data: products } = useProducts();

  const [clientType, setClientType] = useState<"company" | "contact" | "manual">("company");
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
  const [items, setItems] = useState<InvoiceItemForm[]>([
    { id: crypto.randomUUID(), description: "", quantity: 1, unit_price: 0, discount_percent: 0, tax_rate: 23 },
  ]);

  const selectedCompany = companies?.find((c) => c.id === selectedCompanyId);
  const selectedContact = contacts?.find((c) => c.id === selectedContactId);

  const getClientInfo = () => {
    if (clientType === "company" && selectedCompany) {
      return {
        name: selectedCompany.name,
        email: selectedCompany.email || "",
        address: selectedCompany.address || "",
        company_id: selectedCompany.id,
      };
    }
    if (clientType === "contact" && selectedContact) {
      return {
        name: selectedContact.name,
        email: selectedContact.email || "",
        address: "",
        contact_id: selectedContact.id,
      };
    }
    return {
      name: clientName,
      email: clientEmail,
      address: clientAddress,
    };
  };

  const addItem = () => {
    setItems([
      ...items,
      { id: crypto.randomUUID(), description: "", quantity: 1, unit_price: 0, discount_percent: 0, tax_rate: 23 },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof InvoiceItemForm, value: any) => {
    setItems(
      items.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const selectProduct = (itemId: string, productId: string) => {
    const product = products?.find((p) => p.id === productId);
    if (product) {
      setItems(
        items.map((item) =>
          item.id === itemId
            ? {
                ...item,
                product_id: productId,
                description: product.name,
                unit_price: product.base_price || 0,
              }
            : item
        )
      );
    }
  };

  const calculateItemTotal = (item: InvoiceItemForm) => {
    const discountMultiplier = 1 - item.discount_percent / 100;
    return item.quantity * item.unit_price * discountMultiplier;
  };

  const subtotal = items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  const taxAmount = items.reduce(
    (sum, item) => sum + (calculateItemTotal(item) * item.tax_rate) / 100,
    0
  );
  const total = subtotal + taxAmount;

  const handleSubmit = async () => {
    const clientInfo = getClientInfo();

    if (!clientInfo.name) {
      return;
    }

    const invoiceItems: CreateInvoiceItemInput[] = items
      .filter((item) => item.description)
      .map((item) => ({
        product_id: item.product_id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percent: item.discount_percent,
        tax_rate: item.tax_rate,
      }));

    await createInvoice.mutateAsync({
      company_id: clientInfo.company_id,
      contact_id: clientInfo.contact_id,
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
    setItems([{ id: crypto.randomUUID(), description: "", quantity: 1, unit_price: 0, discount_percent: 0, tax_rate: 23 }]);
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
              )}

              {clientType === "contact" && (
                <Select value={selectedContactId} onValueChange={setSelectedContactId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar contacto" />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts?.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

            {/* Invoice Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Itens da Fatura</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar Item
                </Button>
              </div>

              <div className="space-y-3">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className="grid gap-3 p-4 border rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        Item {index + 1}
                      </span>
                      {items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-xs">Produto (opcional)</Label>
                        <Select
                          value={item.product_id || ""}
                          onValueChange={(value) => selectProduct(item.id, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar produto" />
                          </SelectTrigger>
                          <SelectContent>
                            {products?.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name} - {formatCurrency(product.base_price || 0)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Descrição *</Label>
                        <Input
                          value={item.description}
                          onChange={(e) =>
                            updateItem(item.id, "description", e.target.value)
                          }
                          placeholder="Descrição do item"
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Quantidade</Label>
                        <Input
                          type="number"
                          min="1"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(item.id, "quantity", parseFloat(e.target.value) || 1)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Preço Unit. (€)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) =>
                            updateItem(item.id, "unit_price", parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Desconto (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={item.discount_percent}
                          onChange={(e) =>
                            updateItem(item.id, "discount_percent", parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">IVA (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={item.tax_rate}
                          onChange={(e) =>
                            updateItem(item.id, "tax_rate", parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>
                    </div>

                    <div className="text-right text-sm">
                      <span className="text-muted-foreground">Total: </span>
                      <span className="font-medium">
                        {formatCurrency(calculateItemTotal(item))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Totals */}
            <div className="space-y-2 text-right">
              <div className="flex justify-end gap-8">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium w-24">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-end gap-8">
                <span className="text-muted-foreground">IVA:</span>
                <span className="font-medium w-24">{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-end gap-8 text-lg">
                <span className="font-semibold">Total:</span>
                <span className="font-bold w-24">{formatCurrency(total)}</span>
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
