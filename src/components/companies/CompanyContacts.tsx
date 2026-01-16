import { useNavigate } from "react-router-dom";
import { useCompanyContacts } from "@/hooks/useCompanyContacts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  User, 
  Mail, 
  Phone, 
  Star, 
  Link2Off, 
  MoreHorizontal,
  UserPlus
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface CompanyContactsProps {
  companyId: string;
  companyName?: string;
  onAddContact?: () => void;
}

export function CompanyContacts({ companyId, companyName, onAddContact }: CompanyContactsProps) {
  const navigate = useNavigate();
  const { contacts, isLoading, setPrimaryContact, unlinkContact } = useCompanyContacts(companyId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <User className="w-4 h-4" />
            Contactos Associados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <User className="w-4 h-4" />
            Contactos Associados
            {contacts.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {contacts.length}
              </Badge>
            )}
          </CardTitle>
          {onAddContact && (
            <Button variant="ghost" size="sm" onClick={onAddContact} className="h-8">
              <UserPlus className="w-4 h-4 mr-1" />
              Adicionar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {contacts.length === 0 ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Nenhum contacto associado</p>
            {onAddContact && (
              <Button variant="link" size="sm" onClick={onAddContact} className="mt-1">
                Adicionar contacto
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {contacts.map((contact) => {
              const initials = contact.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);

              return (
                <div
                  key={contact.id}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors hover:bg-muted/50",
                    contact.is_primary_contact && "bg-primary/5 border border-primary/20"
                  )}
                  onClick={() => navigate(`/dashboard/contacts/${contact.id}`)}
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="text-xs bg-gradient-to-br from-violet-500/80 to-violet-600 text-white">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{contact.name}</span>
                      {contact.is_primary_contact && (
                        <Badge variant="secondary" className="h-5 text-[10px] gap-1">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          Principal
                        </Badge>
                      )}
                    </div>
                    {contact.job_title && (
                      <p className="text-xs text-muted-foreground truncate">{contact.job_title}</p>
                    )}
                    <div className="flex items-center gap-3 mt-0.5">
                      {contact.email && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3" />
                          {contact.email}
                        </span>
                      )}
                      {contact.phone && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {contact.phone}
                        </span>
                      )}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {!contact.is_primary_contact && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setPrimaryContact.mutate({ contactId: contact.id, companyId });
                          }}
                        >
                          <Star className="w-4 h-4 mr-2" />
                          Definir como principal
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          unlinkContact.mutate(contact.id);
                        }}
                        className="text-destructive"
                      >
                        <Link2Off className="w-4 h-4 mr-2" />
                        Desvincular
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
