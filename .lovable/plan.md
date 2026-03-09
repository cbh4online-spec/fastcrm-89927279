

## Diagnóstico

O código actual das rotas está **correcto** -- `/marketplace/:workspaceSlug` (linha 689) é mais específico que `/*` (linha 760) e o React Router v6 deve dar prioridade à rota pública.

O que o screenshot mostra (Marketplace de Extensões) corresponde ao **build anterior** que ainda está publicado no domínio `fastcrm.metodopare.ai`. O preview do Lovable confirma que o routing foi actualizado (mostra login page em vez do dashboard marketplace).

## Solução

1. **Republicar a app** no domínio custom para que o novo código de routing entre em vigor.

2. **Pequena melhoria de segurança** -- mover a rota `/marketplace` (sem slug, linha 655) para **fora** do `CRMRoutes` e colocá-la ao lado das outras rotas públicas de marketplace, evitando qualquer ambiguidade:

**`src/App.tsx`**
- Remover a linha 655: `<Route path="/marketplace" element={<Navigate to="/dashboard/marketplace" replace />} />`
- Adicionar junto às rotas públicas de marketplace (após linha 689):
  ```tsx
  <Route path="/marketplace" element={<Navigate to="/dashboard/marketplace" replace />} />
  ```

Isto garante que **todas** as rotas `/marketplace*` são resolvidas no nível superior do router, sem depender do fallback `/*` → `CRMRoutes`.

### Ficheiros a editar
- `src/App.tsx` (mover 1 linha)

