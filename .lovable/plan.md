
# Corrigir Instagram Looter no menu lateral

## Problema
O Instagram Looter esta renderizado **fora** do array `filteredNavigationGroups`, directamente no JSX com apenas uma verificacao de workspace (`metodopare`). A propriedade `moduleSlug` que adicionamos nao tem efeito porque o `renderNavGroup` nao verifica modulos instalados -- essa logica so existe no `useMemo` que filtra o array `navigationGroups`.

## Solucao
Adicionar uma verificacao de `installedModuleIds` ao bloco condicional do Instagram Looter, para que alem de verificar o workspace, tambem verifique se o modulo esta instalado.

## Seccao Tecnica

### Ficheiro a alterar

**`src/components/layout/Sidebar.tsx`** -- linha 569

Alterar de:
```typescript
{currentWorkspace?.slug === "metodopare" && (
```

Para:
```typescript
{currentWorkspace?.slug === "metodopare" && installedModuleIds.includes("instagram-looter") && (
```

Apenas 1 linha a modificar. A variavel `installedModuleIds` ja esta disponivel no componente.
