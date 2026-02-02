
# Plano: Implementar Assistente IA para Propostas Comerciais

## Visão Geral

Criar um sistema de assistência IA completo para propostas comerciais que ajude em:
- **Avaliação e Probabilidades**: Análise de viabilidade da proposta com score de sucesso
- **Construção do Âmbito**: Sugestões de objectivos, entregáveis e exclusões
- **Cronograma**: Geração de fases e marcos baseados no tipo de projecto
- **Condições e Termos**: Recomendações de pagamento e validade
- **Referências**: Sugestões de casos de sucesso relevantes

## Arquitectura da Solução

```text
┌─────────────────────────────────────────────────────────────────────┐
│                      INTERFACE DO UTILIZADOR                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Painel IA Flutuante (Colapsável)                             │  │
│  │ ┌─────────────────────────────────────────────────────────┐  │  │
│  │ │ Análise de Proposta                                     │  │  │
│  │ │ ├── Score de Sucesso (0-100%)                           │  │  │
│  │ │ ├── Probabilidade de Fecho                              │  │  │
│  │ │ ├── Factores Positivos/Negativos                        │  │  │
│  │ │ └── Próximas Acções Recomendadas                        │  │  │
│  │ └─────────────────────────────────────────────────────────┘  │  │
│  │ ┌─────────────────────────────────────────────────────────┐  │  │
│  │ │ Assistente por Secção                                   │  │  │
│  │ │ ├── [Gerar Âmbito] baseado nos itens                    │  │  │
│  │ │ ├── [Gerar Cronograma] estimativas automáticas          │  │  │
│  │ │ ├── [Sugerir Condições] baseado no perfil               │  │  │
│  │ │ └── [Sugerir Referências] projectos similares           │  │  │
│  │ └─────────────────────────────────────────────────────────┘  │  │
│  │ ┌─────────────────────────────────────────────────────────┐  │  │
│  │ │ Copilot (Perguntas Livres)                              │  │  │
│  │ │ "Como posso melhorar esta proposta?"                    │  │  │
│  │ └─────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Edge Function: ai-proposal-assistant

Nova edge function centralizada para todas as operações de IA em propostas.

### Modos de Operação

| Modo | Descrição | Input | Output |
|------|-----------|-------|--------|
| `analyze` | Análise completa da proposta | proposalData, items, opportunity | score, probabilidade, factores, acções |
| `generate_scope` | Gerar âmbito do projecto | items, opportunity, context | objectives, deliverables, exclusions |
| `generate_timeline` | Gerar cronograma | items, scopeData, complexity | phases, milestones, duração |
| `suggest_conditions` | Sugerir condições | proposalValue, clientType, history | payment, validity, terms |
| `suggest_references` | Sugerir referências | industry, projectType, items | projects, testimonial, certs |
| `copilot` | Perguntas livres | question, proposalContext | response, suggestions |

### Estrutura do Request

```typescript
interface ProposalAssistantRequest {
  mode: "analyze" | "generate_scope" | "generate_timeline" | 
        "suggest_conditions" | "suggest_references" | "copilot";
  
  proposalData: {
    id: string;
    title: string;
    price: number;
    status: string;
    items: Array<{
      name: string;
      quantity: number;
      unit_price: number;
      description?: string;
      category?: string;
    }>;
  };
  
  opportunityData?: {
    title: string;
    value: number;
    stage: string;
    lead?: { name: string; company?: string };
  };
  
  clientData?: {
    name: string;
    type: "contact" | "company";
    industry?: string;
    previousProposals?: number;
  };
  
  existingData?: {
    scope?: ScopeData;
    timeline?: TimelineData;
    conditions?: ConditionsData;
    references?: ReferencesData;
  };
  
  question?: string;
}
```

### Respostas por Modo

#### Modo `analyze`
```typescript
interface AnalysisResult {
  successScore: number; // 0-100
  closeProbability: number; // 0-100
  confidence: number; // 0-1
  
  positiveFactors: Array<{
    factor: string;
    impact: "high" | "medium" | "low";
    description: string;
  }>;
  
  riskFactors: Array<{
    factor: string;
    severity: "high" | "medium" | "low";
    mitigation: string;
  }>;
  
