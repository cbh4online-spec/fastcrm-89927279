

# Trocar email na página de Cookies

## Alteração

Ficheiro `src/modules/growth-seo/pages/CookiePolicyPage.tsx`, linha 149 — substituir a referência dinâmica `company.email_dpo` pelo email fixo `online@metodopare.ai`.

```tsx
// De:
<a href={`mailto:${company.email_dpo}`} ...>{company.email_dpo}</a>

// Para:
<a href="mailto:online@metodopare.ai" ...>online@metodopare.ai</a>
```

| Ficheiro | Alteração |
|---|---|
| `src/modules/growth-seo/pages/CookiePolicyPage.tsx` | Substituir email de contacto na secção 5 |

