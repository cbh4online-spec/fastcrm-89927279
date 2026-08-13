# Funis de Checkout — completar o MVP

## Diagnóstico

O módulo tem base funcional (funis, ofertas, sessões, upsell/downsell, Stripe, analytics), mas o painel de gestão está incompleto:

- **Não há ecrã de detalhe do funil.** `CheckoutFunnelsPage` só cria (nome + slug) e elimina. Tudo o que faz o checkout funcionar — produtos e preços (`settings.products`), moeda, contador, escassez, morada obrigatória, order bumps e passos de upsell/downsell — só existe em base de dados, sem qualquer UI. Um funil criado hoje mostra ao cliente um único item com preço 0.
- **Sem edição nem ativar/desativar.** O hook já expõe `updateFunnel`, mas nenhuma UI o usa; `is_active` nunca muda a partir do painel.
- **Ligação a ofertas inexistente.** As ofertas criadas em `/dashboard/checkout/offers` não podem ser associadas a um funil (nem como bump nem como passo), apesar de `checkout_funnel_steps` e `checkout_order_bumps` existirem.
- **Validação fraca.** Slug apenas em minúsculas com espaços trocados: aceita acentos e caracteres inválidos, não verifica duplicados, sem limites de comprimento, sem validação de preços. Sem zod.
- **Robustez.** Eliminar funil não pede confirmação; sem estado de erro nas queries (só loading e vazio); botões só-ícone sem `aria-label`; sem indicação de que o Stripe do workspace não está configurado (o cliente só descobre o erro no checkout).
- **UX/UI.** Cartões fora do padrão IX, sem pesquisa/filtros, sem KPI de desempenho por funil, sem copiar link público, sem contagem de passos/bumps.

## O que vai ser construído

### 1. Página de detalhe do funil (`/dashboard/checkout/:funnelId`)
Novo ecrã com cabeçalho IX (nome, slug, estado, copiar link, pré-visualizar) e tabs:

- **Produtos & Preço** — editor de linhas (nome, quantidade, preço), moeda, total calculado. Escreve em `settings.products`.
- **Passos do funil** — lista ordenada de upsell / downsell / thank-you, escolhendo ofertas existentes; reordenar e remover (`checkout_funnel_steps`).
- **Order bumps** — associar ofertas do tipo bump, ordem e ativação (`checkout_order_bumps`).
- **Conversão** — contador regressivo, texto de escassez, morada obrigatória, badges de confiança (`settings`).
- **Definições** — nome, descrição, slug, ativo/inativo, eliminar com confirmação.

Guardar explícito com estado (Guardado / A guardar / Erro com repetir).

### 2. Listagem melhorada
Layout IX: pesquisa, filtro Ativos/Inativos/Todos, linhas compactas com slug, nº de passos e bumps, estado; ações: abrir, copiar link, duplicar funil, ativar/desativar, eliminar (com confirmação). Estado vazio dentro de `IXCard` com CTA único.

### 3. Validação e robustez
- Schemas zod para funil (nome 2–120, slug `^[a-z0-9-]{3,60}$` normalizado sem acentos) e produtos (preço ≥ 0, quantidade ≥ 1, máx. 20 linhas).
- Verificação de slug único por workspace antes de gravar, com mensagem clara em vez do erro cru da base de dados.
- Estados de erro em todas as queries, com botão "Tentar novamente".
- Aviso no topo quando o workspace não tem Stripe ativo, com link para as definições de pagamentos.
- `aria-label` em todas as ações só-ícone; confirmação (AlertDialog) em eliminar/duplicar.
- Validação no checkout público: bloquear pagamento quando o funil não tem produtos com preço > 0, com mensagem própria (hoje mostra "Checkout não disponível" ou total zero).

## Estrutura técnica

- `src/pages/dashboard/checkout/CheckoutFunnelDetailPage.tsx` — novo ecrã com tabs.
- `src/components/checkout/admin/FunnelProductsEditor.tsx`, `FunnelStepsEditor.tsx`, `FunnelBumpsEditor.tsx`, `FunnelSettingsForm.tsx` — blocos reutilizáveis.
- `src/schemas/checkout/funnelSchema.ts` — zod partilhado por criação e edição.
- `src/hooks/useCheckoutFunnels.ts` — adicionar `duplicateFunnel`, `toggleActive` e contagens (passos/bumps) na query da listagem.
- `src/hooks/useCheckoutOrderBumps.ts` — novo hook para `checkout_order_bumps` (listar, associar, ordenar, remover).
- `src/routes/CheckoutRoutes.tsx` — nova rota de detalhe.
- `src/pages/dashboard/checkout/CheckoutFunnelsPage.tsx` — reescrita da listagem no padrão IX.
- `src/pages/checkout/CheckoutPage.tsx` — mensagem de erro clara para funil sem produtos configurados.

Sem alterações de base de dados: todas as tabelas (`checkout_funnels`, `checkout_funnel_steps`, `checkout_offers`, `checkout_order_bumps`) já existem com RLS por workspace. Sem alterações às Edge Functions de Stripe.

## Critérios de aceitação

- Criar um funil, definir produtos e preços, associar um bump e um upsell, e completar uma compra ponta a ponta sem tocar na base de dados.
- Ativar/desativar e duplicar um funil a partir da listagem.
- Slug inválido ou repetido é bloqueado com mensagem em português, antes de gravar.
- Eliminar pede confirmação.
- Erros de rede mostram estado de erro com repetir; consola sem erros.
- Funciona em mobile (tabs com scroll, ações acessíveis) e por teclado.

## Riscos por validar

- Funis existentes podem ter `settings` em formatos antigos; o editor lê com valores por omissão e normaliza ao gravar.
- Stripe por workspace: sem chave ativa o fluxo continua a falhar no pagamento — o aviso torna-o explícito, mas a configuração em si fica fora deste âmbito.
