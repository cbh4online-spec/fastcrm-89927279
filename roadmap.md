
- [x] Corrigir violação de `entity_activities_activity_type_check` (tipo `message_sent` no registo de mensagens WhatsApp) — constraint alargada na migration 0005.

## Project monitoring (2026-10-27)
- [ ] Reputação FastMatch: problema confirmado; aguarda aprovação do plano de cálculo autoritativo e proteção de escrita.
- [x] Corrigir origem na importação após «Já enviei»; não agendar follow-ups de prospeção que a conversão cancela. Testes aprovados, sem criar leads reais.
- [x] Webhook: segredo da loja já configurado; corrigir checkout inicial pago de subscrição, preservando assinatura e idempotência. 13 testes isolados aprovados; sem cobrança real.
- [x] Preços Meta: remover IVA duplicado; catálogo ativo Ajax confirmado em 828,52 EUR para FIBRA-KIT1-PRO-4G-W.
- [ ] Mapa de Eventos: política bloqueia administradores; catálogo também vazio para super admin (0 registos). Aguarda aprovação do plano de acesso e conteúdo.
- [x] Vendedor: invalidar companies em vez de companys; teste do seletor confirma atualização da lista e detalhe.

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
- [x] Repor largura integral e cartões compactos nos alertas mobile, filtros em duas colunas; validado com alerta real a 360/393/1280 px, margens de 12px, Acompanhamentos completo, Abrir desobstruído, sem overflow; nove testes aprovados e build OK, sem marcar alertas como lidos nem publicar.
- [x] Corrigir filtros e textos dos alertas, espaço inferior e proteção das ações contra o Copilot; validado com alerta real a 360/393 px e desktop sem marcar como lido.
- [x] Corrigir consulta da próxima tarefa (instância resolvida, campos reais, pending, invalidação e erro explícito) e regresso direto à lista, incluindo contacto indisponível.
- [ ] Validar próxima tarefa e regresso dentro da ficha real do André — sessão disponível sem contactos nos workspaces relevantes; não existem tarefas nesses workspaces na base consultada.

## Desempenho produtos/loja (pedido 2026-10-08)
- [x] Recuperação de atualização com limites de tempo, sem ciclo e sem recarregar no checkout.
- [x] Lista de produtos no telemóvel: 25 cartões de cada vez, pesquisa/filtros sobre o catálogo completo.
- [x] Espera pelo espaço de trabalho antes de decidir enviar para /onboarding.
- [x] Loja: uma só leitura para categorias e marcas; árvore de categorias partilhada.
- [x] Ícone do site 838 KB → 2,6 KB.
- [ ] Validar /dashboard/products com sessão owner Ajax real (medida autenticada não feita).

## Navegação de Prospeção (pedido 2026-10-09)
- [x] Reunir acessos reais numa secção própria entre Clientes e Vendas, sem duplicações ou alterações funcionais.
- [x] Garantir menu lateral no Extrator Instagram e abertura/destaque da secção ativa, incluindo móvel/recolhido.
- [x] Executar testes de navegação e verificar a prévia, sem publicação nem alterações ao servidor. Oito testes aprovados; navegação desktop, móvel e recolhida confirmada; build automático OK. Suite alargada tem duas falhas anteriores (billing e /admin); observado erro de locale alheio à navegação.

## WhatsApp — concluir integração (2026-10-30)
- [x] Fase 1 diagnóstico: Z-API desligado em PHARLISS («Client-Token not allowed») e myMYA Hub (subscrição da instância expirada); 0 mensagens em 30 dias exceto 9 recebidas a 01/10.
- [ ] Fase 2–4 (ficha, extensão piloto, envios automáticos) — bloqueado: religar Z-API pelo utilizador + escolher workspaces piloto.
- [x] Extensão v0.5.0 ativa para piloto myMYA Hub (falta teste do utilizador)

## WhatsApp Business Oficial (pedido 2026-10-30)
- [x] Add-on 49 €/mês por número; pedido pelo dono, aprovação pelo super admin (Definições → Canais).
- [x] Ligar o número +351 925 990 747 só ao METODOPARE e enviar pela Meta (texto 1:1). Falta teste real de envio.
- [ ] Receber respostas no CRM — exige mudar a estrutura da aplicação (decisão do utilizador).
