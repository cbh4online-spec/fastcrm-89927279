

# Plano: Seleção de páginas/perfis sociais do GHL por workspace

## Problema
Com múltiplos workspaces, cada um ligado a uma location GHL diferente, não é possível ver nem escolher quais páginas/perfis de redes sociais (Instagram, Facebook, WhatsApp) estão associados a cada workspace.

## Abordagem

### 1. Nova Edge Function `ghl-list-social-channels`
**Ficheiro:** `supabase/functions/ghl-list-social-channels/index.ts`

- Recebe `{ workspace_id }` via POST
- Lê a `ghl_api_key_encrypted` e `ghl_location_id` da config do workspace
- Chama a API do GHL:
  - `GET https://services.leadconnectorhq.com/social-media-posting/{locationId}/oauth/facebook/accounts` — páginas Facebook
  - `GET https://services.leadconnectorhq.com/social-media-posting/{locationId}/oauth/instagram/accounts` — contas Instagram  
  - `GET https://services.leadconnectorhq.com/locations/{locationId}` — info do WhatsApp associado
- Retorna a lista de páginas/perfis encontrados com id, nome, tipo e estado

### 2. Migração: nova tabela `workspace_ghl_social_channels`
Armazena os canais selecionados por workspace:

| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid PK | — |
| workspace_id | uuid FK | Workspace |
| channel_type | text | `instagram`, `facebook`, `whatsapp` |
| ghl_account_id | text | ID da conta/página no GHL |
| account_name | text | Nome da página/perfil |
| is_active | boolean | Se está ativo neste workspace |
| created_at | timestamptz | — |

RLS: acesso por workspace membership.

### 3. UI: secção "Canais Sociais" no WorkspaceGHLSettings
**Ficheiro:** `src/components/settings/sections/WorkspaceGHLSettings.tsx`

- Botão "Carregar canais do GHL" que invoca a edge function
- Mostra lista de páginas/perfis encontrados com switches para ativar/desativar cada um
- Grava a seleção na tabela `workspace_ghl_social_channels`
- Badge com estado de cada canal (conectado/desconectado)

### Ficheiros a criar/editar
| Ficheiro | Alteração |
|---|---|
| `supabase/functions/ghl-list-social-channels/index.ts` | **Novo** — busca canais sociais da API GHL |
| `src/components/settings/sections/WorkspaceGHLSettings.tsx` | Adicionar secção de seleção de canais |
| Migração SQL | **Nova** — tabela `workspace_ghl_social_channels` + RLS |

