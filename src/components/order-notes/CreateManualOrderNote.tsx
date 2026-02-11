import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useClientUsers } from "@/hooks/useClientUsers";
import { useCreateOrderNote } from "@/hooks/useCreateOrderNote";
import { ProductSearchDialog } from "./ProductSearchDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Copy,
  Save, Send, Search, Package, User,
} from "lucide-react";
import type { ClientUser, AddressData } from "@/types/client-user";
import type { OrderNoteStatus } from "@/types/order-note";

interface LineItem {
  id: string;
  product_id: string | null;
  product_name: string;
  product_sku: string | null;
  product_image_url: string | null;
  quantity: number;
  unit_price_net: number;
  vat_rate: number;
  notes: string | null;
}

function uid() {
  return Math.random().toString(36).substring(2, 10);
}

export function CreateManualOrderNote() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const { clients } = useClientUsers();
  const createMutation = useCreateOrderNote();

  // Client
  const [selectedClient, setSelectedClient] = useState<ClientUser | null>(null);
  const [clientOpen, setClientOpen] = useState(false);

  // Items
  const [items, setItems] = useState<LineItem[]>([]);
  const [productDialogOpen, setProductDialogOpen] = useState(false);

  // Addresses
  const [billingAddress, setBillingAddress] = useState<AddressData>({});
  const [shippingAddress, setShippingAddress] = useState<AddressData>({});

  // Installments
  const [installmentRequested, setInstallmentRequested] = useState(false);
  const [installmentCount, setInstallmentCount] = useState(2);
  const [installmentNotes, setInstallmentNotes] = useState("");

  // Notes
  const [clientNotes, setClientNotes] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  // Totals
  const totals = useMemo(() => {
    let net = 0, vat = 0;
    items.forEach((item) => {
      const lineNet = item.quantity * item.unit_price_net;
      const lineVat = lineNet * (item.vat_rate / 100);
      net += lineNet;
      vat += lineVat;
    });
    return { net, vat, gross: net + vat };
  }, [items]);

  // Client selection
  const handleSelectClient = useCallback((client: ClientUser) => {
    setSelectedClient(client);
    setClientOpen(false);
    if (client.billing_address) {
      setBillingAddress(client.billing_address as AddressData);
    }
    if (client.shipping_address) {
      setShippingAddress(client.shipping_address as AddressData);
    }
  }, []);

  // Add product from catalog
  const handleAddProduct = useCallback((product: {
    id: string; name: string; sku: string | null;
    image_url: string | null; price: number;
  }) => {
    setItems((prev) => [
      ...prev,
      {
        id: uid(),
        product_id: product.id,
        product_name: product.name,
        product_sku: product.sku,
        product_image_url: product.image_url,
        quantity: 1,
        unit_price_net: product.price,
        vat_rate: 23,
        notes: null,
      },
    ]);
  }, []);

  // Add manual line
  const handleAddManualLine = useCallback(() => {
    setItems((prev) => [
      ...prev,
      {
        id: uid(),
        product_id: null,
        product_name: "",
        product_sku: null,
        product_image_url: null,
        quantity: 1,
        unit_price_net: 0,
        vat_rate: 23,
        notes: null,
      },
    ]);
  }, []);

  // Update item
  const updateItem = useCallback((id: string, field: keyof LineItem, value: unknown) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  }, []);

  // Remove item
  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // Move item
  const moveItem = useCallback((id: string, direction: "up" | "down") => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if ((direction === "up" && idx === 0) || (direction === "down" && idx === prev.length - 1)) return prev;
      const next = [...prev];
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  }, []);

  // Copy billing to shipping
  const copyBillingToShipping = useCallback(() => {
    setShippingAddress({ ...billingAddress });
  }, [billingAddress]);

  // Submit
  const handleSubmit = useCallback((status: OrderNoteStatus) => {
    if (!currentWorkspace?.id || !selectedClient) return;
    if (items.length === 0) return;

    createMutation.mutate({
      workspace_id: currentWorkspace.id,
      client_user_id: selectedClient.id,
      status,
      items: items.map((item, idx) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        product_sku: item.product_sku,
        product_image_url: item.product_image_url,
        quantity: item.quantity,
        unit_price_net: item.unit_price_net,
        vat_rate: item.vat_rate,
        position: idx,
        notes: item.notes,
      })),
      billing_address: billingAddress,
      shipping_address: shippingAddress,
      client_notes: clientNotes || undefined,
      admin_notes: adminNotes || undefined,
      installment_requested: installmentRequested,
      installment_count: installmentRequested ? installmentCount : 1,
      installment_notes: installmentRequested ? installmentNotes : undefined,
    });
  }, [currentWorkspace, selectedClient, items, billingAddress, shippingAddress, clientNotes, adminNotes, installmentRequested, installmentCount, installmentNotes, createMutation]);

  const canSubmit = !!selectedClient && items.length > 0 && items.every((i) => i.product_name.trim() && i.quantity > 0);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/order-notes")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Nova Nota de Encomenda</h1>
          <p className="text-muted-foreground text-sm">Criar encomenda manual para cliente B2B</p>
        </div>
      </div>

      {/* Client Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" /> Cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Popover open={clientOpen} onOpenChange={setClientOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                {selectedClient ? (
                  <div>
                    <span className="font-medium">{selectedClient.name}</span>
                    <span className="text-muted-foreground ml-2">{selectedClient.email}</span>
                    {selectedClient.tax_id && (
                      <span className="text-muted-foreground ml-2">NIF: {selectedClient.tax_id}</span>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground">Selecionar cliente...</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Pesquisar cliente..." />
                <CommandList>
                  <CommandEmpty>Nenhum cliente encontrado</CommandEmpty>
                  <CommandGroup>
                    {clients.map((c) => (
                      <CommandItem
                        key={c.id}
                        value={`${c.name} ${c.email} ${c.tax_id || ""}`}
                        onSelect={() => handleSelectClient(c)}
                      >
                        <div>
                          <p className="font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.email} {c.tax_id ? `• NIF: ${c.tax_id}` : ""}</p>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" /> Produtos
            </CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setProductDialogOpen(true)}>
                <Search className="h-4 w-4 mr-1" /> Catálogo
              </Button>
              <Button size="sm" variant="outline" onClick={handleAddManualLine}>
                <Plus className="h-4 w-4 mr-1" /> Linha Manual
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Adicione produtos do catálogo ou linhas manuais
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead className="w-20">Qtd.</TableHead>
                    <TableHead className="w-28">Preço Unit.</TableHead>
                    <TableHead className="w-20">IVA %</TableHead>
                    <TableHead className="w-24 text-right">Líquido</TableHead>
                    <TableHead className="w-24 text-right">IVA</TableHead>
                    <TableHead className="w-24 text-right">Total</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => {
                    const lineNet = item.quantity * item.unit_price_net;
                    const lineVat = lineNet * (item.vat_rate / 100);
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="p-1">
                          <div className="flex flex-col">
                            <button
                              onClick={() => moveItem(item.id, "up")}
                              disabled={idx === 0}
                              className="p-0.5 hover:text-foreground text-muted-foreground disabled:opacity-30"
                            >
                              <ChevronUp className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => moveItem(item.id, "down")}
                              disabled={idx === items.length - 1}
                              className="p-0.5 hover:text-foreground text-muted-foreground disabled:opacity-30"
                            >
                              <ChevronDown className="h-3 w-3" />
                            </button>
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.product_id ? (
                            <div className="flex items-center gap-2">
                              {item.product_image_url ? (
                                <img src={item.product_image_url} className="w-8 h-8 rounded object-cover" />
                              ) : null}
                              <div>
                                <p className="text-sm font-medium">{item.product_name}</p>
                                {item.product_sku && <p className="text-xs text-muted-foreground">SKU: {item.product_sku}</p>}
                              </div>
                            </div>
                          ) : (
                            <Input
                              value={item.product_name}
                              onChange={(e) => updateItem(item.id, "product_name", e.target.value)}
                              placeholder="Nome do produto"
                              className="h-8 text-sm"
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, "quantity", Math.max(1, Number(e.target.value)))}
                            className="h-8 text-sm w-16"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={item.unit_price_net}
                            onChange={(e) => updateItem(item.id, "unit_price_net", Math.max(0, Number(e.target.value)))}
                            className="h-8 text-sm w-24"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={item.vat_rate}
                            onChange={(e) => updateItem(item.id, "vat_rate", Math.max(0, Number(e.target.value)))}
                            className="h-8 text-sm w-16"
                          />
                        </TableCell>
                        <TableCell className="text-right text-sm">€{lineNet.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-sm">€{lineVat.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-sm font-medium">€{(lineNet + lineVat).toFixed(2)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(item.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Totals */}
              <div className="border-t p-4 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal (líquido)</span>
                  <span>€{totals.net.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">IVA</span>
                  <span>€{totals.vat.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-1 border-t">
                  <span>Total</span>
                  <span>€{totals.gross.toFixed(2)}</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Addresses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Morada de Faturação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Rua</Label>
              <Input value={billingAddress.street || ""} onChange={(e) => setBillingAddress((p) => ({ ...p, street: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Código Postal</Label>
                <Input value={billingAddress.postal_code || ""} onChange={(e) => setBillingAddress((p) => ({ ...p, postal_code: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Cidade</Label>
                <Input value={billingAddress.city || ""} onChange={(e) => setBillingAddress((p) => ({ ...p, city: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs">País</Label>
              <Input value={billingAddress.country || ""} onChange={(e) => setBillingAddress((p) => ({ ...p, country: e.target.value }))} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Morada de Envio</CardTitle>
              <Button variant="ghost" size="sm" onClick={copyBillingToShipping}>
                <Copy className="h-3 w-3 mr-1" /> Copiar faturação
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Rua</Label>
              <Input value={shippingAddress.street || ""} onChange={(e) => setShippingAddress((p) => ({ ...p, street: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Código Postal</Label>
                <Input value={shippingAddress.postal_code || ""} onChange={(e) => setShippingAddress((p) => ({ ...p, postal_code: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Cidade</Label>
                <Input value={shippingAddress.city || ""} onChange={(e) => setShippingAddress((p) => ({ ...p, city: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs">País</Label>
              <Input value={shippingAddress.country || ""} onChange={(e) => setShippingAddress((p) => ({ ...p, country: e.target.value }))} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Installments */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Prestações</CardTitle>
            <Switch checked={installmentRequested} onCheckedChange={setInstallmentRequested} />
          </div>
        </CardHeader>
        {installmentRequested && (
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Número de Prestações</Label>
              <Input
                type="number"
                min={2}
                max={24}
                value={installmentCount}
                onChange={(e) => setInstallmentCount(Math.max(2, Number(e.target.value)))}
                className="w-24"
              />
            </div>
            <div>
              <Label className="text-xs">Notas sobre prestações</Label>
              <Textarea
                value={installmentNotes}
                onChange={(e) => setInstallmentNotes(e.target.value)}
                rows={2}
                placeholder="Condições especiais..."
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Notas</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Notas do Cliente</Label>
            <Textarea
              value={clientNotes}
              onChange={(e) => setClientNotes(e.target.value)}
              rows={3}
              placeholder="Observações do cliente..."
            />
          </div>
          <div>
            <Label className="text-xs">Notas Internas (Admin)</Label>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={3}
              placeholder="Notas internas..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3 pb-8">
        <Button variant="outline" onClick={() => navigate("/dashboard/order-notes")}>
          Cancelar
        </Button>
        <Button
          variant="outline"
          disabled={!canSubmit || createMutation.isPending}
          onClick={() => handleSubmit("draft")}
        >
          <Save className="h-4 w-4 mr-1" /> Guardar Rascunho
        </Button>
        <Button
          disabled={!canSubmit || createMutation.isPending}
          onClick={() => handleSubmit("submitted")}
        >
          <Send className="h-4 w-4 mr-1" /> Submeter
        </Button>
      </div>

      {/* Product Search Dialog */}
      <ProductSearchDialog
        open={productDialogOpen}
        onClose={() => setProductDialogOpen(false)}
        onSelect={handleAddProduct}
      />
    </div>
  );
}
