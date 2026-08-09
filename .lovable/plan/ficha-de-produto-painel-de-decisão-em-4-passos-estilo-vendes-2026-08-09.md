# Ficha de produto: painel de decisão em 4 passos (estilo VendeSimples)

## Diagnóstico

A ficha atual (anexo 1) já tem preço c/IVA, stock, quantidade, adicionar ao carrinho, comprar agora, fazer oferta, alerta de preço e uma faixa de confiança pequena. Os blocos que o VendeSimples mostra dentro da coluna de compra existem no FastCRM, mas estão dispersos e muito abaixo na página:

- `StoreOfferDialog` (fazer oferta) — botão solto, sem comparação com a compra direta
- `StoreProductBundles` / `StoreBoughtTogether` — packs existem, mas sem seletor de opções nem total/portes combinados
- `StoreCheaperAlternatives` — existe, mas isolado no fundo da página
- Contacto com o vendedor — não existe bloco dedicado na ficha

Ou seja: falta a **arquitetura de decisão** (escolher como comprar, escolher quanto levar, ver alternativas, falar com alguém), não faltam dados.

## O que vou construir

Um painel único na coluna direita, numerado, que substitui a pilha atual de botões:

```text
1  COMO QUERES COMPRAR
   [ Compra direta  620,00 € ]   [ Fazer oferta  620,00 € ]
     Envio e devolução garantidos     Propõe o teu preço
     [ Adicionar ao carrinho ]        [ Fazer oferta ]

2  LEVA MAIS (quando há packs)
   [ Só este item ] [ + 1 item ] [ + 2 itens ]
   Resumo: itens, portes, total  ->  [ Adicionar ao carrinho ]

3  ALTERNATIVAS MAIS ACESSÍVEIS  (só se houver na mesma categoria e mais baratas)

4  FALA CONNOSCO  (só se a loja tiver canal configurado)
```

### Passo 1 — Como queres comprar
Dois cartões lado a lado: compra direta (com selo "Melhor opção") e fazer oferta. Cada um lista as suas garantias reais, vindas das definições da loja (devolução, pagamento seguro, apoio). O cartão de oferta só aparece se o produto tiver ofertas ativadas; caso contrário o passo 1 colapsa e mostra apenas a compra direta.

### Passo 2 — Leva mais
Seletor de opções construído a partir dos packs configurados (`product_bundles`) e, quando não há packs, dos produtos "comprados juntos". Cada opção mostra miniaturas, preço total do conjunto e etiqueta ("Melhor valor", "Envio combinado"). Por baixo, resumo com itens, portes e total, calculado com as mesmas regras do checkout para o valor nunca divergir. Um único botão adiciona toda a opção escolhida ao carrinho.

### Passo 3 — Alternativas mais acessíveis
Reaproveita `StoreCheaperAlternatives`, agora dentro do painel, com preço e percentagem de poupança. Continua ligado/desligado nas definições da ficha de produto.

### Passo 4 — Fala connosco
Ligação direta ao canal de contacto já configurado na loja (WhatsApp/email/formulário de pedido de preço). Não aparece se nada estiver configurado.

## Notas técnicas

- Novo `src/components/store/purchase/StorePurchasePanel.tsx` a orquestrar quatro subcomponentes: `PurchaseModeChooser`, `BundleTierSelector`, `CheaperAlternativesInline`, `SellerContactBlock`.
- `StoreProductPage.tsx` passa a compor o painel; os blocos duplicados que hoje ficam soltos abaixo são removidos dessa posição para não repetir conteúdo.
- Preços e IVA continuam a vir de `StoreVatContext` + `useStoreTierPricing`; portes calculados com a mesma função usada no checkout, sem fórmula nova.
- Cada passo é controlado pelo `product_page_config` já existente (`bundles_enabled`, `cheaper_alternatives_enabled`, faixa de confiança), com dois novos interruptores: escolha de modo de compra e bloco de contacto.
- Mobile: painel empilha na vertical e a barra de conversão fixa passa a refletir a opção selecionada no passo 2.
- Sem alterações de schema.

## Critérios de aceitação

- Nenhum passo aparece vazio; sem packs, sem alternativas ou sem canal de contacto, o passo desaparece.
- O total mostrado no passo 2 é igual ao total do carrinho depois de adicionar.
- Fazer oferta continua a respeitar as regras atuais (só onde está ativo).
- Sem duplicação visual: cada bloco aparece uma vez na página.
- Sem erros de consola; teclado e foco funcionais na escolha de opções.

## Por validar

- O passo 2 deve incluir portes na comparação (como no VendeSimples) ou mostrar apenas o valor dos produtos?
- O passo 4 deve abrir WhatsApp da loja ou o formulário de contacto interno?
