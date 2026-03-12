

# Plano: Corrigir erro `operator does not exist: order_note_status = text`

## Problema
A coluna `status` da tabela `order_notes` usa um tipo **enum** Postgres (`order_note_status`). O cliente Supabase JS envia filtros como texto, e o PostgREST não consegue comparar enum com text directamente — daí o erro.

## Solução
Criar uma migração que altera a coluna `status` de **enum para TEXT** com um check constraint para manter a validação dos valores permitidos. Isto resolve a incompatibilidade sem alterar nenhum código frontend.

### Migração SQL
1. Alterar `order_notes.status` de `order_note_status` enum para `TEXT`
2. Adicionar `CHECK` constraint com os valores válidos do enum
3. Manter o default `'draft'`

### Ficheiros a alterar
| Ficheiro | Alteração |
|---|---|
| Nova migração SQL | ALTER COLUMN status TYPE TEXT, adicionar CHECK constraint |

Nenhuma alteração de código frontend necessária — os valores usados nos `.eq()` e `.neq()` já são strings válidas.

