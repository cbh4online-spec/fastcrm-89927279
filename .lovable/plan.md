

# Plano: Verificador de DNS para domínio customizado do Marketplace

## Objetivo
Adicionar um botão "Verificar DNS" na secção de domínio público que faz uma verificação em tempo real e atualiza o estado `custom_domain_verified` na base de dados.

## Abordagem

### 1. Edge Function `verify-marketplace-domain`
**Ficheiro:** `supabase/functions/verify-marketplace-domain/index.ts`

- Recebe `{ domain, workspace_id }` via POST
- Faz DNS lookup do domínio usando a API pública `https://dns.google/resolve?name={domain}&type=A`
- Verifica se o registo A aponta para `185.158.133.1`
- Atualiza `c2c_marketplace_config.custom_domain_verified` para `true` ou `false`
- Retorna o resultado com detalhes (IPs encontrados, estado)
- Inclui CORS headers e validação de JWT

### 2. Botão "Verificar DNS" no MarketplaceConfigPage
**Ficheiro:** `src/pages/dashboard/marketplace/MarketplaceConfigPage.tsx`

- Adicionar botão junto ao badge de estado (linha ~243-255)
- Ao clicar, chama a edge function via `supabase.functions.invoke('verify-marketplace-domain')`
- Mostra loading durante a verificação
- Atualiza o badge com o resultado (verde ✓ ou vermelho ✗ com detalhes)
- Toast com feedback: "DNS verificado com sucesso" ou "DNS ainda não está a apontar para o IP correcto"

### Ficheiros a editar/criar
| Ficheiro | Alteração |
|---|---|
| `supabase/functions/verify-marketplace-domain/index.ts` | **Novo** — edge function de verificação DNS |
| `src/pages/dashboard/marketplace/MarketplaceConfigPage.tsx` | Adicionar botão "Verificar DNS" + lógica de invocação |

Nenhuma migração necessária — a coluna `custom_domain_verified` já existe.

