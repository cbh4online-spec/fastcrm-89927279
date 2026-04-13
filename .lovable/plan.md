

# Plano: Restaurar entrada "Configuração" no menu do Marketplace C2C

## Problema
A entrada `c2c-config` ("Configuração") não existe no route manifest (`src/config/routeManifest.ts`), pelo que o menu do Marketplace C2C não mostra o link para a página de configuração (onde está a secção de domínio público).

## Alteração

### Ficheiro: `src/config/routeManifest.ts`
Adicionar a entrada `c2c-config` após a linha 261 (`c2c-moderation`):

```typescript
e("c2c-config",      "Configuração",     "/dashboard/c2c/config",           Settings,      "marketplace-c2c", { moduleSlug: "marketplace-c2c" }),
```

A rota `/dashboard/c2c/config` já existe em `src/routes/C2CRoutes.tsx` e o ícone `Settings` já está importado no ficheiro.

### Resultado
O menu lateral do Marketplace C2C passará a incluir "Configuração" no final da lista, dando acesso direto à página com a secção "Domínio Público" onde se configura o domínio customizado.

