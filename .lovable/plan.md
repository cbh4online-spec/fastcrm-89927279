

# Estado Actual — Checklist de Instalação FastCRM

## Diagnóstico

Cruzando os 32 batches do documento com o `package.json` actual, **a esmagadora maioria já está instalada** (Vagas 1–4 completas). Restam apenas **6 packages** genuinamente em falta que não foram excluídos por decisão técnica anterior:

### Packages em falta (não redundantes, não excluídos)

| Package | Batch | Razão |
|---|---|---|
| `@nivo/heatmap` | 13 | Mencionado para verificar, não foi instalado |
| `@nivo/treemap` | 13 | Mencionado para verificar, não foi instalado |
| `react-pdf` | 14 | Viewer de PDFs (diferente de `@react-pdf/renderer` que gera PDFs) |
| `react-window-infinite-loader` | 16 | Infinite scroll para listas virtualizadas |
| `vite-plugin-pwa` | 21 | Adiado na Vaga 3 por estabilidade do preview |
| `workbox-window` | 21 | Dependência do PWA |

### Packages correctamente excluídos (confirmar que se mantêm fora)

- `xlsx` → substituído por `exceljs` ✅
- `uuid` → coberto por `nanoid` ✅
- `sanitize-html` → coberto por `dompurify` ✅
- `@playwright/test`, `chromatic`, `@storybook/*` → não correm no Lovable ✅
- `@hotjar/browser` → privacy concerns ✅
- `resend`, `openai`, `stripe` (server) → usar via Deno nas edge functions ✅
- `@radix-ui/react-direction` → RTL não prioritário ✅

## Plano

### Passo 1 — Instalar os 6 packages em falta
```
@nivo/heatmap @nivo/treemap react-pdf react-window-infinite-loader vite-plugin-pwa workbox-window
```

### Passo 2 — Batch 32: Verificações de config
- Confirmar `tailwind.config.ts` tem todos os plugins (já feito nas vagas anteriores)
- Confirmar `postcss.config.js` tem autoprefixer
- `vitest.config.ts` — verificar se já existe ou criar com `happy-dom` + `coverage-v8`

### Passo 3 — PWA config (adiado anteriormente)
- Adicionar `vite-plugin-pwa` ao `vite.config.ts` com manifest FastCRM e `registerType: 'autoUpdate'`

## Resultado

Após esta execução, **todos os batches 0–32 ficam completos**. O checklist fica 100% ✅.

## Riscos

- `vite-plugin-pwa` pode interferir com o preview do Lovable — configurar com `devOptions: { enabled: false }` para evitar problemas no sandbox
- `react-pdf` usa um worker PDF.js que precisa de configuração do `workerSrc`

