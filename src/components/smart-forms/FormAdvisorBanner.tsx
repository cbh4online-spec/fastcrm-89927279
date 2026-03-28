import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingDown, AlertTriangle, Rocket } from 'lucide-react';
import { SmartForm } from '@/types/smartForm';

interface FormAdvisorBannerProps {
  forms: SmartForm[];
}

export function FormAdvisorBanner({ forms }: FormAdvisorBannerProps) {
  const advice = useMemo(() => {
    if (!forms || forms.length === 0) {
      return {
        icon: Rocket,
        color: 'text-primary',
        bgColor: 'bg-primary/5 border-primary/20',
        message: 'Cria o teu primeiro formulário inteligente. A IA gera campos, scoring e automações em segundos.',
      };
    }

    const activeForms = forms.filter(f => f.is_active && !f.is_internal);
    const lowConversion = activeForms.find(f => f.submission_count > 10 && f.conversion_rate < 10);
    
    if (lowConversion) {
      const fieldCount = lowConversion.schema?.fields?.length || 0;
      return {
        icon: TrendingDown,
        color: 'text-amber-500',
        bgColor: 'bg-amber-500/5 border-amber-500/20',
        message: `O formulário "${lowConversion.name}" tem ${lowConversion.submission_count} submissões mas apenas ${lowConversion.conversion_rate.toFixed(1)}% de conversão${fieldCount > 6 ? ` — reduzir de ${fieldCount} para ${Math.max(4, fieldCount - 3)} campos pode aumentar a conversão em ~25%` : '. Considera simplificar os campos ou melhorar o CTA.'}`,
      };
    }

    const noSubmissions = activeForms.find(f => f.submission_count === 0);
    if (noSubmissions) {
      return {
        icon: AlertTriangle,
        color: 'text-orange-500',
        bgColor: 'bg-orange-500/5 border-orange-500/20',
        message: `O formulário "${noSubmissions.name}" ainda não tem submissões. Incorpora-o no teu site ou partilha o link para começar a captar leads.`,
      };
    }

    const bestForm = activeForms.reduce((best, f) => 
      f.conversion_rate > (best?.conversion_rate || 0) ? f : best
    , activeForms[0]);

    if (bestForm && bestForm.conversion_rate > 0) {
      return {
        icon: Sparkles,
        color: 'text-green-500',
        bgColor: 'bg-green-500/5 border-green-500/20',
        message: `O formulário "${bestForm.name}" lidera com ${bestForm.conversion_rate.toFixed(1)}% de conversão. Usa-o como modelo para os próximos formulários.`,
      };
    }

    return null;
  }, [forms]);

  if (!advice) return null;

  const Icon = advice.icon;

  return (
    <Card className={`${advice.bgColor}`}>
      <CardContent className="p-4 flex items-start gap-3">
        <Icon className={`h-5 w-5 ${advice.color} shrink-0 mt-0.5`} />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className="text-xs gap-1">
              <Sparkles className="h-3 w-3" />
              IA Advisor
            </Badge>
          </div>
          <p className="text-sm">{advice.message}</p>
        </div>
      </CardContent>
    </Card>
  );
}
