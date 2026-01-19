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
  Loader2,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { useCompanyContacts } from "@/hooks/useCompanyContacts";

interface LinkContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  companyName: string;
  companyEmail?: string | null;
  companyWebsite?: string | null;
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

// Extract domain from email or website
function extractDomain(emailOrUrl: string | null | undefined): string | null {
  if (!emailOrUrl) return null;
  
  // If it's an email
  if (emailOrUrl.includes("@")) {
    const parts = emailOrUrl.split("@");
    return parts[1]?.toLowerCase() || null;
  }
  
  // If it's a URL
  try {
    const url = new URL(emailOrUrl.startsWith("http") ? emailOrUrl : `https://${emailOrUrl}`);
    return url.hostname.replace("www.", "").toLowerCase();
  } catch {
    return null;
  }
}

export function LinkContactDialog({ 
  open, 
  onOpenChange, 
  companyId, 
  companyName,
  companyEmail,
  companyWebsite
}: LinkContactDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const { currentWorkspace } = useWorkspace();
  const { linkContact } = useCompanyContacts(companyId);

  // Get company domain for smart matching
  const companyDomain = useMemo(() => {
    return extractDomain(companyEmail) || extractDomain(companyWebsite);
  }, [companyEmail, companyWebsite]);

  // Fetch all contacts that are NOT already linked to this company
  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["available-contacts-for-linking", currentWorkspace?.id, companyId],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      
      // Get contacts that either have no company or a different company
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
        .order("name");

      if (error) throw error;
      
      // Filter out contacts already linked to this company
      return data
        .filter(contact => contact.company_id !== companyId)
        .map(contact => ({
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

  // Categorize contacts: suggestions (matching domain), unassigned, assigned to other
  const { suggestedContacts, unassignedContacts, assignedContacts } = useMemo(() => {
    // First filter by search term
    let filtered = contacts;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = contacts.filter(contact => 
        contact.name.toLowerCase().includes(term) ||
        contact.email?.toLowerCase().includes(term) ||
        contact.phone?.includes(term) ||
        contact.job_title?.toLowerCase().includes(term)
      );
    }

    // Separate by category
    const suggested: AvailableContact[] = [];
    const unassigned: AvailableContact[] = [];
    const assigned: AvailableContact[] = [];

    for (const contact of filtered) {
      const contactDomain = extractDomain(contact.email);
      const isDomainMatch = companyDomain && contactDomain && contactDomain === companyDomain;

      if (isDomainMatch) {
        suggested.push(contact);
      } else if (!contact.company_id) {
        unassigned.push(contact);
      } else {
        assigned.push(contact);
      }
    }

    return {
      suggestedContacts: suggested,
      unassignedContacts: unassigned,
      assignedContacts: assigned,
    };
  }, [contacts, searchTerm, companyDomain]);

  const handleLink = async (contactId: string) => {
    try {
      await linkContact.mutateAsync({ contactId, companyId });
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

  const totalAvailable = suggestedContacts.length + unassignedContacts.length + assignedContacts.length;

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

          {/* Domain hint */}
          {companyDomain && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-primary/5 px-3 py-2 rounded-md">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>
                A procurar contactos com emails <strong>@{companyDomain}</strong>
              </span>
            </div>
          )}

          {/* Results */}
          <ScrollArea className="h-[380px] pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : totalAvailable === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <User className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {searchTerm ? "Nenhum contacto encontrado" : "Sem contactos disponíveis para associar"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* AI Suggested contacts (domain match) */}
                {suggestedContacts.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <p className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                        Sugestões ({suggestedContacts.length})
                      </p>
                    </div>
                    <div className="space-y-1 bg-amber-50/50 dark:bg-amber-900/10 rounded-lg p-2 border border-amber-200/50 dark:border-amber-800/30">
                      {suggestedContacts.map((contact) => (
                        <ContactRow
                          key={contact.id}
                          contact={contact}
                          getInitials={getInitials}
                          onLink={handleLink}
                          isLinking={linkContact.isPending}
                          highlight
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Unassigned contacts */}
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
  highlight?: boolean;
}

function ContactRow({ contact, getInitials, onLink, isLinking, showCompany, highlight }: ContactRowProps) {
  return (
    <div className={`flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 group ${highlight ? 'bg-white/50 dark:bg-white/5' : ''}`}>
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarFallback className={`text-xs text-white ${highlight ? 'bg-gradient-to-br from-amber-500 to-orange-500' : 'bg-gradient-to-br from-blue-500/80 to-blue-600'}`}>
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
        variant={highlight ? "default" : "ghost"}
        size="sm"
        className={`h-8 ${highlight ? '' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
        onClick={() => onLink(contact.id)}
        disabled={isLinking}
      >
        {highlight ? (
          <>
            Associar
            <ArrowRight className="w-4 h-4 ml-1" />
          </>
        ) : (
          <>
            <Link2 className="w-4 h-4 mr-1" />
            Associar
          </>
        )}
      </Button>
    </div>
  );
}
