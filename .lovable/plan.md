

# Plano: Corrigir URL do Portal B2B

## Problema Identificado

O portal B2B não abre porque o URL está configurado para um domínio externo que não está a funcionar:

| Componente | URL Actual (Problema) | URL Correcto |
|------------|----------------------|--------------|
| Portal B2B | `https://fastcrm.metodopare.ai/client/login` | `https://fastcrm.lovable.app/client/login` |

### Causa Raiz

O código em múltiplos ficheiros tem o URL do portal **hardcoded** para `fastcrm.metodopare.ai`, que é um domínio custom que pode não estar configurado ou a resolver correctamente.

### Ficheiros Afectados

1. `src/pages/B2BPortalSettingsPage.tsx` (linha 40-42)
2. `src/pages/ClientUsersPage.tsx` (linha 13-15)
3. `src/components/client-users/ClientUsersList.tsx` (linha 96)

## Solução

Alterar todos os URLs do portal para usar o domínio actual da aplicação em vez de um domínio hardcoded externo.

### Abordagem

Usar `window.location.origin` para construir URLs dinâmicos que funcionam em qualquer ambiente:

```typescript
// ANTES (hardcoded - não funciona)
const portalUrl = `https://fastcrm.metodopare.ai/client/login?workspace=${slug}`;

// DEPOIS (dinâmico - funciona em qualquer ambiente)
const portalUrl = `${window.location.origin}/client/login?workspace=${slug}`;
```

## Alterações de Código

### 1. B2BPortalSettingsPage.tsx

```typescript
// Linha 40-42
const portalUrl = currentWorkspace?.slug 
  ? `${window.location.origin}/client/login?workspace=${currentWorkspace.slug}`
  : `${window.location.origin}/client/login`;
```

### 2. ClientUsersPage.tsx

```typescript
// Linha 13-15
const portalUrl = currentWorkspace?.slug 
  ? `${window.location.origin}/client/login?workspace=${currentWorkspace.slug}`
  : `${window.location.origin}/client/login`;
```

### 3. ClientUsersList.tsx

```typescript
// Linha 96
portalUrl: `${window.location.origin}/client/login`,
```

## Benefícios

1. O portal funciona em **qualquer ambiente** (preview, produção, domínio custom)
2. Não requer configuração de DNS externos
3. A sessão de autenticação é partilhada no mesmo domínio

## Teste

Após as alterações:
1. Aceder a `/dashboard/b2b-portal`
2. Clicar em "Abrir Portal"
3. O portal deve abrir em `fastcrm.lovable.app/client/login` (ou preview URL correspondente)
4. O login deve funcionar normalmente

