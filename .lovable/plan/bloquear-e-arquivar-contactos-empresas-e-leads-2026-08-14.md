# Bloquear e Arquivar contactos, empresas e leads

Dois conceitos distintos, aplicáveis às três entidades do CRM (Contactos, Empresas, Leads):

- **Bloquear** — o registo continua visível e pesquisável, mas fica proibida qualquer interação de saída (email, WhatsApp, SMS, chamadas, sequências, automações). Serve para pedidos de "não contactar" / RGPD / clientes conflituosos.
- **Arquivar** — o registo sai das listas de ativos (mas não é apagado). Continua acessível através do filtro "Arquivados" e por link direto, e o histórico financeiro mantém-se intacto.

## Comportamento

### Arquivar
- Ação "Arquivar" no menu (…) do cabeçalho da ficha e no menu de linha das listagens; suporta seleção múltipla nas listas.
- Diálogo de confirmação com motivo opcional.
- As listagens de Contactos, Empresas e Leads passam a mostrar apenas ativos por omissão; novo filtro de estado: Ativos (padrão) / Arquivados / Todos.
- Contadores e KPIs das listas passam a contar apenas ativos.
- Registos arquivados deixam de aparecer em seletores (criar oportunidade, proposta, fatura, campanhas, segmentos WhatsApp).
- Ação inversa "Desarquivar" na ficha e na lista filtrada por arquivados.
- Ao arquivar uma empresa, os contactos associados não são arquivados automaticamente — apenas é mostrado aviso com o número de contactos afetados.

### Bloquear
- Interruptor "Bloquear contacto" no menu (…) da ficha, com motivo obrigatório curto.
- Badge vermelho "Bloqueado" no cabeçalho da ficha e na linha da lista.
- Enquanto bloqueado: botões de Email, WhatsApp, SMS, chamada, criar sequência e enviar proposta ficam desativados com tooltip explicativo.
- Bloqueio validado também no servidor: as funções de envio (email, WhatsApp/Z-API, SMS, cobranças, automações e autopilot) recusam o envio para entidades bloqueadas e registam o motivo em log.
- Automações e sequências ignoram registos bloqueados em vez de falharem.
- Desbloquear regista quem desbloqueou e quando.

## Estrutura técnica

Migração de base de dados (contacts, companies, leads):
- `archived_at timestamptz`, `archived_by uuid`, `archive_reason text`
- `is_blocked boolean not null default false`, `blocked_at timestamptz`, `blocked_by uuid`, `block_reason text`
- Índices parciais em `(workspace_id) where archived_at is null` para manter as listas rápidas.
- Auditoria em `activity_logs` para arquivar/desarquivar/bloquear/desbloquear.

Frontend:
- Hook partilhado `useEntityArchiveBlock` (arquivar, desarquivar, bloquear, desbloquear) reutilizado pelas três entidades.
- Componentes `ArchiveEntityDialog` e `BlockEntityDialog`.
- Guarda `useEntityInteractionLock(entity)` para desativar as ações de comunicação.
- Filtros de estado adicionados a `SmartContactsFilters`, filtros de Empresas e `SmartFilters` (Leads); hooks de listagem (`useContacts`, `useCompanies`, `useSmartContacts`, leads) passam a filtrar `archived_at is null` por omissão.
- Navegação anterior/seguinte (`useEntityNavIds`) respeita o mesmo filtro.

Backend:
- Helper partilhado nas edge functions para verificar bloqueio antes de qualquer envio, aplicado às funções de email, WhatsApp, SMS e cobranças.

## Critérios de aceitação
- Arquivar um registo remove-o da lista de ativos e dos seletores, sem perder histórico.
- Filtro "Arquivados" mostra-o e permite desarquivar.
- Um registo bloqueado não permite qualquer envio, nem pela UI nem por automação/edge function.
- Todas as ações ficam registadas em auditoria com autor, data e motivo.
- Sem regressões nos KPIs financeiros das fichas.

## Riscos e pontos por validar
- Volume de locais que consultam contactos/empresas/leads: a primeira fase cobre listagens, seletores principais e envios; seletores mais raros podem exigir passagem adicional.
- Confirmar se pretende que arquivar uma empresa oculte também os seus contactos (proposta atual: não).
