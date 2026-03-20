import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Eye, Copy, Sparkles, Mail, ShoppingCart, Users, Megaphone, PartyPopper, Heart } from 'lucide-react';

const CATEGORIES = [
  { key: 'all', label: 'Todos', icon: Mail },
  { key: 'welcome', label: 'Boas-vindas', icon: PartyPopper },
  { key: 'newsletter', label: 'Newsletter', icon: Megaphone },
  { key: 'promotional', label: 'Promocional', icon: ShoppingCart },
  { key: 'engagement', label: 'Engajamento', icon: Heart },
  { key: 'onboarding', label: 'Onboarding', icon: Users },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (html: string, name: string) => void;
}

export function TemplateLibraryDialog({ open, onOpenChange, onSelectTemplate }: Props) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['email-template-library'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_template_library')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const filtered = templates.filter(t => {
    const matchesSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'all' || t.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Biblioteca de Templates
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            return (
              <Button
                key={cat.key}
                variant={category === cat.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategory(cat.key)}
                className="gap-1.5"
              >
                <Icon className="h-3.5 w-3.5" />
                {cat.label}
              </Button>
            );
          })}
        </div>

        <div className="flex-1 overflow-hidden flex gap-4">
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">A carregar...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="h-12 w-12 mx-auto text-muted-foreground/40" />
                <p className="mt-3 text-muted-foreground">
                  {templates.length === 0
                    ? 'A biblioteca será populada em breve com templates profissionais'
                    : 'Nenhum template encontrado'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 p-1">
                {filtered.map(t => (
                  <Card
                    key={t.id}
                    className="group cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
                    onClick={() => setPreviewHtml(t.body_html)}
                  >
                    <div className="aspect-[4/3] bg-muted/30 border-b relative overflow-hidden">
                      {t.thumbnail_url ? (
                        <img src={t.thumbnail_url} alt={t.name} className="w-full h-full object-cover" />
                      ) : (
                        <iframe
                          srcDoc={t.body_html}
                          className="w-[200%] h-[200%] origin-top-left scale-50 pointer-events-none"
                          sandbox="allow-same-origin"
                          title={t.name}
                        />
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                          <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); setPreviewHtml(t.body_html); }}>
                            <Eye className="h-3.5 w-3.5 mr-1" /> Preview
                          </Button>
                          <Button size="sm" onClick={(e) => { e.stopPropagation(); onSelectTemplate(t.body_html, t.name); onOpenChange(false); }}>
                            <Copy className="h-3.5 w-3.5 mr-1" /> Usar
                          </Button>
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{t.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{t.description}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
                          {t.is_premium && <Badge className="text-[10px] bg-amber-100 text-amber-700">Pro</Badge>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>

          {previewHtml && (
            <div className="w-[380px] border rounded-lg bg-white flex flex-col shrink-0">
              <div className="p-3 border-b flex items-center justify-between bg-muted/30">
                <span className="text-sm font-medium">Preview</span>
                <Button variant="ghost" size="sm" onClick={() => setPreviewHtml(null)}>✕</Button>
              </div>
              <iframe
                srcDoc={previewHtml}
                className="flex-1 w-full border-0"
                sandbox="allow-same-origin"
                title="Preview"
              />
              <div className="p-3 border-t">
                <Button className="w-full" onClick={() => { onSelectTemplate(previewHtml, ''); onOpenChange(false); }}>
                  <Copy className="h-4 w-4 mr-2" /> Usar este template
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
