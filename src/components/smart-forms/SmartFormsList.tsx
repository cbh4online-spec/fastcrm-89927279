import { useState } from 'react';
import { useSmartForms, useDeleteSmartForm } from '@/hooks/useSmartForms';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  Plus, 
  Search, 
  MoreVertical, 
  FileText, 
  Target, 
  HelpCircle,
  Rocket,
  RefreshCw,
  Building,
  ExternalLink,
  Copy,
  Trash2,
  Edit,
  MessageSquare,
  Sparkles,
  Eye
} from 'lucide-react';
import { SmartForm, FormType } from '@/types/smartForm';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface SmartFormsListProps {
  onCreateNew: () => void;
  onEdit: (form: SmartForm) => void;
  onViewSubmissions: (form: SmartForm) => void;
}

const FORM_TYPE_ICONS: Record<FormType, React.ElementType> = {
  lead_capture: FileText,
  qualification: Target,
  proposal_request: FileText,
  support: HelpCircle,
  onboarding: Rocket,
  reactivation: RefreshCw,
  internal: Building,
};

const FORM_TYPE_LABELS: Record<FormType, string> = {
  lead_capture: 'Captação',
  qualification: 'Qualificação',
  proposal_request: 'Proposta',
  support: 'Suporte',
  onboarding: 'Onboarding',
  reactivation: 'Reativação',
  internal: 'Interno',
};

export function SmartFormsList({ onCreateNew, onEdit, onViewSubmissions }: SmartFormsListProps) {
  const { data: forms, isLoading } = useSmartForms();
  const deleteForm = useDeleteSmartForm();
  const [search, setSearch] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formToDelete, setFormToDelete] = useState<SmartForm | null>(null);

  const filteredForms = forms?.filter(form => 
    form.name.toLowerCase().includes(search.toLowerCase()) ||
    form.description?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const handleCopyLink = (form: SmartForm) => {
    const url = `${window.location.origin}/f/${form.slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado!');
  };

  const handleDelete = () => {
    if (formToDelete) {
      deleteForm.mutate(formToDelete.id);
      setDeleteDialogOpen(false);
      setFormToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (!forms || forms.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="rounded-full bg-primary/10 p-4 mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Nenhum formulário criado</h3>
          <p className="text-muted-foreground text-center mb-6 max-w-md">
            A IA pode criar um formulário em segundos se disseres o objetivo.
          </p>
          <Button onClick={onCreateNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Criar Formulário
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar formulários..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={onCreateNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Formulário
        </Button>
      </div>

      {/* Forms Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredForms.map((form) => {
          const Icon = FORM_TYPE_ICONS[form.form_type] || FileText;
          
          return (
            <Card key={form.id} className="group hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{form.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {FORM_TYPE_LABELS[form.form_type]}
                        </Badge>
                        {form.is_conversational && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <MessageSquare className="h-3 w-3" />
                            Chat
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(form)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onViewSubmissions(form)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Submissões
                      </DropdownMenuItem>
                      {!form.is_internal && (
                        <>
                          <DropdownMenuItem onClick={() => window.open(`/f/${form.slug}`, '_blank')}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Abrir Formulário
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCopyLink(form)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Copiar Link
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => {
                          setFormToDelete(form);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent>
                {form.description && (
                  <CardDescription className="mb-4 line-clamp-2">
                    {form.description}
                  </CardDescription>
                )}
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span>{form.submission_count} submissões</span>
                    {form.conversion_rate > 0 && (
                      <span>{form.conversion_rate.toFixed(1)}% conversão</span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Ativo</span>
                    <Switch checked={form.is_active} disabled />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar formulário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O formulário "{formToDelete?.name}" e todas as suas submissões serão eliminados permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
