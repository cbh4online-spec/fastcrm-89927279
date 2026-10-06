
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
- [x] Corrigir recuperação de chunks desatualizados e evitar ciclos de reload da PWA.
- [x] Reduzir o carregamento inicial com rotas principais e ferramentas de desenvolvimento lazy.
- [x] Validar landing, autenticação e loja em desktop; landing também validada em mobile.

## Integração mymia.world (pedido 2026-09-24)
- [ ] Obter chave de serviço do mymia.world e guardar em MYMIA_SOURCE_SERVICE_KEY; testar "Ver o que existe" e sincronizar.

## Resend como módulo do marketplace (pedido 2026-10-02)
- [x] Ligar o Resend ao projeto.
- [x] Criar módulo "Emails (Resend)" no marketplace; campanhas só enviam com o módulo ativo.

## Etapas das oportunidades (pedido 2026-10-06)
- [x] Aplicar percurso vertical com nomes completos, etapa atual destacada e avanço contextual; validado isoladamente em desktop e mobile, incluindo avanço, loading e última etapa.
- [ ] Confirmar na ficha real — a sessão de teste não carregou o percurso da oportunidade.

## Alertas e ficha de contacto (pedido 2026-10-06)
- [x] Corrigir filtros e textos dos alertas, espaço inferior e proteção das ações contra o Copilot; validado com alerta real a 360/393 px e desktop sem marcar como lido.
- [x] Corrigir consulta da próxima tarefa (instância resolvida, campos reais, pending, invalidação e erro explícito) e regresso direto à lista, incluindo contacto indisponível.
- [ ] Validar próxima tarefa e regresso dentro da ficha real do André — sessão disponível sem contactos nos workspaces relevantes; não existem tarefas nesses workspaces na base consultada.
