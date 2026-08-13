# Criar ofertas sem sair do funil

## Diagnóstico

No separador **Passos** (e igualmente em **Order bumps**) do detalhe do funil, quando o workspace ainda não tem ofertas, o utilizador vê apenas o texto "Ainda não tem ofertas criadas. Crie-as em Checkout > Ofertas." — sem qualquer ação clicável. O formulário de criação de oferta existe, mas está embutido dentro de `CheckoutOffersPage`, pelo que só é acessível nessa página e obriga a abandonar o funil e perder o contexto.

## O que vai ser construído

### 1. Diálogo de oferta reutilizável
Extrair o formulário de criação de oferta da página de Ofertas para um componente próprio (`OfferFormDialog`), com os mesmos campos: ligação ao catálogo (via o picker de produtos já existente), nome, tipo, preço, headline e descrição. A página de Ofertas passa a usar esse componente, sem alteração de comportamento.

### 2. Botão "Nova oferta" nos passos e nos order bumps
- Ao lado do seletor "Escolher oferta" passa a existir um botão **Nova oferta**, sempre visível.
- O estado vazio deixa de ser só texto: mostra uma frase curta e um botão primário **Criar primeira oferta**, mais um link discreto para Checkout > Ofertas.
- Nos passos, o tipo de oferta pré-preenche o tipo escolhido no seletor (upsell/downsell); nos order bumps, pré-preenche "Order Bump".
- Depois de criar, a oferta é automaticamente selecionada no seletor, com aviso de sucesso, para o utilizador só precisar de clicar em "Adicionar".

### 3. Ajuda contextual
Texto curto de apoio a explicar o que é uma oferta (produto adicional apresentado depois/durante o pagamento) e a diferença entre upsell, downsell e order bump, visível junto aos seletores.

## Detalhes técnicos

- Novo `src/components/checkout/admin/OfferFormDialog.tsx` — dialog controlado (`open`, `onOpenChange`), prop `defaultOfferType` e callback `onCreated(offer)`; usa `useCheckoutOffers().createOffer` e `ProductPickerDialog`.
- `src/pages/dashboard/checkout/CheckoutOffersPage.tsx` — substituir o dialog inline pelo novo componente.
- `src/components/checkout/admin/FunnelStepsEditor.tsx` e `FunnelBumpsEditor.tsx` — botão + estado vazio com CTA; ao criar, `setOfferId(offer.id)`.
- Sem alterações de base de dados nem de Edge Functions; as ofertas continuam a ser criadas em `checkout_offers` com o `workspace_id` atual e RLS existente.

## Critérios de aceitação

- Com zero ofertas, o separador Passos mostra um botão que abre o formulário e permite criar uma oferta sem sair do funil.
- A oferta criada aparece já selecionada no seletor e pode ser adicionada como passo num clique.
- O mesmo funciona no separador Order bumps, com tipo pré-definido.
- A página Checkout > Ofertas mantém o comportamento atual.
- Validação de nome e preço mantida; estados de loading e erro visíveis; ações acessíveis por teclado e com `aria-label`.
