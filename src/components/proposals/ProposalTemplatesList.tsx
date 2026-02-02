import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus, Search, FileText, Loader2, LayoutTemplate } from "lucide-react";
import {
  useProposalTemplates,
  useCreateProposalTemplate,
  useUpdateProposalTemplate,
  useDeleteProposalTemplate,
} from "@/hooks/useProposals";
import { ProposalTemplateCard } from "./ProposalTemplateCard";
import { ProposalTemplateFormDialog } from "./ProposalTemplateFormDialog";
import type { ProposalTemplate, ContentBlock } from "@/types/proposal";

const sortOptions = [
  { value: "created_desc", label: "Mais recentes" },
  { value: "created_asc", label: "Mais antigos" },
  { value: "name_asc", label: "Nome (A-Z)" },
  { value: "name_desc", label: "Nome (Z-A)" },
];

export function ProposalTemplatesList() {
  const [searchValue, setSearchValue] = useState("");
  const [sortValue, setSortValue] = useState("created_desc");
  const [formOpen, setFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ProposalTemplate | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: templates, isLoading } = useProposalTemplates();
  const createTemplate = useCreateProposalTemplate();
  const updateTemplate = useUpdateProposalTemplate();
  const deleteTemplate = useDeleteProposalTemplate();

  // Filter and sort templates
  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    let result = [...templates];

    // Search filter
    if (searchValue) {
      const lower = searchValue.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(lower) ||
          t.description?.toLowerCase().includes(lower)
      );
    }

    // Sort
    switch (sortValue) {
      case "created_desc":
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "created_asc":
        result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case "name_asc":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name_desc":
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
    }

    return result;
  }, [templates, searchValue, sortValue]);

  // Stats
  const stats = useMemo(() => {
    if (!templates) return { total: 0, active: 0 };
    return {
      total: templates.length,
      active: templates.filter((t) => t.is_active).length,
    };
  }, [templates]);

  const handleCreate = () => {
    setEditingTemplate(null);
    setFormOpen(true);
  };

  const handleEdit = (template: ProposalTemplate) => {
    setEditingTemplate(template);
    setFormOpen(true);
  };

  const handleDuplicate = async (template: ProposalTemplate) => {
    await createTemplate.mutateAsync({
      name: `${template.name} (cópia)`,
      description: template.description || undefined,
      content_blocks: (template.content_blocks as ContentBlock[]) || [],
      cta_text: template.cta_text,
      cta_color: template.cta_color,
    });
  };

  const handleToggleActive = async (template: ProposalTemplate, active: boolean) => {
    // Since the hook doesn't support is_active toggle, we'll need to extend it
    // For now, we'll just call update with the current values
    await updateTemplate.mutateAsync({
      id: template.id,
      name: template.name,
    });
  };

  const handleSave = async (data: {
    name: string;
    description: string;
    content_blocks: ContentBlock[];
    cta_text: string;
    cta_color: string;
  }) => {
    if (editingTemplate) {
      await updateTemplate.mutateAsync({
        id: editingTemplate.id,
        ...data,
      });
    } else {
      await createTemplate.mutateAsync(data);
    }
    setFormOpen(false);
    setEditingTemplate(null);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteTemplate.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const isSaving = createTemplate.isPending || updateTemplate.isPending;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <LayoutTemplate className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total de Modelos</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.active}</p>
              <p className="text-sm text-muted-foreground">Modelos Activos</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 col-span-2 md:col-span-1">
          <div className="flex items-center justify-center h-full">
            <Button onClick={handleCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Modelo
            </Button>
          </div>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar modelos..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sortValue} onValueChange={setSortValue}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card className="p-12 text-center">
          <LayoutTemplate className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-30" />
          <h3 className="text-lg font-medium mb-2">
            {searchValue ? "Nenhum modelo encontrado" : "Sem modelos criados"}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {searchValue
              ? "Tente ajustar os termos de pesquisa."
              : "Crie o seu primeiro modelo para reutilizar em propostas futuras."}
          </p>
          {!searchValue && (
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Criar primeiro modelo
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <ProposalTemplateCard
              key={template.id}
              template={template}
              onEdit={() => handleEdit(template)}
              onDuplicate={() => handleDuplicate(template)}
              onDelete={() => setDeleteId(template.id)}
              onToggleActive={(active) => handleToggleActive(template, active)}
            />
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <ProposalTemplateFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        template={editingTemplate}
        onSave={handleSave}
        isSaving={isSaving}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar modelo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acção não pode ser desfeita. O modelo será permanentemente removido
              e não estará disponível para novas propostas.
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
