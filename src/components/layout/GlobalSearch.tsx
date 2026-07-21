import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLeads } from "@/hooks/useLeads";
import { useContacts } from "@/hooks/useContacts";
import { useCompanies } from "@/hooks/useCompanies";
import { useOpportunities } from "@/hooks/useOpportunities";
import {
  getSearchableRoutes,
  getTopLevelGroupForRoute,
  TOP_LEVEL_GROUPS,
  type RouteEntry,
  type TopLevelGroup,
} from "@/config/routeManifest";
import { useWorkspaceModules } from "@/hooks/useWorkspaceModules";
import { useMenuPermissions } from "@/hooks/useMenuPermissions";
import { useAppMode } from "@/hooks/useAppMode";
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
} from "lucide-react";

interface GlobalSearchProps {
  trigger?: React.ReactNode;
}

const DEFAULT_GROUPS: TopLevelGroup[] = ["inicio", "clientes", "vendas", "comunicacao"];
const DEFAULT_PER_GROUP = 2;
const DEFAULT_MAX = 8;

function isTypingContext() {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (el.isContentEditable) return true;
  return false;
}

export function GlobalSearch({ trigger }: GlobalSearchProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const { data: leads = [] } = useLeads();
  const { contacts = [] } = useContacts();
  const { companies = [] } = useCompanies();
  const { data: opportunities = [] } = useOpportunities();

  const { installedModuleIds } = useWorkspaceModules();
  const { canAccessMenu } = useMenuPermissions();
  const { mode } = useAppMode();

  // Rotas pesquisáveis, respeitando permissões, módulos e modo. Sem rotas parametrizadas.
  const searchableRoutes = useMemo<RouteEntry[]>(() => {
    return getSearchableRoutes(installedModuleIds, canAccessMenu, mode).filter(
      (r) => !!r.href && !r.href.includes(":"),
    );
  }, [installedModuleIds, canAccessMenu, mode]);

  const groupLabelByKey = useMemo(() => {
    const m = new Map<TopLevelGroup, string>();
    TOP_LEVEL_GROUPS.forEach((tg) => m.set(tg.key, tg.label));
    return m;
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const isCmdSlash = (e.metaKey || e.ctrlKey) && e.key === "/";
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (!isCmdSlash && !isCmdK) return;
      // Se não estiver aberto e o utilizador estiver a escrever noutro sítio, ignorar.
      if (!open && isTypingContext()) return;
      e.preventDefault();
      setOpen((o) => !o);
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open]);

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

  // Páginas agrupadas por top-level group.
  const groupedPages = useMemo<Array<{ group: TopLevelGroup; label: string; items: RouteEntry[] }>>(() => {
    const query = search.trim().toLowerCase();

    // Estado vazio: 2 rotas por grupo em Início/Clientes/Vendas/Comunicação, máx 8.
    if (!query) {
      const seen = new Set<string>();
      const groups: Array<{ group: TopLevelGroup; label: string; items: RouteEntry[] }> = [];
      let total = 0;
      for (const gk of DEFAULT_GROUPS) {
        if (total >= DEFAULT_MAX) break;
        const items: RouteEntry[] = [];
        for (const r of searchableRoutes) {
          if (items.length >= DEFAULT_PER_GROUP) break;
          if (seen.has(r.key)) continue;
          if (getTopLevelGroupForRoute(r) !== gk) continue;
          items.push(r);
          seen.add(r.key);
          total++;
          if (total >= DEFAULT_MAX) break;
        }
        if (items.length > 0) {
          groups.push({ group: gk, label: groupLabelByKey.get(gk) ?? gk, items });
        }
      }
      return groups;
    }

    // Com query: match por label ou label do grupo top-level, ordenado pelos TOP_LEVEL_GROUPS.
    const matches = searchableRoutes.filter((r) => {
      const gk = getTopLevelGroupForRoute(r);
      const groupLabel = gk ? (groupLabelByKey.get(gk) ?? "") : "";
      return (
        r.label.toLowerCase().includes(query) ||
        groupLabel.toLowerCase().includes(query)
      );
    });

    const bucket = new Map<TopLevelGroup, RouteEntry[]>();
    for (const r of matches) {
      const gk = getTopLevelGroupForRoute(r);
      if (!gk) continue;
      const arr = bucket.get(gk) ?? [];
      arr.push(r);
      bucket.set(gk, arr);
    }
    const out: Array<{ group: TopLevelGroup; label: string; items: RouteEntry[] }> = [];
    let total = 0;
    for (const tg of TOP_LEVEL_GROUPS) {
      const items = bucket.get(tg.key);
      if (!items || items.length === 0) continue;
      const capped = items.slice(0, 5);
      out.push({ group: tg.key, label: tg.label, items: capped });
      total += capped.length;
      if (total >= 15) break;
    }
    return out;
  }, [search, searchableRoutes, groupLabelByKey]);

  const anyPage = groupedPages.some((g) => g.items.length > 0);
  const hasResults =
    anyPage ||
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
          {!hasResults && <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>}

          {groupedPages.map((g, idx) => (
            <div key={g.group}>
              {idx > 0 && <CommandSeparator />}
              <CommandGroup heading={g.label}>
                {g.items.map((page) => {
                  const Icon = page.icon || FileText;
                  return (
                    <CommandItem
                      key={page.key}
                      value={`page-${g.group}-${page.key}`}
                      onSelect={() => handleSelect(page.href)}
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
            </div>
          ))}

          {anyPage && filteredLeads.length > 0 && <CommandSeparator />}

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
                        <span className="ml-2 text-xs text-muted-foreground">{lead.email}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {lead.status === "new" ? "Novo" : lead.status === "in_progress" ? "Em Progresso" : "Concluído"}
                    </Badge>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  </div>
                </CommandItem>
              ))}
              {leads.length > 5 && (
                <CommandItem onSelect={() => handleSelect("/dashboard/leads")} className="justify-center text-primary">
                  Ver todos os leads ({leads.length})
                </CommandItem>
              )}
            </CommandGroup>
          )}

          {filteredLeads.length > 0 && filteredContacts.length > 0 && <CommandSeparator />}

          {filteredContacts.length > 0 && (
            <CommandGroup heading="Contactos">
              {filteredContacts.map((contact) => (
                <CommandItem
                  key={contact.id}
                  value={`contact-${contact.id}`}
                  onSelect={() => handleSelect(`/dashboard/contacts/${contact.id}`)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="font-medium">{contact.name}</span>
                      {contact.company && (
                        <span className="ml-2 text-xs text-muted-foreground">@ {contact.company}</span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </CommandItem>
              ))}
              {contacts.length > 5 && (
                <CommandItem onSelect={() => handleSelect("/dashboard/contacts")} className="justify-center text-primary">
                  Ver todos os contactos ({contacts.length})
                </CommandItem>
              )}
            </CommandGroup>
          )}

          {filteredContacts.length > 0 && filteredCompanies.length > 0 && <CommandSeparator />}

          {filteredCompanies.length > 0 && (
            <CommandGroup heading="Empresas">
              {filteredCompanies.map((company) => (
                <CommandItem
                  key={company.id}
                  value={`company-${company.id}`}
                  onSelect={() => handleSelect(`/dashboard/companies/${company.id}`)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="font-medium">{company.name}</span>
                      {company.industry && (
                        <span className="ml-2 text-xs text-muted-foreground">{company.industry}</span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </CommandItem>
              ))}
              {companies.length > 5 && (
                <CommandItem onSelect={() => handleSelect("/dashboard/companies")} className="justify-center text-primary">
                  Ver todas as empresas ({companies.length})
                </CommandItem>
              )}
            </CommandGroup>
          )}

          {filteredCompanies.length > 0 && filteredOpportunities.length > 0 && <CommandSeparator />}

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
                        <span className="ml-2 text-xs text-muted-foreground">{opp.lead.name}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {opp.value && (
                      <Badge variant="secondary" className="text-xs">{formatCurrency(opp.value)}</Badge>
                    )}
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  </div>
                </CommandItem>
              ))}
              {opportunities.length > 5 && (
                <CommandItem onSelect={() => handleSelect("/dashboard/opportunities")} className="justify-center text-primary">
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
