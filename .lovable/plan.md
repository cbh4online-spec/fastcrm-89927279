## Diagnóstico

A captura mostra o padrão visual InvoiceXpress para a listagem de **Faturas**:
- Título grande à esquerda + barra de pesquisa central + CTAs verdes à direita (`Criar Outros`, `Criar Fatura`).
- Linha de **chips-filtro** com label em cima e valor selecionado embaixo (Clientes, Estado, Tipo, Datas, Séries, Favoritos, Outras Opções) — chips ativos com borda verde.
- Barra de **toolbar**: seleção em massa à esquerda, "Ordenar por", "Resultados por página", contador de documentos, "Limpar filtros".
- **Cartão-resumo** com fórmula visual: `Não Vencido + Vencido + Recebido + Acertos = Total s/IVA + IVA = Total`, e linha secundária com Rascunhos e Cancelados.
- **Linhas/cards** de documentos: checkbox + badge de estado (Final/Rascunho/Pago) + número + nome do cliente + datas de emissão/vencimento + total (com s/IVA por baixo) + ícone de ação verde.

Hoje cada listagem usa um layout próprio (tabela densa, filtros diferentes), o que quebra a consistência com a sidebar InvoiceXpress já aplicada.

## Decisões de produto/UX

1. Criar **uma framework visual partilhada** para "Listagem de Documentos" reutilizável em Faturas, Propostas/Orçamentos, Notas de Encomenda, Guias e Encomendas da Loja.
2. Manter a lógica de dados/permissões/filtros existente em cada módulo — só substituir a apresentação.
3. Cartão-resumo configurável por tipo de documento (faturas mostram financeiro completo; propostas mostram pipeline: rascunho/enviada/aceite/recusada/valor total).
4. Cards-linha com hover, clique para abrir o detalhe, ação rápida no ícone final (PDF / abrir).

## Estrutura técnica

Novos componentes em `src/components/documents/listing/`:

```text
DocumentListLayout.tsx        // header (título + pesquisa + CTAs) + slots
DocumentFilterChips.tsx       // chips com label/valor, estado ativo
DocumentListToolbar.tsx       // seleção, ordenação, page-size, contador
DocumentSummaryCard.tsx       // fórmula visual configurável
DocumentRow.tsx               // card-linha com badge, número, cliente, datas, totais
DocumentStatusBadge.tsx       // mapeamento estado → cor (pago/rascunho/final/…)
```

Tokens (já existem no design system): usar `--primary` (azul FastCRM) para chips ativos e ações em vez do verde IX. CTAs primários ficam azuis.

## Plano de implementação

1. Construir os 6 componentes base com props tipadas e estados (vazio, loading, erro).
2. Refatorar `src/pages/Invoices.tsx` para usar o novo layout — referência canónica.
3. Aplicar a `src/pages/Proposals.tsx` (cartão-resumo: nº rascunhos / enviadas / aceites / valor total).
4. Aplicar a `src/pages/OrderNotesPage.tsx` (resumo por estado de encomenda).
5. Aplicar a `src/pages/StoreOrdersPage.tsx`.
6. Aplicar a páginas de Guias e Recibos, se existirem rotas equivalentes.
7. QA: estados vazios, mobile (<768px → chips em scroll horizontal, cartão-resumo empilhado), permissões.

## Critérios de aceitação

- Faturas, Propostas, Notas de Encomenda e Encomendas usam o mesmo header, chips, toolbar, cartão-resumo e cards-linha.
- Cor primária = azul FastCRM (não verde IX).
- Mantém todos os filtros, ordenação, paginação e ações já existentes.
- Responsivo em mobile.
- Zero regressões nos detalhes/criação.

## Riscos e pontos por validar

- **Confirmar âmbito**: incluo Guias e Recibos? Inclui também as listagens de **Encomendas da Loja** (B2C) e **Aprovações B2B**?
- Cartão-resumo de Propostas: que métricas queres ver (valor em pipeline, taxa de conversão, nº por estado)?
- CTAs do header — manter "Criar Fatura" + "Criar Outros" como no IX, ou só um botão primário por página?
- Quero arrancar pelas **Faturas** como referência e depois replicar — ok?
