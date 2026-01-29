
# Plano: Adicionar Gestão de Objetivos ao Motor Conversacional

## Contexto

O Motor Conversacional tem uma estrutura de 4 camadas de governança:
1. **Factual Layer** - Knowledge Base (existente)
2. **Behavior Layer** - Regras de Conversa (existente)
3. **Decision Layer** - AI Personas (existente)
4. **Journey Layer** - Objetivos e Fluxos (a implementar)

A tabela `conversation_objectives` já existe na base de dados mas não há interface para gerir os objetivos.

## O que são Objetivos?

Objetivos definem **o que a IA deve recolher** durante uma conversa:
- Nome do lead
- Email
- Interesse específico
- Orçamento
- Fase de decisão

Cada objetivo mapeia diretamente para um campo do CRM e pode ser configurado para:
- Saltar se já estiver preenchido (`skip_if_filled`)
- Bloquear próximas perguntas até ser respondido (`blocks_next_questions`)

## Solução

Adicionar uma nova tab "Objetivos" ao Motor Conversacional com:

### 1. Nova Tab no Motor Conversacional
Adicionar ao `ConversationalEngineModule.tsx` uma 4ª tab com ícone `Target`

### 2. Componente ConversationObjectivesTab
Lista de objetivos com:
- Drag-and-drop para reordenar (sort_position)
- Toggle ativo/inativo
- Indicador de obrigatório
- Botão criar/editar

### 3. Formulário de Objetivo
Campos:
- Nome do objetivo (ex: "Capturar Nome")
- Código único (ex: "lead_name")
- Descrição
- Entidade CRM (lead, contact, opportunity)
- Campo CRM a atualizar
- Prompt template (como perguntar)
- Configurações (skip_if_filled, blocks_next_questions, is_required)
- Regras de validação (JSON)

### 4. Hook useConversationObjectives
CRUD para a tabela `conversation_objectives`

## Ficheiros a Criar

| Ficheiro | Descrição |
|----------|-----------|
| `src/hooks/useConversationObjectives.ts` | Hook para CRUD de objetivos |
| `src/components/conversational-engine/ConversationObjectivesTab.tsx` | Tab principal com lista |
| `src/components/conversational-engine/ConversationObjectiveForm.tsx` | Modal de criação/edição |

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/conversational-engine/ConversationalEngineModule.tsx` | Adicionar 4ª tab |
| `src/components/conversational-engine/index.ts` | Exportar novos componentes |

## Secção Técnica

### Estrutura da Tabela (já existe)

```text
conversation_objectives:
  - id: uuid
  - workspace_id: uuid (FK)
  - persona_id: uuid (FK, opcional)
  - objective_code: string (único por workspace)
  - objective_name: string
  - objective_description: text
  - crm_entity: string ('lead' | 'contact' | 'opportunity')
  - crm_field_to_update: string
  - crm_field_type: string
  - prompt_template: text (como perguntar)
  - skip_if_filled: boolean
  - blocks_next_questions: boolean
  - is_required: boolean
  - is_active: boolean
  - sort_position: number
  - validation_rules: json
  - trigger_condition: json
  - on_complete_action: string
  - on_complete_message: text
```

### Hook useConversationObjectives

```typescript
// Estrutura base
export function useConversationObjectives(personaId?: string) {
  // Queries
  - objectives: lista ordenada por sort_position
  - activeObjectivesCount: count de objetivos ativos
  
  // Mutations
  - createObjective(data)
  - updateObjective(id, data)
  - deleteObjective(id)
  - toggleActive(id, isActive)
  - reorderObjectives(ids[]) // atualiza sort_position em lote
}
```

### Campos CRM Disponíveis

Para facilitar a configuração, pré-definir campos comuns:

```typescript
const CRM_FIELDS = {
  lead: [
    { value: 'name', label: 'Nome' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Telefone' },
    { value: 'company_name', label: 'Empresa' },
    { value: 'status', label: 'Estado' },
    { value: 'source', label: 'Origem' },
    { value: 'tags', label: 'Tags' },
    { value: 'notes', label: 'Notas' },
    // campos personalizados via custom_fields
  ],
  contact: [...],
  opportunity: [...]
}
```

### UI da Tab Objetivos

```text
┌─────────────────────────────────────────────────────────────────┐
│ Objetivos de Conversa                         [+ Novo Objetivo] │
│ Define o que a IA deve recolher durante conversas              │
├─────────────────────────────────────────────────────────────────┤
│ ⁞ 1. Capturar Nome       lead.name       [Obrigatório] [Ativo] │
│ ⁞ 2. Capturar Email      lead.email      [Obrigatório] [Ativo] │
│ ⁞ 3. Interesse           lead.tags       [Opcional]    [Ativo] │
│ ⁞ 4. Orçamento           opp.value       [Opcional]    [Inativo] │
└─────────────────────────────────────────────────────────────────┘
```

### Formulário de Objetivo

```text
┌─────────────────────────────────────────────────────────────────┐
│ Novo Objetivo                                              [X] │
├─────────────────────────────────────────────────────────────────┤
│ Nome: [Capturar Nome do Lead                               ]   │
│ Código: [lead_name                                         ]   │
│ Descrição: [Pergunta o nome ao utilizador                  ]   │
├─────────────────────────────────────────────────────────────────┤
│ Mapeamento CRM:                                                 │
│ Entidade: [Lead ▼]  Campo: [name ▼]                            │
├─────────────────────────────────────────────────────────────────┤
│ Como Perguntar (Prompt):                                        │
│ [Para dar seguimento, pode dizer-me o seu nome?            ]   │
├─────────────────────────────────────────────────────────────────┤
│ Comportamento:                                                  │
│ ☑ Obrigatório                                                   │
│ ☑ Saltar se já preenchido                                      │
│ ☐ Bloquear próximas perguntas                                  │
├─────────────────────────────────────────────────────────────────┤
│                                    [Cancelar]  [Guardar]        │
└─────────────────────────────────────────────────────────────────┘
```

## Dependências

Nenhuma nova dependência necessária. Usa componentes UI existentes (Radix, shadcn/ui).

## Resultado Esperado

Após implementação:
1. Nova tab "Objetivos" no Motor Conversacional
2. Lista drag-and-drop de objetivos ordenáveis
3. Modal de criação/edição com mapeamento CRM
4. Integração com edge functions existentes (`ai-inbox-reply`, `flow-engine`)
