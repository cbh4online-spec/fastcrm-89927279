

# Multi-Widget com Associação de Agente

## Problema

Atualmente o sistema só suporta **1 widget por workspace** (query com `.limit(1)`) e não há campo para associar um agente IA ao widget. O widget já tem `default_persona_id` e `default_flow_id`, mas falta o **agente**.

## Solução

### 1. Migração DB — Adicionar `default_agent_id`

```sql
ALTER TABLE public.widget_configurations 
ADD COLUMN default_agent_id UUID REFERENCES public.ai_agents(id) ON DELETE SET NULL;
```

O agente associado define o comportamento completo do widget (persona + fluxo + knowledge bases herdados do agente).

### 2. Reescrever `WidgetTab.tsx` — Lista de Widgets

Substituir o wrapper simples por uma **lista de cards**:

- Cada card mostra: nome, cor, agente associado, status (ativo/inativo), domínios
- Botão **"Criar Widget"** abre dialog de criação
- Ações por card: **Editar**, **Duplicar**, **Eliminar**, **Testar**
- Query sem `.limit(1)` para buscar todos os widgets do workspace

### 3. Adicionar Selector de Agente ao Formulário

No tab **Comportamento** do `WidgetConfigPanel`, adicionar dropdown de agente:

- Lista agentes ativos do workspace (canal `widget`)
- Quando selecionado, o agente traz consigo persona e fluxo configurados
- Os campos de persona/fluxo manuais ficam como **override** (só usados se não houver agente)
- Tooltip explica a hierarquia: "O agente define a personalidade e fluxo. Pode sobrepor manualmente abaixo."

### 4. Adaptar `WidgetConfigPanel` para modo multi-widget

- Recebe `widgetId` como prop (em vez de buscar o primeiro)
- Abre em dialog/sheet quando se clica num card
- Botão guardar cria ou atualiza conforme o caso

## Ficheiros

| Ficheiro | Alteração |
|----------|-----------|
| **Migração SQL** | Adicionar coluna `default_agent_id` |
| `src/components/ai-assistants/WidgetTab.tsx` | Reescrever como lista multi-widget |
| `src/components/chat-widget/WidgetConfigPanel.tsx` | Aceitar `widgetId` prop, adicionar selector de agente |
| `supabase/functions/chat-widget/index.ts` | Carregar agente associado quando disponível |

