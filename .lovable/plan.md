

# Corrigir prefixo do URL do Workspace

## Problema
No ficheiro `WorkspaceSettings.tsx` (linha 409), o prefixo do URL do workspace está hardcoded como `app.fastcrm.com/` — o domínio correcto é `fastcrm.metodopare.ai`.

## Alteração

| Ficheiro | Linha | De | Para |
|---|---|---|---|
| `src/components/settings/sections/WorkspaceSettings.tsx` | 409 | `app.fastcrm.com/` | `fastcrm.metodopare.ai/` |

Uma única alteração de string.

