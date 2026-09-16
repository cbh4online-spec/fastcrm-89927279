
- [x] Corrigir violação de `entity_activities_activity_type_check` (tipo `message_sent` no registo de mensagens WhatsApp) — constraint alargada na migration 0005.

## Faturação (pedido 2026-09-02)
- [ ] Permitir editar datas das faturas (emissão / vencimento) na listagem e no detalhe.
- [ ] Corrigir KPI "Recebido" — não reflete as faturas pagas.
- [ ] Garantir que os valores respeitam o IVA configurado nos produtos.

## Produtos / WhatsApp (pedido 2026-09-02)
- [x] Ficha de produto: "Preço Base (s/IVA)" mostrava o valor de catálogo c/IVA quando `tax_included = true`.
- [x] Mensagem na inbox (Messenger/GHL) gravada localmente sem envio real — deteção GHL alargada + guarda contra falso sucesso.

## Loja pública (pedido 2026-09-16)
- [x] Pesquisar artigos por SKU, código de barras, código SAF-T e SKU de variante, com isolamento por workspace.

## Estabilidade e desempenho (pedido 2026-09-16)
- [ ] Corrigir recuperação de chunks desatualizados e evitar ciclos de reload da PWA.
- [ ] Reduzir o carregamento inicial com rotas principais e ferramentas de desenvolvimento lazy.
- [ ] Validar landing, autenticação, dashboard e loja em desktop e mobile.
