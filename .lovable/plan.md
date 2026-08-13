# Atalho de Gestão Super Admin no menu do utilizador

## Diagnóstico
- O menu do avatar (canto superior direito) só tem **Perfil**, **Definições** e **Terminar sessão** — não tem entrada para a área de Super Admin.
- Existe um botão de escudo na barra superior visível a super admins, mas navega para `/n-v2`, rota que não existe no router. As páginas de backoffice estão registadas em `/super-admin-v2` (e sub-rotas: workspaces, users, subscriptions, permissions, pricing, limits, ai, payments), todas protegidas por `RequireSuperAdmin`.

## Decisões de produto/UX
1. Adicionar no dropdown do avatar, apenas quando `isSuperAdmin`, um item **Gestão SaaS** com ícone de escudo, separado por divisória acima de Terminar sessão.
2. Corrigir o destino do atalho de escudo da barra superior para `/super-admin-v2`, para os dois pontos de entrada serem coerentes.
3. Manter o item invisível para utilizadores sem o papel (a proteção real continua na rota `RequireSuperAdmin`).

## Estrutura técnica
- `src/components/layout/TopBar.tsx`:
  - `DropdownMenuContent`: novo `DropdownMenuItem` condicional a `isSuperAdmin` → `navigate("/super-admin-v2")`, ícone `ShieldCheck`, label `t('saasManagement')` (já existe em `pt/nav.json`).
  - Botão de escudo existente: trocar `/n-v2` por `/super-admin-v2`.
- Sem alterações de dados, RLS ou backend.

## Critérios de aceitação
- Super admin vê "Gestão SaaS" no menu do avatar e chega ao backoffice.
- Utilizador normal não vê o item.
- O ícone de escudo na barra superior abre a mesma página (sem 404).

## Riscos
- Nenhum relevante; alteração apenas de apresentação e navegação.
