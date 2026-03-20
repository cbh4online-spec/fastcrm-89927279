import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Globe, Eye, Users, ExternalLink, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface LandingPage {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  is_published: boolean;
  visits_count: number;
  submissions_count: number;
  campaign_id: string | null;
  form_fields: any[];
  template_html: string | null;
  thank_you_message: string | null;
  created_at: string;
}

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select';
  required: boolean;
  options?: string[];
}

const DEFAULT_FIELDS: FormField[] = [
  { name: 'name', label: 'Nome', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'phone', label: 'Telefone', type: 'phone', required: false },
];

export function CampaignLandingPages() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    thank_you_message: 'Obrigado pelo seu registo!',
  });
  const [formFields, setFormFields] = useState<FormField[]>(DEFAULT_FIELDS);

  const { data: pages = [], isLoading } = useQuery({
    queryKey: ['campaign-landing-pages', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from('campaign_landing_pages')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as LandingPage[];
    },
    enabled: !!currentWorkspace?.id,
  });

  const createPage = useMutation({
    mutationFn: async () => {
      if (!currentWorkspace?.id) throw new Error('No workspace');
      const { error } = await supabase.from('campaign_landing_pages').insert({
        workspace_id: currentWorkspace.id,
        title: formData.title,
        slug: formData.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        description: formData.description || null,
        thank_you_message: formData.thank_you_message,
        form_fields: formFields as any,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-landing-pages'] });
      toast.success('Landing page criada');
      setShowCreate(false);
      setFormData({ title: '', slug: '', description: '', thank_you_message: 'Obrigado pelo seu registo!' });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await supabase
        .from('campaign_landing_pages')
        .update({ is_published: published })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-landing-pages'] });
      toast.success('Estado atualizado');
    },
  });

  const deletePage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('campaign_landing_pages').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-landing-pages'] });
      toast.success('Landing page removida');
    },
  });

  const addField = () => {
    setFormFields([...formFields, { name: '', label: '', type: 'text', required: false }]);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const updated = [...formFields];
    updated[index] = { ...updated[index], ...updates };
    if (updates.label && !updated[index].name) {
      updated[index].name = updates.label.toLowerCase().replace(/\s+/g, '_');
    }
    setFormFields(updated);
  };

  const removeField = (index: number) => {
    setFormFields(formFields.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Landing Pages</h3>
          <p className="text-sm text-muted-foreground">Páginas de captura associadas a campanhas</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Landing Page
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">A carregar...</p>
      ) : pages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Globe className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhuma landing page criada</p>
            <Button variant="outline" className="mt-3" onClick={() => setShowCreate(true)}>
              Criar primeira
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {pages.map((page) => (
            <Card key={page.id} className="relative">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{page.title}</CardTitle>
                  <Badge variant={page.is_published ? 'default' : 'secondary'}>
                    {page.is_published ? 'Publicada' : 'Rascunho'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">/{page.slug}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-4 text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Eye className="h-3.5 w-3.5" />
                    {page.visits_count} visitas
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    {page.submissions_count} submissões
                  </span>
                </div>
                <div className="flex gap-2">
                  <Switch
                    checked={page.is_published}
                    onCheckedChange={(checked) => togglePublish.mutate({ id: page.id, published: checked })}
                  />
                  <span className="text-sm">{page.is_published ? 'Publicada' : 'Não publicada'}</span>
                  <div className="flex-1" />
                  {page.is_published && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <a href={`/lp/${page.slug}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => deletePage.mutate(page.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Landing Page</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input
                value={formData.title}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    title: e.target.value,
                    slug: formData.slug || e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
                  });
                }}
                placeholder="Webinar de Marketing Digital"
              />
            </div>
            <div>
              <Label>Slug (URL)</Label>
              <Input
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="webinar-marketing"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição breve da página..."
                rows={2}
              />
            </div>
            <div>
              <Label>Mensagem de agradecimento</Label>
              <Input
                value={formData.thank_you_message}
                onChange={(e) => setFormData({ ...formData, thank_you_message: e.target.value })}
              />
            </div>

            {/* Form Fields */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Campos do formulário</Label>
                <Button variant="ghost" size="sm" onClick={addField}>
                  <Plus className="h-3 w-3 mr-1" />
                  Campo
                </Button>
              </div>
              <div className="space-y-2">
                {formFields.map((field, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Input
                      placeholder="Label"
                      value={field.label}
                      onChange={(e) => updateField(idx, { label: e.target.value })}
                      className="flex-1"
                    />
                    <select
                      value={field.type}
                      onChange={(e) => updateField(idx, { type: e.target.value as FormField['type'] })}
                      className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                    >
                      <option value="text">Texto</option>
                      <option value="email">Email</option>
                      <option value="phone">Telefone</option>
                      <option value="textarea">Texto longo</option>
                    </select>
                    <Switch
                      checked={field.required}
                      onCheckedChange={(r) => updateField(idx, { required: r })}
                    />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeField(idx)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button
              onClick={() => createPage.mutate()}
              disabled={!formData.title || !formData.slug || createPage.isPending}
            >
              {createPage.isPending ? 'A criar...' : 'Criar Landing Page'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
