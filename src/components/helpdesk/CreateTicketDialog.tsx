import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Search, X, User, Building2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useDebounce } from "use-debounce";
import type { TicketPriority, TicketType, TicketChannel } from "@/hooks/useHelpdeskTickets";

interface CreateTicketDialogProps {
  onSubmit: (data: {
    subject: string;
    description?: string;
    priority: TicketPriority;
    type: TicketType;
    channel?: TicketChannel;
    department?: string;
    contact_id?: string;
    company_id?: string;
  }) => Promise<any>;
}

const DEPARTMENTS = ["Suporte", "Comercial", "Técnico", "Faturação"];

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map(w => w?.[0] || "").join("").toUpperCase();
}

export function CreateTicketDialog({ onSubmit }: CreateTicketDialogProps) {
  const { currentWorkspace } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [type, setType] = useState<TicketType>("support");
  const [channel, setChannel] = useState<TicketChannel>("manual");
  const [department, setDepartment] = useState("");

  // Contact search
  const [contactSearch, setContactSearch] = useState("");
  const [debouncedContactSearch] = useDebounce(contactSearch, 300);
  const [selectedContact, setSelectedContact] = useState<{
    id: string; name: string; email: string | null; phone: string | null;
    company: string | null; company_id: string | null; job_title: string | null;
  } | null>(null);

  // Company search
  const [companySearch, setCompanySearch] = useState("");
  const [debouncedCompanySearch] = useDebounce(companySearch, 300);
  const [selectedCompany, setSelectedCompany] = useState<{ id: string; name: string } | null>(null);

  const { data: contacts = [] } = useQuery({
    queryKey: ["ticket-contact-search", debouncedContactSearch, currentWorkspace?.id],
    queryFn: async () => {
      if (!debouncedContactSearch || debouncedContactSearch.length < 2) return [];
      const { data } = await supabase
        .from("contacts")
        .select("id, name, email, phone, company, company_id, job_title")
        .eq("workspace_id", currentWorkspace!.id)
        .or(`name.ilike.%${debouncedContactSearch}%,email.ilike.%${debouncedContactSearch}%,phone.ilike.%${debouncedContactSearch}%`)
        .limit(8);
      return data || [];
    },
    enabled: !!currentWorkspace?.id && debouncedContactSearch.length >= 2 && !selectedContact,
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["ticket-company-search", debouncedCompanySearch, currentWorkspace?.id],
    queryFn: async () => {
      if (!debouncedCompanySearch || debouncedCompanySearch.length < 2) return [];
      const { data } = await supabase
        .from("companies")
        .select("id, name, email")
        .eq("workspace_id", currentWorkspace!.id)
        .ilike("name", `%${debouncedCompanySearch}%`)
        .limit(8);
      return data || [];
    },
    enabled: !!currentWorkspace?.id && debouncedCompanySearch.length >= 2 && !selectedCompany,
  });

  // Auto-link company when selecting a contact that has one
  const handleSelectContact = async (contact: typeof contacts[0]) => {
    setSelectedContact({
      id: contact.id,
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      company: contact.company,
      company_id: contact.company_id,
      job_title: contact.job_title,
    });
    setContactSearch("");

    // Auto-fill company if contact has one and no company is selected
    if (contact.company_id && !selectedCompany) {
      const { data: comp } = await supabase
        .from("companies")
        .select("id, name")
        .eq("id", contact.company_id)
        .single();
      if (comp) {
        setSelectedCompany({ id: comp.id, name: comp.name });
      }
    }
  };

  const handleSubmit = async () => {
    if (!subject.trim()) {
      toast.error("O assunto é obrigatório");
      return;
    }
    setLoading(true);
    try {
      await onSubmit({
        subject: subject.trim(),
        description: description.trim() || undefined,
        priority,
        type,
        channel,
        department: department || undefined,
        contact_id: selectedContact?.id,
        company_id: selectedCompany?.id,
      });
      toast.success("Ticket criado com sucesso");
      setOpen(false);
      resetForm();
    } catch {
      toast.error("Erro ao criar ticket");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSubject("");
    setDescription("");
    setPriority("medium");
    setType("support");
    setChannel("manual");
    setDepartment("");
    setSelectedContact(null);
    setSelectedCompany(null);
    setContactSearch("");
    setCompanySearch("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Novo Ticket
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Ticket</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* ── CLIENT SECTION ── */}
          <div className="space-y-3 p-3 rounded-lg border bg-muted/20">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" /> Identificação do Cliente
            </h3>

            {/* Contact selection */}
            <div>
              <Label className="text-xs mb-1 block">Contacto</Label>
              {selectedContact ? (
                <div className="flex items-center gap-2.5 p-2.5 rounded-md border bg-background">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                      {getInitials(selectedContact.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{selectedContact.name}</div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      {selectedContact.job_title && <span>{selectedContact.job_title}</span>}
                      {selectedContact.email && <span>• {selectedContact.email}</span>}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => { setSelectedContact(null); setContactSearch(""); }}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    placeholder="Pesquisar por nome, email ou telefone..."
                    className="pl-8 h-9"
                  />
                  {contacts.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {contacts.map((c) => (
                        <button
                          key={c.id}
                          className="w-full text-left px-3 py-2.5 text-sm hover:bg-accent flex items-center gap-2.5 border-b last:border-b-0"
                          onClick={() => handleSelectContact(c)}
                        >
                          <Avatar className="h-7 w-7 shrink-0">
                            <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                              {getInitials(c.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate">{c.name}</div>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                              {c.email && <span className="truncate">{c.email}</span>}
                              {c.company && <span className="truncate">• {c.company}</span>}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Company selection */}
            <div>
              <Label className="text-xs mb-1 block">Empresa</Label>
              {selectedCompany ? (
                <div className="flex items-center gap-2.5 p-2.5 rounded-md border bg-background">
                  <div className="h-8 w-8 shrink-0 rounded bg-muted flex items-center justify-center">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <span className="flex-1 text-sm font-medium truncate">{selectedCompany.name}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => { setSelectedCompany(null); setCompanySearch(""); }}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={companySearch}
                    onChange={(e) => setCompanySearch(e.target.value)}
                    placeholder="Pesquisar empresa..."
                    className="pl-8 h-9"
                  />
                  {companies.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-40 overflow-y-auto">
                      {companies.map((c) => (
                        <button
                          key={c.id}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2"
                          onClick={() => { setSelectedCompany({ id: c.id, name: c.name }); setCompanySearch(""); }}
                        >
                          <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate">{c.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── TICKET DETAILS ── */}
          <div>
            <Label className="text-xs">Assunto *</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Assunto do ticket" />
          </div>
          <div>
            <Label className="text-xs">Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descreva o problema..." className="min-h-[100px]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Prioridade</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as TicketType)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="support">Suporte</SelectItem>
                  <SelectItem value="commercial">Comercial</SelectItem>
                  <SelectItem value="technical">Técnico</SelectItem>
                  <SelectItem value="billing">Faturação</SelectItem>
                  <SelectItem value="feature_request">Funcionalidade</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Canal</Label>
              <Select value={channel} onValueChange={(v) => setChannel(v as TicketChannel)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Telefone</SelectItem>
                  <SelectItem value="portal">Portal</SelectItem>
                  <SelectItem value="chat">Chat</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Departamento</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "A criar..." : "Criar Ticket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
