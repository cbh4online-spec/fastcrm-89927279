import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Search, 
  User, 
  Mail, 
  Phone, 
  Building2, 
  Link2, 
  UserPlus,
  Loader2
} from "lucide-react";
import { useCompanyContacts } from "@/hooks/useCompanyContacts";

interface LinkContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  companyName: string;
}

interface AvailableContact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  company_id: string | null;
  company_name: string | null;
}

export function LinkContactDialog({ 
  open, 
  onOpenChange, 
  companyId, 
  companyName 
}: LinkContactDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const { currentWorkspace } = useWorkspace();
  const { linkContact, contacts: linkedContacts } = useCompanyContacts(companyId);

  // Fetch all contacts that are NOT already linked to this company
  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["available-contacts-for-linking", currentWorkspace?.id, companyId],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      
      const { data, error } = await supabase
        .from("contacts")
        .select(`
          id,
          name,
          email,
          phone,
          job_title,
          company_id,
          companies:company_id (name)
        `)
        .eq("workspace_id", currentWorkspace.id)
        .neq("company_id", companyId)
        .order("name");

      if (error) throw error;
      
      return data.map(contact => ({
        id: contact.id,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        job_title: contact.job_title,
        company_id: contact.company_id,
        company_name: contact.companies?.name || null,
      })) as AvailableContact[];
    },
    enabled: open && !!currentWorkspace?.id,
  });

  // Filter contacts based on search
  const filteredContacts = useMemo(() => {
    if (!searchTerm.trim()) return contacts;
    
    const term = searchTerm.toLowerCase();
    return contacts.filter(contact => 
      contact.name.toLowerCase().includes(term) ||
      contact.email?.toLowerCase().includes(term) ||
      contact.phone?.includes(term) ||
      contact.job_title?.toLowerCase().includes(term)
    );
  }, [contacts, searchTerm]);

  // Split into unassigned and assigned to other companies
  const { unassignedContacts, assignedContacts } = useMemo(() => {
    return {
      unassignedContacts: filteredContacts.filter(c => !c.company_id),
      assignedContacts: filteredContacts.filter(c => c.company_id),
    };
  }, [filteredContacts]);

  const handleLink = async (contactId: string) => {
    try {
      await linkContact.mutateAsync({ contactId, companyId });
      // Keep dialog open for multiple associations
    } catch (error) {
      // Error handled in hook
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Associar Contacto
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Pesquise e associe contactos existentes a <strong>{companyName}</strong>
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por nome, email ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          {/* Results */}
          <ScrollArea className="h-[400px] pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <User className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {searchTerm ? "Nenhum contacto encontrado" : "Sem contactos disponíveis para associar"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Unassigned contacts first */}
                {unassignedContacts.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                      Sem empresa ({unassignedContacts.length})
                    </p>
                    <div className="space-y-1">
                      {unassignedContacts.map((contact) => (
                        <ContactRow
                          key={contact.id}
                          contact={contact}
                          getInitials={getInitials}
                          onLink={handleLink}
                          isLinking={linkContact.isPending}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Contacts assigned to other companies */}
                {assignedContacts.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                      Noutra empresa ({assignedContacts.length})
                    </p>
                    <div className="space-y-1">
                      {assignedContacts.map((contact) => (
                        <ContactRow
                          key={contact.id}
                          contact={contact}
                          getInitials={getInitials}
                          onLink={handleLink}
                          isLinking={linkContact.isPending}
                          showCompany
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ContactRowProps {
  contact: AvailableContact;
  getInitials: (name: string) => string;
  onLink: (contactId: string) => void;
  isLinking: boolean;
  showCompany?: boolean;
}

function ContactRow({ contact, getInitials, onLink, isLinking, showCompany }: ContactRowProps) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 group">
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500/80 to-blue-600 text-white">
          {getInitials(contact.name)}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{contact.name}</span>
          {contact.job_title && (
            <Badge variant="secondary" className="h-5 text-[10px] shrink-0">
              {contact.job_title}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          {contact.email && (
            <span className="text-xs text-muted-foreground flex items-center gap-1 truncate">
              <Mail className="w-3 h-3 shrink-0" />
              {contact.email}
            </span>
          )}
          {contact.phone && (
            <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
              <Phone className="w-3 h-3" />
              {contact.phone}
            </span>
          )}
        </div>
        {showCompany && contact.company_name && (
          <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Building2 className="w-3 h-3" />
            {contact.company_name}
          </span>
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="h-8 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => onLink(contact.id)}
        disabled={isLinking}
      >
        <Link2 className="w-4 h-4 mr-1" />
        Associar
      </Button>
    </div>
  );
}
