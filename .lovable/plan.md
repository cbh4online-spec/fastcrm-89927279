

## Auditoria: Score, Temperatura, Scores e Ciclo de Vida no Lead Detail

### Bugs encontrados

Analisei a screenshot vs. o código e encontrei **4 problemas concretos**:

---

### Bug 1: Score contraditório (90 vs 75)

O **Destaques** mostra "Score 90/100" e o card **Score** em baixo mostra "75". São fontes de dados diferentes:
- `EntityHighlightsGrid` lê `lead.lead_score` (campo na tabela `leads`)
- `ScoreTemperatureDisplay` lê o resultado da Edge Function `ai-entity-insights` (nunca persiste)

**Causa**: Quando a IA calcula o score (75), esse valor **não é escrito de volta** na tabela `leads`. O `lead_score` na tabela ficou com um valor antigo (90) de outra fonte (ex: importação, enriquecimento).

**Fix**: Após `ai-entity-insights` retornar, escrever `score.value` → `lead_score` e `score.temperature` → `ai_temperature` na tabela `leads`.

---

### Bug 2: Temperatura contraditória (Frio vs Morno)

Mesmo problema — o **Destaques** mostra "Frio" (da tabela `leads.ai_temperature`) e o card Score mostra "Morno" (do resultado da IA). Sem sync, ficam dessincronizados.

**Fix**: Incluído no fix do Bug 1 — persistir `ai_temperature` junto com o score.

---

### Bug 3: ICP Fit, Engagement e PARE sempre 0%

O `LeadScoresCard` lê `lead.icp_fit_score`, `lead.engagement_score`, `lead.pare_score` — campos que **só são atualizados manualmente** (clique do utilizador). Nenhuma análise de IA preenche estes campos automaticamente.

**Fix**: Quando a IA analisa o lead, calcular e preencher estes 3 scores com base nos fatores da análise (ex: ICP Fit a partir de perfil/setor, Engagement a partir de interações, PARE a partir de fatores de risco).

---

### Bug 4: "Última Atividade" usa timestamp errado

O `EntityHighlightsGrid` usa `entity.updated_at` — que é o timestamp da última atualização do registo na BD (qualquer campo). Não reflete a última atividade real (email, chamada, tarefa).

**Fix**: Consultar `activity_logs` ou `tasks` para encontrar a data da última interação real.

---

### Ciclo de Vida — sem bug

O `LeadLifecycleSection` funciona correctamente: lê `lead.status` e permite alterá-lo via clique. Está a funcionar como esperado.

---

### Plano de correção

| Ficheiro | Alteração |
|---|---|
| `src/hooks/useAIInsights.ts` | Após receber resultado da IA, fazer `update` na tabela `leads` com `lead_score`, `ai_temperature` e os 3 sub-scores |
| `supabase/functions/ai-entity-insights/index.ts` | Incluir cálculo de `icp_fit_score`, `engagement_score`, `pare_score` no output |
| `src/components/entity/EntityHighlightsGrid.tsx` | Usar `last_contact_at` como fallback para Última Atividade (campo já existente na tabela) |

### Fluxo corrigido

```text
AI Entity Insights executa
  → retorna score, temperature, factors
  → hook useAIInsights persiste na tabela leads:
      lead_score = score.value
      ai_temperature = score.temperature
      icp_fit_score = factors.icp_fit
      engagement_score = factors.engagement
      pare_score = factors.pare
  → EntityHighlightsGrid lê da tabela → dados consistentes
  → ScoreTemperatureDisplay lê do resultado IA → mesmos dados
  → LeadScoresCard lê da tabela → preenchido automaticamente
```

