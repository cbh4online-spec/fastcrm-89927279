# Contagem de stock (inventário físico) com modo mobile

## Diagnóstico

O sistema já regista stock e movimentos (`product_inventory`, `product_stock_movements`, `product_stock_locations`, `inventory_movements`) e valoriza o inventário em Stock Valorizado por FIFO. O que não existe é um processo de **contagem física**: hoje só é possível corrigir stock produto a produto, sem folha de contagem, sem registo de quem contou, sem comparação contado vs. sistema e sem trilho de auditoria dos acertos.

## Decisões de produto/UX

1. A contagem é um documento com ciclo de vida: **Rascunho → Em contagem → Em revisão → Fechada** (ou Cancelada). Só o fecho mexe no stock.
2. Âmbito configurável: inventário total, por categoria, por localização/armazém, ou lista de produtos escolhidos.
3. Duas interfaces sobre os mesmos dados:
   - **Desktop**: tabela de linhas com pesquisa, filtros (por contar / com divergência / contados), edição rápida e revisão final com resumo de impacto.
   - **Mobile (modo contagem)**: ecrã de foco a um item de cada vez — pesquisa por SKU/nome, leitura por câmara de código de barras, teclado numérico grande, botões +/-, "guardar e seguinte". Quantidade de sistema oculta por defeito (contagem cega, opcional) para evitar enviesamento.
4. Trabalho offline-tolerante: as contagens gravam localmente e sincronizam; nunca perder uma contagem por falha de rede.
5. Ao fechar, gera um movimento de ajuste por cada divergência, com motivo obrigatório acima de um limiar configurável.
6. Nada é apagado: contagens fechadas ficam consultáveis com o histórico completo.

## Estrutura técnica

Novas tabelas (com RLS por `workspace_id` e GRANTs):
- `stock_counts`: âmbito, localização, estado, contagem cega, datas, responsável, notas, totais.
- `stock_count_items`: produto/variante, `expected_qty` (congelado ao gerar), `counted_qty`, `variance`, custo unitário, quem contou e quando, notas.
- Índices por `(workspace_id, status)` e `(count_id, product_id)`.

RPCs (SECURITY DEFINER, `search_path = public`):
- `generate_stock_count_items(count_id)` — congela o esperado conforme o âmbito.
- `submit_stock_count_item(count_id, product_id, qty, notes)` — upsert idempotente, usada pelo mobile.
- `close_stock_count(count_id)` — valida permissões, escreve os ajustes em `product_stock_movements` (tipo `adjustment`, `reference_type='stock_count'`), atualiza `product_inventory.stock_on_hand`, marca fechada. Tudo numa transação.

Frontend:
- Rotas `/dashboard/stock-counts` (lista IX), `/dashboard/stock-counts/:id` (detalhe/revisão) e `/dashboard/stock-counts/:id/count` (modo contagem full-screen, otimizado para telemóvel).
- Hooks `useStockCounts`, `useStockCountItems`, `useSubmitCount` com atualização otimista e fila de reenvio.
- Leitor de código de barras via `BarcodeDetector` com fallback para introdução manual.
- Entrada no menu em Produtos → Contagens de stock, e botão "Nova contagem" a partir do Stock Valorizado.
- Exportação CSV da folha de contagem e do relatório de divergências.

## Plano de implementação

1. Migração das tabelas, RLS, GRANTs e RPCs.
2. Lista e criação de contagens (âmbito, localização, contagem cega).
3. Detalhe desktop: linhas, filtros, progresso, divergências.
4. Modo contagem mobile com scanner e resiliência offline.
5. Revisão e fecho com ajustes de stock e registo de auditoria.
6. Relatório de divergências e exportações.

## Critérios de aceitação

- Criar uma contagem por categoria/localização gera as linhas com o esperado congelado.
- No telemóvel é possível pesquisar ou ler o código, introduzir a quantidade e avançar sem sair do ecrã.
- Perder a rede a meio não perde contagens já introduzidas.
- Fechar a contagem acerta o stock apenas nas divergências e deixa movimentos rastreáveis.
- Uma contagem fechada é imutável e continua consultável.
- Sem erros de consola; utilizável a 390px e 1280px.

## Por validar

- Confirmar se a contagem deve ser por localização/armazém desde já ou apenas global nesta primeira versão.
- Motivo obrigatório em divergências: sempre, ou só acima de um limiar (valor ou quantidade)?
- Contagem cega (esconder a quantidade de sistema) por defeito ligada ou desligada?
