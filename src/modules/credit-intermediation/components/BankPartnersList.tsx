import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  useBankPartners, 
  useCreateBankPartner, 
  useUpdateBankPartner,
  useDeleteBankPartner 
} from "../hooks/useBankPartners";
import { CREDIT_TYPE_LABELS, CreditType, BankPartner } from "../types";
import { 
  Plus, 
  Building2, 
  MoreHorizontal, 
  Pencil, 
  Trash2,
  Phone,
  Mail,
  Loader2,
  CheckCircle2,
  XCircle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";

const formSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  contact_name: z.string().optional(),
  contact_email: z.string().email().optional().or(z.literal("")),
  contact_phone: z.string().optional(),
  credit_types: z.array(z.string()).min(1, "Selecione pelo menos um tipo"),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export function BankPartnersList() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<BankPartner | null>(null);

  const { data: banks = [], isLoading } = useBankPartners();
  const createBank = useCreateBankPartner();
  const updateBank = useUpdateBankPartner();
  const deleteBank = useDeleteBankPartner();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      contact_name: "",
      contact_email: "",
      contact_phone: "",
      credit_types: [],
      notes: "",
    },
  });

  const openCreateDialog = () => {
    setEditingBank(null);
    form.reset({
      name: "",
      contact_name: "",
      contact_email: "",
      contact_phone: "",
      credit_types: [],
      notes: "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (bank: BankPartner) => {
    setEditingBank(bank);
    form.reset({
      name: bank.name,
      contact_name: bank.contact_name || "",
      contact_email: bank.contact_email || "",
      contact_phone: bank.contact_phone || "",
      credit_types: bank.credit_types || [],
      notes: bank.notes || "",
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: FormData) => {
    if (editingBank) {
      await updateBank.mutateAsync({
        id: editingBank.id,
        name: data.name,
        contact_name: data.contact_name,
        contact_email: data.contact_email,
        contact_phone: data.contact_phone,
        credit_types: data.credit_types as CreditType[],
        terms: [],
        commission_rates: [],
        notes: data.notes,
      });
    } else {
      await createBank.mutateAsync({
        name: data.name,
        contact_name: data.contact_name,
        contact_email: data.contact_email,
        contact_phone: data.contact_phone,
        credit_types: data.credit_types as CreditType[],
        terms: [],
        commission_rates: [],
        notes: data.notes,
      });
    }
    setDialogOpen(false);
    form.reset();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem a certeza que quer remover este parceiro?")) {
      await deleteBank.mutateAsync(id);
    }
  };

  const handleToggleActive = async (bank: BankPartner) => {
    await updateBank.mutateAsync({
      id: bank.id,
      is_active: !bank.is_active,
    });
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-5 bg-muted rounded w-32" />
            </CardHeader>
            <CardContent>
              <div className="h-4 bg-muted rounded w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Parceiros Bancários</h2>
          <p className="text-sm text-muted-foreground">
            Gerir bancos e condições de crédito
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Banco
        </Button>
      </div>

      {/* Banks Grid */}
      {banks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-medium mb-2">Sem parceiros bancários</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Adicione bancos parceiros para começar a submeter propostas
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeiro Banco
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {banks.map((bank) => (
            <Card key={bank.id} className={!bank.is_active ? "opacity-60" : ""}>
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{bank.name}</CardTitle>
                    <div className="flex items-center gap-1 mt-1">
                      {bank.is_active ? (
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          <XCircle className="w-3 h-3 mr-1" />
                          Inativo
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEditDialog(bank)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleToggleActive(bank)}>
                      {bank.is_active ? (
                        <>
                          <XCircle className="h-4 w-4 mr-2" />
                          Desativar
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Ativar
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDelete(bank.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remover
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Contact */}
                {(bank.contact_email || bank.contact_phone) && (
                  <div className="space-y-1 text-sm">
                    {bank.contact_email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="w-3 h-3" />
                        <span className="truncate">{bank.contact_email}</span>
                      </div>
                    )}
                    {bank.contact_phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-3 h-3" />
                        <span>{bank.contact_phone}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Credit Types */}
                <div className="flex flex-wrap gap-1">
                  {(bank.credit_types || []).map((type) => (
                    <Badge key={type} variant="outline" className="text-xs">
                      {CREDIT_TYPE_LABELS[type as CreditType] || type}
                    </Badge>
                  ))}
                </div>

                {/* Stats */}
                {(bank.total_proposals_submitted || 0) > 0 && (
                  <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t">
                    <span>{bank.total_proposals_submitted} propostas</span>
                    <span>{bank.total_funded} financiadas</span>
                    {bank.avg_approval_rate && (
                      <span>{bank.avg_approval_rate}% aprovação</span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingBank ? "Editar Parceiro" : "Novo Parceiro Bancário"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Banco</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Millennium BCP" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="contact_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contacto</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome do gestor" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contact_phone"
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
              </div>

              <FormField
                control={form.control}
                name="contact_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="gestor@banco.pt" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="credit_types"
                render={() => (
                  <FormItem>
                    <FormLabel>Tipos de Crédito</FormLabel>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.keys(CREDIT_TYPE_LABELS) as CreditType[]).map((type) => (
                        <FormField
                          key={type}
                          control={form.control}
                          name="credit_types"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(type)}
                                  onCheckedChange={(checked) => {
                                    const current = field.value || [];
                                    if (checked) {
                                      field.onChange([...current, type]);
                                    } else {
                                      field.onChange(current.filter((t) => t !== type));
                                    }
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal cursor-pointer">
                                {CREDIT_TYPE_LABELS[type]}
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createBank.isPending || updateBank.isPending}>
                  {(createBank.isPending || updateBank.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {editingBank ? "Guardar" : "Adicionar"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
