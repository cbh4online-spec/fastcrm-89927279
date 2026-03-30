

## Instalar Dependências para a Loja Online

### Diagnóstico

Após inspeção do `package.json`, a maioria das dependências pedidas **já existe**:

| Dependência | Estado |
|---|---|
| `zustand` | ✅ Já instalada (^5.0.12) |
| `libphonenumber-js` | ✅ Já instalada (^1.12.41) |
| `@sentry/react` | ✅ Já instalada (^10.46.0) |
| `posthog-js` | ✅ Já instalada (^1.364.1) |
| **`decimal.js`** | ❌ Não existe — instalar |
| **`validator`** | ❌ Não existe — instalar |
| **`@types/validator`** | ❌ Não existe (dev) — instalar |

### Plano

1. Instalar `decimal.js` e `validator` como dependências de produção
2. Instalar `@types/validator` como dependência de desenvolvimento
3. Validar que o build compila sem erros

### Comandos

```bash
npm install decimal.js validator
npm install -D @types/validator
```

### Riscos

- Nenhum conflito esperado — são bibliotecas standalone sem dependências pesadas
- Não serão feitas alterações a componentes existentes

