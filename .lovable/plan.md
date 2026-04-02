
Diagnóstico

- O erro `stream errored out` com código `515` não parece ser um crash do frontend; na replay o fluxo acabou por ligar com sucesso.
- O problema real é de resiliência/orquestração no fluxo QR:
  1. Em `WhatsAppConnectionCard`, o botão “Iniciar nova ligação” dispara `disconnect` e abre logo o diálogo. Como o `WhatsAppQRDialog` auto-invoca `whatsapp-qr-connect`, a nova ligação arranca antes de a sessão antiga terminar. Isto explica `name already in use` e a escalada para restart/delete/recreate.
  2. `whatsapp-qr-connect` e `whatsapp-qr-reconnect` fazem demasiado trabalho numa única request. Isso é compatível com timeouts/streams terminados.
  3. `whatsapp-qr-status` e `whatsapp-qr-disconnect` ainda têm chamadas externas sem timeout.
  4. As funções QR confiam demasiado em dados do cliente (`workspaceId` / `userId`) e não validam pertença ao workspace.
- Não faz sentido criar nova arquitetura funcional; a tabela `whatsapp_qr_connections` já é suficiente.

Decisões de produto/UX

- Manter o card e o fluxo QR actuais.
- Tornar “Iniciar nova ligação” estritamente sequencial: primeiro desligar, só depois abrir o QR.
- Expor estados intermédios reais: “a desligar sessão anterior”, “a preparar instância”, “QR pronto”, “nova ligação necessária”.
- Manter polling rápido em estados transitórios e fallback mais lento em estados estáveis.

Estrutura técnica

- Reutilizar `whatsapp_qr_connections` como source of truth.
- Reaproveitar `metadata_json` para estado interno assíncrono (`pending_action`, `step`, `retry_after`, `operation_id`) em vez de criar nova tabela.
- Criar um helper partilhado para a API externa com:
  - normalização de URL
  - timeout único
  - parsing seguro de JSON/texto
  - normalização de erros (`stream:error`, `515`, `Unauthorized`, `Log out instance`, `disconnectionObject`)
- Hardening de auth em todas as funções QR com validação de JWT, membership e schema validation.

Plano de implementação

1. Corrigir a corrida no frontend
- Em `WhatsAppConnectionCard`, substituir o clique actual por fluxo encadeado:
  - executar disconnect
  - aguardar sucesso / estado `disconnected`
  - só então abrir `WhatsAppQRDialog`
- Em `WhatsAppQRDialog`, deixar de enviar `userId` e suportar respostas rápidas/assíncronas (`preparing`, `qr_pending`, `connected`, `error`).

2. Deixar de bloquear requests longas
- Refactor de `whatsapp-qr-connect` para uma chamada curta:
  - validar auth + workspace
  - preparar estado inicial
  - tentar apenas passos rápidos
  - se precisar de restart/delete/recreate, guardar `pending_action` e devolver imediatamente
- Aplicar o mesmo princípio a `whatsapp-qr-reconnect`.
- Passar a recuperação longa para progressão por polling em `whatsapp-qr-status` (um passo por chamada, nunca a cadeia inteira numa única request).

3. Hardening de timeouts e erros
- Adicionar timeout uniforme às chamadas externas em `whatsapp-qr-status` e `whatsapp-qr-disconnect`.
- Normalizar `stream errored out` / `code 515` e erros de logout para estados coerentes:
  - `disconnected + repair_required` quando a sessão morreu
  - nunca ficar preso em `waiting_for_scan` se já houver erro terminal
- Manter respostas resilientes com payload estruturado para não partir a UI.

4. Melhorar sincronização UI/backend
- Fazer `whatsapp-qr-status` devolver também `qr_code` quando ele já existir na base de dados, para o diálogo recuperar QR gerado de forma assíncrona.
- Ajustar `useWhatsAppQRConnection`:
  - 5s em estados transitórios
  - fallback periódico em estados estáveis para apanhar falhas de webhook
- Preservar a lógica actual de `repair_required`, mas com detecção mais fiável.

5. Hardening de segurança
- Em `whatsapp-qr-connect`, `status`, `sync`, `disconnect` e `reconnect`:
  - validar JWT manualmente
  - verificar membership em `workspace_members`
  - deixar de confiar em `userId` vindo do frontend
  - validar body com schema

Detalhes técnicos

- Ficheiros principais:
  - `src/components/integrations/WhatsAppConnectionCard.tsx`
  - `src/components/settings/WhatsAppQRDialog.tsx`
  - `src/hooks/useWhatsAppQRConnection.ts`
  - funções backend `whatsapp-qr-connect`, `whatsapp-qr-status`, `whatsapp-qr-disconnect`, `whatsapp-qr-reconnect`
- À partida, sem nova tabela; reutilizar `metadata_json` e campos existentes.

Critérios de aceitação

- “Iniciar nova ligação” já não corre em paralelo com o disconnect.
- `whatsapp-qr-connect` responde rapidamente mesmo quando a instância está presa.
- Deixa de haver escalada frequente para `name already in use` / restart/delete/recreate na mesma request.
- Estados 515/logout aparecem na UI como falha recuperável ou `repair_required`, sem falsos “connected”.
- Todas as funções QR recusam pedidos sem autenticação válida ou sem acesso ao workspace.
- O QR consegue aparecer mesmo após recuperação assíncrona.
- Fluxo validado ponta-a-ponta sem erros novos de consola.

Riscos e pontos por validar

- Confirmar se o `515` chega sempre via payload estruturado ou se por vezes só aparece em logs externos.
- Alguns `401 / Log out instance` podem ser stale; o mapping não pode marcar `repair_required` quando o estado já voltou a `open`.
- Testar: primeira ligação, logout no telemóvel, QR expirado, instância já existente, reconnect após falha e validação end-to-end completa.
