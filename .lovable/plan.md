
# Arrumar módulo WhatsApp — Diagnóstico e Plano

## 1. Diagnóstico (estado actual)

### 1.1 Código — `src/integrations/whatsapp/`
Bem estruturado em `providers/`, `normalize/`, `utils/`. **Não é aqui o problema.** O adapter Z-API delega tudo para `whatsapp-pro-send` (bom). O `zapyAdapter` é um alias do `zapiAdapter`.

### 1.2 Hooks — 44 ficheiros, fragmentação clara
Há **duas gerações** sobrepostas:
- **Legacy Z-API directa**: `useWhatsAppZapi.ts`, `useWhatsAppZapiConnection.ts`, `useSendVoiceNote.ts` → ainda invocam `whatsapp-zapi-send`.
- **Pro / unificada**: `useWhatsAppPro.ts`, `useWhatsAppProOps.ts`, `useWhatsAppHealth.ts`, `useWhatsAppConnection.ts` → invocam `whatsapp-pro-send`.

Hooks de Inbox (`useConversation*`, `useInbox*`, `useWhatsAppInbox`) estão dispersos entre `src/hooks/` raiz sem agrupamento por domínio.

### 1.3 Páginas — 21 páginas WhatsApp + `Inbox.tsx` + `ConversationalEngine.tsx`
- Hub principal: `WhatsAppPro.tsx` (`/dashboard/whatsapp-pro`)
- 16 sub-páginas com URLs `/whatsapp-pro/*` listadas individualmente no sidebar (sidebar inundado com 17 entradas “WhatsApp”).
- `WhatsAppOpsDashboard` exposto em **duas rotas** (`/whatsapp/ops` e `/inbox/ops`).
- `WhatsAppInboxPage` coexiste com `Inbox.tsx` (omnichannel) — sobreposição funcional.

### 1.4 Edge Functions — 37 funções `whatsapp-*`
Sobreposições críticas:
| Domínio | Funções duplicadas | Recomendação |
|---|---|---|
| Envio | `whatsapp-pro-send`, `whatsapp-zapi-send`, `whatsapp-send-message` | Manter só `whatsapp-pro-send` |
| Webhook inbound | `whatsapp-pro-webhook`, `whatsapp-webhook`, `whatsapp-zapi-webhook` | Consolidar em `whatsapp-pro-webhook` |
| Reminders | `whatsapp-send-scheduled-reminders` vs `whatsapp-pro-scheduled-dispatch` | Manter `pro-scheduled-dispatch` |
| Connect | `whatsapp-zapi-connect`/`disconnect`/`status`/`configure-webhook` | Manter (são fluxo de provisioning Z-API; renomear para `whatsapp-provider-*`) |

### 1.5 Conectores / instâncias
SSoT é `whatsapp_provider_instances` (já documentado em memory). Há componentes UI antigos a falar directamente com Z-API (`WhatsAppZapiConnectionCard`, `WhatsAppZapiQRDialog`, `QuickWhatsAppZapiDialog`) — devem passar a usar a camada genérica de “provider instance”.

### 1.6 Navegação
17 entradas individuais de WhatsApp no grupo “comunicação” do `routeManifest.ts`. Não há sub-menu — tudo plano. Causa o tal “sidebar confuso”.

---

## 2. Decisões de produto/UX

1. **Hub único** `/dashboard/whatsapp-pro` com tabs internas (Inbox, Campanhas, Templates, Sequências, Bot, Catálogo, Agendamentos, Configurações). Sub-rotas continuam a existir para deep-link e SEO interno, mas no **sidebar** aparece só:
   - **WhatsApp** (hub) — abre o overview/health
   - **WhatsApp Inbox** (atalho)
   - **WhatsApp Campanhas** (atalho)
   - Restantes ficam acessíveis via tabs do hub e do command palette (⌘K).
2. **Inbox omnichannel** (`/dashboard/inbox`) continua a ser o local canónico de conversas. `WhatsAppInboxPage` passa a ser **vista filtrada** do inbox geral (`?channel=whatsapp`) em vez de página paralela. Mantém URL com redirect.
3. **Conectores**: uma só página `/dashboard/whatsapp-pro/connections` que lista `whatsapp_provider_instances`, com fluxo unificado de Z-API (e futuros providers). Cards/diálogos antigos deprecados.
4. **Edge functions legacy** (`whatsapp-send-message`, `whatsapp-zapi-send`, `whatsapp-webhook`, `whatsapp-send-scheduled-reminders`) entram em modo *deprecated*: redirecionam internamente para as versões `pro-*` e logam aviso. Removidas numa fase 2 após confirmar zero invocações em produção (via logs).

---

## 3. Estrutura técnica alvo

