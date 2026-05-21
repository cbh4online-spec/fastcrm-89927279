# Controlo de Permissões por Função — Workspace

## Diagnóstico

Estado atual:
- `WorkspaceContext` já expõe `role: WorkspaceRole` (`owner | admin | agent | viewer | agency | hr`).
- Permissões estão **dispersas e inconsistentes**:
  - `useCanViewCostMargin` (custo/margem) faz check manual.
  - `useDashboardRole` mapeia roles para "comercial/gestor/admin/suporte".
  - `useProfileMenuPermissions` / `useFieldPermissions` lêem de tabelas DB.
  - Várias rotas (`AIRoutes`, `HRRoutes`, `SecurityRoutes`, `PartnerRoutes`, etc.) **não validam role** — qualquer membro do workspace acede.
- Edge functions do Control Plane (`admin-user-action`, `cloud_status`, etc.) validam super_admin caso a caso, sem helper partilhado para `owner/admin`.
- Sem matriz canónica documentada — cada PR adivinha.

Resultado: privilege creep latente. Um `viewer` consegue navegar a páginas administrativas; um `agent` vê dados financeiros que não devia.

## Decisões de Produto

**Matriz canónica (SSoT)** das 4 funções:

| Capacidade | owner | admin | agent | viewer |
|---|---|---|---|---|
| Gerir workspace (settings, billing, members) | ✅ | ✅ | ❌ | ❌ |
| Configurar integrações / canais / IA | ✅ | ✅ | ❌ | ❌ |
| Ver custos, margens, financeiros (P&L, SAF-T) | ✅ | ✅ | ❌ | 👁️ leitura |
| CRUD em leads, contactos, deals, tarefas | ✅ | ✅ | ✅ | ❌ |
| Inbox, mensagens, atividades | ✅ | ✅ | ✅ | 👁️ leitura |
| Reports operacionais | ✅ | ✅ | ✅ | 👁️ leitura |
| Apagar / bulk / export | ✅ | ✅ | ❌ | ❌ |
| Catálogo (produtos, preços) | ✅ | ✅ | 👁️ leitura | 👁️ leitura |
| HR, Security, Audit Logs | ✅ | ✅ | ❌ | ❌ |

`agency` herda de `admin`; `hr` herda de `agent` + acesso total ao módulo HR. `super_admin` faz bypass global.

## Estrutura Técnica

### 1. SSoT de capabilities — `src/lib/permissions/capabilities.ts`

```ts
export const CAPABILITIES = [
  "workspace.manage", "workspace.billing", "members.manage",
  "integrations.manage", "ai.configure",
  "finance.view", "finance.manage",
  "crm.read", "crm.write", "crm.delete", "crm.bulk_export",
  "inbox.read", "inbox.reply",
  "catalog.read", "catalog.write",
  "reports.operational", "reports.executive",
  "hr.access", "security.access", "audit.view",
] as const;
export type Capability = typeof CAPABILITIES[number];

export const ROLE_CAPABILITIES: Record<WorkspaceRole, Capability[]> = {
  owner:  [/* todas */],
  admin:  [/* todas exceto workspace.billing irreversível */],
  agent:  ["crm.read","crm.write","inbox.read","inbox.reply","catalog.read","reports.operational"],
  viewer: ["crm.read","inbox.read","catalog.read","reports.operational","finance.view"],
  agency: /* mesmo que admin */,
  hr:     /* agent + hr.access */,
};
```

### 2. Hook canónico — `src/hooks/useCapability.ts`
```ts
export function useCapability(cap: Capability): boolean
export function useCapabilities(): { can: (c: Capability) => boolean, role }
```
Substitui progressivamente `useCanViewCostMargin`, checks ad-hoc.

### 3. Guard de rota — `src/components/guards/CapabilityGuard.tsx`
```tsx
<CapabilityGuard need="finance.manage" fallback={<AccessDenied/>}>
  <BillingPage/>
</CapabilityGuard>
```
Wrapper aplicado nos `*Routes.tsx` por grupo (não rota a rota).

### 4. Backend — `supabase/functions/_shared/capabilities.ts`
Mesma matriz, função `requireCapability(req, workspaceId, cap)` que:
- Valida JWT (`auth.getUser`)
- Lê `workspace_members.role`
- Verifica `is_super_admin` (bypass)
- Devolve 403 estruturado se falhar
- Loga em `admin_audit_logs` quando ação é sensível

