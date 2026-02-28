
# Corrigir Geração de Imagens da Landing Page

## Problemas identificados

1. **Função não registada no `config.toml`** — A edge function `landing-generate-images` não está listada no ficheiro de configuração. Isto significa que JWT verification está activo por defeito, e chamadas sem autenticação (como as feitas pela página admin) são rejeitadas.

2. **Import deprecado** — A função usa `import { serve } from "https://deno.land/std@0.168.0/http/server.ts"` em vez do `Deno.serve` nativo, que é o padrão actual.

3. **Timeout potencial** — A geração de 8 imagens sequencialmente pode exceder o tempo limite da função. Cada imagem leva ~10-20s.

## Alterações

### 1. Registar a função no `config.toml`
Adicionar entrada `[functions.landing-generate-images]` com `verify_jwt = false` para permitir chamadas sem autenticação (é uma ferramenta admin interna).

### 2. Actualizar `supabase/functions/landing-generate-images/index.ts`
- Substituir `import { serve }` deprecado por `Deno.serve` nativo
- A página admin já chama imagem a imagem (1 por request), o que evita timeout

### 3. Re-deploy da função
Após as alterações, a função será automaticamente re-deployed.

## Ficheiros a modificar
1. `supabase/config.toml` — adicionar registo da função
2. `supabase/functions/landing-generate-images/index.ts` — corrigir import deprecado
