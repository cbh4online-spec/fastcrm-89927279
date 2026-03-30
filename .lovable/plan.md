

# Trocar email na página de Termos de Uso

## Alteração

Ficheiro `src/modules/growth-seo/pages/TermsOfUsePage.tsx`, linha 143 — substituir a referência dinâmica `company.email_general` pelo email fixo `online@metodopare.ai`.

```tsx
// De:
<a href={`mailto:${company.email_general}`} ...>{company.email_general}</a>

// Para:
<a href="mailto:online@metodopare.ai" ...>online@metodopare.ai</a>
```

| Ficheiro | Alteração |
|---|---|
| `src/modules/growth-seo/pages/TermsOfUsePage.tsx` | Substituir email de contacto na secção de contacto |

