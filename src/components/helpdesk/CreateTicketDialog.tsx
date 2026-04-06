import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [selectedContact, setSelectedContact] = useState<{ id: string; name: string; email: string | null } | null>(null);

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
        .select("id, name, email, phone, company")
        .eq("workspace_id", currentWorkspace!.id)
        .or(`name.ilike.%${debouncedContactSearch}%,email.ilike.%${debouncedContactSearch}%`)
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
          {/* Contact selection */}
          <div>
            <Label className="text-xs flex items-center gap-1 mb-1">
              <User className="h-3 w-3" /> Contacto
            </Label>
            {selectedContact ? (
              <div className="flex items-center gap-2 p-2 rounded border bg-muted/30 text-sm">
                <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="flex-1 truncate">{selectedContact.name}</span>
                {selectedContact.email && (
                  <span className="text-xs text-muted-foreground truncate">{selectedContact.email}</span>
                )}
                <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => { setSelectedContact(null); setContactSearch(""); }}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  placeholder="Pesquisar contacto por nome ou email..."
                  className="pl-8 h-9"
                />
                {contacts.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-40 overflow-y-auto">
                    {contacts.map((c) => (
                      <button
                        key={c.id}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2"
                        onClick={() => { setSelectedContact({ id: c.id, name: c.name, email: c.email }); setContactSearch(""); }}
                      >
                        <User className="h-3 w-3 shrink-0 text-muted-foreground" />
                        <span className="truncate">{c.name}</span>
                        {c.email && <span className="text-xs text-muted-foreground ml-auto truncate">{c.email}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Company selection */}
          <div>
            <Label className="text-xs flex items-center gap-1 mb-1">
              <Building2 className="h-3 w-3" /> Empresa
            </Label>
            {selectedCompany ? (
              <div className="flex items-center gap-2 p-2 rounded border bg-muted/30 text-sm">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="flex-1 truncate">{selectedCompany.name}</span>
                <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => { setSelectedCompany(null); setCompanySearch(""); }}>
                  <X className="h-3 w-3" />
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
                        <Building2 className="h-3 w-3 shrink-0 text-muted-foreground" />
                        <span className="truncate">{c.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

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
