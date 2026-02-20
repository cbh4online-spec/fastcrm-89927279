

# Fix: Erro "Cannot coerce the result to a single JSON object"

## Problema

Este erro ocorre quando o Supabase tenta devolver um unico resultado com `.single()`, mas nao encontra nenhuma linha correspondente. No modulo Bio, isto pode acontecer quando uma pagina e consultada por ID e esse ID nao existe ou ainda nao foi guardado.

## Solucao

Substituir `.single()` por `.maybeSingle()` nas queries de leitura (que podem legitimamente nao ter resultados). As mutacoes de insert/update podem manter `.single()` pois espera-se sempre um resultado.

## Alteracoes

| Ficheiro | O que muda |
|---|---|
| `src/hooks/useBioPages.ts` | Linha 50: `.single()` -> `.maybeSingle()` na funcao `useBioPage()` |
| `src/hooks/useBioBlocks.ts` | Sem alteracao (apenas mutations usam `.single()`, o que e correcto) |

### Detalhe

**useBioPages.ts - funcao `useBioPage(id)`** (linha 46-52):

```typescript
// De:
const { data, error } = await supabase
  .from("bio_pages")
  .select("*")
  .eq("id", id)
  .single();
if (error) throw error;
return data as BioPage;

// Para:
const { data, error } = await supabase
  .from("bio_pages")
  .select("*")
  .eq("id", id)
  .maybeSingle();
if (error) throw error;
return data as BioPage | null;
```

As mutacoes (`useCreateBioPage`, `useUpdateBioPage`, `usePublishBioPage`) mantem `.single()` pois sempre devem devolver o registo criado/atualizado.

### Resultado

O erro desaparece. Se a pagina nao for encontrada, o hook devolve `null` em vez de lancar uma excepcao.
