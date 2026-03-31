

## Activar Módulo HR no Workspace

### Abordagem

Inserir directamente um registo na tabela `workspace_modules` para activar o módulo `hr-management` no workspace actual. Isto é equivalente a clicar "Instalar" no Marketplace.

### Implementação

**1 migração SQL:**

```sql
-- Activate hr-management module for the workspace
INSERT INTO workspace_modules (workspace_id, module_id, status, subscribed_at, current_period_start)
SELECT 
  wm.id AS workspace_id,
  mm.id AS module_id,
  'active',
  now(),
  now()
FROM workspaces wm
CROSS JOIN marketplace_modules mm
WHERE mm.slug = 'hr-management'
  AND NOT EXISTS (
    SELECT 1 FROM workspace_modules wmod 
    WHERE wmod.workspace_id = wm.id AND wmod.module_id = mm.id
  )
LIMIT 1;
```

Isto activa o módulo para o primeiro workspace existente. O `ModuleGuard` verifica `workspace_modules` com status `active` ou `trial`, pelo que o acesso ficará imediatamente disponível.

Após a activação, basta navegar a `/dashboard/hr/time-tracking` no preview para testar o clock-in/clock-out do Jorge Cardoso.

### Alternativa

Se preferir activar manualmente: navegar a `/dashboard/marketplace` no preview, procurar "Recursos Humanos" e clicar Instalar/Activar.