  recommendations: Array<{
    action: string;
    priority: "now" | "soon" | "later";
    expectedImpact: string;
  }>;
  
  missingElements: string[];
  strengthAreas: string[];
  summary: string;
}
```

#### Modo `generate_scope`
```typescript
interface ScopeResult {
  objectives: string;
  deliverables: string[];
  exclusions: string[];
  assumptions: string;
  confidence: number;
  reasoning: string;
}
```

#### Modo `generate_timeline`
```typescript
interface TimelineResult {
  phases: Array<{
    type: "phase" | "milestone";
    title: string;
    duration?: number;
    week?: number;
    description: string;
  }>;
  totalDuration: number;
  confidence: number;
  reasoning: string;
}
```

---

## Componentes Frontend

### 1. ProposalAIAssistantPanel.tsx (Novo)

Painel flutuante/colapsável com todas as funcionalidades de IA:

```text
┌────────────────────────────────────────────┐
│ Assistente IA                    [−]       │
├────────────────────────────────────────────┤
│ ┌────────────────────────────────────────┐ │
│ │ Score de Sucesso                       │ │
│ │ ████████████░░░░░░░░  72%              │ │
│ │ Probabilidade de Fecho: 65%            │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │ Acções Rápidas                         │ │
│ │ [Gerar Âmbito] [Gerar Timeline]        │ │
│ │ [Sugerir Condições] [Ver Análise]      │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │ Pergunte à IA...                       │ │
│ │ [                              ] [→]   │ │
│ └────────────────────────────────────────┘ │
└────────────────────────────────────────────┘
```

### 2. ProposalAnalysisSheet.tsx (Novo)

Sheet lateral com análise detalhada:
- Tabs: Visão Geral | Factores | Recomendações
- Gráficos de score e probabilidade
- Lista de factores positivos/negativos
- Próximas acções com prioridade

### 3. SectionAIAssistButton.tsx (Novo)

Botão contextual para cada secção:
- Ícone sparkles ao lado do título da secção
- Tooltip explicativo
- Loading state durante geração
- Preview antes de aplicar

### 4. useProposalAI.ts (Novo Hook)

```typescript
export function useProposalAI() {
  const [isLoading, setIsLoading] = useState(false);
  
  const analyzeProposal = (proposalData, opportunityData, clientData) => {...}
  const generateScope = (items, opportunity) => {...}
  const generateTimeline = (items, scopeData) => {...}
  const suggestConditions = (proposalValue, clientType) => {...}
  const suggestReferences = (industry, projectType) => {...}
  const askCopilot = (question, context) => {...}
  
  return { 
    isLoading, 
    analyzeProposal, 
    generateScope, 
    generateTimeline,
    suggestConditions,
    suggestReferences,
    askCopilot
  };
}
```

---

## Integração com Secções Existentes

### ProposalScopeSection.tsx
Adicionar botão no header:
```text
┌─────────────────────────────────────────────────────────┐
│ ÂMBITO DO PROJECTO                    [Gerar com IA ✨] │
├─────────────────────────────────────────────────────────┤
```

Quando clicado:
1. Chama `generateScope` com itens da proposta
2. Mostra preview num modal
3. Utilizador pode aceitar/editar/cancelar
4. Campos preenchidos têm badge "Sugerido por IA"

### ProposalTimelineSection.tsx
Adicionar botão no header:
```text
┌─────────────────────────────────────────────────────────┐
│ CRONOGRAMA                            [Gerar com IA ✨] │
├─────────────────────────────────────────────────────────┤
```

Lógica:
1. Analisa itens e âmbito
2. Estima duração por categoria de produto/serviço
3. Sugere fases e marcos
4. Calcula duração total

### ProposalConditionsSection.tsx
Adicionar botão no header:
```text
┌─────────────────────────────────────────────────────────┐
│ CONDIÇÕES DE PAGAMENTO                [Sugerir IA ✨]   │
├─────────────────────────────────────────────────────────┤
```

Análise de:
- Valor da proposta (maiores valores = prazos mais longos)
- Tipo de cliente (empresa vs pessoa singular)
- Histórico de pagamentos (se disponível)
- Práticas do sector

### ProposalReferencesSection.tsx
Adicionar botão:
```text
┌─────────────────────────────────────────────────────────┐
│ REFERÊNCIAS                           [Sugerir IA ✨]   │
├─────────────────────────────────────────────────────────┤
```

Sugere:
- Projectos similares do workspace
- Testemunhos relevantes
- Certificações aplicáveis ao tipo de projecto

---

## Ficheiros a Criar

| Ficheiro | Descrição |
|----------|-----------|
| `supabase/functions/ai-proposal-assistant/index.ts` | Edge function principal |
| `src/hooks/useProposalAI.ts` | Hook centralizado para IA |
| `src/components/proposals/ProposalAIAssistantPanel.tsx` | Painel flutuante |
| `src/components/proposals/ProposalAnalysisSheet.tsx` | Sheet de análise detalhada |
| `src/components/proposals/SectionAIAssistButton.tsx` | Botão reutilizável |
| `src/components/proposals/AIPreviewDialog.tsx` | Dialog de preview |

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `ProposalDetailDialog.tsx` | Adicionar painel IA na sidebar |
| `ProposalScopeSection.tsx` | Adicionar botão de geração IA |
| `ProposalTimelineSection.tsx` | Adicionar botão de geração IA |
| `ProposalConditionsSection.tsx` | Adicionar botão de sugestão IA |
| `ProposalReferencesSection.tsx` | Adicionar botão de sugestão IA |

---

## Fluxo de Utilização

```text
1. Utilizador abre proposta
          │
          ▼
