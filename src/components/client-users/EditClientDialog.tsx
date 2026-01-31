import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useClientUserActions } from "@/hooks/useClientUsers";
import type { ClientUser } from "@/types/client-user";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const editClientSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  phone: z.string().optional(),
  tax_id: z.string().optional(),
  credit_limit: z.coerce.number().min(0).optional(),
  payment_terms: z.string().optional(),
  status: z.enum(["active", "suspended", "pending"]),
  notes: z.string().optional(),
  billing_street: z.string().optional(),
  billing_city: z.string().optional(),
  billing_postal_code: z.string().optional(),
  billing_country: z.string().optional(),
  shipping_street: z.string().optional(),
  shipping_city: z.string().optional(),
  shipping_postal_code: z.string().optional(),
  shipping_country: z.string().optional(),
});

type EditClientFormData = z.infer<typeof editClientSchema>;

interface EditClientDialogProps {
  client: ClientUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditClientDialog({ 
  client, 
  open, 
  onOpenChange, 
  onSuccess 
}: EditClientDialogProps) {
  const { currentWorkspace } = useWorkspace();
  const { updateClient, isUpdating } = useClientUserActions();

  const form = useForm<EditClientFormData>({
    resolver: zodResolver(editClientSchema),
    defaultValues: {
      name: "",
      phone: "",
      tax_id: "",
      credit_limit: 0,
      payment_terms: "30_days",
      status: "pending",
      notes: "",
      billing_street: "",
      billing_city: "",
      billing_postal_code: "",
      billing_country: "Portugal",
      shipping_street: "",
      shipping_city: "",
      shipping_postal_code: "",
      shipping_country: "",
    },
  });

  // Reset form when client changes
  useEffect(() => {
    if (client) {
      form.reset({
        name: client.name,
        phone: client.phone || "",
        tax_id: client.tax_id || "",
        credit_limit: client.credit_limit || 0,
        payment_terms: client.payment_terms || "30_days",
        status: client.status,
        notes: client.notes || "",
        billing_street: client.billing_address?.street || "",
        billing_city: client.billing_address?.city || "",
        billing_postal_code: client.billing_address?.postal_code || "",
        billing_country: client.billing_address?.country || "Portugal",
        shipping_street: client.shipping_address?.street || "",
        shipping_city: client.shipping_address?.city || "",
        shipping_postal_code: client.shipping_address?.postal_code || "",
        shipping_country: client.shipping_address?.country || "",
      });
    }
  }, [client, form]);

  const onSubmit = async (data: EditClientFormData) => {
    if (!client) return;

    try {
      await updateClient({
        clientId: client.id,
        updates: {
          name: data.name,
          phone: data.phone || null,
          tax_id: data.tax_id || null,
          credit_limit: data.credit_limit,
          payment_terms: data.payment_terms,
          status: data.status,
          notes: data.notes || null,
          billing_address: {
            street: data.billing_street,
            city: data.billing_city,
            postal_code: data.billing_postal_code,
            country: data.billing_country,
          },
          shipping_address: {
            street: data.shipping_street,
            city: data.shipping_city,
            postal_code: data.shipping_postal_code,
            country: data.shipping_country,
          },
        },
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Cliente B2B</DialogTitle>
          <DialogDescription>
            Atualize os dados do cliente profissional.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do cliente" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Activo</SelectItem>
                        <SelectItem value="suspended">Suspenso</SelectItem>
                        <SelectItem value="pending">Pendente</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder="+351 912 345 678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tax_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NIF/NIPC</FormLabel>
                    <FormControl>
                      <Input placeholder="123456789" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Credit Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="credit_limit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Limite de Crédito (€)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step={0.01} {...field} />
                    </FormControl>
                    <FormDescription>
                      Limite máximo para compras a crédito
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="payment_terms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Condições de Pagamento</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="immediate">Imediato</SelectItem>
                        <SelectItem value="15_days">15 dias</SelectItem>
                        <SelectItem value="30_days">30 dias</SelectItem>
                        <SelectItem value="45_days">45 dias</SelectItem>
                        <SelectItem value="60_days">60 dias</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Billing Address */}
            <div className="space-y-4">
              <h4 className="font-medium">Endereço de Faturação</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="billing_street"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Morada</FormLabel>
                      <FormControl>
                        <Input placeholder="Rua, número, andar" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="billing_postal_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código Postal</FormLabel>
                      <FormControl>
                        <Input placeholder="1000-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="billing_city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade</FormLabel>
                      <FormControl>
                        <Input placeholder="Lisboa" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="billing_country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>País</FormLabel>
                      <FormControl>
                        <Input placeholder="Portugal" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Shipping Address */}
            <div className="space-y-4">
              <h4 className="font-medium">Endereço de Entrega (se diferente)</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="shipping_street"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Morada</FormLabel>
                      <FormControl>
                        <Input placeholder="Rua, número, andar" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="shipping_postal_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código Postal</FormLabel>
                      <FormControl>
                        <Input placeholder="1000-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="shipping_city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade</FormLabel>
                      <FormControl>
                        <Input placeholder="Lisboa" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="shipping_country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>País</FormLabel>
                      <FormControl>
                        <Input placeholder="Portugal" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas Internas</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observações sobre o cliente..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Guardar Alterações
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
