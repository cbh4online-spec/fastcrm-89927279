import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Search,
  Eye,
  Copy,
  Trash2,
  Pencil,
  MoreVertical,
  FileText,
  LayoutTemplate,
  Monitor,
  Smartphone,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import {
  useMarketingTemplates,
  useCreateMarketingTemplate,
  useUpdateMarketingTemplate,
  useDeleteMarketingTemplate,
} from '@/hooks/useMarketingTemplates';
import { TEMPLATE_CATEGORIES, DEFAULT_TEMPLATES } from '@/types/marketing';
import type { MarketingTemplate } from '@/types/marketing';

function TemplatePreviewDialog({
  template,
  open,
  onOpenChange,
}: {
  template: MarketingTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [mobileView, setMobileView] = useState(false);

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>{template.name}</DialogTitle>
              {template.description && (
                <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
              )}
            </div>
            <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
              <Button
                variant={!mobileView ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={() => setMobileView(false)}
              >
                <Monitor className="h-3 w-3" />
                Desktop
              </Button>
              <Button
                variant={mobileView ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={() => setMobileView(true)}
              >
                <Smartphone className="h-3 w-3" />
                Mobile
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-auto bg-muted/30 rounded-lg p-4 flex justify-center">
          <div
            className="bg-background border rounded-lg shadow-sm overflow-hidden transition-all"
            style={{ width: mobileView ? 375 : '100%', maxWidth: 700 }}
          >
            <iframe
              srcDoc={template.bodyHtml}
              className="w-full border-0"
              style={{ minHeight: 400, height: '60vh' }}
              sandbox="allow-same-origin"
              title={`Preview: ${template.name}`}
            />
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-[10px]">
              {TEMPLATE_CATEGORIES.find((c) => c.value === template.category)?.label || template.category}
            </Badge>
            <span>Usado {template.usageCount}×</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TemplateFormDialog({
  template,
  open,
  onOpenChange,
}: {
  template?: MarketingTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isEditing = !!template;
  const createTemplate = useCreateMarketingTemplate();
  const updateTemplate = useUpdateMarketingTemplate();

  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [subject, setSubject] = useState(template?.subject || '');
  const [bodyHtml, setBodyHtml] = useState(template?.bodyHtml || '');
  const [category, setCategory] = useState(template?.category || 'general');

  const handleSubmit = async () => {
    if (isEditing && template) {
      await updateTemplate.mutateAsync({
        id: template.id,
        name,
        description,
        subject,
        bodyHtml,
        category,
      });
    } else {
      await createTemplate.mutateAsync({
        name,
        description,
        subject,
        bodyHtml,
        category,
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Template' : 'Novo Template'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do template..." />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Breve descrição..." />
          </div>
          <div className="space-y-2">
            <Label>Assunto padrão</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Assunto do email..." />
          </div>
          <div className="space-y-2">
            <Label>HTML do template</Label>
            <Textarea
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
              placeholder="Cole o HTML do template aqui..."
              rows={10}
              className="font-mono text-xs"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name || !bodyHtml || createTemplate.isPending || updateTemplate.isPending}
          >
            {isEditing ? 'Guardar' : 'Criar Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TemplateLibraryPage() {
  const { data: templates, isLoading } = useMarketingTemplates();
  const createTemplate = useCreateMarketingTemplate();
  const deleteTemplate = useDeleteMarketingTemplate();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [previewTemplate, setPreviewTemplate] = useState<MarketingTemplate | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MarketingTemplate | null>(null);

  const filtered = useMemo(() => {
    if (!templates) return [];
    let result = [...templates];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) => t.name.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)
      );
    }
    if (categoryFilter !== 'all') {
      result = result.filter((t) => t.category === categoryFilter);
    }
    return result;
  }, [templates, search, categoryFilter]);

  const handleDuplicate = async (template: MarketingTemplate) => {
    await createTemplate.mutateAsync({
      name: `${template.name} (cópia)`,
      description: template.description,
      subject: template.subject,
      bodyHtml: template.bodyHtml,
      bodyText: template.bodyText,
      category: template.category,
    });
  };

  const handleInstallDefault = async (defaultTpl: (typeof DEFAULT_TEMPLATES)[number]) => {
    await createTemplate.mutateAsync({
      name: defaultTpl.name,
      description: defaultTpl.description,
      bodyHtml: defaultTpl.bodyHtml,
      category: defaultTpl.category,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Biblioteca de Templates"
        count={templates?.length || 0}
        description="Templates de email reutilizáveis para campanhas e sequências"
        actions={[
          {
            label: 'Novo Template',
            icon: <Plus className="h-4 w-4" />,
            onClick: () => {
              setEditingTemplate(null);
              setShowForm(true);
            },
          },
        ]}
      />

      <Tabs defaultValue="custom">
        <TabsList>
          <TabsTrigger value="custom">Os Meus Templates</TabsTrigger>
          <TabsTrigger value="gallery">Galeria de Modelos</TabsTrigger>
        </TabsList>

        {/* Custom templates */}
        <TabsContent value="custom">
          {/* Filters */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar templates..."
                className="pl-8 h-9 text-sm"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40 h-9 text-sm">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {TEMPLATE_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-52" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Card className="py-12">
              <CardContent className="flex flex-col items-center justify-center text-center">
                <LayoutTemplate className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {search || categoryFilter !== 'all' ? 'Nenhum template encontrado' : 'Sem templates'}
                </h3>
                <p className="text-muted-foreground mb-4 text-sm">
                  {search ? 'Ajuste a pesquisa' : 'Crie o seu primeiro template ou instale um da galeria'}
                </p>
                {!search && (
                  <Button
                    onClick={() => {
                      setEditingTemplate(null);
                      setShowForm(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Template
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((tpl) => (
                <Card key={tpl.id} className="overflow-hidden hover:shadow-md transition-shadow group">
                  {/* Preview thumbnail */}
                  <div
                    className="h-36 bg-muted/30 border-b relative overflow-hidden cursor-pointer"
                    onClick={() => setPreviewTemplate(tpl)}
                  >
                    <iframe
                      srcDoc={tpl.bodyHtml}
                      className="w-full h-full border-0 pointer-events-none"
                      style={{ transform: 'scale(0.4)', transformOrigin: 'top left', width: '250%', height: '250%' }}
                      sandbox="allow-same-origin"
                      tabIndex={-1}
                    />
                    <div className="absolute inset-0 bg-background/0 group-hover:bg-background/30 transition-colors flex items-center justify-center">
                      <Eye className="h-6 w-6 text-foreground opacity-0 group-hover:opacity-70 transition-opacity" />
                    </div>
                  </div>

                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">{tpl.name}</h3>
                        {tpl.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{tpl.description}</p>
                        )}
                        <div className="flex items-center gap-2 pt-1">
                          <Badge variant="outline" className="text-[10px]">
                            {TEMPLATE_CATEGORIES.find((c) => c.value === tpl.category)?.label || tpl.category}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {tpl.usageCount}× usado
                          </span>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setPreviewTemplate(tpl)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Pré-visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingTemplate(tpl);
                              setShowForm(true);
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(tpl)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => deleteTemplate.mutate(tpl.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Gallery tab — system/default templates */}
        <TabsContent value="gallery">
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              Modelos prontos a usar. Clica em "Instalar" para adicionar à tua biblioteca.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {DEFAULT_TEMPLATES.map((tpl, idx) => (
              <Card key={idx} className="overflow-hidden">
                <div className="h-28 bg-muted/30 border-b overflow-hidden">
                  <iframe
                    srcDoc={tpl.bodyHtml}
                    className="w-full h-full border-0 pointer-events-none"
                    style={{ transform: 'scale(0.35)', transformOrigin: 'top left', width: '285%', height: '285%' }}
                    sandbox="allow-same-origin"
                    tabIndex={-1}
                  />
                </div>
                <CardContent className="p-3 space-y-2">
                  <div>
                    <h3 className="font-medium text-sm">{tpl.name}</h3>
                    <p className="text-xs text-muted-foreground">{tpl.description}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px]">
                      {TEMPLATE_CATEGORIES.find((c) => c.value === tpl.category)?.label || tpl.category}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={() => handleInstallDefault(tpl)}
                      disabled={createTemplate.isPending}
                    >
                      <Plus className="h-3 w-3" />
                      Instalar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Preview dialog */}
      <TemplatePreviewDialog
        template={previewTemplate}
        open={!!previewTemplate}
        onOpenChange={(open) => !open && setPreviewTemplate(null)}
      />

      {/* Form dialog */}
      <TemplateFormDialog
        template={editingTemplate}
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) setEditingTemplate(null);
        }}
      />
    </div>
  );
}
