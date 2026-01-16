import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit2,
  Copy,
  Archive,
  Trash2,
  Eye,
  ExternalLink,
  FileText,
  Sparkles,
} from "lucide-react";
import { useForms, useDuplicateForm, useUpdateForm, useDeleteForm } from "@/hooks/useFormBuilder";
import { CreateFormDialog } from "./CreateFormDialog";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { 
  FORM_TYPE_LABELS, 
  FORM_STATUS_LABELS,
  TARGET_ENTITY_LABELS,
  type FormStatus 
} from "@/types/formBuilder";

export function FormBuilderPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FormStatus | "all">("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: forms = [], isLoading } = useForms(statusFilter === "all" ? undefined : statusFilter);
  const duplicateForm = useDuplicateForm();
  const updateForm = useUpdateForm();
  const deleteForm = useDeleteForm();

  const filteredForms = forms.filter(form => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      form.name.toLowerCase().includes(query) ||
      form.description?.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (status: FormStatus) => {
    const variants: Record<FormStatus, "default" | "secondary" | "outline"> = {
      active: "default",
      draft: "secondary",
      archived: "outline",
    };
    return <Badge variant={variants[status]}>{FORM_STATUS_LABELS[status]}</Badge>;
  };

  const handleArchive = (formId: string) => {
    updateForm.mutate({ id: formId, status: 'archived' });
  };

  const handleActivate = (formId: string) => {
    updateForm.mutate({ id: formId, status: 'active' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Formulários</h1>
          <p className="text-muted-foreground">
            Crie e gerencie formulários inteligentes para capturar leads e contactos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setCreateDialogOpen(true)}>
            <Sparkles className="h-4 w-4 mr-2" />
            Criar com IA
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Formulário
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar formulários..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as FormStatus | "all")}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="draft">Rascunhos</SelectItem>
                <SelectItem value="archived">Arquivados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Forms Table */}
      {isLoading ? (
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          </CardContent>
        </Card>
      ) : filteredForms.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="font-semibold text-lg">Sem formulários</h3>
                <p className="text-muted-foreground">
                  {searchQuery 
                    ? "Nenhum formulário encontrado para esta pesquisa."
                    : "Cria o teu primeiro formulário inteligente."
                  }
                </p>
              </div>
              {!searchQuery && (
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar primeiro formulário
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Submissões</TableHead>
                  <TableHead>Última Submissão</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredForms.map((form) => (
                  <TableRow key={form.id}>
                    <TableCell>
                      <div>
                        <span className="font-medium">{form.name}</span>
                        {form.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {form.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {FORM_TYPE_LABELS[form.form_type]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {TARGET_ENTITY_LABELS[form.target_entity]}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(form.status)}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-medium">{form.submissions_count}</span>
                    </TableCell>
                    <TableCell>
                      {form.last_submission_at ? (
                        format(new Date(form.last_submission_at), "dd MMM yyyy, HH:mm", { locale: pt })
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/dashboard/forms/${form.id}`)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/dashboard/forms/${form.id}/preview`)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Pré-visualizar
                          </DropdownMenuItem>
                          {form.status === 'active' && form.slug && (
                            <DropdownMenuItem onClick={() => window.open(`/f/${form.slug}`, '_blank')}>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Abrir formulário
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => duplicateForm.mutate(form.id)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicar
                          </DropdownMenuItem>
                          {form.status === 'draft' && (
                            <DropdownMenuItem onClick={() => handleActivate(form.id)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Publicar
                            </DropdownMenuItem>
                          )}
                          {form.status !== 'archived' && (
                            <DropdownMenuItem onClick={() => handleArchive(form.id)}>
                              <Archive className="h-4 w-4 mr-2" />
                              Arquivar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => deleteForm.mutate(form.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}

      <CreateFormDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
}
