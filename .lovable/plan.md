

## Smart Dynamic Templates -- Templates Dinamicos Inteligentes

### Resumo

Adicionar sistema de templates com variaveis inteligentes calculadas, sintaxe condicional (`{{#if}}`), e personalizacao automatica baseada no perfil do lead. Os templates adaptam tom, CTA e conteudo em tempo real usando dados do CRM e metricas calculadas por IA.

---

### 1. Migracao DB -- Novos Campos

Adicionar 3 campos na tabela `communication_templates`:

```text
is_dynamic BOOLEAN DEFAULT false
dynamic_rules JSONB DEFAULT '{}'
personalization_level TEXT DEFAULT 'basic'  (basic, contextual, predictive)
```

### 2. Tipos TypeScript

Atualizar `src/types/communicationTemplate.ts`:

- Adicionar `isDynamic`, `dynamicRules`, `personalizationLevel` ao interface `CommunicationTemplate`
- Criar type `PersonalizationLevel = 'basic' | 'contextual' | 'predictive'`
- Expandir `TEMPLATE_VARIABLES` com novas variaveis CRM: `company_name`, `industry`, `pipeline_stage`, `lead_score`, `potential_value`, `assigned_user`, `city`, `days_since_last_contact`
- Criar constante `SMART_VARIABLES` para variaveis calculadas: `urgency_level`, `business_maturity`, `digital_readiness`, `conversion_probability`, `recommended_tone`
- Adicionar `PERSONALIZATION_LABELS` constante

### 3. Motor de Rendering Condicional

Criar `src/lib/dynamicTemplateEngine.ts`:

- Parser que processa sintaxe `{{#if condition}}...{{else}}...{{/if}}`
- Suporta operadores: `==`, `!=`, `>`, `<`, `>=`, `<=`
- Funcao `renderDynamicTemplate(template, variables)` que:
  1. Resolve condicionais `{{#if}}`
  2. Substitui variaveis `{{key}}`
  3. Aplica fallbacks para valores null
- Funcao `extractConditions(template)` para listar todas as condicoes usadas
- Funcao `validateDynamicTemplate(template)` para verificar sintaxe

### 4. Edge Function `generate-dynamic-template-context`

Nova edge function que recebe `leadId` ou `contactId` + `workspaceId` e calcula:

```text
{
  "urgency_level": "low | medium | high",
  "business_maturity": "early | growth | scale",
  "digital_readiness": "low | medium | high",
  "conversion_probability": 0-100,
  "recommended_tone": "direct | consultative | strategic",
  "days_since_last_contact": number
}
```

Logica:
- `urgency_level`: baseado em SLA deadline, tempo sem contacto, valor potencial
- `business_maturity`: baseado em industry, employee_count, annual_revenue
- `digital_readiness`: baseado em tags, notas, historico de interacao
- `conversion_probability`: usa lead_score existente ou calcula baseado em pipeline stage + engagement
- `recommended_tone`: derivado de lead_score (alto = direto, medio = consultivo, baixo = educacional)

Usa Lovable AI (gemini-3-flash-preview) para inferir `business_maturity` e `digital_readiness` quando dados insuficientes.

### 5. Hook `useDynamicTemplateContext`

Novo hook `src/hooks/useDynamicTemplateContext.ts`:

- Recebe `leadId` ou `contactId`
- Chama a edge function `generate-dynamic-template-context`
- Retorna variaveis calculadas + variaveis CRM base (nome, empresa, industria, etc.)
- Cache de 5 minutos via React Query

### 6. Atualizar Hook `useCommunicationTemplates`

Mapear os novos campos `is_dynamic`, `dynamic_rules`, `personalization_level` nas queries, create e update.

### 7. Atualizar `TemplateFormDialog`

- Adicionar toggle "Template Dinamico" que ativa modo avancado
- Quando dinamico = true:
  - Mostrar selector de `personalization_level` (Basico, Contextual, Preditivo)
  - Na tab "Variaveis", adicionar seccao "Variaveis Inteligentes" com as calculadas
  - Adicionar botao "Inserir Condicao" que insere bloco `{{#if}}...{{/if}}` no body
  - Atualizar preview para processar condicionais com dados de exemplo
- Na tab "Preview", usar o motor de rendering condicional com variaveis de exemplo enriquecidas

### 8. Atualizar `TemplatePreviewDialog`

- Quando template `isDynamic`, mostrar badge "Dinamico"
- Processar condicionais no preview com dados de exemplo
- Mostrar seccao "Variaveis Inteligentes Usadas" listando as condicoes detectadas

### 9. Atualizar `InboxTemplatePanel`

- Quando um template dinamico e selecionado na Inbox:
  1. Chamar `generate-dynamic-template-context` com o leadId da conversa
  2. Processar template com variaveis reais do lead
  3. Resolver condicionais automaticamente
  4. Mostrar badge "Personalizado" no resultado
- Adicionar indicador visual nos cards de templates dinamicos

### 10. Atualizar Edge Function `generate-template`

- Adicionar parametro `dynamic: true` que gera templates com sintaxe condicional
- Quando `dynamic = true`, o prompt pede ao modelo para incluir blocos `{{#if}}` baseados em variaveis inteligentes

### 11. Templates Dinamicos METODOPARE

Inserir 3 templates dinamicos via insert tool:

| Nome | Canal | Descricao |
|---|---|---|
| Qualificacao Inteligente | email | Adapta assunto e corpo baseado em conversion_probability e business_maturity |
| Reativacao Inteligente | email | Adapta mensagem baseado em days_since_last_contact, industry e urgency_level |
| Proposta Quente | email | Adapta CTA baseado em conversion_probability e potential_value |

---

### Ficheiros Afetados

| Ficheiro | Alteracao |
|---|---|
| Migracao SQL | `is_dynamic`, `dynamic_rules`, `personalization_level` |
| `src/types/communicationTemplate.ts` | Novos tipos, variaveis CRM e inteligentes |
| `src/lib/dynamicTemplateEngine.ts` | Novo -- parser condicional + rendering |
| `supabase/functions/generate-dynamic-template-context/index.ts` | Novo -- calculo variaveis inteligentes |
| `supabase/config.toml` | Declarar nova edge function |
| `src/hooks/useDynamicTemplateContext.ts` | Novo -- hook para variaveis calculadas |
| `src/hooks/useCommunicationTemplates.ts` | Mapear novos campos |
| `src/components/communication/TemplateFormDialog.tsx` | Toggle dinamico + condicoes + preview |
| `src/components/communication/TemplatePreviewDialog.tsx` | Preview com condicionais |
| `src/components/inbox/InboxTemplatePanel.tsx` | Rendering dinamico com dados reais do lead |
| `supabase/functions/generate-template/index.ts` | Suporte a geracao com sintaxe condicional |
| Insert SQL | 3 templates dinamicos METODOPARE |

### Ordem de Implementacao

1. Migracao DB (3 novos campos)
2. Motor de rendering condicional (`dynamicTemplateEngine.ts`)
3. Edge function `generate-dynamic-template-context` + config.toml
4. Tipos TypeScript + hooks (context + templates)
5. UI: TemplateFormDialog (toggle + condicoes + preview)
6. UI: TemplatePreviewDialog (preview dinamico)
7. UI: InboxTemplatePanel (rendering com dados reais)
8. Atualizar edge function `generate-template` para modo dinamico
9. Inserir templates METODOPARE

