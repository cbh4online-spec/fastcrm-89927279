# Preço com e sem IVA na ficha de produto

## Diagnóstico

Na ficha de produto (Criar/Editar) existe apenas **Preço Base**, sem indicar se esse valor é com ou sem IVA. A base de dados já tem os campos certos — `products.tax_included` (booleano), `products.tax_rate_estimate_pct` (taxa) e `products.tax_rate_mode` — e já existem funções utilitárias `getNetPrice()` / `getGrossPrice()` em `src/utils/productPricing.ts` que convertem corretamente conforme `tax_included`.

O que falta:
- O formulário nunca pergunta se o Preço Base inclui IVA: `tax_included` não é lido nem gravado (não existe no tipo de produto, no input de criação, nem na mutação de atualização).
- A taxa de IVA só está escondida na secção avançada "Custos e Margens" (campo "Imposto"), longe do preço.
- Não há forma de introduzir o valor pelos dois lados (escrever 24,58 c/IVA e obter 19,99 s/IVA, ou o inverso).

## O que vou construir

### 1. Bloco de preço com dupla entrada

No bloco de preço da ficha de produto, em vez de um único campo:

```text
Preço sem IVA *        IVA (%)        Preço com IVA
[ 19,90        ]       [ 23  ▾]       [ 24,48        ]
Moeda: EUR ▾           ( ) O preço introduzido inclui IVA
```

- Os dois campos de preço são editáveis: escrever num recalcula o outro em tempo real com a taxa selecionada.
- Selector de IVA com as taxas PT (23%, 13%, 6%, 0% / Isento) e opção de valor livre.
- Interruptor **"Preço base inclui IVA"** que define qual dos dois valores é guardado em `base_price` (grava `tax_included`).
- Linha de resumo abaixo: "19,90 € s/IVA · 4,58 € IVA · 24,48 € c/IVA".
- Arredondamento a 2 decimais, sem derivas (a conversão parte sempre do valor que o utilizador escreveu por último).
- Se a taxa for 0 ou isento, os dois campos ficam iguais e o valor do IVA é 0.

### 2. Persistência

- Gravar e ler `tax_included` (novo) e continuar a gravar `tax_rate_estimate_pct` — a taxa passa a ser editável junto ao preço e continua espelhada no campo "Imposto" da secção "Custos e Margens" (mesma fonte de verdade, sem duplicar estado).
- Herdar a taxa por omissão da categoria (`default_tax_rate`), comportamento que já existe.

### 3. Leitura coerente no resto do sistema

- Detalhe do produto e secção financeira mostram as duas linhas (s/IVA e c/IVA) usando os utilitários existentes.
- Margens continuam calculadas sobre o valor **sem IVA** (convenção já em vigor: Margem = (PVP−Custo)/PVP sobre líquido), para não inflacionar margens quando o preço é introduzido com IVA.

## Detalhes técnicos

- `src/components/products/CreateProductDialog.tsx`: novo sub-componente de preço (`PriceWithVatInput`) com estado `basePrice`, `priceIncludesVat`, `vatRate`; ligação bidirecional e formatação pt-PT (aceitar vírgula decimal).
- `src/types/product.ts`: acrescentar `tax_included` a `Product` e a `ProductInput`.
- `src/hooks/useProducts.ts`: propagar `tax_included` na criação e na mutação de atualização (linha ~429).
- `src/utils/productPricing.ts`: reutilizar `getNetPrice`/`getGrossPrice`; acrescentar apenas helpers de conversão para o input (`netFromGross`, `grossFromNet`) se necessário.
- `src/components/products/ProductFinancialSection.tsx` e detalhe/tabela: apresentar s/IVA e c/IVA sem alterar consultas.
- Sem migração de base de dados — as colunas já existem.

## Critérios de aceitação

- Em Editar produto consigo escrever o preço com IVA e o campo sem IVA atualiza (e vice-versa).
- O interruptor "inclui IVA" grava corretamente e, ao reabrir a ficha, os dois valores reaparecem iguais aos guardados.
- Alterar a taxa de IVA recalcula o par de valores sem alterar o valor que introduzi.
- Margens e KPIs mantêm-se calculados sobre o líquido; nenhum valor do catálogo/loja muda para produtos existentes.
- Taxa 0%/isento não adiciona IVA.
- Sem erros de consola; layout mantém o estilo IX.

## Riscos e pontos por validar

- Produtos existentes não têm `tax_included` definido: assumem-se como **preço sem IVA** (comportamento atual dos utilitários), o que preserva os valores mostrados hoje.
- Confirmar contigo: queres que o campo mostrado por omissão na listagem de produtos seja o valor sem IVA (atual) ou com IVA?
