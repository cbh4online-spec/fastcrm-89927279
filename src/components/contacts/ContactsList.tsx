import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useContacts, Contact } from "@/hooks/useContacts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Plus, 
  MoreHorizontal, 
  Mail, 
  Phone, 
  Building2, 
  Pencil, 
  Trash2, 
  Eye,
  Users,
  RefreshCw,
  Download,
  Tag,
  UserCheck,
  UserX,
  Calendar,
} from "lucide-react";
import { CreateContactDialog } from "./CreateContactDialog";
import { EditContactDialog } from "./EditContactDialog";
import { PageHeader } from "@/components/common/PageHeader";
import { Toolbar } from "@/components/common/Toolbar";
import { FilterSidebar, type FilterGroup } from "@/components/common/FilterSidebar";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const sortOptions = [
  { value: "name_asc", label: "Nome (A-Z)" },
  { value: "name_desc", label: "Nome (Z-A)" },
  { value: "created_desc", label: "Mais recentes" },
  { value: "created_asc", label: "Mais antigos" },
];

export function ContactsList() {
  const navigate = useNavigate();
  const { contacts, isLoading, deleteContact } = useContacts();
  
  // Modal state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null);

  // UI state
  const [showFilterSidebar, setShowFilterSidebar] = useState(true);
  const [activeFilterId, setActiveFilterId] = useState<string | undefined>();
  const [searchValue, setSearchValue] = useState("");
  const [sortValue, setSortValue] = useState("created_desc");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[1]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");

  // Extract unique tags from contacts
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    contacts.forEach(c => c.tags?.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [contacts]);

  // Stats
  const stats = useMemo(() => ({
    total: contacts.length,
    withEmail: contacts.filter(c => c.email).length,
    withPhone: contacts.filter(c => c.phone).length,
    withCompany: contacts.filter(c => c.company).length,
  }), [contacts]);

  // Filter and sort
  const filteredContacts = useMemo(() => {
    let result = [...contacts];

    // Status filter
    if (statusFilter === "with_email") {
      result = result.filter(c => c.email);
    } else if (statusFilter === "without_email") {
      result = result.filter(c => !c.email);
    } else if (statusFilter === "with_company") {
      result = result.filter(c => c.company);
    }

    // Tag filter
    if (tagFilter !== "all") {
      result = result.filter(c => c.tags?.includes(tagFilter));
    }

    // Search
    if (searchValue) {
      const query = searchValue.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query) ||
        c.company?.toLowerCase().includes(query) ||
        c.phone?.includes(query)
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortValue) {
        case "name_asc":
          return a.name.localeCompare(b.name);
        case "name_desc":
          return b.name.localeCompare(a.name);
        case "created_desc":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "created_asc":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        default:
          return 0;
      }
    });

    return result;
  }, [contacts, statusFilter, tagFilter, searchValue, sortValue]);

  // Pagination
  const totalPages = Math.ceil(filteredContacts.length / pageSize);
  const paginatedContacts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredContacts.slice(start, start + pageSize);
  }, [filteredContacts, currentPage, pageSize]);

  // Handlers
  const handleDelete = async () => {
    if (deleteContactId) {
      await deleteContact.mutateAsync(deleteContactId);
      setDeleteContactId(null);
    }
  };

  const handleFilterSelect = (filterId: string) => {
    setActiveFilterId(filterId);
    setCurrentPage(1);

    const [group, value] = filterId.split("_");

    if (group === "status") {
      setStatusFilter(value);
      setTagFilter("all");
    } else if (group === "tag") {
      setTagFilter(value);
      setStatusFilter("all");
    }
  };

  const handleClearFilters = () => {
    setActiveFilterId(undefined);
    setStatusFilter("all");
    setTagFilter("all");
    setSearchValue("");
    setCurrentPage(1);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedContacts.map(c => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(i => i !== id));
    }
  };

  const handleBulkExport = () => {
    const selected = contacts.filter(c => selectedIds.includes(c.id));
    const csv = [
      ["Nome", "Email", "Telefone", "Empresa", "Tags", "Criado em"].join(","),
      ...selected.map(c => [
        c.name,
        c.email || "",
        c.phone || "",
        c.company || "",
        c.tags?.join("; ") || "",
        format(new Date(c.created_at), "dd/MM/yyyy"),
      ].join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `contactos_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    toast.success(`${selected.length} contactos exportados`);
    setSelectedIds([]);
  };

  const handleBulkDelete = async () => {
    for (const id of selectedIds) {
      await deleteContact.mutateAsync(id);
    }
    setSelectedIds([]);
    toast.success(`${selectedIds.length} contactos eliminados`);
  };

  // Filter groups
  const filterGroups: FilterGroup[] = [
    {
      id: "status",
      label: "Estado",
      icon: <Users className="h-4 w-4" />,
      defaultOpen: true,
      items: [
        { id: "status_with_email", label: "Com email", icon: <Mail className="h-4 w-4" />, count: stats.withEmail },
        { id: "status_without_email", label: "Sem email", icon: <UserX className="h-4 w-4" />, count: stats.total - stats.withEmail },
        { id: "status_with_company", label: "Com empresa", icon: <Building2 className="h-4 w-4" />, count: stats.withCompany },
      ],
    },
  ];

  // Add tags filter group if tags exist
  if (allTags.length > 0) {
    filterGroups.push({
      id: "tag",
      label: "Tags",
      icon: <Tag className="h-4 w-4" />,
      defaultOpen: false,
      items: allTags.slice(0, 10).map(tag => ({
        id: `tag_${tag}`,
        label: tag,
        count: contacts.filter(c => c.tags?.includes(tag)).length,
      })),
    });
  }

  return (
    <div className="flex flex-col h-full">
      {/* PageHeader */}
      <PageHeader
        title="Contactos"
        count={stats.total}
        description="Gerir os contactos do seu workspace"
        actions={[
          {
            label: "Novo Contacto",
            icon: <Plus className="h-4 w-4" />,
            onClick: () => setCreateDialogOpen(true),
          },
        ]}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border-b">
        <Card className="bg-card/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Com Email</p>
                <p className="text-xl font-bold text-primary">{stats.withEmail}</p>
              </div>
              <Mail className="h-8 w-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Com Telefone</p>
                <p className="text-xl font-bold text-success">{stats.withPhone}</p>
              </div>
              <Phone className="h-8 w-8 text-success/20" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Com Empresa</p>
                <p className="text-xl font-bold text-warning">{stats.withCompany}</p>
              </div>
              <Building2 className="h-8 w-8 text-warning/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <Toolbar
        searchValue={searchValue}
        searchPlaceholder="Pesquisar contactos..."
        onSearchChange={(value) => {
          setSearchValue(value);
          setCurrentPage(1);
        }}
        showFilters={showFilterSidebar}
        filtersActive={activeFilterId !== undefined || statusFilter !== "all" || tagFilter !== "all"}
        onToggleFilters={() => setShowFilterSidebar(!showFilterSidebar)}
        onClearFilters={handleClearFilters}
        sortOptions={sortOptions}
        sortValue={sortValue}
        onSortChange={setSortValue}
        rightActions={
          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2 mr-2">
                <Badge variant="secondary">{selectedIds.length} selecionados</Badge>
                <Button variant="outline" size="sm" onClick={handleBulkExport}>
                  <Download className="h-4 w-4 mr-1" />
                  Exportar
                </Button>
                <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Eliminar
                </Button>
              </div>
            )}
            <Button variant="ghost" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Filter Sidebar */}
        <FilterSidebar
          filterGroups={filterGroups}
          activeFilterId={activeFilterId}
          onFilterSelect={handleFilterSelect}
          onClearFilter={handleClearFilters}
          isOpen={showFilterSidebar}
          onClose={() => setShowFilterSidebar(false)}
        />

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : paginatedContacts.length === 0 ? (
            <div className="text-center py-12 bg-muted/30 rounded-lg">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground mb-4">
                {searchValue || activeFilterId ? "Nenhum contacto encontrado" : "Ainda não tem contactos"}
              </p>
              {!searchValue && !activeFilterId && (
                <Button variant="outline" onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar primeiro contacto
                </Button>
              )}
            </div>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={paginatedContacts.length > 0 && paginatedContacts.every(c => selectedIds.includes(c.id))}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedContacts.map((contact) => (
                    <TableRow 
                      key={contact.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/dashboard/contacts/${contact.id}`)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.includes(contact.id)}
                          onCheckedChange={(checked) => handleSelectOne(contact.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{contact.name}</p>
                          {contact.job_title && (
                            <p className="text-sm text-muted-foreground">{contact.job_title}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {contact.email ? (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <span className="text-primary">{contact.email}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {contact.phone ? (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            {contact.phone}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {contact.company ? (
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            {contact.company}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {contact.tags && contact.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {contact.tags.slice(0, 2).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {contact.tags.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{contact.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(contact.created_at), "dd MMM yyyy, HH:mm", { locale: pt })}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/dashboard/contacts/${contact.id}`)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditContact(contact)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteContactId(contact.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {filteredContacts.length} contactos
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="text-sm border rounded px-2 py-1 bg-background"
                >
                  {PAGE_SIZE_OPTIONS.map(size => (
                    <option key={size} value={size}>{size} por página</option>
                  ))}
                </select>
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          onClick={() => setCurrentPage(pageNum)}
                          isActive={currentPage === pageNum}
                          className="cursor-pointer"
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <CreateContactDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {editContact && (
        <EditContactDialog
          contact={editContact}
          open={!!editContact}
          onOpenChange={(open) => !open && setEditContact(null)}
        />
      )}

      <AlertDialog open={!!deleteContactId} onOpenChange={(open) => !open && setDeleteContactId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar contacto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser revertida. O contacto será permanentemente eliminado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
