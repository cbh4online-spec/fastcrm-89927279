import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lock, TrendingUp, HelpCircle, ShoppingCart, ArrowRight } from 'lucide-react';
import { useTracking } from '../../../hooks/useTracking';

interface SampleKeyword {
  keyword: string;
  type: 'long-tail' | 'question' | 'commercial' | 'informational';
  volume?: number;
  difficulty?: 'low' | 'medium' | 'high';
}

interface SampleKeywordsPreviewProps {
  seedKeyword: string;
  keywords?: SampleKeyword[];
  visibleCount?: number;
  totalCount?: number;
  pageType: string;
  entitySlug?: string;
  className?: string;
}

const typeConfig = {
  'long-tail': { label: 'Long-tail', icon: TrendingUp, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  'question': { label: 'Pergunta', icon: HelpCircle, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  'commercial': { label: 'Comercial', icon: ShoppingCart, color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  'informational': { label: 'Informativo', icon: TrendingUp, color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
};

const difficultyColors = {
  low: 'text-green-600',
  medium: 'text-yellow-600',
  high: 'text-red-600',
};

// Generate sample keywords based on seed
function generateSampleKeywords(seed: string): SampleKeyword[] {
  const templates = [
    { prefix: 'como usar', type: 'question' as const },
    { prefix: 'melhor', type: 'commercial' as const },
    { prefix: '', suffix: 'grátis', type: 'commercial' as const },
    { prefix: 'o que é', type: 'informational' as const },
    { prefix: '', suffix: 'para iniciantes', type: 'long-tail' as const },
    { prefix: '', suffix: 'ferramentas', type: 'commercial' as const },
    { prefix: '', suffix: 'exemplos', type: 'informational' as const },
    { prefix: '', suffix: 'vs alternativas', type: 'commercial' as const },
    { prefix: 'guia completo de', type: 'long-tail' as const },
    { prefix: '', suffix: 'dicas', type: 'informational' as const },
  ];

  return templates.map((t, i) => ({
    keyword: `${t.prefix ? t.prefix + ' ' : ''}${seed}${t.suffix ? ' ' + t.suffix : ''}`,
    type: t.type,
    volume: Math.floor(Math.random() * 10000) + 100,
    difficulty: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as 'low' | 'medium' | 'high',
  }));
}

export function SampleKeywordsPreview({
  seedKeyword,
  keywords,
  visibleCount = 5,
  totalCount = 50,
  pageType,
  entitySlug,
  className = '',
}: SampleKeywordsPreviewProps) {
  const { trackCTAClick } = useTracking();
  const [sampleKeywords, setSampleKeywords] = useState<SampleKeyword[]>([]);

  useEffect(() => {
    if (keywords && keywords.length > 0) {
      setSampleKeywords(keywords);
    } else if (seedKeyword) {
      setSampleKeywords(generateSampleKeywords(seedKeyword));
    }
  }, [seedKeyword, keywords]);

  const visibleKeywords = sampleKeywords.slice(0, visibleCount);
  const hiddenCount = totalCount - visibleCount;

  const handleUnlockClick = () => {
    trackCTAClick({
      cta_type: 'unlock_keywords',
      placement: 'sample_preview',
      page_type: pageType,
      entity_slug: entitySlug,
    });
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">
            Keyword Ideas para "{seedKeyword}"
          </CardTitle>
          <Badge variant="secondary">
            A mostrar {visibleCount} de {totalCount}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Visible Keywords */}
        <div className="space-y-2">
          {visibleKeywords.map((kw, index) => {
            const config = typeConfig[kw.type];
            const Icon = config.icon;
            
            return (
              <div 
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={config.color}>
                    <Icon className="h-3 w-3 mr-1" />
                    {config.label}
                  </Badge>
                  <span className="font-medium">{kw.keyword}</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {kw.volume && (
                    <span>{kw.volume.toLocaleString()} /mês</span>
                  )}
                  {kw.difficulty && (
                    <span className={difficultyColors[kw.difficulty]}>
                      {kw.difficulty === 'low' ? 'Fácil' : kw.difficulty === 'medium' ? 'Médio' : 'Difícil'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Blurred/Locked Keywords */}
        <div className="relative">
          <div className="space-y-2 blur-sm pointer-events-none select-none">
            {[1, 2, 3].map((i) => (
              <div 
                key={i}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="bg-gray-100">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Long-tail
                  </Badge>
                  <span className="font-medium">keyword exemplo bloqueada {i}</span>
                </div>
                <span className="text-sm text-muted-foreground">1,234 /mês</span>
              </div>
            ))}
          </div>

          {/* Unlock Overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-[2px] rounded-lg">
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Lock className="h-5 w-5" />
                <span className="font-medium">+{hiddenCount} keywords bloqueadas</span>
              </div>
              <Link to="/auth" onClick={handleUnlockClick}>
                <Button className="gap-2">
                  Desbloquear Lista Completa
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <p className="text-xs text-muted-foreground">
                Conta gratuita · Sem cartão de crédito
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
