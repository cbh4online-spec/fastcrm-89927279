# Permissões por Função (Workspace RBAC)

**SSoT**: `src/lib/permissions/capabilities.ts` (frontend) e
`supabase/functions/_shared/capabilities.ts` (backend). Os dois ficheiros
são **espelhados** — qualquer alteração tem de ser replicada nos dois lados.
O teste `src/test/permissions/capability-matrix.test.ts` valida a matriz.

## Funções

| Role | Descrição |
|---|---|
| `owner` | Proprietário do workspace. Acesso total, incluindo faturação. |
| `admin` | Administrador. Tudo excepto operações de faturação irreversíveis. |
| `agency` | Operador externo a gerir o workspace. Equivalente a `admin`. |
| `hr` | Acesso operacional + módulo Recursos Humanos. |
| `agent` | Operação diária — CRM, inbox, catálogo (leitura), reports operacionais. |
| `viewer` | Só leitura — CRM, inbox, catálogo, reports e KPIs financeiros. |

`super_admin` (em `user_roles`) faz **bypass global** de todas as capabilities.

## Matriz

Ver `ROLE_CAPABILITIES` em `capabilities.ts`. Resumo:

| Capability | owner | admin | agency | hr | agent | viewer |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| workspace.manage | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| workspace.billing | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| members.manage | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| integrations.manage | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| ai.configure | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| finance.view | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| finance.manage | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| crm.read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| crm.write | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| crm.delete | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| crm.bulk_export | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| inbox.read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| inbox.reply | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| catalog.read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| catalog.write | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| reports.operational | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| reports.executive | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| hr.access | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| security.access | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| audit.view | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

## Uso

**Frontend — proteger rota:**
```tsx
import { CapabilityGuard } from "@/components/guards/CapabilityGuard";

<CapabilityGuard need="security.access">
  <SecurityRoutes />
</CapabilityGuard>
```

**Frontend — esconder UI condicional:**
```tsx
import { useCapability } from "@/hooks/useCapability";

const canExport = useCapability("crm.bulk_export");
{canExport && <Button onClick={exportCsv}>Exportar</Button>}
```

**Backend — edge function:**
```ts
import { requireCapability } from "../_shared/capabilities.ts";

const check = await requireCapability(supabase, req, workspaceId, "finance.manage");
if (!check.ok) {
  return new Response(JSON.stringify({ error: check.error }), {
    status: check.status, headers: corsHeaders,
  });
}
```
