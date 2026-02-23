

# product_embeddings -- Sistema ja implementado via fire-and-forget

## Analise

O sistema de embeddings para produtos ja esta implementado com o seguinte fluxo:

| Componente | Estado |
|---|---|
| Edge Function `product-embedding` | Existe e funcional (extrai keywords via Gemini) |
| Edge Function `product-ai-improve` | Chama `product-embedding` via fire-and-forget quando `create_embeddings=true` |
| Edge Function `product-quick-create` | Nao chama embeddings (correcto -- e criacao rapida) |
| Hook `useProductAIImprove` | Passa `create_embeddings` como opcao (default `false`) |

### Fluxo actual

```text
product-ai-improve (create_embeddings=true)
  --> fire-and-forget HTTP POST --> product-embedding
    --> extrai keywords via Gemini
    --> retorna resultado (sem persistir embedding vector)
```

### Sobre a tabela de queue

O sistema actual usa fire-and-forget em vez de tabela de queue. Isto e adequado para o MVP porque:

1. O `product-embedding` ja e idempotente (pode ser chamado varias vezes para o mesmo produto)
2. Nao ha necessidade de retry automatico -- se falhar, o utilizador pode re-executar o AI improve
3. O `product-quick-create` nao dispara embeddings propositadamente (o produto ainda nao tem descricao enriquecida)

### Quando adicionar tabela de queue?

Uma tabela `embedding_jobs` faria sentido quando:
- Houver processamento em batch (centenas de produtos)
- For necessario retry automatico com backoff
- For necessario dashboard de monitoring de jobs

Nenhum destes cenarios esta activo no MVP.

## Resultado

**Nenhuma alteracao necessaria.** O padrao fire-and-forget actual e suficiente para o MVP. O embedding so e disparado apos o AI improve (quando o produto ja tem conteudo enriquecido), o que e o momento correcto.

## Ficheiros a modificar

Nenhum.

