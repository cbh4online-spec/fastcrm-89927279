# Stock Valorizado — corrigir SKU ilegível e melhorar o MVP

## Diagnóstico

Na tabela de inventário (`src/pages/StockValuationPage.tsx`) a tabela usa `table-fixed w-full min-w-0` com uma coluna de produto em percentagem (34%) e sete colunas em píxeis fixos. Dentro do layout do dashboard a soma das larguras fixas ultrapassa o espaço disponível, por isso a coluna "Produto / SKU" é comprimida até poucos píxeis: o nome parte-se letra a letra ("Pl a…", "CL O…") e o SKU, com `truncate`, fica reduzido a "P…". O conteúdo está correto — o problema é apenas de layout de tabela.

## Decisões de produto/UX

1. A identificação do produto é a coluna mais importante: nunca deve ser comprimida. Ganha largura mínima garantida e a tabela passa a permitir scroll horizontal em vez de esmagar colunas.
2. O SKU passa a ser legível e útil: tipo monoespaçado, contraste adequado, com botão de copiar e destaque quando corresponde à pesquisa.
3. O nome do produto liga à ficha do produto (abre em novo separador), evitando ter de procurar manualmente.
4. Cabeçalho fixo ao fazer scroll e coluna de produto fixa à esquerda no scroll horizontal.
5. Indicação visual da coluna e direção de ordenação (atualmente não há seta).
6. Seletor de colunas visíveis, para quem só quer ver custo ou só PVP, com preferência guardada localmente.
7. Estados vazios distintos: "sem produtos" vs "sem resultados para os filtros" com ação para limpar filtros.

## Estrutura técnica

- Substituir `table-fixed` por larguras naturais com `min-w-[980px]` no elemento `Table`, mantendo o contentor com `overflow-x-auto`.
- Coluna de produto: `min-w-[260px]`, nome com `line-clamp-2` e `title`, SKU em `font-mono text-[11px]` numa linha própria, sem `truncate` agressivo.
- Novo subcomponente `ProductCell` no mesmo ficheiro (nome, SKU, ação de copiar) para manter a tabela legível.
- Cabeçalho `sticky top-0` dentro do contentor com scroll; primeira coluna `sticky left-0` com fundo do cartão.
- Indicadores de ordenação com ícones `ArrowUp`/`ArrowDown` no cabeçalho ativo.
- Estado `visibleColumns` persistido em `localStorage` (chave `stock-valuation:columns`), aplicado a cabeçalho, células e exportação CSV.
- Cartões mobile: mesma hierarquia de SKU (mono + copiar), sem alterações de dados.
- Sem alterações a hooks, SQL ou lógica de cálculo — apenas apresentação.

## Plano de implementação

1. Corrigir o layout da tabela (larguras, scroll, sticky) e a célula de produto/SKU.
2. Adicionar copiar SKU e ligação à ficha do produto (desktop e mobile).
3. Adicionar indicadores de ordenação e o seletor de colunas visíveis ligado ao CSV.
4. Afinar estados vazios e verificar responsividade em 1180px, 1440px e 390px.

## Critérios de aceitação

- Em 1180px o nome do produto ocupa no máximo duas linhas legíveis e o SKU aparece completo ou com reticências apenas em SKUs muito longos.
- O scroll horizontal aparece em vez de comprimir colunas; a coluna de produto e o cabeçalho mantêm-se visíveis.
- Copiar SKU coloca o valor na área de transferência com confirmação.
- Ocultar colunas reflete-se na tabela e no CSV exportado.
- Sem erros de consola; mobile mantém os cartões legíveis.

## Riscos e pontos por validar

- Sticky na primeira coluna exige fundo opaco para não sobrepor texto — validar em tema claro e escuro.
- Confirmar a rota correta da ficha de produto usada na ligação do nome.
