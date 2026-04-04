

# Plano: Auditoria e Correção do Módulo de Intelligence

## Diagnóstico

Após análise detalhada de todo o módulo de Intelligence (página, subcomponentes, hooks, edge functions), identifiquei **7 problemas** que afetam a funcionalidade:

---

### Problemas Identificados

**1. BUG CRÍTICO — `ai-generate-automation` referencia variável inexistente**
Na linha 53 do edge function, o código faz `typeof workspaceId !== 'undefined'` e `typeof workspace_id !== 'undefined'`, mas nenhuma dessas variáveis é extraída do request body ou headers. O aiGate nunca executa, o que significa que não há controlo de quota nesta função.

**2. BUG — `ai-generate-automation` não valida autenticação**
A edge function não verifica JWT nem workspace membership. Qualquer pessoa com o anon key pode gerar automações — falha de segurança.

**3. BUG — `intelligence-panel` usa `getClaims` (API instável)**
O `getClaims` não é um método standard do Supabase JS client. Deve usar `getUser()` para validação de JWT, que é o padrão documentado e fiável.

**4. BUG — Tab "Automate" → botão "Save Automation" é fake**
O botão "Save Automation" (linha 131) faz apenas `toast.success()` sem guardar nada na base de dados. A automação gerada é descartada.

**5. UX — Textos misturados PT/EN na página Intelligence**
O título é "Intelligence", as tabs são "Overview", "Assist", "Analyze", "Automate" (EN), mas o conteúdo é maioritariamente PT. Inconsistência de idioma.

**6. UX — Tab "Analyze" mostra estado vazio sem orientação**
Quando não há forecast, mostra "No forecast available" sem explicar o que é necessário (ter oportunidades abertas no pipeline). O utilizador não sabe por onde começar.

**7. FUNCIONAL — `compute-revenue-forecast` não é chamado automaticamente**
O forecast requer trigger manual via botão. Não há schedule/cron nem regeneração automática quando os dados do pipeline mudam.

---

### Plano de Implementação

#### Passo 1 — Corrigir autenticação e aiGate no `ai-generate-automation`
- Extrair `workspace_id` do body do request
- Adicionar validação JWT via `getUser()`
- Verificar membership no workspace
- Corrigir referência ao aiGate com a variável correcta

#### Passo 2 — Substituir `getClaims` por `getUser` no `intelligence-panel`
- Usar `supabase.auth.getUser()` (padrão seguro e documentado)
- Manter a validação de workspace_id

#### Passo 3 — Implementar persistência real na tab "Automate"
- No clique "Save Automation", inserir na tabela `automations` existente
- Redirecionar para `/dashboard/automations` após guardar com sucesso
- Tratar erros e mostrar feedback adequado

#### Passo 4 — Traduzir toda a página Intelligence para PT-PT
- Título: "Inteligência"
- Tabs: "Visão Geral", "Assistente", "Análise", "Automação"
- Conteúdo da tab Analyze: traduzir "Best Case" → "Melhor Cenário", etc.
- Conteúdo da tab Automate: traduzir "Quick examples" → "Exemplos rápidos", etc.

#### Passo 5 — Melhorar estado vazio na tab "Analyze"
- Mostrar explicação clara: "É necessário ter oportunidades abertas no pipeline para gerar previsões de receita."
- Link direto para criar oportunidade

#### Passo 6 — Adicionar regeneração automática do forecast
- Chamar `compute-revenue-forecast` via invalidação quando pipeline muda (já existe trigger `trg_invalidate_deal_intel`)
- Adicionar auto-refresh no hook com `refetchInterval` quando o forecast tem mais de 24h

---

### Ficheiros Afetados

| Ficheiro | Acção |
|---|---|
| `supabase/functions/ai-generate-automation/index.ts` | Corrigir auth + aiGate |
| `supabase/functions/intelligence-panel/index.ts` | Substituir getClaims por getUser |
| `src/pages/IntelligencePage.tsx` | Traduzir para PT-PT |
| `src/components/intelligence/AnalyzeTab.tsx` | Traduzir + melhorar estado vazio |
| `src/components/intelligence/AutomateTab.tsx` | Persistência real + tradução |
| `src/hooks/useRevenueForecast.ts` | Auto-refresh condicional |

### Critérios de Aceitação
- Todas as edge functions validam JWT e workspace membership
- Automações geradas são guardadas na BD
- Interface 100% em PT-PT
- Estados vazios com orientação clara
- Forecast auto-refresh quando stale (>24h)