2. Painel IA carrega automaticamente
   análise básica (score rápido)
          │
          ▼
3. Em cada secção, pode clicar
   "Gerar com IA" para assistência
          │
          ├── Âmbito: gera objectivos e entregáveis
          ├── Timeline: estima fases e duração
          ├── Condições: sugere pagamento e validade
          └── Referências: sugere casos similares
          │
          ▼
4. Preview do conteúdo gerado
   ├── [Aceitar] → Aplica aos campos
   ├── [Editar] → Abre para modificação
   └── [Cancelar] → Descarta
          │
          ▼
5. Campos com conteúdo IA têm
   badge visual "Sugerido por IA"
          │
          ▼
6. A qualquer momento, pode usar
   o Copilot para perguntas livres
```

---

## Detalhes Técnicos

### Contexto para a IA

A edge function receberá contexto rico:

```typescript
const context = {
  // Dados da proposta
  proposal: {
    title, price, status, currency,
    items: items.map(i => ({
      name: i.product_name,
      category: i.product?.category,
      description: i.product?.description,
      quantity: i.quantity,
      price: i.unit_price
    }))
  },
  
  // Oportunidade associada
  opportunity: {
    title, value, stage,
    lead: { name, company, industry },
    daysOpen
  },
  
  // Cliente (se seleccionado)
  client: {
    name, type, industry,
    previousDeals, averagePaymentDays
  },
  
  // Dados já preenchidos
  existing: {
    scope: scopeData,
    timeline: timelineData,
    conditions: conditionsData
  }
};
```

### Modelo IA

Usar `google/gemini-3-flash-preview` via Lovable AI Gateway:
- Rápido e económico
- Bom para tarefas estruturadas
- Suporta function calling

### Cache e Performance

- Análise básica: cache 5 minutos
- Sugestões por secção: sem cache (dependem de contexto)
- Copilot: sem cache (perguntas únicas)

---

## Componentes UI Reutilizáveis

Usar componentes existentes de `src/components/ai/`:
- `ConfidenceScore` - Indicador visual de confiança
- `AISuggestionIndicator` - Badge "Sugerido por IA"
- `SuggestionExplanation` - Explicação do raciocínio

---

## Estimativa de Esforço

| Componente | Complexidade | Linhas |
|------------|--------------|--------|
| Edge Function ai-proposal-assistant | Alta | ~400 |
| Hook useProposalAI | Média | ~200 |
| ProposalAIAssistantPanel | Alta | ~350 |
| ProposalAnalysisSheet | Média | ~250 |
| SectionAIAssistButton | Baixa | ~80 |
| AIPreviewDialog | Média | ~150 |
| Modificações às 4 secções | Média | ~200 |
| **Total** | | ~1630 |
