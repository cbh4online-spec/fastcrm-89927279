

## Pack 6 -- Predictive Structure Library (METODOPARE)

### Resumo

Atualizar as 7 estruturas de persuasao existentes na tabela `persuasion_structures` para as 6 definicoes calibradas do METODOPARE, com blocos detalhados, canais especificos e constraints enriquecidos. Adicionar peso estrategico inicial ao motor preditivo para guiar a exploracao antes de dados reais.

---

### 1. Migracao DB -- Atualizar Estruturas

**Apagar as 7 estruturas existentes** (AIDA, AIDAShort, PAS, BAB, 4P, ObjectionHandling, DemoInvite) e inserir 6 novas com schemas calibrados:

| Key | Label | Canal | Blocos | Max Length |
|---|---|---|---|---|
| AIDA | AIDA -- Email Completo | email | attention, interest, desire, action | 1600 |
| AIDA_SHORT | AIDA Short -- WhatsApp | whatsapp | attention, interest, action | 350 |
| PAS | PAS -- Problema, Agitacao, Solucao | email | problem, agitate, solution, action | 1400 |
| BAB | BAB -- Before, After, Bridge | email | before, after, bridge, action | 1500 |
| 4P | 4P -- Picture, Promise, Proof, Push | email | picture, promise, proof, push | 1300 |
| REENGAGE | Reativacao Inteligente | email | reference, update, opportunity, action | 1200 |

Cada estrutura tera blocks com campos `id`, `goal`, `required` e constraints com `max_length`, `cta_type`, `tone_options` conforme os schemas JSON fornecidos.

Nota: `ObjectionHandling` e `DemoInvite` serao removidos (substituidos por PAS e REENGAGE que cobrem os mesmos cenarios com schemas mais robustos).

### 2. Atualizar `structure-predict-best` -- Peso Estrategico Inicial

Quando `samples === 0` (sem dados de aprendizagem), o motor aplica um **prior weight** por estrutura para guiar a exploracao inicial:

```text
AIDA:        1.0
AIDA_SHORT:  1.0
PAS:         1.1
BAB:         1.15
4P:           1.25
REENGAGE:    0.9
```

Logica:
- Se nenhuma estrutura tem amostras, multiplicar o score base (0) pelo prior weight nao tem efeito
- Solucao: quando `totalSamplesAll === 0`, usar weighted random selection baseado nos priors em vez de selecao uniforme
- Quando `totalSamplesAll > 0` mas uma estrutura especifica tem `samples === 0`, adicionar prior weight como score inicial (ex: 0.1 * prior) para dar vantagem a estruturas com maior potencial teorico

### 3. Atualizar Hook `usePersuasionStructures`

Atualizar a interface `PersuasionStructure` para refletir o novo formato dos blocks (campos `id` e `goal` em vez de `name` e `description`).

### 4. Atualizar `TemplateFormDialog`

Atualizar as labels de estruturas disponiveis para refletir os novos keys (AIDA_SHORT em vez de AIDAShort, remover ObjectionHandling e DemoInvite, adicionar REENGAGE).

---

### Ficheiros Afetados

| Ficheiro | Alteracao |
|---|---|
| Migracao SQL | DELETE + INSERT das 6 estruturas com schemas calibrados |
| `supabase/functions/structure-predict-best/index.ts` | Adicionar prior weights para cold-start |
| `src/hooks/usePersuasionStructures.ts` | Atualizar interface blocks |
| `src/types/communicationTemplate.ts` | Atualizar TemplateStructure enum e STRUCTURE_LABELS |
| `src/components/communication/TemplateFormDialog.tsx` | Atualizar opcoes de estrutura |

### Ordem de Implementacao

1. Migracao DB (delete + insert 6 estruturas)
2. Edge function `structure-predict-best` (prior weights)
3. Tipos + hooks + UI (labels atualizados)
