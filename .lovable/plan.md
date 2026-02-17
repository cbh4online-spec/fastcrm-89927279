

# Corrigir erro ao gerar prioridades

## Problema
A edge function `ai-member-priorities` nao esta registada no ficheiro `supabase/config.toml`. Sem essa entrada, a funcao nao e deployada e qualquer chamada resulta no erro "Failed to send a request to the Edge Function".

## Solucao
Adicionar a entrada da funcao ao `config.toml` com `verify_jwt = false` (o padrao usado nas outras funcoes AI do projecto).

### Ficheiro: `supabase/config.toml`
Adicionar:
```toml
[functions.ai-member-priorities]
verify_jwt = false
```

Apos esta alteracao, a funcao sera automaticamente deployada e o botao "Sugerir Prioridades" passara a funcionar.

