import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  MessageSquare,
  FileText,
  CheckSquare,
  Target,
  CreditCard,
  StickyNote,
  Activity,
  Sparkles,
  Layers,
  History,
  Users,
  Zap,
  Plus,
  ShoppingCart,
} from 'lucide-react';
import { MenuSection } from '@/types/entity';

interface EntityEmptyStateProps {
  section: MenuSection;
  entityName: string;
  onAction?: () => void;
  actionLabel?: string;
}

const SECTION_CONFIG: Record<MenuSection, {
  icon: React.ElementType;
  title: string;
  description: string;
  suggestion: string;
  actionLabel?: string;
}> = {
  overview: {
    icon: Activity,
    title: 'Visão geral',
    description: 'O resumo aparecerá quando houver atividade.',
    suggestion: 'Começa por adicionar uma nota ou enviar uma mensagem.',
  },
  insights: {
    icon: Sparkles,
    title: 'Sem insights disponíveis',
    description: 'A IA precisa de mais dados para gerar insights.',
    suggestion: 'Adiciona informações ou interage para a IA aprender.',
    actionLabel: 'Gerar Insights',
  },
  timeline: {
    icon: Activity,
    title: 'Sem atividade registada',
    description: 'O histórico de interações aparecerá aqui.',
    suggestion: 'Cada ação fica registada automaticamente.',
  },
  notes: {
    icon: StickyNote,
    title: 'Sem notas',
    description: 'Ainda não foram adicionadas notas.',
    suggestion: 'Adiciona a primeira nota para documentar informações importantes.',
    actionLabel: 'Adicionar Nota',
  },
  messages: {
    icon: MessageSquare,
    title: 'Sem mensagens',
    description: 'Nenhuma conversa iniciada.',
    suggestion: 'Envia a primeira mensagem com ajuda da IA.',
    actionLabel: 'Nova Mensagem',
  },
  tasks: {
    icon: CheckSquare,
    title: 'Sem tarefas',
    description: 'Nenhuma tarefa atribuída.',
    suggestion: 'Cria uma tarefa para acompanhamento.',
    actionLabel: 'Criar Tarefa',
  },
  opportunities: {
    icon: Target,
    title: 'Sem oportunidades',
    description: 'Nenhuma oportunidade associada.',
    suggestion: 'Cria uma oportunidade quando identificares potencial de negócio.',
    actionLabel: 'Criar Oportunidade',
  },
  proposals: {
    icon: FileText,
    title: 'Sem propostas',
    description: 'Nenhuma proposta enviada.',
    suggestion: 'Envia uma proposta personalizada.',
    actionLabel: 'Criar Proposta',
  },
  payments: {
    icon: CreditCard,
    title: 'Sem pagamentos',
    description: 'Nenhum pagamento registado.',
    suggestion: 'Os pagamentos aparecerão quando houver faturação.',
  },
  details: {
    icon: Layers,
    title: 'Informações básicas',
    description: 'Preenche os dados para completar o perfil.',
    suggestion: 'Quanto mais informação, melhores os insights da IA.',
  },
  'custom-fields': {
    icon: Layers,
    title: 'Sem campos personalizados',
    description: 'Não existem campos personalizados configurados.',
    suggestion: 'Cria campos personalizados nas definições.',
    actionLabel: 'Ir para Definições',
  },
  history: {
    icon: History,
    title: 'Sem histórico',
    description: 'O histórico de alterações aparecerá aqui.',
    suggestion: 'Cada modificação fica registada automaticamente.',
  },
  contacts: {
    icon: Users,
    title: 'Sem contactos associados',
    description: 'Nenhum contacto ligado a esta empresa.',
    suggestion: 'Associa contactos existentes ou cria novos.',
    actionLabel: 'Associar Contacto',
  },
  automations: {
    icon: Zap,
    title: 'Sem automações',
    description: 'Nenhuma automação configurada para esta entidade.',
    suggestion: 'Cria automações para poupar tempo e aumentar produtividade.',
    actionLabel: 'Criar Automação',
  },
  credit: {
    icon: CreditCard,
    title: 'Sem propostas de crédito',
    description: 'Nenhuma proposta de crédito associada.',
    suggestion: 'Cria uma proposta quando identificares necessidade de financiamento.',
    actionLabel: 'Criar Proposta de Crédito',
  },
  orders: {
    icon: ShoppingCart,
    title: 'Sem encomendas B2B',
    description: 'Nenhuma encomenda B2B associada.',
    suggestion: 'As encomendas aparecerão quando houver clientes B2B com encomendas.',
  },
};

export function EntityEmptyState({
  section,
  entityName,
  onAction,
  actionLabel: customActionLabel,
}: EntityEmptyStateProps) {
  const config = SECTION_CONFIG[section];
  const Icon = config.icon;
  const finalActionLabel = customActionLabel || config.actionLabel;

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
        
        <h3 className="font-medium text-lg mb-1">{config.title}</h3>
        <p className="text-muted-foreground text-sm max-w-sm mb-2">
          {config.description}
        </p>
        <p className="text-muted-foreground/70 text-xs max-w-sm">
          {config.suggestion}
        </p>
        
        {finalActionLabel && onAction && (
          <Button 
            variant="outline" 
            className="mt-4 gap-2"
            onClick={onAction}
          >
            <Plus className="h-4 w-4" />
            {finalActionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}