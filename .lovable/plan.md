# Comparação de preços: sem repetições e só referências acima do nosso preço

## Diagnóstico

No bloco "Comparar Preços" da página pública de produto, as referências externas são listadas tal como estão guardadas, ordenadas por preço, sem qualquer agrupamento:

- a mesma loja aparece várias vezes (`loja.strong-answer.com` duas vezes);
- variações do mesmo domínio contam como lojas diferentes (`Aquario` e `Aquario.pt`);
- referências mais baratas que o nosso preço são mostradas ao cliente, o que enfraquece a proposta de valor.

## Decisões de produto/UX

1. **Uma referência por loja.** Agrupar por domínio normalizado (sem `www.`, sem sufixos duplicados de marca) e manter apenas **o valor mais alto** dessa loja.
2. **Mostrar apenas referências acima do nosso preço.** Referências iguais ou abaixo do nosso preço deixam de aparecer na loja pública.
3. **Se não sobrar nenhuma referência**, o bloco de lojas externas simplesmente não é mostrado (sem mensagens vazias nem placeholders).
4. **O cálculo automático de preço não muda.** Continua a usar todas as referências válidas recolhidas, incluindo as que ficam escondidas — a regra é apenas de apresentação.

## Melhorias ao MVP (mesmo bloco)

- Selo "Melhor preço" quando todas as referências visíveis são mais caras que a nossa.
- Poupança apresentada em euros e percentagem face à referência mais barata visível.
- Data da última recolha ("Atualizado a …") por baixo da lista.
- Máximo de 4 lojas, ordenadas do mais alto para o mais baixo.
- Nome da loja apresentado de forma limpa (domínio legível em vez de texto inconsistente).

## Estrutura técnica

- Novo módulo puro `src/lib/pricing/competitorDisplay.ts`:
  - `normalizeStoreKey(name, url)` — chave de agrupamento por domínio;
  - `prepareCompetitorRefs(refs, ourPrice, { max })` — dedupe por loja mantendo o máximo, filtro `price > ourPrice`, ordenação desc, corte no limite;
  - devolve também `cheapestVisible` e `lastFetchedAt` para o cabeçalho.
- `src/components/store/PriceComparisonWidget.tsx` passa a consumir esse módulo em vez de `externalPrices.slice(0, 4)`; recebe já `currentPrice`.
- `src/hooks/usePriceComparison.ts` mantém-se (continua a devolver todas as referências válidas); nenhuma alteração ao motor `undercutPricing` nem às Edge Functions de preços.
- Testes novos em `src/test/pricing/competitorDisplay.test.ts`: dedupe por domínio, `www`/subdomínio, escolha do valor mais alto, filtro pelo nosso preço, lista vazia, limite de 4.

## Plano de implementação

1. Criar o módulo puro `competitorDisplay.ts`.
2. Criar os testes unitários e passá-los.
3. Refatorar `PriceComparisonWidget.tsx` (dedupe, filtro, selo, poupança, data).
4. Correr `bunx tsgo --noEmit -p tsconfig.app.json` e os testes de pricing.

## Critérios de aceitação

- Nenhuma loja repetida na lista.
- `Aquario` e `Aquario.pt` contam como uma única loja.
- Nenhuma referência igual ou inferior ao nosso preço visível na loja pública.
- Bloco desaparece quando não há referências elegíveis.
- Ajuste automático de preço continua a usar a referência mais baixa recolhida.
- Typecheck e testes verdes.

## Riscos e pontos por validar

- Lojas distintas sob o mesmo domínio (marketplaces) passam a ser agrupadas numa só linha — aceitável nesta fase.
- Produtos cujas referências sejam todas mais baratas deixam de mostrar comparação; a informação continua disponível na área de administração de preços.
