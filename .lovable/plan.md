
# Plano: Perfis de Gestor + Auto-Assign Inteligente

## 1. Migration — Tabela `manager_profiles`

Criar tabela com categorias fixas por dimensão:

- **manager_profiles**
  - `id`, `workspace_id`, `user_id` (unique por workspace)
  - `segments` (text[]) — ex: ["Tecnologia", "Saúde"]
  - `territories` (text[]) — ex: ["Norte", "Centro"]
  - `client_types` (text[]) — ex: ["Enterprise", "PME", "Governo"]
  - `is_active` (boolean, default true)
  - `created_at`, `updated_at`

- **manager_profile_categories** (valores disponíveis por workspace)
  - `id`, `workspace_id`
  - `dimension` (enum: segment, territory, client_type)
  - `value` (text)
  - `is_active` (boolean)

RLS: membros do workspace podem ler; admins/owners podem modificar.

## 2. Matching obrigatório no Auto-Assign

Alterar o `assignmentEngine.ts`:
- Ao atribuir, verificar se a lead/contacto/empresa tem `segment`, `territory` ou `client_type`
- Filtrar gestores que tenham match nas dimensões correspondentes
- Se nenhum gestor tem match → entidade fica na queue (não atribuída)
- Se múltiplos gestores com match → escolher por menor carga

## 3. UI — Perfil do Gestor

No card/detalhe do gestor, adicionar:
- Badges com segmentos, territórios e tipos de cliente
- Edição inline das categorias atribuídas

## 4. UI — Configuração de Categorias

No cockpit, adicionar secção para gerir as categorias disponíveis por dimensão (CRUD simples).

## 5. UI — Auto-Assign melhorado

O diálogo de Auto-Assign passa a mostrar:
- Contagem de entidades por dimensão
- Warning quando há entidades sem match possível

## Ficheiros a alterar
- Migration (nova tabela)
- `src/lib/commercial/assignmentEngine.ts` — matching logic
- `src/pages/dashboard/GestoresPage.tsx` — UI perfis + categorias
- `src/hooks/useManagerPortfolio.ts` — buscar perfis

## Riscos
- As leads/contactos/empresas precisam de ter campos de segmento/território para o matching funcionar. Se não tiverem, o matching não se aplica e a lead fica não atribuída (comportamento correcto para matching obrigatório).
