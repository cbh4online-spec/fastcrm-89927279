# FastCRM WhatsApp Pro v0.4.1 — preparação do primeiro piloto

Data: **26 de outubro de 2026**. Estado: **PREPARADO PARA QA LOCAL; NO-GO para OAuth real e pesquisa no painel**.

## 1. Diagnóstico e âmbito

- Workspace no CRM: **myMYA Hub** (referido pelo operador como myMIA Hub).
- Slug: **mymya-hub**.
- UUID: **430c7917-8398-4c71-9c2d-d39389ad04e5**.
- A extensão mantém `PUBLIC_CLIENT_ID=""` e `API_READY=false`. Não foram ativados OAuth, API, variáveis ou integrações por esta entrega.
- Esta preparação altera apenas o consentimento, testes dedicados e este documento. Não cria nem modifica contactos, leads, funções, políticas, dados ou ZIP público. Não publica a aplicação.

## 2. Evidência de leitura já fornecida pelo operador

Os seguintes resultados provêm dos **SELECT executados no Lovable em 2026-10-26**, comunicados no pedido. Não foram repetidos nesta preparação nem equivalem a um teste através da extensão.

| Verificação | Resultado comunicado |
|---|---:|
| Estado do workspace | Ativo |
| Membros | 3: owner, admin, admin |
| Contactos ativos | 33 |
| Contactos com phone | 28 |
| Contactos com formato PT válido | 25 |
| Leads ativas | 9502 |
| Leads com phone | 7595 |
| Leads com formato PT válido | 7114 |
| Registos em workspace_instances | 0 |
| Consulta read-only por um número conhecido na fonte contactos, filtrada pelo workspace | Exatamente 1 contacto |
| Consulta read-only por um número conhecido na fonte leads, filtrada pelo workspace | Exatamente 1 lead |

**ALERTA: uma consulta SQL administrativa não demonstra as permissões da extensão.** Não comprova JWT OAuth, claim client_id, pertença, capability `crm.read`, isolamento entre tenants, resolução de instância ou consentimento. A ausência de workspace_instances também não prova que a API escolherá corretamente a instância; é necessário validar o comportamento real, sem contornar recusas.

Nenhum nome, número, identificador de contacto/lead, resultado individual ou credencial deve ser incluído no repositório, nos documentos, em screenshots, em logs ou na ficha de resultados.

## 3. Decisões de consentimento e estrutura

A página existente usa as mesmas APIs `getAuthorizationDetails`, `approveAuthorization` e `denyAuthorization`, através do cliente já existente. Apresenta o nome do cliente e exclusivamente o campo singular **`authDetails.scope`**, separado por espaços:

- `email`: endereço de email;
- `profile`: informações do perfil;
- `phone`: número de telefone;
- `openid`: identificação da conta;
- scopes desconhecidos: texto literal seguro, sem interpretação de HTML.

O piloto pede somente **`email`**; mostrar outros scopes quando recebidos não os acrescenta ao pedido da extensão. O consentimento não promete acesso ao CRM além das permissões pedidas; consultas continuam sujeitas às permissões e regras existentes. Erros do servidor são substituídos por mensagens genéricas PT-PT, sem logs de tokens. O redirect devolvido pelo SDK sem `client` é preservado para consentimento já concedido, conforme o fluxo documentado; não é um destino fornecido pelo utilizador na URL.

As rotas `/login` e `/.lovable/oauth/consent` estão confirmadas pela auditoria anterior. Nenhuma rota ou método de login é alterado. **O retorno com authorization_id, incluindo Google/Apple, continua por testar.** Os testes locais simulam respostas do SDK: não demonstram login real.

Este documento atualiza o estado da auditoria antiga da secção 9 de `PILOTO-OAUTH-ATIVACAO.md` quanto a scopes e erros; esse documento histórico não é alterado nesta entrega.

## 4. Plano operacional: fase permitida agora, sem ativação

1. Executar testes Node e o preflight seguro da v0.4.1; exigir PASS com `PUBLIC_CLIENT_ID=""` e `API_READY=false`.
2. Instalar a v0.4.1 **unpacked**, numa pasta dedicada de caminho estável: `chrome://extensions` → Modo de programador → Carregar descompactada. Usar a pasta completa da extensão ou a distribuição local já validada, nunca o ZIP público v0.3.1.
3. Confirmar a versão, abrir o painel e observar «Configuração OAuth pendente». Não tentar obter tokens ou usar credenciais fornecidas ao agente.
4. Em Configurações, copiar a **URI de retorno OAuth** obtida por `chrome.identity.getRedirectURL("oauth2")`. Guardar ID da extensão e URI exata apenas na ficha operacional privada.
5. Confirmar **ID estável no Chrome piloto**: mesma máquina e mesmo caminho unpacked após recarregar/reiniciar. Não mover a pasta, não introduzir uma key ad hoc no manifest e não presumir o mesmo ID no Edge ou noutra máquina.
6. Preparar o pedido de registo de um cliente OAuth **público**, nome «FastCRM WhatsApp Pro», sem client_secret, Authorization Code + PKCE S256, URI exata copiada e scope `email`. O registo/configuração no serviço de autenticação do **Lovable Cloud** exige uma operação administrativa aprovada separadamente; esta entrega não a executa e não pressupõe acesso a um painel externo.

