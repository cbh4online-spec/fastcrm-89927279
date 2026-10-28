# Avaliação MCP — FastCRM para ChatGPT e Claude

## Fase 1 — Diagnóstico

**Estado atual, verificado no código:**
- Já existe um servidor MCP («FastCRM») com login OAuth (Lovable Cloud), um plugin Vite e 13 ferramentas.
- 7 ferramentas são de leitura: workspaces, contactos, empresas, leads, oportunidades, faturas e conversa WhatsApp.
- 6 ferramentas são de escrita ou envio: criar lead, criar tarefa, enviar texto/imagem/vídeo por WhatsApp e agendar mensagem.
- O acesso aos dados passa pelas regras por workspace (RLS) do utilizador autenticado.

**Funcionalidades adequadas a MCP:** consultas rápidas e limitadas (pipeline, KPIs, catálogo, tarefas), resumos e criação de rascunhos. **Não são adequadas:** importações SAF-T, geração de vídeo/IA longa e envios em massa.

**Compatibilidade técnica:**
- Claude (Desktop, Web, Code): suporta MCP remoto com OAuth e registo dinâmico de clientes (DCR).
- ChatGPT: os conectores/Apps aceitam MCP remoto com OAuth em planos Plus/Pro/Business/Enterprise. A escrita depende do modo de programador ou de aprovação.
- Pontos por confirmar: o servidor OAuth do Cloud está ativo, as chaves de assinatura são assimétricas, a página de consentimento preserva o `next` e os URIs de retorno da OpenAI e da Anthropic são aceites.

**Autenticação:** OAuth 2.1 com PKCE e DCR, emissor `supabase.co/auth/v1`, verificação de `client_id` obrigatória e sem tokens colados à mão. O consentimento é feito em `/.lovable/oauth/consent`.

**Permissões e isolamento de dados:**
- A identidade vem sempre do token e nunca de um parâmetro da ferramenta. Todas as ferramentas validam o `workspace_id` contra a pertença do utilizador.
- É necessário aplicar `useCapability`/`requireCapability` do lado do servidor (`crm.read`, `finance.read`). A RLS sozinha não distingue um Agente de um Gestor.
- Custos e margens (ex.: na PHARLISS só o Fernando e o Jorge os veem) têm de ficar excluídos de qualquer ferramenta.

**Riscos:**
- Alto: as ferramentas de envio por WhatsApp acessíveis a um assistente (injeção de instruções e envios indevidos) e as faturas e conversas com dados pessoais (RGPD) enviadas para fornecedores de IA dos EUA.
- Médio: falta de auditoria por cliente OAuth, ausência de limites de pedidos e respostas grandes.
- Baixo: o bundle da função `mcp` já causou timeout na publicação.

**Custos:** o MCP corre nas funções do Cloud (custo por invocação, baixo). O utilizador final usa o seu próprio plano ChatGPT/Claude, sem custo de IA para nós. Há esforço de manutenção e de suporte.

## Fase 2 — Três ferramentas só de leitura, sem dados sensíveis

1. **`get_pipeline_summary`**: contagens e valor total por etapa e por estado das oportunidades num workspace. Não inclui nomes, contactos nem notas. Exige `crm.read`.
2. **`list_my_open_tasks`**: tarefas abertas atribuídas ao próprio utilizador (título, prazo em dias Europe/Lisbon, tipo de entidade), sem dados de contacto. Exige pertença ao workspace.
3. **`search_public_catalog`**: produtos ativos da loja pública (nome, SKU, preço público, disponibilidade), sem custo, margem nem fornecedor. Usa apenas dados que já são públicos.

Todas devolvem no máximo 50 itens, com `readOnlyHint` e `openWorldHint: false`, e sem PII.

## Fase 3 — Plano

**Implementação (após aprovação):**
1. Criar um perfil «leitura-segura»: um servidor separado ou um filtro de visibilidade por ferramenta, em que as ferramentas de escrita e WhatsApp ficam ocultas por omissão.
2. Criar as 3 ferramentas em `src/lib/mcp/tools/`, uma por ficheiro, com verificação de capacidade do lado do servidor.
3. Criar uma tabela `mcp_tool_audit` (utilizador, workspace, client_id, ferramenta, duração, sem conteúdo dos dados).
4. Adicionar um limite de pedidos por utilizador e por cliente.
5. Confirmar OAuth, consentimento e chaves de assinatura, extrair o manifesto e publicar só com a sua autorização.

**Testes:**
- Testes unitários: o input é rejeitado sem workspace, um membro de outro workspace é negado e a saída não tem campos sensíveis (lista de bloqueio).
- RLS testada com Agente, Gestor, admin e super_admin.
- Teste completo de OAuth no Claude e no ChatGPT: aprovar, recusar, token expirado.
- Teste de injeção de instruções: o conteúdo devolvido não dispara ações.

**Segurança:** menor privilégio, sem `service_role`, ferramentas de envio desligadas por omissão, revogação de clientes OAuth, adenda ao contrato de tratamento de dados (DPA) e aviso RGPD no ecrã de consentimento.

**Monetização:**
- START: sem MCP.
- GROW: as 3 ferramentas de leitura.
- PRO: leitura completa e escrita com aprovação.
- Add-on opcional por volume de chamadas, medido pela auditoria. A capacidade `integrations.mcp` é controlada pelo plano.

**Critérios de aceitação:**
- Nenhuma ferramenta devolve custos, margens, telefone, email ou NIF.
- Acesso a outro workspace = 0 resultados ou erro.
- 100% das chamadas ficam auditadas.

**Por validar consigo:**
- Ocultar já as ferramentas de envio WhatsApp atuais?
- Planos e preços da monetização.
- Que workspaces entram no piloto.
