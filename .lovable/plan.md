

## Integrar Mensagens de Redes Sociais com o GHL

### Contexto Atual

A integração GHL já suporta tecnicamente os canais sociais (Instagram DM, Facebook Messenger, WhatsApp) tanto para receber como para enviar mensagens. O webhook `ghl-webhook-message` mapeia os tipos GHL (17/18 para Instagram, 5/11/19 para Facebook/Messenger) e o `ghl-send-message` envia por esses canais. No entanto, falta uma configuração clara no UI para os utilizadores verem e gerirem estes canais sociais via GHL.

---

### O que sera feito

**1. Secção "Canais Sociais via GHL" nas Definições GHL**

Adicionar ao `WorkspaceGHLSettings.tsx` uma nova secção (visível quando o GHL está configurado) que mostra:
- Lista de canais sociais suportados: Instagram, Facebook Messenger, WhatsApp
- Estado de cada canal (baseado nas conversas existentes com esse canal no workspace)
- Instruções de como ativar cada canal no GHL (links/guia)
- Toggle para ativar/desativar a sincronização por canal

**2. Atualizar Canais no Settings**

Modificar `ChannelsSettings.tsx` para:
- Na secção "WhatsApp & Instagram", mostrar badge "Via GHL" quando a integração está ativa
- Na secção "Redes Sociais" (Facebook), mostrar igualmente a indicação de que já está conectado via GHL
- Remover botões "Conectar" duplicados quando o canal já está coberto pelo GHL

**3. Filtro por Canal Social no Inbox**

Verificar que o `InboxSidebar` já tem filtros para instagram/messenger/facebook e que funcionam corretamente com conversas vindas do GHL.

**4. Sincronização de Conversas Sociais**

Atualizar `ghl-sync-conversations` para filtrar e identificar conversas de canais sociais (Instagram, Messenger, WhatsApp) durante a sincronização em massa, garantindo que o campo `channel` é corretamente mapeado.

---

### Detalhes Tecnicos

**Ficheiro**: `src/components/settings/sections/WorkspaceGHLSettings.tsx`
- Adicionar componente `SocialChannelsStatus` que consulta conversas agrupadas por canal para mostrar contagens
- Mostrar cards para Instagram, Facebook Messenger, WhatsApp com ícone, estado e contagem de conversas
- Incluir accordion com instruções para ativar cada canal no painel GHL

**Ficheiro**: `src/components/settings/sections/ChannelsSettings.tsx`
- Importar `useWorkspaceGHLConfig` para verificar se GHL está ativo
- Condicionar a exibição dos botões "Conectar" e mostrar badge "Conectado via GHL" quando aplicável
- Manter a opção de conexão directa ao Instagram como alternativa

**Ficheiro**: `src/components/inbox/InboxSidebar.tsx`
- Confirmar que os filtros de canal (instagram, messenger, facebook, whatsapp) estão presentes e funcionais
- Adicionar contagem de conversas por canal social se não existir

**Ficheiro**: `supabase/functions/ghl-sync-conversations/index.ts`
- Garantir que o mapeamento de canal durante a sincronização usa a mesma função `resolveGHLChannel` do webhook
- Verificar que conversas do tipo Instagram (17/18), Messenger (5/19), WhatsApp (9/15/16) são corretamente classificadas

**Nenhuma migração de base de dados necessária** - a estrutura existente já suporta os canais sociais com o campo `channel` nas tabelas `conversations` e `messages`.

