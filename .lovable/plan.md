
Objetivo: eliminar falsos “NIF não encontrado” (ex.: 514076380) sem perder rapidez.

1) Diagnóstico confirmado
- Verifiquei a função `lookup-company-nif` com `514076380`: atualmente devolve sucesso.
- Nos logs, o mesmo NIF já falhou por erro transitório da fonte externa (`Firecrawl scrape error: 500` e `Signal timed out`).
- Causa raiz: quando `nif.pt` devolve `result:error` e VIES não valida, uma falha temporária do Racius é tratada como “não encontrado”.

2) Correção no backend (principal)
Ficheiro: `supabase/functions/lookup-company-nif/index.ts`

- Introduzir estado por fonte:
  - `success` | `no_data` | `transient_error`.
- Refatorar `tryFirecrawlRacius` para resiliência:
  - retry curto (ex.: 2 tentativas) em 5xx/timeout;
  - fallback de scrape da URL direta para URL de pesquisa;
  - fallback final sem Firecrawl (fetch alternativo de conteúdo Racius em markdown) para reduzir dependência de um único provedor.
- Melhorar decisão final:
  - só devolver “não encontrado” quando houver evidência consistente de `no_data`;
  - se todas as fontes falharem por erro transitório, devolver erro “temporário/retryable” (não “empresa não encontrada”).
- Manter execução paralela para velocidade e timeouts agressivos.

3) Correção no frontend (evitar falha intermitente ao utilizador)
Ficheiro: `src/hooks/useNifLookup.ts`

- Interpretar novo erro retryable do backend.
- Fazer 1 retry automático silencioso (sem toast duplicado) antes de mostrar erro.
- Mensagens distintas:
  - “não encontrado” (definitivo),
  - “serviço temporariamente indisponível, tente novamente” (transitório).

4) Uniformização dos pontos que não usam o hook
Ficheiro: `src/components/settings/sections/CompanyBillingForm.tsx`

- Substituir invoke manual por lógica partilhada (hook/helper) para herdar retry e mensagens corretas.

5) Validação da correção
- Testar o NIF `514076380` em múltiplas chamadas seguidas e confirmar ausência de falsos negativos.
- Testar um NIF realmente inexistente e confirmar resposta “não encontrado”.
- Verificar logs da função para confirmar:
  - retries acionados apenas em erro transitório;
  - tempos médios mantidos (objetivo: resposta rápida na maioria dos casos).

Detalhes técnicos
- Não requer alterações de base de dados.
- Mantém a estratégia de fontes em paralelo; a melhoria é na classificação de erro, retries curtos e fallback de scraping.
- Resultado esperado: menos falhas intermitentes e melhor perceção de fiabilidade sem degradar performance.
