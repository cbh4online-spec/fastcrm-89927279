import { useState, useMemo, useEffect } from "react";
import { Contact } from "@/hooks/useContacts";
import { Opportunity } from "@/hooks/useOpportunities";
import { PipelineStage } from "@/hooks/usePipelineStages";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Mail, Phone, Building2, Trash2, Eye, DollarSign, User } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { CrmEntityType } from "@/hooks/useCrmViews";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { BulkActionsBar } from "./BulkActionsBar";
import { TablePagination } from "./TablePagination";

interface CrmTableViewProps {
  entityType: CrmEntityType;
  contacts: Contact[];
  opportunities: Opportunity[];
  stages: PipelineStage[];
  visibleColumns: string[];
  onRowClick: (id: string) => void;
  onDeleteContact: (id: string) => Promise<void>;
  onDeleteContacts?: (ids: string[]) => Promise<void>;
  onAddTagsToContacts?: (ids: string[], tags: string[]) => Promise<void>;
}

const DEFAULT_PAGE_SIZE = 25;

export function CrmTableView({
  entityType,
  contacts,
  opportunities,
  stages,
  visibleColumns,
  onRowClick,
  onDeleteContact,
  onDeleteContacts,
  onAddTagsToContacts,
}: CrmTableViewProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const getStageById = (stageId: string) => stages.find(s => s.id === stageId);

  const allItems = entityType === "contacts" ? contacts : opportunities;
  const totalItems = allItems.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  // Reset to page 1 when data or entity changes
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [entityType, totalItems]);

  // Paginated items
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return allItems.slice(startIndex, endIndex);
  }, [allItems, currentPage, pageSize]);

  const paginatedContacts = entityType === "contacts" ? (paginatedItems as Contact[]) : [];
  const paginatedOpportunities = entityType === "opportunities" ? (paginatedItems as Opportunity[]) : [];

  const currentPageIds = paginatedItems.map(item => item.id);
  const isAllOnPageSelected = currentPageIds.length > 0 && currentPageIds.every(id => selectedIds.has(id));
  const isSomeOnPageSelected = currentPageIds.some(id => selectedIds.has(id)) && !isAllOnPageSelected;

  // Get available tags from all contacts (not just paginated)
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    contacts.forEach(c => c.tags?.forEach(t => tags.add(t)));
    return Array.from(tags);
  }, [contacts]);

  const handleSelectAllOnPage = () => {
    const newSelected = new Set(selectedIds);
    if (isAllOnPageSelected) {
      currentPageIds.forEach(id => newSelected.delete(id));
    } else {
      currentPageIds.forEach(id => newSelected.add(id));
    }
    setSelectedIds(newSelected);
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (entityType === "contacts" && onDeleteContacts) {
      await onDeleteContacts(ids);
    } else {
      for (const id of ids) {
        await onDeleteContact(id);
      }
    }
    setSelectedIds(new Set());
  };

  const handleBulkExport = () => {
    const ids = Array.from(selectedIds);
    const itemsToExport = allItems.filter(item => ids.includes(item.id));
    
    let csvContent = "";
    if (entityType === "contacts") {
      const contactsData = itemsToExport as Contact[];
      csvContent = "Nome,Email,Telefone,Empresa,Cargo,Tags,Criado em\n";
      contactsData.forEach(contact => {
        csvContent += `"${contact.name}","${contact.email || ""}","${contact.phone || ""}","${contact.company || ""}","${contact.job_title || ""}","${(contact.tags || []).join(", ")}","${format(new Date(contact.created_at), "dd/MM/yyyy")}"\n`;
      });
    } else {
      const oppsData = itemsToExport as Opportunity[];
      csvContent = "Título,Valor,Etapa,Lead,Estado,Data Prevista,Criado em\n";
      oppsData.forEach(opp => {
        const stage = getStageById(opp.stage_id);
        csvContent += `"${opp.title}","${opp.value || 0}","${stage?.name || ""}","${opp.lead?.name || ""}","${opp.status}","${opp.expected_close_date ? format(new Date(opp.expected_close_date), "dd/MM/yyyy") : ""}","${format(new Date(opp.created_at), "dd/MM/yyyy")}"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${entityType}-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  const handleBulkAddTags = async (tags: string[]) => {
    if (onAddTagsToContacts) {
      await onAddTagsToContacts(Array.from(selectedIds), tags);
      setSelectedIds(new Set());
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  if (entityType === "contacts") {
    if (contacts.length === 0) {
      return (
        <div className="text-center py-12 bg-muted/30 rounded-lg">
          <p className="text-muted-foreground">Nenhum contacto encontrado</p>
        </div>
      );
    }

    return (
      <div className="space-y-3 h-full flex flex-col">
        <BulkActionsBar
          entityType={entityType}
          selectedCount={selectedIds.size}
          onClearSelection={handleClearSelection}
          onDelete={handleBulkDelete}
          onExport={handleBulkExport}
          onAddTags={handleBulkAddTags}
          availableTags={availableTags}
        />
        
        <div className="flex-1 flex flex-col border rounded-lg overflow-hidden">
          <ScrollArea className="flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={isAllOnPageSelected}
                      onCheckedChange={handleSelectAllOnPage}
                      aria-label="Selecionar todos nesta página"
                      className={isSomeOnPageSelected ? "data-[state=checked]:bg-primary/50" : ""}
                    />
                  </TableHead>
                  {visibleColumns.includes("name") && <TableHead>Nome</TableHead>}
                  {visibleColumns.includes("email") && <TableHead>Email</TableHead>}
                  {visibleColumns.includes("phone") && <TableHead>Telefone</TableHead>}
                  {visibleColumns.includes("company") && <TableHead>Empresa</TableHead>}
                  {visibleColumns.includes("job_title") && <TableHead>Cargo</TableHead>}
                  {visibleColumns.includes("tags") && <TableHead>Tags</TableHead>}
                  {visibleColumns.includes("created_at") && <TableHead>Criado em</TableHead>}
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedContacts.map((contact) => (
                  <TableRow
                    key={contact.id}
                    className={`cursor-pointer hover:bg-muted/50 ${selectedIds.has(contact.id) ? "bg-primary/5" : ""}`}
                    onClick={() => onRowClick(contact.id)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(contact.id)}
                        onCheckedChange={(checked) => handleSelectItem(contact.id, checked as boolean)}
                        aria-label={`Selecionar ${contact.name}`}
                      />
                    </TableCell>
                    {visibleColumns.includes("name") && (
                      <TableCell>
                        <div>
                          <p className="font-medium">{contact.name}</p>
                          {contact.job_title && !visibleColumns.includes("job_title") && (
                            <p className="text-sm text-muted-foreground">{contact.job_title}</p>
                          )}
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.includes("email") && (
                      <TableCell>
                        {contact.email ? (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <span className="text-primary hover:underline">{contact.email}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    )}
                    {visibleColumns.includes("phone") && (
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
                    )}
                    {visibleColumns.includes("company") && (
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
                    )}
                    {visibleColumns.includes("job_title") && (
                      <TableCell>
                        {contact.job_title || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                    )}
                    {visibleColumns.includes("tags") && (
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
                    )}
                    {visibleColumns.includes("created_at") && (
                      <TableCell className="text-muted-foreground">
                        {format(new Date(contact.created_at), "dd MMM yyyy", { locale: pt })}
                      </TableCell>
                    )}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onRowClick(contact.id)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Ver Detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onDeleteContact(contact.id)}
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
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
          
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
      </div>
    );
  }

  // Opportunities table
  if (opportunities.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-lg">
        <p className="text-muted-foreground">Nenhuma oportunidade encontrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 h-full flex flex-col">
      <BulkActionsBar
        entityType={entityType}
        selectedCount={selectedIds.size}
        onClearSelection={handleClearSelection}
        onDelete={handleBulkDelete}
        onExport={handleBulkExport}
        onAddTags={async () => {}}
      />
      
      <div className="flex-1 flex flex-col border rounded-lg overflow-hidden">
        <ScrollArea className="flex-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={isAllOnPageSelected}
                    onCheckedChange={handleSelectAllOnPage}
                    aria-label="Selecionar todos nesta página"
                    className={isSomeOnPageSelected ? "data-[state=checked]:bg-primary/50" : ""}
                  />
                </TableHead>
                {visibleColumns.includes("title") && <TableHead>Título</TableHead>}
                {visibleColumns.includes("value") && <TableHead>Valor</TableHead>}
                {visibleColumns.includes("stage") && <TableHead>Etapa</TableHead>}
                {visibleColumns.includes("lead") && <TableHead>Lead</TableHead>}
                {visibleColumns.includes("status") && <TableHead>Estado</TableHead>}
                {visibleColumns.includes("expected_close_date") && <TableHead>Data Prevista</TableHead>}
                {visibleColumns.includes("created_at") && <TableHead>Criado em</TableHead>}
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedOpportunities.map((opp) => {
                const stage = getStageById(opp.stage_id);
                return (
                  <TableRow
                    key={opp.id}
                    className={`cursor-pointer hover:bg-muted/50 ${selectedIds.has(opp.id) ? "bg-primary/5" : ""}`}
                    onClick={() => onRowClick(opp.id)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(opp.id)}
                        onCheckedChange={(checked) => handleSelectItem(opp.id, checked as boolean)}
                        aria-label={`Selecionar ${opp.title}`}
                      />
                    </TableCell>
                    {visibleColumns.includes("title") && (
                      <TableCell>
                        <p className="font-medium">{opp.title}</p>
                      </TableCell>
                    )}
                    {visibleColumns.includes("value") && (
                      <TableCell>
                        <div className="flex items-center gap-1 font-medium text-primary">
                          <DollarSign className="w-4 h-4" />
                          {Number(opp.value).toLocaleString("pt-PT", { minimumFractionDigits: 0 })}
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.includes("stage") && (
                      <TableCell>
                        {stage ? (
                          <Badge 
                            variant="outline" 
                            style={{ borderColor: stage.color, color: stage.color }}
                          >
                            {stage.name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    )}
                    {visibleColumns.includes("lead") && (
                      <TableCell>
                        {opp.lead ? (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            {opp.lead.name}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    )}
                    {visibleColumns.includes("status") && (
                      <TableCell>
                        <Badge 
                          variant={opp.status === "won" ? "default" : opp.status === "lost" ? "destructive" : "secondary"}
                        >
                          {opp.status === "open" ? "Aberta" : opp.status === "won" ? "Ganha" : "Perdida"}
                        </Badge>
                      </TableCell>
                    )}
                    {visibleColumns.includes("expected_close_date") && (
                      <TableCell className="text-muted-foreground">
                        {opp.expected_close_date 
                          ? format(new Date(opp.expected_close_date), "dd MMM yyyy", { locale: pt })
                          : "—"}
                      </TableCell>
                    )}
                    {visibleColumns.includes("created_at") && (
                      <TableCell className="text-muted-foreground">
                        {format(new Date(opp.created_at), "dd MMM yyyy", { locale: pt })}
                      </TableCell>
                    )}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onRowClick(opp.id)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Ver Detalhes
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>
    </div>
  );
}
