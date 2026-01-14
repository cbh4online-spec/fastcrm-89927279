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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Mail, Phone, Building2, Pencil, Trash2, Eye, DollarSign, User } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { CrmEntityType } from "@/hooks/useCrmViews";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface CrmTableViewProps {
  entityType: CrmEntityType;
  contacts: Contact[];
  opportunities: Opportunity[];
  stages: PipelineStage[];
  visibleColumns: string[];
  onRowClick: (id: string) => void;
  onDeleteContact: (id: string) => void;
}

export function CrmTableView({
  entityType,
  contacts,
  opportunities,
  stages,
  visibleColumns,
  onRowClick,
  onDeleteContact,
}: CrmTableViewProps) {
  const getStageById = (stageId: string) => stages.find(s => s.id === stageId);

  if (entityType === "contacts") {
    if (contacts.length === 0) {
      return (
        <div className="text-center py-12 bg-muted/30 rounded-lg">
          <p className="text-muted-foreground">Nenhum contacto encontrado</p>
        </div>
      );
    }

    return (
      <ScrollArea className="border rounded-lg h-full">
        <Table>
          <TableHeader>
            <TableRow>
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
            {contacts.map((contact) => (
              <TableRow
                key={contact.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onRowClick(contact.id)}
              >
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
    <ScrollArea className="border rounded-lg h-full">
      <Table>
        <TableHeader>
          <TableRow>
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
          {opportunities.map((opp) => {
            const stage = getStageById(opp.stage_id);
            return (
              <TableRow
                key={opp.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onRowClick(opp.id)}
              >
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
  );
}
