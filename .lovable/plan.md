

# Instalar dependências em falta

## Diagnóstico
- `@tailwindcss/typography` já está em `devDependencies` (v0.5.16) mas **não está** nos plugins do `tailwind.config.ts`
- `remark-gfm` **não existe** no `package.json`

## Alterações

### 1. Instalar `remark-gfm`
- Adicionar `"remark-gfm": "^4.0.0"` às dependencies do `package.json`

### 2. Adicionar `@tailwindcss/typography` aos plugins do Tailwind
- Em `tailwind.config.ts` linha 140, alterar:
  ```ts
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
  ```

| Ficheiro | Alteração |
|---|---|
| `package.json` | Adicionar `remark-gfm` |
| `tailwind.config.ts` | Adicionar typography plugin |

