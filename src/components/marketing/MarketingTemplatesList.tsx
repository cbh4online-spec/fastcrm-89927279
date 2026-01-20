import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  FileText, 
  MoreHorizontal, 
  Search, 
  Edit, 
  Trash2, 
  Eye,
  Copy
} from 'lucide-react';
import { useMarketingTemplates, useDeleteMarketingTemplate } from '@/hooks/useMarketingTemplates';
import { TEMPLATE_CATEGORIES } from '@/types/marketing';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { TemplateFormDialog } from './TemplateFormDialog';
import type { MarketingTemplate } from '@/types/marketing';

interface MarketingTemplatesListProps {
  onCreateNew: () => void;
}

export function MarketingTemplatesList({ onCreateNew }: MarketingTemplatesListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<MarketingTemplate | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

  const { data: templates = [], isLoading } = useMarketingTemplates();
  const deleteTemplate = useDeleteMarketingTemplate();

  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (template: MarketingTemplate) => {
    setSelectedTemplate(template);
    setShowEditDialog(true);
  };

  const handlePreview = (template: MarketingTemplate) => {
    setSelectedTemplate(template);
    setShowPreviewDialog(true);
  };

  const handleDelete = (id: string) => {
    setTemplateToDelete(id);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (templateToDelete) {
      await deleteTemplate.mutateAsync(templateToDelete);
      setShowDeleteDialog(false);
      setTemplateToDelete(null);
    }
  };

  const getCategoryLabel = (category: string) => {
    return TEMPLATE_CATEGORIES.find(c => c.value === category)?.label || category;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-muted-foreground">A carregar templates...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Templates
              </CardTitle>
              <CardDescription>
                Templates de email reutilizáveis para as tuas campanhas
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">
                {searchQuery ? 'Nenhum template encontrado' : 'Ainda não criaste nenhum template'}
              </p>
              {!searchQuery && (
                <Button onClick={onCreateNew} className="mt-4">
                  <FileText className="h-4 w-4 mr-2" />
                  Criar Primeiro Template
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((template) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {template.name}
                          {template.isSystem && (
                            <Badge variant="secondary" className="text-xs">
                              Sistema
                            </Badge>
                          )}
                        </CardTitle>
                        {template.description && (
                          <CardDescription className="text-sm mt-1">
                            {template.description}
                          </CardDescription>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handlePreview(template)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </DropdownMenuItem>
                          {!template.isSystem && (
                            <DropdownMenuItem onClick={() => handleEdit(template)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicar
                          </DropdownMenuItem>
                          {!template.isSystem && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDelete(template.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between text-sm">
                      <Badge variant="outline">
                        {getCategoryLabel(template.category)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {template.usageCount} usos
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      Criado em {format(new Date(template.createdAt), "d MMM yyyy", { locale: pt })}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <TemplateFormDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        template={selectedTemplate}
        onClose={() => {
          setShowEditDialog(false);
          setSelectedTemplate(null);
        }}
      />

      {/* Preview Dialog */}
      <AlertDialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <AlertDialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Preview: {selectedTemplate?.name}</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="border rounded-lg p-4 bg-white">
            {selectedTemplate?.subject && (
              <p className="text-sm mb-4 pb-4 border-b">
                <strong>Assunto:</strong> {selectedTemplate.subject}
              </p>
            )}
            <div
              className="email-preview"
              dangerouslySetInnerHTML={{ __html: selectedTemplate?.bodyHtml || '' }}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Fechar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Template?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O template será permanentemente eliminado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
