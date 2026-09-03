# Gestão Profissional de Grupos WhatsApp (Z-API)

## Diagnóstico do estado atual (verificado)

- `public.whatsapp_zapi_groups` existe mas é mínima: `workspace_id, group_id, name, description, picture_url, participants_count, is_admin, metadata_json, last_synced_at`. Não tem `provider_instance_id`, estado de sincronização, flags (arquivado, silenciado, anúncio, comunidade) nem categoria/responsável/tags.
- Não existe qualquer tabela de participantes de grupo.
- `whatsapp-zapi-sync-groups` faz um único `GET /chats?type=group` sem paginação, sem fallback `/groups`, sem metadata light e sem separação por instância; deriva `groupId` de `g.phone || g.id || g.groupId`.
- Não existe fila de operações administrativas nem fila outbound dedicada: `whatsapp-pro-send` invoca directamente `whatsapp-zapi-send`. Existe `whatsapp_throttle_settings` (limites/dia, intervalos, warmup, pausa) que serve de base ao rate limiting, mas não há modos NORMAL/CONSERVATIVE/RECOVERY nem circuit breaker de grupos.
- Existe `whatsapp_health_events` e monitor de saúde reutilizáveis.
- RBAC: SSoT em `src/lib/permissions/capabilities.ts` espelhado em `supabase/functions/_shared/capabilities.ts` — hoje sem qualquer capability de grupos.
- Rotas WhatsApp Pro em `src/routes/sales/CommunicationRoutes.tsx` + `src/config/routeManifest.ts`.

Conclusão: a especificação é essencialmente construção nova. Entrego por fases; cada fase é utilizável por si.

## Fase P0 — Fundação correcta (dados, sync, participantes, envio seguro)

**Base de dados (migrations aditivas)**
- `whatsapp_zapi_groups`: acrescentar `provider_instance_id`, `status` (ACTIVE/INACTIVE/LEFT/REMOVED/SYNC_ERROR/UNKNOWN, default UNKNOWN), `is_owner`, `is_announcement`, `is_community`, `is_archived`, `is_muted`, `is_pinned`, `unread_count`, `last_message_at`, `category`, `owner_user_id`, `tags`, `invite_link`, `invite_link_updated_at`, `sync_error`, `admin_only_message`, `admin_only_settings`, `admin_only_add_member`, `require_admin_approval`. Backfill de `provider_instance_id` via `ensure_whatsapp_provider_instance`, nova UNIQUE `(workspace_id, provider_instance_id, group_id)` mantendo a antiga até o código migrar.
- Nova `whatsapp_zapi_group_participants` com os campos da especificação (identificação bruta `participant_id_raw`, `normalized_phone`, `lid`, ligações opcionais `contact_id`/`lead_id`, `membership_status`, timestamps de ciclo de vida, métricas, `metadata_json`). Nunca cria leads automaticamente.
- Nova `whatsapp_group_operations` (fila administrativa): tipo de operação, payload, `idempotency_key` único por workspace, estado QUEUED/PROCESSING/SUCCEEDED/PARTIAL_SUCCESS/FAILED/CANCELLED, tentativas, resultado, erro.
- Nova `whatsapp_group_audit_log`: quem, o quê, antes/depois, correlation_id.
- RLS em todas: leitura por membros do workspace, escrita apenas por `service_role`/capability; GRANTs explícitos; índices por `workspace_id`, `provider_instance_id`, `group_id`, `status`, `last_message_at`, `last_synced_at`, `normalized_phone`, `contact_id`, `membership_status`.

**Sincronização** — reescrita de `whatsapp-zapi-sync-groups`:
- identificação canónica do grupo pelo id `@g.us` (nunca `phone` de contacto);
- `GET /groups` paginado (`page`/`pageSize`) com fallback registado para `/chats?type=group`;
- `light-group-metadata/{groupId}` para detalhe e participantes;
- upsert por `(workspace_id, provider_instance_id, group_id)`, marcação `SYNC_ERROR` por grupo sem abortar o lote, `last_synced_at`, e upsert de participantes com reconciliação de saídas (`REMOVED`/`LEFT`).

