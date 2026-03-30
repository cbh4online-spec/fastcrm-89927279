import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, TrendingUp, TrendingDown, AlertTriangle, Sparkles } from 'lucide-react';
import { useWorkspaceMemories } from '@/hooks/useWorkspaceMemory';

export function WorkspaceLearningBrief() {
  const { data: allMemories = [] } = useWorkspaceMemories({ limit: 200 });

  const now = new Date();
  const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString();

  const recentMemories = allMemories.filter(m => m.created_at >= monthAgo);
  const highConfidence = allMemories
    .filter(m => Number(m.confidence) >= 0.7 && m.validity_status === 'valid')
    .sort((a, b) => Number(b.confidence) - Number(a.confidence))
    .slice(0, 5);
  const lowConfidence = allMemories
    .filter(m => Number(m.confidence) < 0.4 && m.validity_status === 'valid')
    .slice(0, 5);
  const obsolete = allMemories
    .filter(m => m.validity_status === 'stale' || m.validity_status === 'contradicted')
    .slice(0, 5);
  const strengthened = allMemories
    .filter(m => (m.reuse_count || 0) > 2 && m.validity_status === 'valid')
    .sort((a, b) => (b.reuse_count || 0) - (a.reuse_count || 0))
    .slice(0, 5);

  const sections = [
    {
      title: 'Aprendemos este mês',
      icon: Brain,
      items: recentMemories.slice(0, 5),
      color: 'text-primary',
      emptyMsg: 'Sem novas memórias este mês',
    },
    {
      title: 'Padrões que ganharam força',
      icon: TrendingUp,
      items: strengthened,
      color: 'text-emerald-500',
      emptyMsg: 'Sem padrões reforçados ainda',
    },
    {
      title: 'Alta confiança',
      icon: Sparkles,
      items: highConfidence,
      color: 'text-amber-500',
      emptyMsg: 'Sem memórias de alta confiança',
    },
    {
      title: 'Baixa confiança',
      icon: AlertTriangle,
      items: lowConfidence,
      color: 'text-orange-500',
      emptyMsg: 'Todas as memórias têm confiança razoável',
    },
    {
      title: 'Padrões obsoletos',
      icon: TrendingDown,
      items: obsolete,
      color: 'text-destructive',
      emptyMsg: 'Sem padrões obsoletos',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="h-5 w-5 text-primary" />
          Learning Brief
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {sections.map((section) => (
          <div key={section.title}>
            <h4 className="flex items-center gap-2 text-sm font-semibold mb-2">
              <section.icon className={`h-4 w-4 ${section.color}`} />
              {section.title}
            </h4>
            {section.items.length === 0 ? (
              <p className="text-xs text-muted-foreground ml-6">{section.emptyMsg}</p>
            ) : (
              <ul className="space-y-1 ml-6">
                {section.items.map((m) => (
                  <li key={m.id} className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {(Number(m.confidence) * 100).toFixed(0)}%
                    </Badge>
                    <span className="truncate">{m.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