**Paragem obrigatória:** com client_id vazio e API_READY=false não é possível concluir login OAuth nem lookup real no painel. Não ativar o servidor global ou a API em produção para superar este bloqueio. O fallback web pode ser testado manualmente com a sessão normal do utilizador, mas não valida o caminho OAuth da extensão.

## 5. Fases futuras, condicionadas a autorização explícita

Estes passos são checklist de uma futura execução, **não autorização para ativação agora**. Se não existir um ambiente isolado que evite disponibilizar OAuth/API a outros, manter NO-GO e decidir esse ambiente antes de prosseguir.

- [ ] Confirmar ambiente isolado aprovado, servidor de autorização e URL de consentimento `/.lovable/oauth/consent`, sem alterar o serviço partilhado de produção nesta tarefa.
- [ ] Registar administrativamente o cliente público e o callback exato do Chrome piloto, sem segredo. Não usar sessão JWT copiada, passwords partilhadas ou chave de serviço.
- [ ] Introduzir o client_id público em `PUBLIC_CLIENT_ID` **apenas numa build piloto separada**; `API_READY` permanece **false durante os testes de login**. O preflight seguro do ramo principal continua a exigir client_id vazio; não adaptar os testes para aceitar ativação prematura.
- [ ] O operador inicia sessão normalmente no seu Chrome autenticado como **owner ou admin** de myMYA Hub. Confirmar nome do cliente e scope `email`; testar Autorizar, Recusar, cancelamento, logout concorrente e expiração.
- [ ] Verificar preservação de `authorization_id` após login e retorno, incluindo Google/Apple apenas quando esses métodos estiverem configurados. Uma falha exige correção autorizada separadamente, não contorno.
- [ ] Preparar a allowlist `FASTCRM_WA_EXTENSION_PILOT_WORKSPACE_IDS` **exclusivamente** com `430c7917-8398-4c71-9c2d-d39389ad04e5`, sem definir secrets nesta entrega. Allowlist de workspace não é isolamento do servidor OAuth nem restrição a uma única conta: permite os membros autorizados desse workspace.
- [ ] Só numa fase aprovada e isolada, configurar a API para o client_id e origem exatos, validar as condições de ativação e, por último, usar `API_READY=true` na build piloto. Não publicar nem distribuir esta build a outros clientes.
- [ ] Pesquisar manualmente um número existente conhecido de contacto e outro de lead; o operador escolhe-os no CRM, sem os guardar no relatório. Exigir os mesmos resultados individuais esperados pela prova administrativa, agora através da sessão OAuth e das regras reais.
- [ ] Testar com outra conta sem pertença a myMYA Hub: não listar o workspace nem obter os seus dados. Testar também outro workspace fora da allowlist, incluindo com conta membro de ambos: exigir recusa antes de ler contactos/leads. Não criar contas/contactos/leads de teste nesta tarefa.
- [ ] Confirmar limpeza de telefone/resultados ao trocar workspace, telefone ou sessão, e descarte de respostas atrasadas. Verificar ausência de tokens na UI e de PII em logs/armazenamento.
- [ ] Não enviar mensagens, não iniciar campanhas e não criar ou modificar qualquer registo para o teste.

## 6. Critérios de aceitação e riscos

**GO local:** testes dedicados e preflight aprovados, alterações confinadas aos caminhos autorizados, scopes e cliente em texto seguro, erros controlados e configurações inativas preservadas.

**GO para teste real futuro:** ambiente isolado e autorização administrativa confirmados, ID/callback estáveis, registo público válido, retorno com authorization_id comprovado, conta real autenticada e testes de isolamento aprovados. A leitura administrativa anterior não satisfaz estes critérios.

**NO-GO:** ausência de registo OAuth ou de ID estável; necessidade de ativar produção partilhada; falha de retorno; dados de outro tenant; credenciais/tokens copiados; necessidade de contornar permissões; resolução de instância não verificada.

Riscos pendentes: ID unpacked local não é portável; Chrome e Edge podem ter IDs diferentes; login social e callback não verificados; testes locais com respostas simuladas não demonstram OAuth real; não foi lida configuração alojada de providers nesta entrega.

## 7. Rollback

Nesta fase sem ativação: fechar/remover a extensão piloto e confirmar o preflight seguro, mantendo `PUBLIC_CLIENT_ID=""` e `API_READY=false`; nenhuma alteração de dados precisa de reversão.

Se uma fase futura autorizada tiver ativado um ambiente isolado: desativar primeiro a API nesse ambiente, retirar a allowlist, revogar/desativar o cliente OAuth piloto e terminar a sessão; repor build segura e remover a extensão. Não presumir que apagar o cliente invalida imediatamente tokens já emitidos: confirmar recusa real dos pedidos. Não alterar o serviço partilhado de produção como parte deste rollback documental.

## 8. Registo de QA sem dados pessoais

Registar apenas data, versão, ambiente, teste, PASS/FAIL, contagens e bloqueador; nunca payloads, números, nomes de clientes, IDs de registos ou tokens. O hash da revisão e os resultados efetivos dos testes são reportados na entrega, sem apresentar a configuração gerada como prova de instalação ou publicação.

Pendentes obrigatórios: **ID estável + registo OAuth público + ambiente isolado autorizado + sessão real no Chrome + leitura pela extensão e cross-tenant denial**. Nada nesta preparação declara OAuth real ou E2E concluído.