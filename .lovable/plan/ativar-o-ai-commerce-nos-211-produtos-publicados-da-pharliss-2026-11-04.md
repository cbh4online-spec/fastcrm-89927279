# Ativar o AI Commerce nos 211 produtos publicados da PHARLISS

## Situação confirmada
- 211 produtos publicados na loja e ativos, nenhum bloqueado pelo controlo de qualidade.
- Nenhum deles tem ainda o AI Commerce configurado (0 ativos), por isso o feed XML sai vazio.

## O que vou fazer
1. Criar a configuração de AI Commerce, já ativada, para cada um dos 211 produtos (só PHARLISS, só publicados e ativos). Não altero nenhum produto que já tenha configuração.
2. Gerar o feed XML de novo e confirmar quantos produtos entram e quantos são recusados, com o motivo (por exemplo, sem imagem, sem preço ou sem marca).
3. Mostrar-lhe o resumo e dizer o que falta corrigir nos produtos recusados.

## Detalhes técnicos
- Inserção única em `product_ai_commerce` (workspace_id, product_id, ai_commerce_enabled = true) a partir de `products` com `store_published` e `status = 'active'`, com `ON CONFLICT DO NOTHING`.
- Verificação via função `commerce-api` (feed) e contagem posterior.

## Riscos
- Produtos com dados incompletos podem continuar fora do feed; isso fica identificado no resumo.
- Reverter é simples: desligar a mesma configuração nestes 211 produtos.
