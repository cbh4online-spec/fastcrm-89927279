
# Aumentar Sugestoes AIDA de 4 para 8

## Alteracao simples

Actualmente o sistema gera exactamente 4 sugestoes. Para dar mais opcoes ao utilizador, vamos aumentar para 8 sugestoes com angulos ainda mais variados.

## Ficheiros a modificar

### 1. Edge Function `supabase/functions/generate-offer-suggestions/index.ts`
- Alterar o prompt de "gera exactamente 4 sugestoes" para "gera exactamente 8 sugestoes"
- Expandir os exemplos de angulos no prompt (ex: automacao, email marketing, branding, formacao, parcerias, gestao de reputacao)

### 2. UI `src/pages/ProfessionalProspecting.tsx`
- Alterar o grid de `grid-cols-2` para um layout scrollavel ou `grid-cols-2` com scroll vertical para acomodar 8 cards sem ocupar demasiado espaco
- Adicionar `max-h` com `overflow-y-auto` na area de sugestoes para manter o dialog usavel

## Resultado
O utilizador vera 8 sugestoes AIDA distintas em vez de 4, cobrindo mais angulos de servico para a profissao escolhida.
