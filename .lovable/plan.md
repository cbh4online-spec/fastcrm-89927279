# KPIs das listagens totalmente visíveis

## Problema
Na página Empresas (e Contactos), os cartões de KPI aparecem cortados: valores como «1 868 …», «445 5…» e rótulos como «FATURAÇÃO …» ficam truncados, e o 5.º cartão (Ticket médio) sai fora do ecrã com scroll horizontal.

## Solução (só apresentação, sem mudar cálculos)
Alterar o componente partilhado da faixa de KPIs para:
1. **Grelha em vez de scroll horizontal**: 2 colunas em telemóvel, 3 em ecrãs médios, 5 em ecrãs largos — todos os cartões visíveis sem deslizar.
2. **Valores nunca cortados**: remover o corte com reticências do valor; o número pode passar de linha se faltar espaço, com tamanho ligeiramente adaptável (maior em ecrãs largos).
3. **Rótulos completos**: permitir que o rótulo ocupe 2 linhas em vez de ser cortado; o texto auxiliar (ex.: «Montante pago») também passa a quebrar linha.
4. **Ícone mais compacto** em ecrãs médios para dar espaço ao número.
5. Manter cliques nos cartões (filtro), estado ativo, «A filtrar por… Limpar» e a nota por baixo.

## Impacto
Melhora automaticamente Empresas, Contactos e as outras listagens que usam a mesma faixa de KPIs. Nenhum valor ou filtro muda.

## Validação
Abrir Empresas na pré-visualização a ~930 px e a 1280 px e confirmar que os 5 valores aparecem inteiros, sem erros na consola.

## Técnico
Ficheiro: `src/components/documents/listing/ListKPIStrip.tsx` — trocar `md:flex md:overflow-x-auto` por `grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5`, remover `truncate` do valor/rótulo/hint (usar `break-words`, `tabular-nums`, `text-lg lg:text-xl`), ícone `h-8 w-8`.
