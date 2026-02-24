import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLeads } from "@/hooks/useLeads";
import { useContacts } from "@/hooks/useContacts";
import { useCompanies } from "@/hooks/useCompanies";
import { useOpportunities } from "@/hooks/useOpportunities";
import { NAV_V2_ITEMS } from "@/config/nav.v2";
import { LEGACY_ROUTES } from "@/config/routes.legacy";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Target,
  Users,
  Building2,
  Kanban,
  ArrowRight,
  FileText,
  type LucideIcon,
} from "lucide-react";

type PageEntry = {
  path: string;
  label: string;
  icon: LucideIcon | null;
  source: "nav" | "legacy";
};

const ALL_PAGES: PageEntry[] = [
  ...NAV_V2_ITEMS.map((item) => ({
    path: item.href,
    label: item.name,
    icon: item.icon as LucideIcon,
    source: "nav" as const,
  })),
  ...LEGACY_ROUTES.map((item) => ({
    path: item.path,
    label: item.label,
    icon: null,
    source: "legacy" as const,
  })),
];

interface GlobalSearchProps {
  trigger?: React.ReactNode;
}

export function GlobalSearch({ trigger }: GlobalSearchProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  // Fetch all data
  const { data: leads = [] } = useLeads();
  const { contacts = [] } = useContacts();
  const { companies = [] } = useCompanies();
  const { data: opportunities = [] } = useOpportunities();

  // Keyboard shortcut to open search
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Filter results based on search
  const filteredLeads = useMemo(() => {
    if (!search) return leads.slice(0, 5);
    const query = search.toLowerCase();
    return leads
      .filter(
        (lead) =>
          lead.name.toLowerCase().includes(query) ||
          lead.email?.toLowerCase().includes(query) ||
          lead.phone?.toLowerCase().includes(query)
      )
      .slice(0, 5);
  }, [leads, search]);

  const filteredContacts = useMemo(() => {
    if (!search) return contacts.slice(0, 5);
    const query = search.toLowerCase();
    return contacts
      .filter(
        (contact) =>
          contact.name.toLowerCase().includes(query) ||
          contact.email?.toLowerCase().includes(query) ||
          contact.company?.toLowerCase().includes(query)
      )
      .slice(0, 5);
  }, [contacts, search]);

  const filteredCompanies = useMemo(() => {
    if (!search) return companies.slice(0, 5);
    const query = search.toLowerCase();
    return companies
      .filter(
        (company) =>
          company.name.toLowerCase().includes(query) ||
          company.industry?.toLowerCase().includes(query)
      )
      .slice(0, 5);
  }, [companies, search]);

  const filteredOpportunities = useMemo(() => {
    if (!search) return opportunities.slice(0, 5);
    const query = search.toLowerCase();
    return opportunities
      .filter(
        (opp) =>
          opp.title.toLowerCase().includes(query) ||
          opp.lead?.name?.toLowerCase().includes(query)
      )
      .slice(0, 5);
  }, [opportunities, search]);

  const filteredPages = useMemo(() => {
    if (!search) {
      // Show all nav items + first 5 legacy
      const navItems = ALL_PAGES.filter((p) => p.source === "nav");
      const legacyItems = ALL_PAGES.filter((p) => p.source === "legacy").slice(0, 5);
      return [...navItems, ...legacyItems];
    }
    const query = search.toLowerCase();
    return ALL_PAGES.filter((p) => p.label.toLowerCase().includes(query)).slice(0, 10);
  }, [search]);

  const hasResults =
    filteredPages.length > 0 ||
    filteredLeads.length > 0 ||
    filteredContacts.length > 0 ||
    filteredCompanies.length > 0 ||
    filteredOpportunities.length > 0;

  const handleSelect = (path: string) => {
    setOpen(false);
    setSearch("");
    navigate(path);
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return "";
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <>
      {trigger ? (
        <div onClick={() => setOpen(true)}>{trigger}</div>
      ) : (
        <Button
          variant="outline"
          className="relative h-9 w-full justify-start text-sm text-muted-foreground sm:pr-12 md:w-64"
          onClick={() => setOpen(true)}
        >
          <Search className="mr-2 h-4 w-4" />
          <span className="hidden lg:inline-flex">Pesquisar...</span>
          <span className="inline-flex lg:hidden">Pesquisar...</span>
          <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
      )}

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Pesquisar páginas, leads, contactos, empresas..."
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

          {/* Pages */}
          {filteredPages.length > 0 && (
            <CommandGroup heading="Páginas">
              {filteredPages.map((page) => {
                const Icon = page.icon || FileText;
                return (
                  <CommandItem
                    key={page.path}
                    value={`page-${page.label}`}
                    onSelect={() => handleSelect(page.path)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span>{page.label}</span>
                    </div>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          {filteredPages.length > 0 && filteredLeads.length > 0 && (
            <CommandSeparator />
          )}

          {/* Leads */}
          {filteredLeads.length > 0 && (
            <CommandGroup heading="Leads">
              {filteredLeads.map((lead) => (
                <CommandItem
                  key={lead.id}
                  value={`lead-${lead.id}`}
                  onSelect={() => handleSelect(`/dashboard/leads/${lead.id}`)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="font-medium">{lead.name}</span>
                      {lead.email && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {lead.email}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {lead.status === "new"
                        ? "Novo"
                        : lead.status === "in_progress"
                        ? "Em Progresso"
                        : "Concluído"}
                    </Badge>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  </div>
                </CommandItem>
              ))}
              {leads.length > 5 && (
                <CommandItem
                  onSelect={() => handleSelect("/dashboard/leads")}
                  className="justify-center text-primary"
                >
                  Ver todos os leads ({leads.length})
                </CommandItem>
              )}
            </CommandGroup>
          )}

          {filteredLeads.length > 0 && filteredContacts.length > 0 && (
            <CommandSeparator />
          )}

          {/* Contacts */}
          {filteredContacts.length > 0 && (
            <CommandGroup heading="Contactos">
              {filteredContacts.map((contact) => (
                <CommandItem
                  key={contact.id}
                  value={`contact-${contact.id}`}
                  onSelect={() =>
                    handleSelect(`/dashboard/contacts/${contact.id}`)
                  }
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="font-medium">{contact.name}</span>
                      {contact.company && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          @ {contact.company}
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </CommandItem>
              ))}
              {contacts.length > 5 && (
                <CommandItem
                  onSelect={() => handleSelect("/dashboard/contacts")}
                  className="justify-center text-primary"
                >
                  Ver todos os contactos ({contacts.length})
                </CommandItem>
              )}
            </CommandGroup>
          )}

          {filteredContacts.length > 0 && filteredCompanies.length > 0 && (
            <CommandSeparator />
          )}

          {/* Companies */}
          {filteredCompanies.length > 0 && (
            <CommandGroup heading="Empresas">
              {filteredCompanies.map((company) => (
                <CommandItem
                  key={company.id}
                  value={`company-${company.id}`}
                  onSelect={() =>
                    handleSelect(`/dashboard/companies/${company.id}`)
                  }
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="font-medium">{company.name}</span>
                      {company.industry && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {company.industry}
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </CommandItem>
              ))}
              {companies.length > 5 && (
                <CommandItem
                  onSelect={() => handleSelect("/dashboard/companies")}
                  className="justify-center text-primary"
                >
                  Ver todas as empresas ({companies.length})
                </CommandItem>
              )}
            </CommandGroup>
          )}

          {filteredCompanies.length > 0 && filteredOpportunities.length > 0 && (
            <CommandSeparator />
          )}

          {/* Opportunities */}
          {filteredOpportunities.length > 0 && (
            <CommandGroup heading="Oportunidades">
              {filteredOpportunities.map((opp) => (
                <CommandItem
                  key={opp.id}
                  value={`opportunity-${opp.id}`}
                  onSelect={() => handleSelect(`/dashboard/opportunities`)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Kanban className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="font-medium">{opp.title}</span>
                      {opp.lead?.name && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {opp.lead.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {opp.value && (
                      <Badge variant="secondary" className="text-xs">
                        {formatCurrency(opp.value)}
                      </Badge>
                    )}
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  </div>
                </CommandItem>
              ))}
              {opportunities.length > 5 && (
                <CommandItem
                  onSelect={() => handleSelect("/dashboard/opportunities")}
                  className="justify-center text-primary"
                >
                  Ver todas as oportunidades ({opportunities.length})
                </CommandItem>
              )}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
