import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { UserPlus, Loader2, Link } from "lucide-react";
import { toast } from "sonner";
import { InviteLinkDialog } from "./InviteLinkDialog";

const inviteClientSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().optional(),
  tax_id: z.string().optional(),
  credit_limit: z.coerce.number().min(0).optional(),
  payment_terms: z.string().optional(),
  contact_id: z.string().optional(),
  company_id: z.string().optional(),
  notes: z.string().optional(),
  billing_street: z.string().optional(),
  billing_city: z.string().optional(),
  billing_postal_code: z.string().optional(),
  billing_country: z.string().optional(),
});

type InviteClientFormData = z.infer<typeof inviteClientSchema>;

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  tax_id: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
}

interface Company {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  tax_id: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
}

interface InviteClientDialogProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

interface InviteData {
  clientName: string;
  clientEmail: string;
  inviteUrl: string;
  temporaryPassword: string;
  clientUserId: string;
  workspaceName: string;
}

export function InviteClientDialog({ trigger, onSuccess }: InviteClientDialogProps) {
  const [open, setOpen] = useState(false);
  const [showInviteLinkDialog, setShowInviteLinkDialog] = useState(false);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const form = useForm<InviteClientFormData>({
    resolver: zodResolver(inviteClientSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      tax_id: "",
      credit_limit: 0,
      payment_terms: "30_days",
      contact_id: "",
      company_id: "",
      notes: "",
      billing_street: "",
      billing_city: "",
      billing_postal_code: "",
      billing_country: "Portugal",
    },
  });

  // Fetch contacts for association - expanded query with all needed fields
  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts-for-client", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data } = await supabase
        .from("contacts")
        .select("id, name, email, phone, tax_id, address, city, postal_code, country")
        .eq("workspace_id", currentWorkspace.id)
        .order("name");
      return (data || []) as Contact[];
    },
    enabled: !!currentWorkspace?.id && open,
  });

  // Fetch companies for association - expanded query with all needed fields
  const { data: companies = [] } = useQuery({
    queryKey: ["companies-for-client", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data } = await supabase
        .from("companies")
        .select("id, name, email, phone, tax_id, address, city, postal_code")
        .eq("workspace_id", currentWorkspace.id)
        .order("name");
      return (data || []) as Company[];
    },
    enabled: !!currentWorkspace?.id && open,
  });

  // Handler for contact selection - auto-fills form fields
  const handleContactChange = (contactId: string) => {
    form.setValue("contact_id", contactId);
    
    if (contactId && contactId !== "none") {
      const contact = contacts.find(c => c.id === contactId);
      if (contact) {
        // Auto-fill fields with contact data
        if (contact.name) form.setValue("name", contact.name);
        if (contact.email) form.setValue("email", contact.email);
        if (contact.phone) form.setValue("phone", contact.phone);
        if (contact.tax_id) form.setValue("tax_id", contact.tax_id);
        if (contact.address) form.setValue("billing_street", contact.address);
        if (contact.city) form.setValue("billing_city", contact.city);
        if (contact.postal_code) form.setValue("billing_postal_code", contact.postal_code);
        if (contact.country) form.setValue("billing_country", contact.country);
      }
    }
  };

  // Handler for company selection - auto-fills form fields
  const handleCompanyChange = (companyId: string) => {
    form.setValue("company_id", companyId);
    
    if (companyId && companyId !== "none") {
      const company = companies.find(c => c.id === companyId);
      if (company) {
        // Auto-fill fields with company data (only if currently empty)
        if (!form.getValues("name") && company.name) form.setValue("name", company.name);
        if (!form.getValues("email") && company.email) form.setValue("email", company.email);
        if (!form.getValues("phone") && company.phone) form.setValue("phone", company.phone);
        if (company.tax_id) form.setValue("tax_id", company.tax_id);
        if (company.address) form.setValue("billing_street", company.address);
        if (company.city) form.setValue("billing_city", company.city);
        if (company.postal_code) form.setValue("billing_postal_code", company.postal_code);
      }
    }
  };

  // Function to send email invitation
  const sendEmailInvitation = async () => {
    if (!inviteData || !currentWorkspace?.id) return;
    
    setEmailSending(true);
    try {
      const { error: emailError } = await supabase.functions.invoke(
        "send-client-invitation",
        {
          body: {
            clientName: inviteData.clientName,
            clientEmail: inviteData.clientEmail,
            workspaceName: inviteData.workspaceName,
            workspaceId: currentWorkspace.id,
            portalUrl: inviteData.inviteUrl,
            temporaryPassword: inviteData.temporaryPassword,
          },
        }
      );

      if (emailError) {
        console.error("Erro ao enviar email de convite:", emailError);
        toast.error("Erro ao enviar email de convite.");
      } else {
        setEmailSent(true);
        toast.success("Email de convite enviado com sucesso!");
      }
    } catch (err) {
      console.error("Exception sending email:", err);
      toast.error("Erro ao enviar email.");
    } finally {
      setEmailSending(false);
    }
  };

  const createClientMutation = useMutation({
    mutationFn: async (data: InviteClientFormData) => {
      if (!currentWorkspace?.id) throw new Error("Workspace não encontrado");

      // Generate invite token
      const inviteToken = crypto.randomUUID();
      const inviteExpiresAt = new Date();
      inviteExpiresAt.setDate(inviteExpiresAt.getDate() + 7); // 7 days

      const billingAddress = {
        street: data.billing_street,
        city: data.billing_city,
        postal_code: data.billing_postal_code,
        country: data.billing_country,
      };

      // First, create the client_users record with invite token
      const { data: clientUser, error } = await supabase
        .from("client_users")
        .insert({
          workspace_id: currentWorkspace.id,
          auth_user_id: null, // Will be set by edge function or on activation
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          tax_id: data.tax_id || null,
          credit_limit: data.credit_limit || 0,
          payment_terms: data.payment_terms || "30_days",
          contact_id: data.contact_id && data.contact_id !== "none" ? data.contact_id : null,
          company_id: data.company_id && data.company_id !== "none" ? data.company_id : null,
          notes: data.notes || null,
          billing_address: JSON.parse(JSON.stringify(billingAddress)),
          status: "pending",
          invite_token: inviteToken,
          invite_expires_at: inviteExpiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Create auth user with temporary password
      const { data: authResult, error: authError } = await supabase.functions.invoke(
        "create-client-auth-user",
        {
          body: {
            email: data.email,
            name: data.name,
            workspaceId: currentWorkspace.id,
            clientUserId: clientUser.id,
          },
        }
      );

      if (authError) {
        console.error("Erro ao criar utilizador Auth:", authError);
        throw new Error("Erro ao criar credenciais de acesso");
      }

      if (!authResult?.success) {
        throw new Error(authResult?.error || "Erro ao criar credenciais de acesso");
      }

      const temporaryPassword = authResult.data.temporaryPassword;

      // Get workspace name
      const { data: workspace } = await supabase
        .from("workspaces")
        .select("name")
        .eq("id", currentWorkspace.id)
        .single();

      return {
        client: clientUser,
        inviteToken,
        temporaryPassword,
        workspaceName: workspace?.name || "FastCRM",
      };
    },
    onSuccess: (result) => {
      // Build invite URL
      const inviteUrl = `https://fastcrm.metodopare.ai/client/invite/${result.inviteToken}`;
      
      // Set invite data and show the sharing dialog
      setInviteData({
        clientName: result.client.name,
        clientEmail: result.client.email,
        inviteUrl,
        temporaryPassword: result.temporaryPassword,
        clientUserId: result.client.id,
        workspaceName: result.workspaceName,
      });
      
      setEmailSent(false);
      setShowInviteLinkDialog(true);
      setOpen(false); // Close the form dialog
      
      queryClient.invalidateQueries({ queryKey: ["client-users"] });
      form.reset();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error("Erro ao criar cliente: " + error.message);
    },
  });

  const onSubmit = (data: InviteClientFormData) => {
    createClientMutation.mutate(data);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Convidar Cliente
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Convidar Novo Cliente B2B</DialogTitle>
          <DialogDescription>
            Preencha os dados do cliente profissional. Um convite será enviado por email.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* CRM Association - MOVED TO TOP */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Link className="h-4 w-4" />
                Associar a Registo CRM (opcional)
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="contact_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contacto CRM</FormLabel>
                      <Select onValueChange={handleContactChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar contacto" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {contacts.map((contact) => (
                            <SelectItem key={contact.id} value={contact.id}>
                              {contact.name} {contact.email && `(${contact.email})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Os dados do contacto serão preenchidos automaticamente
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="company_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Empresa CRM</FormLabel>
                      <Select onValueChange={handleCompanyChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar empresa" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Nenhuma</SelectItem>
                          {companies.map((company) => (
                            <SelectItem key={company.id} value={company.id}>
                              {company.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Os dados da empresa serão preenchidos automaticamente
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Basic Info */}
            <div className="space-y-4">
              <h4 className="font-medium">Informações Básicas</h4>
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
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="email@exemplo.pt" {...field} />
                      </FormControl>
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
            </div>

            {/* Credit Info */}
            <div className="space-y-4">
              <h4 className="font-medium">Condições Comerciais</h4>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createClientMutation.isPending}
              >
                {createClientMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Criar Cliente
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

    {/* Invite Link Dialog - shows after client creation */}
    {inviteData && (
      <InviteLinkDialog
        open={showInviteLinkDialog}
        onOpenChange={setShowInviteLinkDialog}
        clientName={inviteData.clientName}
        clientEmail={inviteData.clientEmail}
        inviteUrl={inviteData.inviteUrl}
        temporaryPassword={inviteData.temporaryPassword}
        onSendEmail={sendEmailInvitation}
        emailSending={emailSending}
        emailSent={emailSent}
      />
    )}
    </>
  );
}
