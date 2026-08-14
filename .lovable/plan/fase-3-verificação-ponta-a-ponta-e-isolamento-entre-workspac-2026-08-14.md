# Fase 3 — Verificação ponta a ponta e isolamento entre workspaces (GHL)

## Estado real verificado agora

Configurações GHL por workspace (`workspace_ghl_config`):

```text
location 3ZKxp2VeQMeX5azcY9SU  ->  myMYA Hub
location 9peybYsaEdbhFf2GO0Bx  ->  Blecksen  +  PHARLISS   (partilhada)
location z0oqqJ6TRofvoDePpGO0  ->  METODOPARE (primary)
```

Canais WhatsApp activos (`workspace_ghl_social_channels`):

- METODOPARE: **duas** linhas whatsapp activas — `z0oqqJ6TRofvoDePpGO0` (a sua própria) e `9peybYsaEdbhFf2GO0Bx` (location da PHARLISS/Blecksen).
- PHARLISS, Blecksen, myMYA Hub: sem canal whatsapp → envio bloqueado.

O ponto crítico: a METODOPARE tem um canal WhatsApp registado com o `ghl_account_id` de uma location que não é dela. Consoante a ordem de avaliação do encaminhamento no webhook, mensagens WhatsApp da location partilhada podem cair na METODOPARE. Não está confirmado que aconteça — confirmar é o primeiro passo desta fase, antes de qualquer alteração.

## O que a Fase 3 faz

### 1. Confirmar (ou ilibar) a fuga de encaminhamento
- Ler o caminho de resolução de workspace no `ghl-webhook-message` e verificar se filtra por `workspace_ghl_config.ghl_location_id` antes de olhar aos canais sociais.
- Cruzar conversas WhatsApp já existentes: contar por workspace as conversas cuja location de origem não corresponde ao `ghl_location_id` configurado desse workspace.
- Consultar `ghl_routing_audit` para ver decisões reais de encaminhamento da location partilhada.
- Só depois decidir: se houver fuga, remover/corrigir a linha whatsapp indevida da METODOPARE e endurecer a resolução para partir sempre da location; se não houver, deixar os dados como estão e apenas documentar.

### 2. Testes automatizados de isolamento
Novo ficheiro de testes (vitest) que cobre a lógica de encaminhamento pura, sem depender da rede:
- Location partilhada → escolhe o workspace pelo `ghl_account_id` do payload; sem correspondência, falha fechado (não escolhe nenhum).
- Nunca cai no workspace `is_primary` como último recurso.
- Canal whatsapp inactivo/inexistente → envio bloqueado com motivo explícito.
- Evento de chamada (códigos 10/20) → cria registo de chamada, não uma mensagem SMS, e é idempotente pelo mesmo `ghlMessageId`.

### 3. Verificação funcional por workspace
Checklist executada workspace a workspace, com registo do resultado:
- Estado do cartão WhatsApp no painel GHL coincide com a base de dados.
- Envio de WhatsApp: METODOPARE deve enviar; PHARLISS/Blecksen/myMYA devem devolver o erro explicativo "canal WhatsApp não activo neste workspace" com atalho para integrações.
- Evento de chamada simulado na location partilhada aparece na timeline do workspace certo e apenas nesse.
- Repetir o mesmo evento não duplica registos.

### 4. Fechar os workspaces em falta
Para PHARLISS, Blecksen e myMYA Hub: usar o botão "Ligar WhatsApp" do painel e confirmar que a activação grava o `ghl_account_id` correcto (a location de cada um), mantendo o encaminhamento fail-closed.

## Detalhes técnicos

- Testes em `src/test/integrations/ghl-routing-isolation.test.ts`, a exercitar a função de resolução extraída da lógica do webhook (extrair para módulo partilhado se ainda estiver embutida no handler).
- Consultas de auditoria só de leitura sobre `ghl_routing_audit`, `conversations` e `voice_call_logs`.
- Qualquer correcção de dados (linha whatsapp indevida) será feita em migração dedicada, conservadora, sem apagar histórico de conversas.

## Critérios de aceitação

- Existe evidência escrita de que a location partilhada encaminha para o workspace certo, ou a fuga é corrigida e retestada.
- Suite de testes de isolamento a passar.
- Nenhum workspace recebe conversas ou chamadas de outro.
- Os quatro workspaces têm estado WhatsApp coerente entre painel e base de dados.

## Riscos e pontos por validar

- Sem um evento de chamada real do GHL, o mapeamento de duração/gravação fica validado apenas por payload simulado.
- Corrigir o canal whatsapp da METODOPARE pode alterar onde caem mensagens que hoje já lá entram; confirmar com o utilizador antes de mexer nos dados.
