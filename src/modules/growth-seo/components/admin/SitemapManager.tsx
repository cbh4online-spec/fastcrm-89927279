import { useState } from 'react';
import { getPublicBaseUrl } from "@/utils/getPublicDomain";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, ExternalLink, FileText, Globe, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SitemapStats {
  type: string;
  count: number;
  lastUpdated: string;
}

export function SitemapManager() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [stats, setStats] = useState<SitemapStats[]>([]);
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);

  const entityTypes = [
    { type: 'keyword', label: 'Keywords', color: 'bg-blue-500' },
    { type: 'template', label: 'Templates', color: 'bg-green-500' },
    { type: 'tool', label: 'Tools', color: 'bg-purple-500' },
    { type: 'category', label: 'Categories', color: 'bg-orange-500' },
    { type: 'blog', label: 'Blog Posts', color: 'bg-pink-500' },
    { type: 'guide', label: 'Guides', color: 'bg-cyan-500' },
    { type: 'glossary', label: 'Glossary', color: 'bg-yellow-500' },
  ];

  const fetchStats = async () => {
    try {
      const statsPromises = entityTypes.map(async ({ type }) => {
        const { count, data } = await supabase
          .from('seo_entities')
          .select('updated_at', { count: 'exact', head: false })
          .eq('status', 'published')
          .eq('entity_type', type)
          .order('updated_at', { ascending: false })
          .limit(1);

        return {
          type,
          count: count || 0,
          lastUpdated: data?.[0]?.updated_at || '-',
        };
      });

      const results = await Promise.all(statsPromises);
      setStats(results);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleGenerateSitemap = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-sitemap', {
        body: { type: 'index' },
      });

      if (error) throw error;

      setLastGenerated(new Date().toISOString());
      await fetchStats();
      toast.success('Sitemap gerado com sucesso!');
    } catch (error) {
      console.error('Sitemap generation failed:', error);
      toast.error('Erro ao gerar sitemap');
    } finally {
      setIsGenerating(false);
    }
  };

  const openSitemap = (type?: string) => {
    const baseUrl = getPublicBaseUrl();
    const url = type 
      ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-sitemap?type=${type}&baseUrl=${baseUrl}`
      : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-sitemap?type=index&baseUrl=${baseUrl}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Gestão de Sitemap
              </CardTitle>
              <CardDescription>
                Gera e gere os sitemaps XML para SEO
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => fetchStats()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar Stats
              </Button>
              <Button onClick={handleGenerateSitemap} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    A gerar...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Gerar Sitemap
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {lastGenerated && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-950 rounded-lg flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-700 dark:text-green-300">
                Último sitemap gerado: {new Date(lastGenerated).toLocaleString('pt-PT')}
              </span>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {entityTypes.map(({ type, label, color }) => {
              const stat = stats.find(s => s.type === type);
              return (
                <Card key={type} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => openSitemap(type)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${color}`} />
                        <span className="font-medium">{label}</span>
                      </div>
                      <Badge variant="secondary">
                        {stat?.count || 0} páginas
                      </Badge>
                    </div>
                    {stat?.lastUpdated && stat.lastUpdated !== '-' && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Última atualização: {new Date(stat.lastUpdated).toLocaleDateString('pt-PT')}
                      </p>
                    )}
                    <ExternalLink className="w-3 h-3 text-muted-foreground mt-2" />
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2">URLs do Sitemap</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <code className="bg-background px-2 py-1 rounded">/sitemap.xml</code>
                <Button variant="ghost" size="sm" onClick={() => openSitemap()}>
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <code className="bg-background px-2 py-1 rounded">/robots.txt</code>
                <Button variant="ghost" size="sm" onClick={() => {
                  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/robots-txt`;
                  window.open(url, '_blank');
                }}>
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
