

# Corrigir Link e Anti-Spam no Convite de Vendedor

## Problemas Identificados

1. **Link errado**: O `custom_domain` esta `null` na tabela `store_settings` para o workspace metodopare. O edge function faz fallback para `window.location.origin` (que e o dominio de preview). Precisa de ter o dominio correto configurado E o path ajustado.

2. **Email marcado como spam**: O email atual usa `onboarding@resend.dev` (dominio de teste do Resend), nao tem estrutura HTML profissional (falta `<!DOCTYPE html>`, tabelas para layout, etc.) e usa emojis no corpo que aumentam a pontuacao de spam.

## Solucao

### 1. Corrigir o dominio do link

**Migracao SQL** - Atualizar `store_settings` para definir o `custom_domain`:

```sql
UPDATE store_settings
SET custom_domain = 'fast.metodopare.ai'
WHERE workspace_id = 'd9e3d0ae-5893-41e9-97f3-7d7ce6a06f0f';
```

Se a linha nao existir, sera necessario inserir.

### 2. Ajustar o path do link no edge function

Alterar o `inviteUrl` para usar `/c2c/{slug}/invite/{token}` (que ja esta correto e corresponde a rota em `App.tsx`). O dominio sera resolvido automaticamente com o `custom_domain` corrigido.

### 3. Reestruturar o email para anti-spam

**Ficheiro: `supabase/functions/send-c2c-seller-invite/index.ts`**

Alteracoes:
- **Remetente**: Mudar de `onboarding@resend.dev` para `Marketplace <noreply@m.fastcrm.metodopare.ai>` (consistente com os outros emails do sistema)
- **Estrutura HTML**: Usar `<!DOCTYPE html>`, layout com tabelas (`role="presentation"`), meta charset/viewport - mesmo padrao usado no `send-community-invite`
- **Remover emojis** do corpo do email (aumentam score de spam)
- **Adicionar texto alternativo**: Link em texto como fallback ("Se nao conseguir clicar no botao, clique aqui")
- **Footer institucional**: Adicionar rodape com identificacao do remetente ("Este email foi enviado por...")
- **Cores solidas nos botoes**: Usar `background-color` em vez de shorthand (compatibilidade com clientes de email)

### Template do Email Reestruturado

O novo template seguira o mesmo padrao do email de convite da comunidade:
- Header com cor solida e nome do marketplace
- Corpo com saudacao, texto do convite e mensagem personalizada (se existir)
- Lista de beneficios sem emojis (usando marcadores HTML nativos)
- Botao CTA com tabela para compatibilidade
- Link alternativo em texto
- Rodape com nota de expiracao e identificacao

### Ficheiros Modificados

| Ficheiro | Alteracao |
|---|---|
| `supabase/functions/send-c2c-seller-invite/index.ts` | Novo template HTML profissional; remetente atualizado para dominio verificado; remocao de emojis |
| Migracao SQL | Definir `custom_domain` para o workspace metodopare |

