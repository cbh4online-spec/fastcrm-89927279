

# Adicionar classes `prose` a áreas de conteúdo markdown

## Contexto
O plugin `@tailwindcss/typography` foi activado mas várias áreas que renderizam HTML/markdown ainda usam classes genéricas (`prose-content`, `text-muted-foreground`) em vez das classes `prose` do plugin, perdendo a estilização automática de listas, tabelas, blockquotes, etc.

## Áreas já com `prose` (sem alteração necessária)
- `ContentSections.tsx`, `FAQSection.tsx`, `EbookRichEditor.tsx`, `CommandOutput.tsx`, `CommandResponseCard.tsx`, `ChatMessage.tsx`, `EmailCanvas.tsx`, `BotTestChat.tsx`, `AIFunnelChat.tsx`, `PersonaTestChat.tsx`, `DiagnosticAssistant.tsx`, `EmailMessageBubble.tsx`, `ComposeEmailDialog.tsx`, `EmailRichComposer.tsx`

## Áreas a corrigir

### 1. Páginas legais (Terms, GDPR, Cookies)
Ficheiros: `TermsOfUsePage.tsx`, `GDPRPage.tsx`, `CookiePolicyPage.tsx`
- Substituir `className="text-muted-foreground leading-relaxed prose-content"` por `className="prose prose-sm max-w-none dark:prose-invert text-muted-foreground leading-relaxed"`

### 2. GuidePage — secções de texto com `dangerouslySetInnerHTML`
Ficheiro: `src/modules/growth-seo/pages/GuidePage.tsx`
- Linha 123: adicionar `prose prose-sm max-w-none dark:prose-invert` ao div que renderiza `section.content`

### 3. ManifestoEditor — wrapper do ReactMarkdown
Ficheiro: `src/components/vision/ManifestoEditor.tsx`
- Linha 81: adicionar `prose max-w-none dark:prose-invert` ao div `manifesto-content` para que os custom components herdem a base tipográfica

### 4. BillingAssistantDrawer — texto de mensagens
Ficheiro: `src/components/billing-assistant/BillingAssistantDrawer.tsx`
- Linha 138: já tem `prose prose-sm max-w-none` mas falta `dark:prose-invert` — adicionar

| Ficheiro | Alteração |
|---|---|
| `src/modules/growth-seo/pages/TermsOfUsePage.tsx` | `prose-content` → `prose prose-sm max-w-none dark:prose-invert` |
| `src/modules/growth-seo/pages/GDPRPage.tsx` | Idem |
| `src/modules/growth-seo/pages/CookiePolicyPage.tsx` | Idem |
| `src/modules/growth-seo/pages/GuidePage.tsx` | Adicionar `prose prose-sm max-w-none dark:prose-invert` ao div de texto |
| `src/components/vision/ManifestoEditor.tsx` | Adicionar `prose max-w-none dark:prose-invert` ao wrapper |
| `src/components/billing-assistant/BillingAssistantDrawer.tsx` | Adicionar `dark:prose-invert` |

