import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Search, FileText, Target, TrendingUp, Zap, BarChart3 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Benefit {
  icon?: LucideIcon;
  title: string;
  description: string;
}

interface BenefitsListProps {
  title?: string;
  benefits?: Benefit[];
  variant?: 'cards' | 'list' | 'inline';
  columns?: 2 | 3 | 4;
  className?: string;
}

const defaultBenefits: Benefit[] = [
  {
    icon: Search,
    title: 'Otimização SEO',
    description: 'Descubra keywords de baixa concorrência para posicionar o seu conteúdo mais rapidamente.',
  },
  {
    icon: FileText,
    title: 'Criação de Conteúdo',
    description: 'Encontre tópicos que o seu público procura e crie conteúdo relevante.',
  },
  {
    icon: Target,
    title: 'Campanhas de Ads',
    description: 'Identifique keywords comerciais de alta intenção para as suas campanhas pagas.',
  },
];

export function BenefitsList({
  title = 'Como estas keyword ideas ajudam',
  benefits = defaultBenefits,
  variant = 'cards',
  columns = 3,
  className = '',
}: BenefitsListProps) {
  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4',
  };

  if (variant === 'list') {
    return (
      <section className={className}>
        {title && (
          <h2 className="text-2xl font-bold mb-6">{title}</h2>
        )}
        <ul className="space-y-4">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon || CheckCircle;
            return (
              <li key={index} className="flex gap-4">
                <div className="flex-shrink-0 mt-1">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold">{benefit.title}</h3>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    );
  }

  if (variant === 'inline') {
    return (
      <section className={className}>
        {title && (
          <h2 className="text-2xl font-bold mb-6 text-center">{title}</h2>
        )}
        <div className="flex flex-wrap justify-center gap-6">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon || CheckCircle;
            return (
              <div key={index} className="flex items-center gap-2 text-muted-foreground">
                <Icon className="h-5 w-5 text-primary" />
                <span>{benefit.title}</span>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  // Default: cards variant
  return (
    <section className={className}>
      {title && (
        <h2 className="text-2xl font-bold mb-6 text-center">{title}</h2>
      )}
      <div className={`grid gap-6 ${gridCols[columns]}`}>
        {benefits.map((benefit, index) => {
          const Icon = benefit.icon || CheckCircle;
          return (
            <Card key={index} className="relative overflow-hidden">
              <CardHeader className="pb-2">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{benefit.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{benefit.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

// Pre-built benefit sets for different page types
export const keywordPageBenefits: Benefit[] = [
  {
    icon: Search,
    title: 'Otimização SEO',
    description: 'Descubra keywords de baixa concorrência para posicionar o seu conteúdo mais rapidamente.',
  },
  {
    icon: FileText,
    title: 'Criação de Conteúdo',
    description: 'Encontre tópicos que o seu público procura e crie conteúdo relevante.',
  },
  {
    icon: Target,
    title: 'Campanhas de Ads',
    description: 'Identifique keywords comerciais de alta intenção para as suas campanhas pagas.',
  },
];

export const toolPageBenefits: Benefit[] = [
  {
    icon: TrendingUp,
    title: 'Keywords Long-tail',
    description: 'Gere variações específicas e menos competitivas das suas keywords principais.',
  },
  {
    icon: Zap,
    title: 'Perguntas do Público',
    description: 'Descubra as perguntas reais que o seu público faz sobre o tema.',
  },
  {
    icon: BarChart3,
    title: 'Intenção de Pesquisa',
    description: 'Identifique a intenção por trás de cada keyword para criar conteúdo adequado.',
  },
  {
    icon: Target,
    title: 'Exportação Fácil',
    description: 'Exporte as suas keywords em CSV para usar noutras ferramentas.',
  },
];

export const categoryPageBenefits: Benefit[] = [
  {
    icon: Target,
    title: 'Alta Intenção Comercial',
    description: 'Keywords específicas do nicho com maior probabilidade de conversão.',
  },
  {
    icon: TrendingUp,
    title: 'Baixa Concorrência',
    description: 'Oportunidades menos exploradas no seu mercado específico.',
  },
  {
    icon: BarChart3,
    title: 'Dados de Volume',
    description: 'Volume de pesquisa mensal para priorizar o seu esforço.',
  },
];
