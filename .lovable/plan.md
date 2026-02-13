

## Fix: Templates Não Aparecem na Inbox

### Problema Identificado

O painel de templates na Inbox tem **duas fontes de dados**:

1. **Tabela `templates`** — usada no tab "Todos" — esta tabela esta **vazia** (0 registos)
2. **Tabela `communication_templates`** — usada no tab "Recomendados" — tem **8 registos**, mas o filtro exige `usageCount > 0`, e todos tem `usage_count: 0`, logo tambem nao aparece nada

Resultado: ambos os tabs mostram "Nenhum template encontrado".

### Solucao

Alterar o `InboxTemplatePanel.tsx` para:

1. **Unificar as fontes**: No tab "Todos", mostrar templates de **ambas as tabelas** (`templates` + `communication_templates`), convertendo `communication_templates` para o formato visual compativel
2. **Corrigir filtro "Recomendados"**: Remover a condicao `usageCount > 0` para que os 8 templates de comunicacao aparecam mesmo sem uso previo (ordenar por taxa de conversao quando disponivel, senao por nome)
3. **Manter consistencia**: Quando um `communication_template` e selecionado no tab "Todos", aplicar o mesmo fluxo de render/personalizacao que ja existe no tab "Recomendados"

### Detalhes Tecnicos

**Ficheiro**: `src/components/inbox/InboxTemplatePanel.tsx`

**Alteracao 1 — Unificar `filteredTemplates`** (linha ~176):
- Apos filtrar os `templates`, converter os `commTemplates` ativos para o mesmo formato visual e concatenar
- Mapear campos: `body` -> `content`, `subject` -> `subject`, `channel` -> `type`, `name` -> `name`
- Aplicar o mesmo filtro de search e channel aos communication_templates

**Alteracao 2 — Corrigir `recommendedTemplates`** (linha ~213):
- Remover `.filter(t => t.usageCount > 0)` para incluir templates sem uso
- Ordenar por conversao quando disponivel, senao por data de criacao

**Alteracao 3 — Adaptar `renderTemplateCard`** (linha ~318):
- Suportar um campo `_source: 'templates' | 'communication'` para distinguir a origem
- Quando a origem e `communication_templates`, usar o `body` e `subject` diretamente no handler de selecao (com suporte a dynamic templates via `renderDynamicTemplate`)

### Ficheiros Afetados

| Ficheiro | Alteracao |
|---|---|
| `src/components/inbox/InboxTemplatePanel.tsx` | Unificar fontes, corrigir filtro recomendados, adaptar card render |

### Resultado Esperado

- Tab "Todos" mostra os 8 communication templates (e quaisquer templates da tabela `templates` quando existirem)
- Tab "Recomendados" mostra os templates por relevancia sem exigir uso previo
- Selecionar um template aplica o conteudo normalmente no compositor de mensagem

