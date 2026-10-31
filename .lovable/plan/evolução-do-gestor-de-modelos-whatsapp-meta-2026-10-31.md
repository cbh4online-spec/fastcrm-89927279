# Evolução do Gestor de Modelos WhatsApp (Meta)

## Diagnóstico
- Hoje existe o separador «Modelos oficiais Meta» com: lista lida diretamente da Meta, criação simples (cabeçalho de texto, corpo com variáveis, exemplos, rodapé), pré-visualização e «Atualizar estados». Nada é guardado no CRM (sem rascunhos, sem histórico).
- Uma única ligação Meta, restrita ao METODOPARE (fail-closed noutros workspaces).
- Limite real da plataforma: **este projeto não consegue receber webhooks da Meta** (respostas, entregas, cliques em botões, alterações de estado). Isso exige mudar para a stack moderna. Por isso, as partes que dependem de receber eventos (secção D completa, ações automáticas de botões, métricas entregue/lida/respondida) ficam preparadas mas não ativas até essa mudança. Não vamos simular.

## Fase 1 — Gestor completo (feito nesta entrega)
1. **Guardar no CRM**: modelos passam a ter registo próprio por workspace (rascunho local, submetido, aprovado, rejeitado, em pausa, desativado), com id Meta, motivo de rejeição, qualidade, datas, autor e **histórico de versões**.
2. **Formulário em 5 secções (acordeão)**, mantendo duas colunas com pré-visualização:
   - A Identificação: conta (número ligado), nome interno, nome técnico gerado e editável, categoria, idioma (pt_PT, pt_BR, es, en), descrição, etiquetas, estado. Valida duplicados por nome+idioma.
   - B Conteúdo: cabeçalho nenhum/texto/imagem/vídeo/documento (carregamento com validação de formato/tamanho e envio para a Meta pelo servidor), contador de caracteres, formatação WhatsApp, botão inserir variável, deteção e validação da sequência, exemplos obrigatórios, associação de cada variável a um campo do CRM (nome, apelido, empresa, telefone, comercial, data de reunião, produto, campos personalizados), avisos de conteúdo de risco.
   - C Botões: resposta rápida, website, telefone; adicionar/ordenar/remover com limites da Meta; botão «SAIR» de opt-out opcional. Para cada resposta rápida pode-se escolher a ação do CRM (guardada, ativa na Fase 2).
   - D Automações: associar a campanha, pipeline/etapa, etiqueta, comercial e workflow existente (motor Kernel/Smart Workflows existente, sem criar outro).
   - E Validação: Guardar rascunho, Validar, Enviar para aprovação, Atualizar estado, Duplicar. Erros em pt-PT junto ao campo. Submissão aceite = «Pendente», nunca «Aprovado».
   - Autenticação usa o formato próprio da Meta (código + botão copiar), não texto livre.
3. **Pré-visualização**: cabeçalho multimédia, botões, alternância telemóvel/computador.
4. **Lista**: pesquisa, filtros (estado, categoria, idioma), colunas pedidas, detalhe com motivo de rejeição e versões; modelos aprovados ficam bloqueados — alterar = duplicar como nova versão.
5. **Enviar modelo aprovado a um contacto** (Nova Mensagem / Caixa de entrada) fora das 24 h: só aprovados, preenche variáveis com dados reais do contacto, bloqueia marketing sem consentimento válido ou com opt-out.
6. **Testar modelo** para o próprio número do utilizador (permitido pela Meta).

## Fase 2 — Requer mudança para stack moderna (não incluída)
Receber webhooks: estados automáticos, entregue/lida/falhada, respostas e cliques, execução das ações dos botões com proteção contra duplicados, métricas Meta vs internas por campanha.

## Detalhes técnicos
- Migração não destrutiva: `whatsapp_meta_templates`, `whatsapp_meta_template_versions`, `whatsapp_meta_template_variables`, `whatsapp_meta_template_button_actions`, `whatsapp_meta_template_events` (preparada para Fase 2). RLS por `workspace_id IN (SELECT get_user_workspace_ids())` + super admin; escrita só com `integrations.manage`; versões/eventos só via servidor. Índice único (workspace, nome técnico, idioma).
- Edge `whatsapp-meta-templates`: ações `save_draft`, `validate`, `submit`, `sync`, `duplicate`, `upload_media` (sessão de upload resumível da Meta → handle), `send_test`; sempre `isMetaInstanceAllowed`, zod, tokens só no servidor.
- `whatsapp-pro-send`: ramo `type: template` com consentimento (`useWhatsAppStopSignals`/variantes de telefone) e verificação de estado aprovado no servidor.
- Regras de validação partilhadas em `_shared/metaTemplateRules.ts` (espelho em `src/lib/whatsapp`), com testes: nome técnico, sequência de variáveis, limites (corpo 1024, cabeçalho 60, rodapé 60, botões ≤10, quick reply ≤25 caracteres), combinações de botões, formatos/tamanhos de media, bloqueio de envio não aprovado e sem consentimento.
- Painel dividido em componentes: `TemplateForm/{Identity,Content,Buttons,Automations,Review}Section`, `TemplatePreview`, `TemplateList`, `TemplateDetailDrawer`.

## Critérios de aceitação
Cenários 1–12 do documento cobertos na Fase 1, exceto os que dependem de receber eventos (Fase 2).

## Riscos
- Aprovação Meta pode demorar até 48 h; sem webhooks o estado só muda ao clicar «Atualizar estado».
- Carregamento de vídeo/documento grande pode ser lento através do servidor.
