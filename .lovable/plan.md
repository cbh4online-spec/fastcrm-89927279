

## Diagnóstico — Erro Reportado

### O que foi reportado
- Runtime error em `supabase/functions/hr-face-verify/index.ts` (line 0, col 0)
- `has_blank_screen: true`

### Análise

O ficheiro `hr-face-verify/index.ts` é uma **edge function backend** — não pode causar um blank screen no frontend. O código da função está correcto:
- CORS headers presentes
- Validação de inputs
- Error handling adequado
- Lógica de face verification + attendance funcional

A atribuição do erro é provavelmente incorrecta. Possíveis causas reais do blank screen:

1. **Erro transitório de build/deploy** — as últimas alterações (Batches 1-3 do eBook) envolveram múltiplos ficheiros. Pode haver um erro transitório que já se resolveu.
2. **Edge function `ebook-generate` sem entrada no `config.toml`** — a função foi criada mas não adicionada ao config.toml com `verify_jwt = false`. Isto pode causar falhas no deploy do bundle de edge functions, embora não devesse causar blank screen no frontend.

### Plano de Correção

**1. Adicionar `ebook-generate` ao `config.toml`**
- Adicionar `[functions.ebook-generate]` com `verify_jwt = false` (a função é invocada pelo frontend via `supabase.functions.invoke` com bearer token, mas a validação JWT interna não é feita — segue o padrão do projecto)

**2. Verificar se o blank screen persiste**
- Se persistir após esta correcção, investigar erros de importação ou TypeScript nos componentes recentemente alterados (EbookEditorShell, EbookWizard, EbooksList)

### Ficheiro a alterar
| Ficheiro | Alteração |
|----------|-----------|
| `supabase/config.toml` | Adicionar `[functions.ebook-generate]` com `verify_jwt = false` |

### Risco
Mínimo — é uma adição de configuração, sem impacto no código existente.

