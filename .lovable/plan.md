

## Corrigir Prospecção: Auto-gerar mensagens e adicionar envio em massa para follow-ups

### Problemas Identificados

1. **Mensagens não são pré-geradas nos follow-ups**: O `prospecting-outreach-processor` apenas muda o status para "ready" mas NÃO gera a mensagem. O campo `message` fica `null`.
2. **Envio é 1 a 1**: O `PendingOutreachPanel` só tem botão individual "Enviar agora" sem opção de envio em massa.
3. **Fluxo manual excessivo**: Cada clique copia mensagem + abre Instagram individualmente sem possibilidade de processar vários de uma vez.

### Correções Planeadas

#### 1. Atualizar Edge Function `prospecting-outreach-processor` para auto-gerar mensagens

Quando um item da fila fica "due", o processor vai:
- Buscar dados do perfil (`professional_prospecting_profiles`) incluindo bio, profissão, etc.
- Buscar configuração do workspace (oferta, dores) via `lead_enricher_settings`
- Chamar `generate-prospecting-message` com `sequenceStep` correto (2 ou 3)
- Guardar `message` e `message_plain` no registo da `prospecting_outreach_queue`
- Só depois marcar como "ready"

#### 2. Refazer o `PendingOutreachPanel` com funcionalidade bulk

- Adicionar botão **"Enviar Todos"** que abre um fluxo bulk semelhante ao `BulkOutreachDialog`
- Mostrar preview da mensagem em cada card (já existe parcialmente mas `message` era null)
- Adicionar botão de **rejeitar** individual
- Para itens sem mensagem gerada (legado), gerar on-demand ao clicar "Enviar"

#### 3. Criar componente `BulkFollowupPanel` inline no `PendingOutreachPanel`

Em vez de abrir um dialog separado, o painel expande para modo bulk:
- Lista todos os follow-ups pendentes com mensagem visível
- Botão "Copiar e Abrir DM" sequencial (perfil a perfil, como o BulkOutreachDialog)
- Botão "Já enviei" / "Rejeitar" por perfil
- Progresso visual
- Ao confirmar envio, atualiza `outreach_step` no perfil

#### 4. Gerar mensagens em falta no frontend (fallback)

Para follow-ups que chegaram ao status "ready" sem mensagem (dados antigos), o `PendingOutreachPanel` vai:
- Detetar items com `message === null`
- Ao abrir o painel bulk, gerar mensagens para esses items via `generate-prospecting-message`
- Mostrar spinner durante geração

### Ficheiros a Criar/Editar

| Ficheiro | Ação |
|---|---|
| `supabase/functions/prospecting-outreach-processor/index.ts` | Editar: adicionar geração automática de mensagem via AI |
| `src/components/professional-prospecting/PendingOutreachPanel.tsx` | Reescrever: bulk send, preview mensagens, rejeitar, progresso |

### Resultado

- Follow-ups chegam ao painel **já com mensagem gerada**
- Utilizador clica **"Enviar Todos"** e processa sequencialmente (copiar → abrir DM → confirmar → próximo)
- Sem necessidade de abrir ecrãs separados
- Fallback para gerar mensagem on-demand para dados antigos

