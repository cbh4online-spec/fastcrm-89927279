# Atalhos do dashboard abrem diretamente o formulário de criação

## Problema

No cabeçalho da Visão Global, o botão "Novo Item" apenas navega para a listagem de Produtos (`/dashboard/products`), obrigando o utilizador a procurar e clicar em "Criar Produto". O mesmo acontece com "Novo Contacto", que só abre a listagem de Contactos.

## Comportamento pretendido

- "Novo Item" abre imediatamente o diálogo de criação de produto (já existente, `CreateProductDialog`), sobre a página de Produtos.
- "Novo Contacto" passa a abrir também de imediato o formulário de criação de contacto, por coerência.
- Fechar o diálogo mantém o utilizador na listagem, sem repetir a abertura ao navegar ou atualizar.

## Estrutura técnica

- `src/pages/dashboard/IXDashboard.tsx`: atalho "Novo Item" passa a apontar para `/dashboard/products?new=1`; "Novo Contacto" para `/dashboard/contacts/new` (rota de criação já existente).
- `src/components/products/ProductsList.tsx`: ler `useSearchParams`; quando `new=1`, ativar `state.setCreateOpen(true)` no arranque e limpar o parâmetro do URL (replace) para não reabrir em navegações seguintes.

## Critérios de aceitação

- Clicar em "Novo Item" na Visão Global abre o diálogo de criação de produto num só passo.
- Clicar em "Novo Contacto" abre o formulário de novo contacto.
- Após fechar o diálogo, o URL fica limpo (`/dashboard/products`) e o diálogo não reabre.
- Sem alterações no comportamento do botão "Criar Produto" existente na listagem.

## Nota sobre o trabalho em curso

A fusão manual de contactos/empresas/leads (plano já aprovado) continua por concluir; esta alteração é pequena e independente, e será feita sem interferir nesses ficheiros.