### 5. RLS — função SQL `has_capability(uid, ws, cap)`
Migration cria função SECURITY DEFINER que espelha a matriz. Políticas críticas (ex.: `invoices`, `products`, `workspace_members`) passam a usar `has_capability(auth.uid(), workspace_id, 'finance.manage')` em vez de checks ad-hoc.

### 6. UI de "Access Denied"
Componente `<AccessDenied capability="..." />` consistente: ícone, mensagem PT-pt, botão "Voltar ao dashboard", link "Pedir acesso ao admin".

## Plano de Implementação (faseado)

**Fase 1 — Fundação (sem breaking changes)**
1. Criar `capabilities.ts` (matriz SSoT) + `useCapability` + `CapabilityGuard` + `AccessDenied`.
2. Criar `supabase/functions/_shared/capabilities.ts`.
3. Migration: função `has_capability(uuid, uuid, text)`.
4. Documentar matriz em `docs/permissions.md` + memory.

**Fase 2 — Aplicação no Frontend**
5. Envolver grupos de rotas críticas com `CapabilityGuard`:
   - `SecurityRoutes` → `security.access`
   - `HRRoutes` → `hr.access`
   - `RevenueFlightControlRoutes` (billing/finance) → `finance.manage`
   - `PartnerRoutes` (admin areas) → `workspace.manage`
   - Settings de workspace, integrações, IA → `integrations.manage`
6. Esconder itens de menu via `useCapability` no `routeManifest`.
7. Migrar `useCanViewCostMargin` → `useCapability("finance.view")` (mantém shim para retrocompat).

**Fase 3 — Backend / Control Plane**
8. Edge functions sensíveis adoptam `requireCapability`:
   - `admin-user-action`, `workspace-*`, `billing-*`, `saft-import`, `saft-analyze`.
9. Reforçar RLS em tabelas: `invoices`, `invoice_payments`, `workspace_members`, `user_roles`.

**Fase 4 — Testes & QA**
10. Vitest: `src/test/permissions/capability-matrix.test.ts` valida cada par (role, cap).
11. Smoke E2E manual: login com cada role, verificar matriz acima.
12. Linter Supabase + corrida de testes.

## Critérios de Aceitação

- [ ] Matriz canónica única em `capabilities.ts` (frontend) e `_shared/capabilities.ts` (backend) — valores espelhados.
- [ ] `CapabilityGuard` aplicado a todos os grupos de rotas listados na Fase 2.
- [ ] `viewer` não consegue navegar para `/dashboard/security`, `/dashboard/hr`, `/dashboard/billing` (vê `AccessDenied`).
- [ ] `agent` não vê coluna de custo/margem em produtos nem rotas financeiras.
- [ ] Edge functions sensíveis devolvem 403 estruturado quando capability falha + log em `admin_audit_logs`.
- [ ] Itens de menu escondidos quando o user não tem capability.
- [ ] Super admin continua a fazer bypass de tudo.
- [ ] Testes vitest verdes para a matriz.
- [ ] Zero regressões: utilizadores existentes (owner/admin) mantêm acesso a tudo o que já tinham.

## Riscos

- **Rotura silenciosa**: aplicar guards em rotas que `agent` usava no dia-a-dia → mitigar com QA por role antes de merge.
- **Drift frontend/backend**: matriz duplicada pode divergir → mitigar com teste partilhado e comentário "SSoT mirror".
- **RLS apertada demais**: queries existentes podem falhar → fase 3 vai atrás da 2 com dataset de teste.
- **Agency/hr roles**: pouco usados, fácil esquecer → matriz cobre explicitamente.

## Pontos por Validar (antes de avançar)

1. **Âmbito desta primeira PR**: faço só a Fase 1 + 2 (frontend + fundação), ou incluo já Fase 3 (edge functions) e Fase 4 (RLS) na mesma entrega? Recomendo entregar **Fases 1+2** primeiro, validar em preview com diferentes contas, e só depois mexer em RLS/edge functions (mais arriscado).
2. **`viewer` vê finance ou não?** Na matriz acima coloquei `finance.view` (leitura de KPIs/faturas) mas sem export. Confirma?
3. **`agency` = `admin`?** No `WorkspaceContext` defaults para `agency` quando não há membership explícito. Mantém igual a admin ou trato como role separado mais restrito?
4. **Itens de menu**: esconder completamente quando sem capability, ou mostrar disabled com tooltip "Sem permissão"?