**Receção** — `whatsapp-zapi-webhook`: identificar mensagens de grupo pelo `@g.us`, atribuir ao participante (`participant_id_raw` → `normalized_phone`), actualizar `last_message_at`/`messages_count`, e nunca fundir conversas de grupo com conversas 1:1.

**Envio** — todo o envio para grupos passa por `whatsapp-pro-send` com `groupId`, respeitando `whatsapp_throttle_settings`; bloqueio explícito de chamadas directas a `/send-text` no frontend (regra de lint/teste).

**Permissões** — acrescentar as capabilities `whatsapp_groups.*` (ver/sincronizar/criar/editar/participantes/aprovar/admins/definições/convite/sair/publicar/mencionar-todos/multi-send/auditoria/analytics) aos dois ficheiros espelhados + documentação em `docs/permissions.md`.

## Fase P1 — Interface e operação

- Página **WhatsApp — Grupos** (`/dashboard/whatsapp-pro/groups`) registada no `routeManifest`: lista com imagem, nome, participantes, função, não lidas, actividade, estados; filtros (todos, administrador, membro, activos, arquivados, silenciados, não lidas, anúncios, comunidades, erro de sync); pesquisa por nome, group ID, descrição, categoria, tags e participante.
- Ficha do grupo com separadores Conversa, Participantes, Configurações, Conteúdo, Métricas e Auditoria.
- Operações administrativas através da fila (criar grupo, nome/imagem/descrição com preview e rollback, adicionar/remover participantes com `autoInvite` e tratamento de `phonesNotAdded`, aprovar/rejeitar em lote, promover/despromover admins, definições `adminOnly*`/`requireAdminApproval`, link de convite com QR/copiar/partilhar/redefinir sob confirmação forte, aceitar convite por URL, sair do grupo preservando histórico).
- Relação com CRM: acções manuais "Criar contacto" e "Criar lead" a partir do participante; moderação gera tarefa/lead/nota/oportunidade/ticket/compromisso.

## Fase P2 — Publicação, limites e analítica

- Publicações agendadas e multi-send por grupos: enfileiramento individual por grupo, intervalos mínimos, nada em paralelo, revalidação no momento do envio.
- Configurações de limites: `max_group_posts_per_hour`, `max_group_posts_per_day`, `max_groups_per_multi_send`, `minimum_interval_between_group_posts`, `max_mention_all_per_day`, `max_estimated_group_reach_per_day`; desactivação total em modo RECOVERY.
- Menções (`mention`/`mentionAll` com permissão própria), sondagens e eventos apenas se a Z-API os suportar — caso contrário marcados como "não implementado" com motivo.
- Analytics agregada por grupo (sem leitura individual de mensagens) e classificações de mensagem GROUP_*.

## Testes

Suite `src/test/whatsapp/groups/*` com os cenários da especificação (identificação `@g.us`, isolamento por instância e workspace, paginação, fallback, idempotência da fila, reconciliação de participantes, RLS por role, limites e bloqueio em RECOVERY, auditoria). A meta de 55 testes é cumprida ao longo das três fases; P0 entrega o núcleo (identificação, sync, participantes, RLS, fila, envio).

## Notas técnicas

- Zero alterações destrutivas: só colunas novas, tabelas novas e índices; a UNIQUE antiga só é removida numa migração posterior.
- Nenhuma funcionalidade "fake": endpoints Z-API não confirmados são reportados como "necessita teste manual" ou "não implementado", nunca simulados.
- Rollback: cada fase é reversível por feature flag de módulo (menu escondido) e as migrations são aditivas.

## Proposta de execução

Começo por P0 completo (dados + sync + participantes + webhook + envio + permissões + testes núcleo) e entrego relatório antes de avançar para P1.
