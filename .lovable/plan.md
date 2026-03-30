

# 4ª Vaga de Bibliotecas — Nível HubSpot

## Diagnóstico

Cruzando o documento com o `package.json` actual:

**Já existem**: `autoprefixer`, `@sentry/react`, `@testing-library/user-event`, `msw`, `web-vitals`, `@react-pdf/renderer`, `file-saver`, `jszip`, `browser-image-compression`

**A excluir**:
- `@playwright/test` + `playwright` — E2E testing não corre no Lovable sandbox
- `@storybook/*` + `chromatic` — Storybook não corre no Lovable preview
- `mixpanel-browser`, `@amplitude/analytics-browser` — redundantes com PostHog
- `@vercel/analytics` — não estamos na Vercel
- `openai`, `stripe` (server-side), `resend` — SDKs backend, usar nas edge functions com Deno imports
- `@googleapis/calendar` — backend SDK, não frontend
- `postcss-nesting` — browsers modernos já suportam nativamente
- `autoprefixer` — já instalado

**Total real a instalar: ~35 packages**

## Plano de Instalação (7 batches)

### Batch 21 — Tiptap Extensions (10 packages)
```
@tiptap/extension-text-align @tiptap/extension-underline @tiptap/extension-text-style
@tiptap/extension-color @tiptap/extension-highlight @tiptap/extension-typography
@tiptap/extension-character-count @tiptap/extension-task-list @tiptap/extension-task-item
@tiptap/extension-mention
```

### Batch 22 — Tiptap Extensions cont. (5 packages)
```
@tiptap/extension-code-block-lowlight lowlight @tiptap/extension-youtube
@tiptap/extension-subscript @tiptap/extension-superscript
```

### Batch 23 — Radix UI Extras (6 packages)
```
@radix-ui/react-toolbar @radix-ui/react-form @radix-ui/react-visually-hidden
@radix-ui/react-portal @radix-ui/react-roving-focus @radix-ui/react-focus-scope
```
Excluir `@radix-ui/react-direction` — RTL não é prioritário.

### Batch 24 — Testing (dev) (3 packages)
```
@vitest/coverage-v8 @vitest/ui @faker-js/faker happy-dom
```

### Batch 25 — Analytics (2 packages)
```
posthog-js react-ga4
```
Excluir Hotjar (privacy concerns com session recording).

### Batch 26 — Developer Utilities (7 packages)
```
type-fest ts-pattern dayjs tailwind-variants @total-typescript/ts-reset neverthrow zod-form-data
```

### Batch 27 — Design System (4 packages)
```
tailwindcss-radix tailwindcss-container-queries @fontsource/inter @fontsource/jetbrains-mono
```

### Batch 28 — Integrações frontend (1 package)
```
ai
```
Vercel AI SDK para streaming unificado.

## Integração Base Imediata

1. **Actualizar `RichTextEditor.tsx`** — adicionar todas as novas extensions Tiptap (underline, text-align, color, highlight, task lists, mentions, character count, youtube, code blocks)
2. **Actualizar `tailwind.config.ts`** — adicionar plugins `tailwindcss-radix` e `tailwindcss-container-queries`
3. **Importar fonts** em `src/main.tsx` — Inter 400/500/600/700 + JetBrains Mono 400
4. **Criar `src/lib/posthog.ts`** — inicialização condicional com `VITE_POSTHOG_KEY`
5. **Adicionar `@total-typescript/ts-reset`** ao `tsconfig.json`

## Critérios de Aceitação

- ~35 packages instalados sem conflitos
- Build sem erros
- RichTextEditor com toolbar completa (15 Tiptap extensions)
- Tailwind plugins configurados
- Fonts Inter e JetBrains Mono disponíveis
- PostHog e GA4 prontos (aguardando keys)

## Riscos

- **Tiptap extensions**: 15 extensions de uma vez pode causar conflitos de versão — todas devem ser da mesma major version (^3.21.0)
- **Bundle size**: Fonts adicionam ~100KB mas eliminam CDN dependency
- **PostHog/GA4**: Sem keys, simplesmente não inicializam (graceful)

