

# Corrigir Link do Convite de Vendedor

## Problema

O link enviado por email usa `window.location.origin` do browser, que no ambiente de preview e `https://3e82dfd9-...lovableproject.com`. O link correto deveria usar o dominio de producao `https://fast.metodopare.ai` com o path `/c2c/{slug}/invite/{token}`.

## Solucao

### 1. Usar dominio de producao no edge function

Em vez de confiar no `domain` enviado pelo frontend, o edge function vai determinar o dominio correto:
- Verificar se o workspace tem um `custom_domain` configurado na tabela `store_settings`
- Se nao, usar o dominio publicado do projeto (`https://fastcrm.lovable.app`)
- Fallback para o `domain` enviado pelo frontend

### 2. Alteracoes

**Ficheiro: `supabase/functions/send-c2c-seller-invite/index.ts`**
- Adicionar query a `store_settings` para buscar `custom_domain` do workspace
- Construir o `inviteUrl` usando o custom domain quando disponivel
- Manter fallback para o dominio enviado pelo frontend

**Ficheiro: `src/hooks/useC2CSellerInvites.ts`**
- Continuar a enviar `window.location.origin` como fallback, sem alteracoes necessarias

### 3. Logica de resolucao do dominio no edge function

```text
1. Buscar store_settings.custom_domain WHERE workspace_id = workspaceId
2. Se custom_domain existe -> usar https://{custom_domain}
3. Senao -> usar o domain enviado pelo frontend (fallback)
4. Construir URL: {dominio_resolvido}/c2c/{workspace.slug}/invite/{token}
```

Isto garante que mesmo quando o admin envia o convite a partir do ambiente de preview, o link no email aponta sempre para o dominio correto de producao.

### Sem alteracoes de base de dados
Usa a coluna `custom_domain` ja existente em `store_settings`.
