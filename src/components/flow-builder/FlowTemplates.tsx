import { ShoppingBag, Users, HelpCircle, Sparkles } from 'lucide-react';
import { FlowStepType, VariableType } from '@/types/conversational-flows';

export interface FlowTemplateVariable {
  name: string;
  displayName: string;
  variableType: VariableType;
  isRequired: boolean;
  mapToField?: string;
  validationPattern?: string;
  validationMessage?: string;
  choices?: string[];
}

export interface FlowTemplateStep {
  id: string;
  stepType: FlowStepType;
  name: string;
  messageContent?: string;
  quickReplies?: string[];
  variableToCollect?: string; // Nome da variável a recolher
  conditionField?: string;
  conditionOperator?: string;
  conditionValue?: string;
  goalName?: string;
  conversionValue?: number;
  actionType?: string;
  actionConfig?: Record<string, unknown>;
  connectsTo?: string; // ID do passo seguinte
  conditionTrueConnectsTo?: string;
  conditionFalseConnectsTo?: string;
  isEntryPoint?: boolean;
  positionX: number;
  positionY: number;
}

export interface FlowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultGoalType: string;
  defaultChannels: string[];
  variables: FlowTemplateVariable[];
  steps: FlowTemplateStep[];
}

// Template: Funil Universal Pharliss
export const PHARLISS_UNIVERSAL_TEMPLATE: FlowTemplate = {
  id: 'pharliss-universal-funnel',
  name: 'Funil Universal - Produtos e Equipamentos',
  description: 'Fluxo de vendas para recolha de informação e recomendação de produtos Pharliss',
  category: 'Vendas',
  icon: ShoppingBag,
  defaultGoalType: 'lead_capture',
  defaultChannels: ['whatsapp', 'instagram', 'widget'],
  
  variables: [
    {
      name: 'nome',
      displayName: 'Nome',
      variableType: 'text',
      isRequired: true,
      mapToField: 'lead.name'
    },
    {
      name: 'contacto',
      displayName: 'Contacto',
      variableType: 'phone',
      isRequired: true,
      mapToField: 'lead.phone'
    },
    {
      name: 'email',
      displayName: 'Email',
      variableType: 'email',
      isRequired: true,
      mapToField: 'lead.email'
    },
    {
      name: 'objetivo',
      displayName: 'Objetivo Principal',
      variableType: 'choice',
      isRequired: true,
      mapToField: 'lead.specialty',
      choices: ['Melhorar couro cabeludo', 'Melhorar pele ou corpo', 'Fortalecer cabelo']
    },
    {
      name: 'estado_atual',
      displayName: 'Estado Atual',
      variableType: 'text',
      isRequired: true
    },
    {
      name: 'tempo_problema',
      displayName: 'Tempo do Problema',
      variableType: 'text',
      isRequired: true
    },
    {
      name: 'intensidade',
      displayName: 'Intensidade (1-10)',
      variableType: 'number',
      isRequired: true
    },
    {
      name: 'tem_profissional',
      displayName: 'Tem Profissional Próximo',
      variableType: 'boolean',
      isRequired: false
    }
  ],

  steps: [
    // 1. Saudação
    {
      id: 'step-1-saudacao',
      stepType: 'message',
      name: 'Saudação',
      messageContent: 'Olá! 👋 Que bom receber o seu contacto. Sou o assistente especializado da Pharliss e estou aqui para ajudar a encontrar a melhor opção dentro da nossa linha profissional.',
      isEntryPoint: true,
      connectsTo: 'step-2-nome',
      positionX: 100,
      positionY: 100
    },
    // 2. Recolha Nome
    {
      id: 'step-2-nome',
      stepType: 'question',
      name: 'Recolha Nome',
      messageContent: 'Para que eu possa enviar recomendações personalizadas e instruções completas, poderia indicar o seu nome?',
      variableToCollect: 'nome',
      connectsTo: 'step-3-contacto',
      positionX: 100,
      positionY: 220
    },
    // 3. Recolha Contacto
    {
      id: 'step-3-contacto',
      stepType: 'question',
      name: 'Recolha Contacto',
      messageContent: 'Qual o seu número de contacto?',
      variableToCollect: 'contacto',
      connectsTo: 'step-4-email',
      positionX: 100,
      positionY: 340
    },
    // 4. Recolha Email
    {
      id: 'step-4-email',
      stepType: 'question',
      name: 'Recolha Email',
      messageContent: 'E o seu email para enviarmos ofertas exclusivas?',
      variableToCollect: 'email',
      connectsTo: 'step-5-agradecimento',
      positionX: 100,
      positionY: 460
    },
    // 5. Agradecimento
    {
      id: 'step-5-agradecimento',
      stepType: 'message',
      name: 'Agradecimento',
      messageContent: 'Obrigado, {nome}! 🙏',
      connectsTo: 'step-6-objetivo',
      positionX: 100,
      positionY: 580
    },
    // 6. Objetivo Principal
    {
      id: 'step-6-objetivo',
      stepType: 'question',
      name: 'Objetivo Principal',
      messageContent: 'Para entender exatamente o que procura, poderia dizer qual é o seu objetivo principal?',
      variableToCollect: 'objetivo',
      quickReplies: ['Melhorar couro cabeludo', 'Melhorar pele ou corpo', 'Fortalecer cabelo'],
      connectsTo: 'step-7-estado',
      positionX: 100,
      positionY: 700
    },
    // 7. Estado Atual
    {
      id: 'step-7-estado',
      stepType: 'question',
      name: 'Estado Atual',
      messageContent: 'Como está hoje o seu {objetivo}?',
      variableToCollect: 'estado_atual',
      connectsTo: 'step-8-tempo',
      positionX: 100,
      positionY: 820
    },
    // 8. Tempo do Problema
    {
      id: 'step-8-tempo',
      stepType: 'question',
      name: 'Tempo do Problema',
      messageContent: 'Isto acontece há quanto tempo?',
      variableToCollect: 'tempo_problema',
      connectsTo: 'step-9-intensidade',
      positionX: 100,
      positionY: 940
    },
    // 9. Intensidade
    {
      id: 'step-9-intensidade',
      stepType: 'question',
      name: 'Intensidade',
      messageContent: 'Num nível de 1 a 10, como classificaria a intensidade da situação?',
      variableToCollect: 'intensidade',
      connectsTo: 'step-10-analise',
      positionX: 100,
      positionY: 1060
    },
    // 10. Análise e Recomendação
    {
      id: 'step-10-analise',
      stepType: 'message',
      name: 'Análise e Recomendação',
      messageContent: 'Perfeito, obrigado por partilhar! 💡 Com base no que descreveu, posso recomendar uma solução profissional adequada à sua situação.\n\nEsta solução foi pensada para:\n• Melhorar gradualmente o problema\n• Atuar na causa e não só no efeito\n• Ser segura e de qualidade profissional\n• Ter resultados consistentes quando usada corretamente',
      connectsTo: 'step-11-profissional',
      positionX: 100,
      positionY: 1180
    },
    // 11. Pergunta Profissional
    {
      id: 'step-11-profissional',
      stepType: 'question',
      name: 'Tem Profissional',
      messageContent: 'Tem um profissional de beleza/saúde próximo da sua área de residência que possa indicar?',
      variableToCollect: 'tem_profissional',
      quickReplies: ['Sim', 'Não'],
      connectsTo: 'step-12-condicao',
      positionX: 100,
      positionY: 1300
    },
    // 12. Condição
    {
      id: 'step-12-condicao',
      stepType: 'condition',
      name: 'Verifica Profissional',
      conditionField: 'tem_profissional',
      conditionOperator: 'equals',
      conditionValue: 'Sim',
      conditionTrueConnectsTo: 'step-13-remete-prof',
      conditionFalseConnectsTo: 'step-14-handoff',
      positionX: 100,
      positionY: 1420
    },
    // 13. Remete ao Profissional
    {
      id: 'step-13-remete-prof',
      stepType: 'message',
      name: 'Remete ao Profissional',
      messageContent: 'Excelente! Recomendo que visite o profissional para uma avaliação personalizada. Ele poderá indicar o produto ideal da nossa linha para o seu caso específico.\n\nPosso ajudar com mais alguma coisa?',
      connectsTo: 'step-15-goal',
      positionX: 300,
      positionY: 1540
    },
    // 14. Handoff Humano
    {
      id: 'step-14-handoff',
      stepType: 'handoff',
      name: 'Transferir para Especialista',
      messageContent: 'Como não tem um profissional próximo, vou transferir esta conversa para um especialista da nossa equipa que poderá ajudá-lo(a) diretamente com recomendações e opções de entrega.\n\nUm momento, por favor...',
      actionType: 'transfer_to_human',
      actionConfig: { reason: 'Sem profissional próximo - precisa de apoio direto' },
      positionX: -100,
      positionY: 1540
    },
    // 15. Goal - Lead Qualificado
    {
      id: 'step-15-goal',
      stepType: 'goal',
      name: 'Lead Qualificado',
      goalName: 'Lead Qualificado com Sucesso',
      conversionValue: 1,
      positionX: 300,
      positionY: 1660
    }
  ]
};

// Lista de todos os templates disponíveis
export const FLOW_TEMPLATES: FlowTemplate[] = [
  PHARLISS_UNIVERSAL_TEMPLATE
];

// Componente para mostrar card de template
interface TemplateCardProps {
  template: FlowTemplate;
  onSelect: (template: FlowTemplate) => void;
  isSelected?: boolean;
}

export function TemplateCard({ template, onSelect, isSelected }: TemplateCardProps) {
  const Icon = template.icon;
  
  return (
    <button
      type="button"
      onClick={() => onSelect(template)}
      className={`
        w-full text-left p-4 rounded-lg border-2 transition-all
        ${isSelected 
          ? 'border-primary bg-primary/5' 
          : 'border-border hover:border-primary/50 hover:bg-muted/50'
        }
      `}
    >
      <div className="flex items-start gap-3">
        <div className={`
          p-2 rounded-lg
          ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
        `}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm">{template.name}</h4>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {template.description}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs bg-muted px-2 py-0.5 rounded">
              {template.steps.length} passos
            </span>
            <span className="text-xs bg-muted px-2 py-0.5 rounded">
              {template.variables.length} variáveis
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
