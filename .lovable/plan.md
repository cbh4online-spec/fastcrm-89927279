

# Corrigir links do Portal B2B para usar dominio personalizado

## Problema

Os links do portal de clientes B2B (e.g. "Ver Portal", links de convite) usam `window.location.origin` para construir o URL. Quando o administrador esta no dashboard via o dominio Lovable (`*.lovableproject.com` ou `*.lovable.app`), o link gerado aponta para esse dominio em vez do dominio personalizado `https://fastcrm.metodopare.ai`.

## Solucao

Criar uma funcao utilitaria que resolve o dominio publico correto, utilizando o campo `custom_domain` da tabela `store_settings` (padrao ja existente no projeto para a loja e comunidade). Se nao houver dominio personalizado configurado, usa o dominio publicado como fallback (`https://fastcrm.lovable.app`).

## Alteracoes

### 1. Criar helper `src/utils/getPublicDomain.ts`

Funcao simples que retorna o dominio publico correto:
- Se `window.location.hostname` nao contem `lovable.app` nem `lovableproject.com`, usa `window.location.origin` (ja esta no dominio correto)
- Caso contrario, retorna `https://fastcrm.metodopare.ai` como fallback (dominio publicado do projeto)

Alternativa mais dinamica: criar um hook `usePublicBaseUrl` que consulta `store_settings.custom_domain` do workspace atual. Mas dado que o dominio publicado e fixo, a abordagem com fallback estatico e mais simples e rapida.

### 2. Atualizar `src/pages/ClientUsersPage.tsx`

Substituir:
```
`${window.location.origin}/client/login?workspace=${currentWorkspace.slug}`
```
Por:
```
`${getPublicBaseUrl()}/client/login?workspace=${currentWorkspace.slug}`
```

### 3. Atualizar `src/pages/B2BPortalSettingsPage.tsx`

Mesma substituicao do `window.location.origin` pelo helper.

### 4. Atualizar `src/components/client-users/ClientUsersList.tsx`

Na linha que gera o `portalUrl` para o convite, substituir `window.location.origin` pelo helper.

## Ficheiros

| Ficheiro | Acao |
|---|---|
| `src/utils/getPublicDomain.ts` | Criar |
| `src/pages/ClientUsersPage.tsx` | Editar (linha 13-15) |
| `src/pages/B2BPortalSettingsPage.tsx` | Editar (linha 40-42) |
| `src/components/client-users/ClientUsersList.tsx` | Editar (linha 96) |

## Logica do helper

```text
getPublicBaseUrl():
  hostname = window.location.hostname
  se hostname NAO contem "lovable.app" E NAO contem "lovableproject.com":
    retorna window.location.origin  (dominio proprio, ja correto)
  senao:
    retorna "https://fastcrm.metodopare.ai"  (fallback publicado)
```

Esta abordagem garante que os links funcionam corretamente tanto no ambiente de preview/desenvolvimento como em producao com dominio personalizado.

