# Rever os avisos de segurança pendentes

## Objetivo
Corrigir os avisos com risco real sem partir formulários públicos nem integrações. Os que não se aplicam ficam descartados com justificação; os que exigem decisão sua ficam assinalados.

## Ordem de trabalho

### 1. Crítico: deteção de leads duplicadas
- O alerta diz que a função aceita qualquer pedido sem validar a sessão.
- No código atual já se valida a sessão e a pertença à organização.
- Vou confirmar com um pedido sem sessão válida, que tem de ser recusado:
  - se for recusado, marco o aviso como já não atual;
  - se não for, corrijo.

### 2. Funções da base de dados com caminho de pesquisa não fixo
- São quatro funções da fila de emails (mover para falhados, ler lote, enfileirar e apagar), mais as que o verificador geral indicar.
- Fixo onde cada função procura tabelas, para impedir que corra código de terceiros.
- Não há mudança de comportamento.

### 3. Tabelas que qualquer utilizador com conta pode ler
- Tabelas indicadas: `c2c_seller_tiers`, `persuasion_structures`, `channel_defaults` e mais duas.
- Para cada uma confirmo se contém só dados de referência partilhados (níveis, estruturas de texto, valores por omissão):
  - se for só referência, descarto o aviso com justificação;
  - se tiver dados de uma organização, restrinjo a leitura aos membros dessa organização.

### 4. Tabelas onde «qualquer pessoa pode adicionar registos»
- Tabelas indicadas: `marketing_leads`, `store_page_views`, `fastclub_applications`, `funnel_events`, `popup_responses`, `ebook_page_events`, `vertical_landing_events`, `fastcrm_proposals` e outras.
- A maioria serve formulários e estatísticas de páginas públicas, onde quem visita tem de conseguir registar dados sem conta.
- Para cada uma mantenho a escrita pública, mas limitada:
  - só aceitar inserir, nunca ler, alterar ou apagar;
  - campos obrigatórios e tamanhos máximos;
  - organização e loja têm de existir.
- Leituras abertas, como `store_sponsors` e `ai_agent_registry`: limito aos dados ativos e públicos, ou aos membros, conforme o que a loja e a app realmente mostram.
- `fastcrm_proposals` e `activation_goals` merecem cuidado especial: se não forem formulários públicos, a escrita fica só para membros.

### 5. Restantes avisos
- Extensão instalada na zona pública: deixo como está, porque mudá-la pode partir funções existentes; fica registado.
- Proteção contra palavras-passe expostas em fugas de dados: ativo, se a configuração o permitir sem afetar os logins atuais.
- Avisos informativos (verificações só no ecrã, registos em desenvolvimento, validação nos webhooks): reviso e corrijo só os que tenham risco concreto.

## Detalhes técnicos
- Uma migração por grupo (2, 3 e 4), com `ALTER FUNCTION ... SET search_path = public` e `DROP POLICY` + `CREATE POLICY` com `WITH CHECK` validado.
- Antes de cada alteração de regras de acesso, leio as políticas atuais e o uso no código, para não bloquear páginas públicas da loja, landing pages ou ebooks.
- No fim:
  - corro o verificador de segurança e marco cada aviso como corrigido ou descartado com motivo;
  - testo um envio público de formulário e uma visualização de página da loja em navegação anónima.

## Critérios de aceitação
- Sem avisos críticos ativos.
- Formulários públicos, popups, estatísticas da loja e candidaturas continuam a funcionar sem sessão.
- Nenhuma tabela com dados de uma organização fica legível por utilizadores de outra.

## Riscos e pontos por validar
- Algumas tabelas antigas podem ser usadas por páginas sem testes. Mitigo isto com a leitura do código e um teste anónimo, mas pode surgir um caso não coberto.
- A proteção de palavras-passe expostas pode obrigar algumas pessoas a mudar de palavra-passe no próximo login.
