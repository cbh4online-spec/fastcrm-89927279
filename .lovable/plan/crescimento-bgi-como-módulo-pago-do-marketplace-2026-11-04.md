# Crescimento (BGI) como módulo pago do Marketplace

## Diagnóstico
- O Marketplace de módulos já existe (`marketplace_modules`, `useMarketplaceModules`, `module-checkout`, `module-subscribe`, `useWorkspaceModules`, `moduleNavRegistry`).
- O `module-checkout` só cria subscrições mensais no Stripe — não suporta pagamento único.
- O catálogo BGI (Etapa 1) já permite combinar vários modelos sem duplicar indicadores.

## Decisões de produto
1. Novo módulo **«Crescimento — Business Growth Intelligence»** (slug `growth-intelligence`) no Marketplace.
2. Duas formas de ativar, escolhidas pelo cliente no checkout:
   - **Mensal** (recorrente, cancelável).
   - **Pagamento único** (licença vitalícia para o workspace).
3. Sem módulo ativo: entrada «Crescimento» aparece no menu com cadeado e leva à página do módulo no Marketplace; acesso direto por link é bloqueado (fail-closed). Super admin mantém acesso.
4. Após ativar: assistente inicial onde o dono escolhe **um ou vários modelos** (Comércio, Formação, Serviços, SaaS, Imobiliário, Personalizado). PHARLISS fica pré-sugerida com Comércio + Formação + Serviços. Pode alterar depois em Definições do módulo.

## Estrutura técnica
- Migração:
  - `marketplace_modules`: novos campos `one_time_price_eur`, `stripe_one_time_price_id`; inserir o módulo `growth-intelligence`.
  - Tabela `workspace_bgi_settings` (workspace_id, template_ids text[], updated_by, updated_at) com RLS por workspace; escrita só para quem tem `settings.manage`; auditoria em `activity_logs`.
  - Registo de ativação único em `workspace_modules` com `billing_type` (`subscription` | `one_time`).
- `module-checkout`: aceitar `billing: "monthly" | "one_time"`; `mode: "payment"` para único; validação zod; idempotência por workspace+módulo (não deixa comprar duas vezes).
- Webhook existente: em `checkout.session.completed` com `mode=payment` ativa o módulo sem data de fim; subscrição mantém o fluxo atual (cancelamento desativa).
- Frontend:
  - Página do módulo no Marketplace com os dois preços e botão por opção.
  - `useBgiSettings` + `BgiTemplatePicker` (multi-seleção) usando `resolveWorkspaceIndicators()`.
  - Rota `/dashboard/growth` protegida por `ModuleGuard`; entrada no `routeManifest`.
  - Nesta fase o ecrã mostra os indicadores selecionados (lista/cartões “a calcular”); valores reais chegam na Etapa 2.

## Critérios de aceitação
- Workspace sem módulo não abre `/dashboard/growth` e vê o convite para ativar.
- Checkout mensal e único funcionam em modo de teste; após pagamento o módulo fica ativo.
- Cancelar a subscrição desativa; o pagamento único nunca expira.
- É possível guardar Comércio + Formação + Serviços e os indicadores aparecem sem duplicados.
- Testes: modo de cobrança (mensal vs único), bloqueio sem módulo, combinação de modelos.

## Pontos por validar
- **Preços**: indique o valor mensal e o valor único (ex.: 49 €/mês e 990 € único?). Até lá fica configurável no super admin, sem preço inventado visível ao cliente.
- O pagamento único dá direito a atualizações futuras do módulo? (assumido: sim).
