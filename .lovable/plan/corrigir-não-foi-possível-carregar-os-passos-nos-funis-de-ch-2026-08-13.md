# Corrigir "Não foi possível carregar os passos" nos Funis de Checkout

## Diagnóstico (confirmado)

O separador **Passos** falha com erro 400 da API:

```text
PGRST200 — Could not find a relationship between 'checkout_funnel_steps'
and 'checkout_offers' in the schema cache
```

Causa: na criação das tabelas, `checkout_funnel_steps.offer_id` e
`checkout_order_bumps.offer_id` foram declarados como `UUID` **sem chave
estrangeira** para `checkout_offers(id)`. Sem FK, a API não consegue fazer o
embed `offer:checkout_offers(*)` que os hooks usam — logo os Passos (e, pelo
mesmo motivo, os Order bumps) nunca carregam.

## Correção

### 1. Base de dados (migração)
- Limpar eventuais `offer_id` órfãos (definir a `NULL`) para a FK poder ser criada.
- Adicionar `FOREIGN KEY (offer_id) REFERENCES public.checkout_offers(id) ON DELETE SET NULL` em:
  - `public.checkout_funnel_steps`
  - `public.checkout_order_bumps`
- Índices em `offer_id` nas duas tabelas.

Sem alterações de RLS ou grants (as políticas já existem e mantêm-se).

### 2. Robustez no frontend
- Nos hooks `useCheckoutFunnelSteps` e `useCheckoutOrderBumps`, tratar falha do
  embed com fallback: ler os passos/bumps sem `offer:` e juntar as ofertas numa
  segunda consulta, evitando que um problema de esquema volte a deixar o ecrã
  inutilizável.
- Mensagem de erro passa a mostrar o motivo e mantém o botão "Tentar novamente".

## Critérios de aceitação
- O separador Passos carrega (lista vazia quando não há passos, com CTA para adicionar).
- Order bumps carregam e permitem associar uma oferta.
- Eliminar uma oferta usada num passo não parte o funil (fica sem oferta associada).
- Consola sem erros 400 PGRST200.
