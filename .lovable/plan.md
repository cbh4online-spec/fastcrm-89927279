

## Fix: Remover Labels AIDA dos Templates

### Problema

5 templates na base de dados contêm labels de estrutura AIDA visíveis no corpo da mensagem (`**Atenção**`, `**Interesse**`, `**Desejo**`, `**Ação**`). Estas labels são instruções internas do framework persuasivo e não devem ser enviadas ao cliente.

Templates afetados:
- Captação Lead Frio (`b299e5a5`)
- WhatsApp Qualificação (`b2e09315`)
- Follow-Up Comercial (`8bdcccbc`)
- Convite Masterclasse (`2e15e55c`)
- Recuperação Lead Inativo (`56e7176c`)

### Solução (3 camadas de proteção)

#### 1. Migração DB — Limpar os 5 templates existentes

Uma migração SQL que faz `UPDATE` no `body` de cada template, removendo as linhas `**Atenção**`, `**Interesse**`, `**Desejo**` e `**Ação**` e limpando linhas vazias duplicadas.

#### 2. Sanitização no UI — Defesa em profundidade

Criar uma função `stripStructureLabels()` em `src/lib/templateUtils.ts` que remove automaticamente labels de estrutura (`**Atenção**`, `**Interesse**`, `**Desejo**`, `**Ação**`, `**Problema**`, `**Agitação**`, `**Solução**`, etc.) do conteúdo antes de apresentar/inserir.

Aplicar esta função em `InboxTemplatePanel.tsx` nos dois pontos onde o `body` é usado:
- Quando o template é selecionado (linha ~270)
- Quando é aplicado no campo de mensagem

#### 3. Prompt do AI — Prevenir geração futura

Atualizar o `systemPrompt` em `template-compose-message/index.ts` para incluir a regra: "NUNCA inclua labels de bloco (Atenção, Interesse, Desejo, Ação, Problema, etc.) no texto da mensagem. O conteúdo deve fluir naturalmente sem cabeçalhos de estrutura."

### Detalhe Técnico

| Camada | Ficheiro | Alteração |
|--------|---------|-----------|
| DB | Nova migração SQL | UPDATE 5 templates, remover labels com regexp_replace |
| UI | `src/lib/templateUtils.ts` (novo) | Função `stripStructureLabels(text)` |
| UI | `src/components/inbox/InboxTemplatePanel.tsx` | Aplicar `stripStructureLabels()` ao body antes de render |
| Edge | `supabase/functions/template-compose-message/index.ts` | Adicionar regra ao systemPrompt |

### Resultado

- Templates existentes ficam imediatamente limpos
- Novos templates gerados por AI nunca incluem labels
- Qualquer template que escape as duas primeiras camadas é limpo no momento de inserção

