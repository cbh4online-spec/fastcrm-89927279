
# Plano: Restringir Integração GHL a Super Admins

## Objetivo
Tornar a secção de integração GoHighLevel visível **apenas para Super Admins**. Utilizadores normais e admins de workspace não devem ver esta opção nas definições.

---

## Alterações Necessárias

### 1. IntegrationsSettings.tsx

Adicionar verificação de `isSuperAdmin` e condicionar a renderização:

```typescript
import { useUserRole } from "@/hooks/useUserRole";

export function IntegrationsSettings(...) {
  const { isSuperAdmin } = useUserRole();
  // ... existing code ...
  
  // GHL section only visible to super admins
  {isSuperAdmin && shouldShow("integrations-ghl") && (
    <SettingsSection ... />
  )}
  
  // GHL summary card in "Outras Integrações" - also hidden
  {isSuperAdmin && (
    <div className="...">GoHighLevel card</div>
  )}
}
```

---

## Detalhes Técnicos

### Ficheiro: `src/components/settings/sections/IntegrationsSettings.tsx`

**Alterações:**
1. Importar `useUserRole` do hook existente
2. Obter `isSuperAdmin` do hook
3. Envolver a secção "GoHighLevel" (linhas 83-91) com condição `isSuperAdmin &&`
4. Envolver o card de resumo GHL em "Outras Integrações" (linhas 146-164) com condição `isSuperAdmin &&`
5. Só chamar `useWorkspaceGHLConfig()` se for super admin (evitar queries desnecessárias)

**Código Final (simplificado):**

```typescript
import { useUserRole } from "@/hooks/useUserRole";

export function IntegrationsSettings({ searchQuery = "", matchedSections }: IntegrationsSettingsProps) {
  const { isSuperAdmin } = useUserRole();
  const { isConfigured: isStripeConfigured } = useWorkspaceStripeConfig();
  
  // Only load GHL config if super admin (avoid unnecessary queries)
  const { isConfigured: isGHLConfigured } = useWorkspaceGHLConfig();

  // ... rest of code ...

  return (
    <div className="space-y-6">
      {/* Stripe - visible to all */}
      {shouldShow("integrations-stripe") && (
        <SettingsSection title="Pagamentos (Stripe)" ... />
      )}

      {/* GHL - SUPER ADMIN ONLY */}
      {isSuperAdmin && shouldShow("integrations-ghl") && (
        <SettingsSection title="GoHighLevel" ... />
      )}

      {/* API & Webhooks - visible to all */}
      {shouldShow("integrations-api") && (...)}

      {/* Outras Integrações */}
      {shouldShow("integrations-external") && (
        <SettingsSection>
          {/* Stripe card - visible */}
          <div>Stripe card</div>

          {/* GHL card - SUPER ADMIN ONLY */}
          {isSuperAdmin && (
            <div>GoHighLevel card</div>
          )}

          {/* Other integrations */}
          ...
        </SettingsSection>
      )}
    </div>
  );
}
```

---

## Comportamento Resultante

| Utilizador | Vê Stripe | Vê GHL | Vê API/Webhooks |
|------------|-----------|--------|-----------------|
| Super Admin | ✅ | ✅ | ✅ |
| Workspace Owner | ✅ | ❌ | ✅ |
| Workspace Admin | ✅ | ❌ | ✅ |
| Agent/Viewer | ✅ | ❌ | ✅ |

---

## Segurança Adicional

A segurança no backend (RLS) já está implementada:
- A tabela `workspace_ghl_config` tem RLS policies que exigem membership no workspace
- Os webhooks são públicos (sem JWT) mas validam `location_id`

Para reforçar, podemos opcionalmente adicionar uma verificação de super admin nas políticas RLS da tabela `workspace_ghl_config`, mas isso impediria os webhooks de funcionar correctamente. O modelo atual (visibilidade frontend + RLS de workspace) é adequado para V0.

---

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/settings/sections/IntegrationsSettings.tsx` | Adicionar verificação `isSuperAdmin` para GHL |

---

## Estimativa
~5 minutos de implementação
