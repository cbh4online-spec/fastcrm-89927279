import { cn } from '@/lib/utils';
import { TrendingUp, Target, Clock, Flame, ThermometerSun, Snowflake, BarChart3, Users, Zap } from 'lucide-react';
import { Entity, EntityType } from '@/types/entity';

interface HighlightCard {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}

interface EntityHighlightsGridProps {
  entityType: EntityType;
  entity: Entity;
}

const TEMPERATURE_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  hot: { label: 'Quente', icon: Flame, color: 'text-red-500' },
  warm: { label: 'Morno', icon: ThermometerSun, color: 'text-amber-500' },
  cold: { label: 'Frio', icon: Snowflake, color: 'text-blue-500' },
};

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return 'agora';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
  return date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
}

export function EntityHighlightsGrid({ entityType, entity }: EntityHighlightsGridProps) {
  const e = entity as any;
  const score = entity.lead_score || entity.contact_score || entity.company_score || 0;
  const temp = entity.ai_temperature as string | undefined;
  const tempConfig = temp ? TEMPERATURE_LABELS[temp] : null;

  const cards: HighlightCard[] = [];

  // Score
  cards.push({
    label: 'Score',
    value: `${score}/100`,
    icon: BarChart3,
    color: score >= 70 ? 'text-emerald-600' : score >= 40 ? 'text-amber-600' : 'text-blue-600',
  });

  // Temperature
  if (tempConfig) {
    cards.push({
      label: 'Temperatura',
      value: tempConfig.label,
      icon: tempConfig.icon,
      color: tempConfig.color,
    });
  }

  // Conversion probability
  if (entity.conversion_probability) {
    cards.push({
      label: 'Conversão',
      value: `${entity.conversion_probability}%`,
      icon: Target,
      color: 'text-primary',
    });
  }

  // Estimated value
  if (entity.estimated_value) {
    cards.push({
      label: 'Valor Est.',
      value: `€${entity.estimated_value.toLocaleString()}`,
      icon: TrendingUp,
      color: 'text-emerald-600',
    });
  }

  // Last update
  cards.push({
    label: 'Última Atividade',
    value: getTimeAgo(new Date(entity.updated_at)),
    icon: Clock,
    color: 'text-muted-foreground',
  });

  // Entity-specific
  if (entityType === 'company' && e.employee_count) {
    cards.push({
      label: 'Funcionários',
      value: e.employee_count,
      icon: Users,
      color: 'text-blue-600',
    });
  }

  if (entity.ai_next_action) {
    cards.push({
      label: 'Próxima Ação',
      value: entity.ai_next_action.length > 20 ? entity.ai_next_action.slice(0, 20) + '…' : entity.ai_next_action,
      icon: Zap,
      color: 'text-primary',
    });
  }

  if (cards.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <div className="h-0.5 w-4 bg-primary rounded-full" />
        Destaques
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="rounded-lg border bg-card p-3 space-y-1"
            >
              <div className="flex items-center gap-1.5">
                <Icon className={cn('h-3.5 w-3.5', card.color)} />
                <span className="text-xs text-muted-foreground">{card.label}</span>
              </div>
              <p className={cn('text-sm font-semibold', card.color)}>{card.value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