```text
src/
  modules/whatsapp/                ← novo módulo (mover gradualmente)
    hooks/
      inbox/        (useWhatsAppInbox, useConversation*)
      ops/          (useWhatsAppHealth, useWhatsAppOps, useWhatsAppProOps)
      campaigns/    (useWhatsAppCampaigns, useWhatsAppRecurring, useWhatsAppScheduled)
      sequences/    (useWhatsAppSequences)
      templates/    (useWhatsAppTemplates, useWhatsAppQuickReplies)
      bot/          (useWhatsAppBotRules)
      connection/   (useWhatsAppConnection, useWhatsAppProvider)
      send/         (useSendWhatsApp — wrapper único sobre whatsapp-pro-send)
    components/     (mover de src/components/whatsapp-pro)
    pages/          (WhatsAppHub + sub-páginas, com tabs)
    lib/            (formatters, channel helpers)
    types/

src/integrations/whatsapp/         ← mantém-se (camada de adapters/providers)

supabase/functions/
  whatsapp-pro-*                   ← canónicas (mantêm)
  whatsapp-provider-{connect,disconnect,status,webhook-config}  ← renomeadas de whatsapp-zapi-*
  whatsapp-{send-message,zapi-send,webhook,send-scheduled-reminders}  ← stubs deprecated
```

`useSendWhatsApp` torna-se o único ponto de envio do frontend. Substitui chamadas directas em `useQuickProposal`, `WhatsAppTemplateDialog`, `useSendVoiceNote`, `useWhatsAppZapi`.

---

## 4. Plano de implementação (por fases)

**Fase A — Reorganização lógica (zero breaking change)**
1. Criar `src/modules/whatsapp/` com sub-pastas e mover apenas *re-exports* (ficheiros antigos passam a re-exportar do novo local).
2. Introduzir `useSendWhatsApp` unificado e refactor de 3 calls directas para usá-lo.
3. Marcar hooks legacy (`useWhatsAppZapi`, `useWhatsAppZapiConnection`) com `@deprecated` + console.warn em dev.

**Fase B — UI consolidada**
4. Refazer `WhatsAppPro.tsx` como **hub com tabs** (Visão geral, Inbox, Campanhas, Templates, Sequências, Bot, Catálogo, Agendamentos, Conectores).
5. Reduzir sidebar a 3 entradas (hub + Inbox + Campanhas). Restantes ficam ocultas mas com rotas activas.
6. Tornar `WhatsAppInboxPage` redirect → `/dashboard/inbox?channel=whatsapp`.
7. Remover rota duplicada `/dashboard/inbox/ops`.

**Fase C — Conectores**
8. Criar página `/dashboard/whatsapp-pro/connections` com listagem de `whatsapp_provider_instances` e CRUD unificado.
9. Deprecar `WhatsAppZapiConnectionCard`, `WhatsAppZapiQRDialog`, `QuickWhatsAppZapiDialog` (redirect/import para os novos).
10. Renomear edge functions `whatsapp-zapi-{connect,disconnect,status,configure-webhook}` para `whatsapp-provider-*` (mantendo as antigas como proxy 6 meses).

**Fase D — Limpeza**
11. Auditar logs (30 dias) das funções `whatsapp-send-message`, `whatsapp-zapi-send`, `whatsapp-webhook`, `whatsapp-send-scheduled-reminders`. Se zero invocações fora dos stubs → eliminar.
12. Remover hooks/componentes não referenciados.
13. Atualizar memory `mem://architecture/integrations/whatsapp-comprehensive-infrastructure`.

---

## 5. Critérios de aceitação

- Sidebar tem ≤ 3 entradas WhatsApp; restantes acessíveis via hub.
- Todos os envios passam por `useSendWhatsApp` → `whatsapp-pro-send`.
- Uma única página de conectores; sem duplicação Z-API.
- Edge functions canónicas documentadas; legacy marcadas como deprecated com proxy funcional.
- Zero regressões em: enviar mensagem, receber webhook, campanha, sequência, agendamento, bot rule, importar contactos.
- `npm run typecheck` e build limpos.

---

## 6. Riscos / pontos por validar

- **R1**: Refactor da Inbox WhatsApp pode partir filtros guardados pelos utilizadores → mitigar com redirect que preserva query params.
- **R2**: Renomear edge functions pode partir webhooks já configurados na Z-API → manter URLs antigos como proxy durante 90 dias.
- **R3**: Decidir se hub é tabs (SPA, mais rápido) ou continua multi-rota com layout partilhado (melhor para deep-link). **Por validar contigo.**
- **R4**: Confirmar contigo se queres já eliminar `WhatsAppOpsDashboard` ou mantê-lo como tab “Operações” do hub.

---

## 7. Ordem sugerida

Começar pela **Fase A** (segura, invisível ao utilizador) + **Fase B passos 4-6** (impacto UX imediato, resolve “sidebar confuso”). Fase C e D em iterações seguintes.

Confirma se avanço directo com Fase A+B ou queres ajustar âmbito.
