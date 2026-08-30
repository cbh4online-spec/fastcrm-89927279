# Gestão SaaS: alterar plano e atribuir créditos por workspace

## Diagnóstico

O que existe hoje (verificado no código):

- No Super Admin clássico (`/super-admin`, secção Workspaces) já existem ambas as ações: diálogo "Alterar plano" (grava em `workspace_subscriptions`: plano, estado, fim de trial, fim de período, com registo em `log_admin_action`) e diálogo "Atribuir créditos" (RPC `admin_assign_credits`, aceita valores positivos e negativos, devolve novo saldo).
- No Backoffice V2 (`/super-admin-v2/...`), que é o ecrã moderno de Gestão SaaS, as páginas de Workspaces e de Subscrições são **apenas de leitura**: `useBillingAdmin` faz só consultas e não há nenhuma mutação nessas páginas.

Ou seja, a capacidade existe mas está apenas no ecrã antigo. Falta trazê-la para a Gestão SaaS V2.

## Decisões de produto/UX

- Reutilizar exatamente a mesma lógica de negócio (mesma tabela, mesmo RPC, mesma auditoria) — não criar um segundo caminho paralelo.
- Disponibilizar as ações em dois sítios do V2:
  - Página **Subscrições**: menu de ações por linha → "Alterar plano" e "Atribuir créditos".
  - Página **Workspaces**: mesmas ações no painel de detalhe do workspace selecionado.
- Diálogos com confirmação explícita, mostrando estado atual (plano, estado, saldo de créditos) antes e depois.
- Créditos: campo com valor positivo (adicionar) ou negativo (remover), motivo obrigatório, aviso claro quando é remoção.
- Após sucesso: toast, invalidação das queries e atualização imediata das listas/KPIs.

## Estrutura técnica

Novo hook partilhado `src/hooks/useSaasAdminActions.ts`:
- `changePlan({ workspaceId, plan, status, trialEnd, periodEnd })` — upsert em `workspace_subscriptions` + `log_admin_action` com `plan_changed`.
- `assignCredits({ workspaceId, amount, description })` — RPC `admin_assign_credits` (`p_workspace_id`, `p_admin_user_id`, `p_credits_amount`, `p_description`), validação do resultado `success`.
- Invalidação de `backoffice-v2/billing`, workspaces V2 e `super-admin-workspaces` para os dois ecrãs ficarem coerentes.

Novos componentes em `src/components/backoffice-v2/`:
- `ChangePlanDialog.tsx` — seleção de plano, estado da subscrição, datas de trial/período.
- `AssignCreditsDialog.tsx` — montante, motivo, pré-visualização do efeito.

Alterações:
- `BackofficeSubscriptionsV2.tsx`: coluna de ações + ligação aos diálogos.
- `BackofficeWorkspacesV2.tsx`: botões no painel de detalhe.
- `WorkspacesSection.tsx` (ecrã antigo): passa a usar o hook partilhado, mantendo o comportamento atual.

Segurança: ações continuam protegidas por `RequireSuperAdmin` no frontend e por `is_super_admin` / RLS no backend; a auditoria regista quem, o quê e quando. Sem alterações de esquema.

## Plano de implementação

1. Extrair a lógica atual para `useSaasAdminActions`.
2. Criar os dois diálogos reutilizáveis.
3. Ligar na página de Subscrições V2.
4. Ligar na página de Workspaces V2.
5. Refatorar o ecrã antigo para o hook partilhado.
6. Typecheck + verificação visual autenticada dos dois ecrãs.

## Critérios de aceitação

- Em `/super-admin-v2/subscriptions` é possível alterar plano e estado de qualquer workspace e ver a lista/KPIs atualizados.
- Em `/super-admin-v2/subscriptions` e no detalhe de Workspaces é possível adicionar e remover créditos com motivo, vendo o novo saldo.
- Ambas as ações ficam registadas em auditoria.
- Utilizador não super admin não vê nem consegue executar as ações.
- Estados de loading, erro e sucesso tratados; português europeu; funciona em ecrã pequeno.

## Riscos e pontos por validar

- Confirmar a lista final de planos a oferecer no seletor (hoje: free, starter, basic, pro, agency).
- Alterar plano manualmente não sincroniza com o Stripe; fica como ação administrativa local (indicado na UI).
