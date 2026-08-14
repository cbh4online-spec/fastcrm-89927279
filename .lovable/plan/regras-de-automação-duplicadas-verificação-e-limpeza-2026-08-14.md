# Regras de Automação duplicadas — verificação e limpeza

## Diagnóstico (confirmado na base de dados)

Existem 36 regras no total, das quais 13 pertencem a 5 grupos duplicados (mesmo workspace + mesmo nome + mesmo gatilho):

| Workspace | Regra | Gatilho | Cópias | Ações | Execuções |
|---|---|---|---|---|---|
| METODOPARE | Qualificação Inteligente | lead_created | 4 | 0 | 0 |
| METODOPARE | Lembrete para contact | contact_updated | 3 | 0 | 0 |
| METODOPARE | Follow-up para lead | lead_updated | 2 | 1 cada | 0 |
| METODOPARE | 1ª Mensagem → Boas-vindas | first_message_from_lead | 2 (inativas) | 2 cada | 0 |
| Blecksen | Follow-up para lead | lead_updated | 2 | 1 cada | 0 |

Nenhuma das cópias tem histórico de execução (`automation_logs` = 0), pelo que a limpeza não perde rastreabilidade. Em cada grupo há normalmente uma regra `active` (a mais antiga) e as restantes em `draft`.

Risco atual: em "Qualificação Inteligente" e "Follow-up para lead" há mais do que uma regra `is_active = true` com o mesmo gatilho — quando passarem a `active` disparam ações repetidas para o mesmo lead.

## Decisões

1. Não apagar nada automaticamente sem confirmação — a limpeza é feita pelo utilizador na interface.
2. Adicionar deteção visível de duplicados na página de Automações, com ação de remoção em lote das cópias redundantes.
3. Prevenir novos duplicados na criação/edição.

## Plano de implementação

### 1. Deteção na interface (`/dashboard/automations`)
- Novo utilitário que agrupa as regras por `name` normalizado + `trigger` e devolve os grupos com mais de 1 registo.
- Banner de aviso no topo da lista: "N regras duplicadas detetadas" com botão "Rever duplicados".
- Badge "Duplicada" nas linhas afetadas.

### 2. Diálogo "Rever duplicados"
- Lista por grupo, mostrando de cada cópia: estado (`active`/`draft`), ativa sim/não, nº de ações, nº de condições, data de criação e nº de execuções.
- Sugestão automática de qual manter: a que tem execuções; em empate, a que tem mais ações; em empate, a mais antiga.
- Seleção editável + botão "Eliminar selecionadas" com confirmação. Eliminação em lote via `delete().in("id", ids)`, seguida de invalidação da query.

### 3. Prevenção
- Na criação/edição, validar (com pedido à base de dados no workspace atual) se já existe regra com o mesmo nome e gatilho; bloquear com mensagem clara e opção de abrir a regra existente.
- Ação rápida que gera regras "Ação rápida criada automaticamente…" passa a reutilizar a regra existente em vez de criar nova.

### 4. Regra de segurança adicional
- Impedir mais do que uma regra `active` + `is_active` com o mesmo gatilho e nome no mesmo workspace: ao ativar uma, avisar se já existir outra equivalente.

## Detalhes técnicos
- Ficheiros: `src/pages/Automations.tsx` (banner e badges), novo `src/components/automations/DuplicateRulesDialog.tsx`, novo `src/lib/automations/detectDuplicateRules.ts`, e o hook de automações usado pela página (adicionar `deleteMany` e verificação de duplicado).
- Comparação de nomes: minúsculas, sem acentos, espaços colapsados.
- Sem alterações de esquema na base de dados nesta fase; a limpeza dos 8 registos redundantes é feita pelo utilizador através do diálogo.

## Critérios de aceitação
- A página de Automações mostra os 5 grupos duplicados existentes.
- É possível eliminar as cópias e a lista fica com 28 regras, sem duplicados.
- Tentar criar uma regra com nome e gatilho já existentes é bloqueado com mensagem explícita.
- Sem novos erros de consola; estados vazio/carregamento/erro cobertos.

## Riscos por validar
- Se preferir limpeza direta por SQL (sem interface), posso apagar já as 8 cópias redundantes — diga e faço nessa forma.
