

# 3ª Vaga de Bibliotecas — Arsenal Completo

## Diagnóstico

O documento lista ~70 packages novos. Cruzando com o `package.json` actual, **já existem**: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `exceljs`, `react-qr-code` (cobre `qrcode.react`), `cmdk`, `react-resizable-panels`, `sonner`, `vaul`, `@dnd-kit/*`, `@radix-ui/react-tooltip`, `dompurify`, `nanoid` (substitui `uuid`), `react-markdown` (substitui `marked`).

**Packages a excluir** (redundantes ou cobertos):
- `@supabase/realtime-js` — já incluído no `@supabase/supabase-js`
- `qrcode.react` — já tens `react-qr-code`
- `uuid` — já tens `nanoid` + `crypto.randomUUID()`
- `xlsx-populate`/`exceljs` — já tens `exceljs`
- `marked`/`markdown-it` — já tens `react-markdown`
- `sanitize-html` — já tens `dompurify`
- `nif-validator` — algoritmo trivial, implementar como utility
- `otplib` — usado no backend, não no frontend
- `react-beautiful-dnd`, `react-tooltip`, `cmdk`, `react-split-pane`, `sonner`, `vaul` — já existem equivalentes
- `vitest`, `@testing-library/react`, `@testing-library/jest-dom` — já instalados

**Total real a instalar: ~50 packages**

## Plano de Instalação (11 batches)

### Batch 10 — Mapas e Calendário (9 packages)
```
@react-google-maps/api @googlemaps/markerclusterer use-places-autocomplete
@fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction @fullcalendar/list
rrule
```
**Config**: Necessário `VITE_GOOGLE_MAPS_API_KEY` (publishable, codebase).

### Batch 11 — Real-Time e Comunicação (4 packages)
```
react-use-websocket @emoji-mart/data @emoji-mart/react linkify-react
```

### Batch 12 — Visualizações Avançadas (6 packages)
```
@nivo/line @nivo/bar @nivo/pie @nivo/sankey @nivo/funnel react-sparklines
```
**Nota**: `@nivo/heatmap` e `@nivo/treemap` verificar se já existem; se não, adicionar.

### Batch 13 — Ficheiros e Export (5 packages)
```
file-saver @types/file-saver jszip browser-image-compression react-pdf @react-pdf/renderer
```

### Batch 14 — UI/UX Avançado (8 packages)
```
react-loading-skeleton react-medium-image-zoom react-player react-copy-to-clipboard
react-responsive react-window-infinite-loader @floating-ui/react react-wrap-balancer
```

### Batch 15 — Segurança (2 packages)
```
jose zxcvbn
```

### Batch 16 — Estado e Performance (6 packages)
```
immer @tanstack/react-query-devtools p-queue superjson match-sorter lodash-es @types/lodash-es
```

### Batch 17 — Texto e Conteúdo (3 packages)
```
diff reading-time turndown
```

### Batch 18 — Developer Experience (4 packages)
```
@testing-library/user-event msw @sentry/react web-vitals
```
**Config**: `VITE_SENTRY_DSN` necessário para Sentry.

### Batch 19 — i18n e PWA (6 packages)
```
i18next-http-backend intl-messageformat countries-list vite-plugin-pwa workbox-window idb-keyval
```

### Batch 20 — CRM Específico (3 packages)
```
cron-parser iban fuse.js
```

## Integração Base Imediata

Após instalação, criar wrappers/utilitários prontos a usar:

1. **`src/lib/maps.ts`** — inicialização do Google Maps com API key
2. **`src/utils/nif.ts`** — validador de NIF português (sem dependência externa)
3. **`src/utils/iban.ts`** — wrapper de validação IBAN
4. **`src/utils/image-compression.ts`** — wrapper de `browser-image-compression` com defaults do projecto
5. **`src/lib/sentry.ts`** — inicialização do Sentry (condicional, só se DSN existir)
6. **`src/components/ui/Skeleton.tsx`** — wrapper de `react-loading-skeleton` com estilos consistentes
7. **Adicionar `ReactQueryDevtools`** ao `App.tsx` (só em dev)
8. **Configurar `vite-plugin-pwa`** no `vite.config.ts` com manifest e registerType autoUpdate

## Critérios de Aceitação

- ~50 packages instalados sem conflitos
- Build sem erros
- Utilitários base criados e prontos a importar
- Google Maps, Sentry, PWA configurados (aguardando keys quando necessário)
- ReactQueryDevtools visível em development

## Riscos

- **Bundle size**: ~50 packages de uma vez pode impactar build time. Todos são tree-shakeable.
- **Google Maps API key**: sem ela, mapas não funcionam — pode ser configurada depois.
- **Sentry DSN**: sem ele, o Sentry simplesmente não inicializa (graceful).
- **FullCalendar**: é pesado (~200KB); considerar lazy loading do módulo Calendário.

