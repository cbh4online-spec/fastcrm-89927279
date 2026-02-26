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
  GraduationCap,
  Link2,
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
    description: 'O histórico de interações e notas aparecerá aqui.',
    suggestion: 'Cada ação fica registada automaticamente.',
  },
  communication: {
    icon: MessageSquare,
    title: 'Sem comunicações',
    description: 'Nenhuma mensagem, email ou agendamento.',
    suggestion: 'Envia a primeira mensagem ou agenda uma reunião.',
    actionLabel: 'Nova Mensagem',
  },
  activity: {
    icon: CheckSquare,
    title: 'Sem atividade',
    description: 'Nenhuma tarefa ou automação configurada.',
    suggestion: 'Cria uma tarefa ou automação para acompanhamento.',
    actionLabel: 'Criar Tarefa',
  },
  business: {
    icon: Target,
    title: 'Sem negócios',
    description: 'Nenhuma oportunidade, proposta ou crédito associado.',
    suggestion: 'Cria uma oportunidade quando identificares potencial.',
    actionLabel: 'Criar Oportunidade',
  },
  financial: {
    icon: CreditCard,
    title: 'Sem dados financeiros',
    description: 'Nenhum pagamento, encomenda ou histórico comercial.',
    suggestion: 'Os dados aparecerão quando houver faturação.',
  },
  data: {
    icon: Layers,
    title: 'Dados do perfil',
    description: 'Preenche os dados para completar o perfil.',
    suggestion: 'Quanto mais informação, melhores os insights da IA.',
  },
  contacts: {
    icon: Users,
    title: 'Sem contactos associados',
    description: 'Nenhum contacto ligado a esta empresa.',
    suggestion: 'Associa contactos existentes ou cria novos.',
    actionLabel: 'Associar Contacto',
  },
  'student-journey': {
    icon: GraduationCap,
    title: 'Sem perfil Student Journey',
    description: 'Este contacto não tem perfil no Student Journey.',
    suggestion: 'Cria um perfil para acompanhar a jornada educacional.',
    actionLabel: 'Criar Perfil',
  },
  // Legacy sections (kept for backward compatibility)
  notes: {
    icon: StickyNote,
    title: 'Sem notas',
    description: 'Ainda não foram adicionadas notas.',
    suggestion: 'Adiciona a primeira nota.',
    actionLabel: 'Adicionar Nota',
  },
  messages: {
    icon: MessageSquare,
    title: 'Sem mensagens',
    description: 'Nenhuma conversa iniciada.',
    suggestion: 'Envia a primeira mensagem.',
    actionLabel: 'Nova Mensagem',
  },
  tasks: {
    icon: CheckSquare,
    title: 'Sem tarefas',
    description: 'Nenhuma tarefa atribuída.',
    suggestion: 'Cria uma tarefa.',
    actionLabel: 'Criar Tarefa',
  },
  opportunities: {
    icon: Target,
    title: 'Sem oportunidades',
    description: 'Nenhuma oportunidade associada.',
    suggestion: 'Cria uma oportunidade.',
    actionLabel: 'Criar Oportunidade',
  },
  proposals: {
    icon: FileText,
    title: 'Sem propostas',
    description: 'Nenhuma proposta enviada.',
    suggestion: 'Envia uma proposta.',
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
    suggestion: 'Quanto mais informação, melhores os insights.',
  },
  'custom-fields': {
    icon: Layers,
    title: 'Sem campos personalizados',
    description: 'Não existem campos configurados.',
    suggestion: 'Cria campos nas definições.',
    actionLabel: 'Ir para Definições',
  },
  history: {
    icon: History,
    title: 'Sem histórico',
    description: 'O histórico aparecerá aqui.',
    suggestion: 'Cada modificação fica registada.',
  },
  automations: {
    icon: Zap,
    title: 'Sem automações',
    description: 'Nenhuma automação configurada.',
    suggestion: 'Cria automações para poupar tempo.',
    actionLabel: 'Criar Automação',
  },
  credit: {
    icon: CreditCard,
    title: 'Sem propostas de crédito',
    description: 'Nenhuma proposta de crédito.',
    suggestion: 'Cria uma proposta de crédito.',
    actionLabel: 'Criar Proposta de Crédito',
  },
  orders: {
    icon: ShoppingCart,
    title: 'Sem encomendas B2B',
    description: 'Nenhuma encomenda B2B.',
    suggestion: 'As encomendas aparecerão com clientes B2B.',
  },
  scheduling: {
    icon: Activity,
    title: 'Sem agendamentos',
    description: 'Nenhum agendamento.',
    suggestion: 'Cria uma reunião para acompanhamento.',
    actionLabel: 'Agendar Reunião',
  },
  relationships: {
    icon: Link2,
    title: 'Sem relações',
    description: 'Nenhuma relação criada.',
    suggestion: 'Adicione relações para conectar registos.',
  },
  audit: {
    icon: History,
    title: 'Sem alterações registadas',
    description: 'O registo aparecerá quando campos forem editados.',
    suggestion: 'Edite campos para ver o histórico.',
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