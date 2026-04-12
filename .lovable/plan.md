

# Plano: IA Pricing Avançada — Pesquisa de Mercado, Features, Módulos e Bundles

## Situação Atual
O botão "IA: Sugerir Preços" chama a action `suggest_prices` na edge function `pricing-ai-assistant`, que apenas sugere preços baseados em benchmarks genéricos. Já existem actions parciais (`generate_features`, `create_promotion`) mas não estão acessíveis de forma centralizada.

## O que vamos construir
Substituir o botão simples por um **dropdown/dialog de IA multi-ação** com 5 capacidades:

1. **Pesquisa de Mercado** — Análise de concorrentes (HubSpot, Pipedrive, Monday, Zoho) com comparativo de preços, features e posicionamento
2. **Sugerir Preços** — Manter a funcionalidade atual mas enriquecida com dados da pesquisa
3. **Propor Features por Nível** — Gerar features diferenciadas para cada plano (START, GROW, PRO) com progressão lógica
4. **Sugerir Módulos** — Recomendar novos módulos para o marketplace com pricing e segmentação
5. **Construir Bundles & Promoções** — Gerar bundles temáticos e promoções com desconto, duração e segmento-alvo

## Alterações

### 1. Edge Function `pricing-ai-assistant` — Novas actions

Adicionar 3 novas actions ao switch:

- **`market_research`**: Prompt especializado que analisa concorrentes do mercado CRM europeu, retorna JSON com `{competitors: [{name, plans: [{tier, price, features}], positioning, strengths, weaknesses}], market_summary, pricing_gaps}`
- **`suggest_features_by_tier`**: Analisa os 3 planos e gera features progressivas e diferenciadas por nível, retorna `{tiers: [{plan_key, features: string[], differentiators: string[]}], cross_tier_analysis}`
- **`suggest_modules`**: Propõe novos módulos para o marketplace com base nos planos existentes, retorna `{modules: [{name, category, description, suggested_price, target_plan, reasoning}]}`

### 2. UI — Dropdown com ações IA no `PricingManagementSection.tsx`

Substituir o botão único por um **DropdownMenu** com as 5 opções:
- 🔍 Pesquisa de Mercado
- 💰 Sugerir Preços (existente)
- ✨ Propor Features por Nível
- 📦 Sugerir Módulos
- 🎁 Criar Bundle/Promoção (existente)

### 3. Dialog de Resultados — `AIStrategyDialog.tsx`

Novo componente dialog que apresenta os resultados de cada action de forma estruturada:
- **Pesquisa de Mercado**: Tabela comparativa de concorrentes com preços e features
- **Features por Nível**: Cards por plano com lista de features + botão "Aplicar" que atualiza o plano
- **Módulos sugeridos**: Lista com botão para criar módulo no marketplace
- **Bundles**: Detalhes da promoção com botão para criar bundle

### Ficheiros a criar/editar

| Ficheiro | Ação |
|---|---|
| `supabase/functions/pricing-ai-assistant/index.ts` | Adicionar 3 actions novas |
| `src/components/super-admin/PricingManagementSection.tsx` | Substituir botão por dropdown + integrar dialog |
| `src/components/super-admin/AIStrategyDialog.tsx` | **Novo** — Dialog de resultados IA |

### Detalhes Técnicos
- Todas as actions usam tool calling (structured output) para garantir JSON válido
- Cada action consome créditos via `useAIGate` (tier medium)
- Dialog permite aplicar sugestões diretamente (ex: atualizar features de um plano, criar módulo)
- Pesquisa de mercado usa o modelo `google/gemini-2.5-pro` para melhor qualidade de análise; restantes usam `google/gemini-3-flash-preview`

