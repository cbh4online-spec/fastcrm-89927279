

## Diagnóstico: Envio de Email e Comunicação

### Análise do Sistema Actual

O sistema de email utiliza uma arquitectura SMTP directa:
1. **Conexão**: O utilizador configura uma conta SMTP/IMAP via `email-connect` (Gmail, Outlook, Hostinger, Custom)
2. **Envio**: O `ComposeEmailDialog` verifica se existe uma `activeEmailConnection` — se não existir, mostra aviso amarelo "Nenhuma conta de email conectada"
3. **Edge Function `email-send`**: Implementa um cliente SMTP nativo do Deno (STARTTLS + AUTH LOGIN)

### Problemas Identificados

1. **Sem logs de email-send** — A edge function nunca foi chamada recentemente, o que sugere que o problema está no frontend (sem conexão configurada) ou a função nunca chega a ser invocada
2. **Fluxo de envio bloqueado sem conexão** — O `handleSend` retorna imediatamente se `!connection`, mostrando um alert. O screenshot mostra a lead sem mensagens, o que é consistente com falta de conexão SMTP
3. **O botão "Enviar Email" nas Ações Rápidas** abre o `ComposeEmailDialog`, mas se não houver conexão activa, o utilizador fica bloqueado
4. **Falta de fallback** — Não há opção de envio sem conexão SMTP (e.g. via Lovable Email infra)
5. **WhatsApp/Instagram/SMS** — WhatsApp usa `wa.me` link externo (funcional), Instagram não tem handler de envio, SMS usa `sms:` link

### Plano de Correção

#### 1. Tornar o envio de email mais robusto e acessível

**Ficheiro**: `src/components/email/ComposeEmailDialog.tsx`
- Melhorar o alerta de "sem conexão" com um botão directo para configurar (link para `/dashboard/settings/integrations`)
- Adicionar validação clara do estado da conexão antes de permitir escrever
- Mostrar indicador visual claro do estado (conectado/desconectado) no header do dialog

#### 2. Melhorar UX do Centro de Mensagens

**Ficheiro**: `src/components/messages/ContactMessagesSection.tsx`
- Quando canal é Email e não há conexão, mostrar aviso inline com link de configuração (em vez de falhar silenciosamente)
- Verificar `useActiveEmailConnection` no componente e mostrar estado
- Tornar o botão "Compor" mais proeminente e o fluxo AI → Compor mais fluido

#### 3. Melhorar integração AI no fluxo de email

**Ficheiros**: `src/components/email/AIEmailAssistPanel.tsx`, `src/components/messages/ContactMessagesSection.tsx`
- Quando o utilizador gera conteúdo com AI e clica "Compor", preencher automaticamente o subject e body no `ComposeEmailDialog`
- Adicionar botão "Enviar com AI" que gera o conteúdo E abre o dialog pré-preenchido
- Melhorar o fluxo AI → Template → Envio para ser mais linear

#### 4. Re-deploy das edge functions de email

**Ficheiros**: `supabase/functions/email-send/index.ts`, `supabase/functions/email-connect/index.ts`
- Re-deploy para garantir que estão activas
- Adicionar logging mais detalhado no email-send para diagnóstico

#### 5. Adicionar feedback visual de estado da conexão email

**Ficheiro**: `src/components/messages/ContactMessagesSection.tsx`
- Badge de estado da conexão email junto ao selector de canal
- Se desconectado, tooltip explicativo e botão de configuração rápida
- Estado loading enquanto verifica conexão

### Resultado Esperado
- O utilizador vê claramente se tem email configurado ou não
- Se não tem, é guiado para configurar em 1-2 cliques
- O fluxo AI → Compor → Enviar é linear e sem barreiras
- O diagnóstico de problemas é mais fácil com logging melhorado

