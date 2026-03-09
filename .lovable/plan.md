

## Diagnóstico

O screenshot mostra a página pública C2C a funcionar correctamente (layout METODOPARE com tema amarelo), o que indica que o routing `/marketplace/:workspaceSlug` já está activo **no preview**.

O código do botão "Entrar" está correcto:
```tsx
onClick={() => navigate(`/login?redirect=/c2c/${workspaceSlug}`)}
```

Isto navega para `/login` (que existe dentro de `CRMRoutes`) com redirect de volta ao marketplace após login. O `Login.tsx` lê o parâmetro `redirect` e redirecciona correctamente.

**Causa provável**: A app precisa de ser **republicada** para que as alterações de routing entrem em vigor no domínio custom `fastcrm.metodopare.ai`. No preview do Lovable, o botão deve funcionar.

**Melhoria adicional**: O redirect após login aponta para `/c2c/${workspaceSlug}` em vez de `/marketplace/${workspaceSlug}`. Embora ambas as rotas existam, devemos uniformizar para `/marketplace/` já que é o path público canónico.

## Plano

### 1. Corrigir o redirect do botão "Entrar" para usar `/marketplace/`
**Ficheiro**: `src/pages/c2c/C2CPublicMarketplace.tsx`
- Linha 427: Alterar `/login?redirect=/c2c/${workspaceSlug}` → `/login?redirect=/marketplace/${workspaceSlug}`

### 2. Corrigir o path do botão "Vender" para consistência
**Ficheiro**: `src/pages/c2c/C2CPublicMarketplace.tsx`
- Linha 358: Alterar `navigate('/c2c/${workspaceSlug}/sell')` → Adicionar rota `/marketplace/:workspaceSlug/sell` em `App.tsx`, ou manter `/c2c/` para sell (que já tem rota na linha 694)

### 3. Republicar a app
Após as alterações, a app deve ser republicada para o domínio custom.

**Total**: 1 ficheiro editado, ~2 linhas alteradas.

