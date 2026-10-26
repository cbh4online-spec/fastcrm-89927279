# FastCRM WhatsApp Pro — Ativação do piloto OAuth (v0.4.1)

Estado à data desta versão: **piloto OAuth preparado, ainda inativo**.
`PUBLIC_CLIENT_ID=""`, `API_READY=false`, flags do backend não definidas (API responde `503 disabled`).
Nenhum cliente OAuth foi criado e não houve login real nem E2E. Este guia não contém valores reais nem fictícios de client_id, chaves ou tokens.

Cada passo indica **quem** o faz. Nada aqui é feito automaticamente pela extensão, pelos scripts ou pelo agente.

---

## 0. Preflight local (qualquer pessoa, sem rede)

```bash
cd extensions/fastcrm-whatsapp-pro
node scripts/pilot-preflight.mjs            # tem de dar RESULTADO: PASS no estado seguro
node --test tests/*.test.js
node scripts/package-extension.mjs --dist-only
```

O preflight não contacta o servidor e não imprime client_id nem tokens. Em modo seguro **falha** se `PUBLIC_CLIENT_ID` estiver preenchido ou `API_READY=true`.

## 1. ID estável da extensão (bloqueador — decidir primeiro)

O redirect OAuth é `https://<ID>.chromiumapp.org/oauth2` (`chrome.identity.getRedirectURL("oauth2")`). O cliente OAuth e o callback só valem para **esse ID exato**.

- **Recomendado:** publicar como não listada na Chrome Web Store e usar o ID atribuído; ou usar uma chave pública gerida externamente (o par de chaves fica fora do repositório, guardado por um responsável).
- **Proibido:** gerar uma `key` ad hoc no manifest só para testar — muda o ID e invalida registos. O preflight falha se o manifest tiver `key`.
- **Modo unpacked:** o ID deriva do caminho da pasta. É estável só nessa máquina enquanto a pasta (e a chave, se houver) não mudar. **Não é garantido entre máquinas.**
- **Edge:** o ID pode ser diferente do Chrome (Edge Add-ons atribui o seu). Cada ID exige o seu próprio redirect registado; pode ser preferível um cliente OAuth por plataforma.

Critério: o ID usado no piloto está escrito na ficha do piloto (fora do repositório) e foi confirmado em `chrome://extensions` em todas as máquinas piloto.

## 2. Configuração do servidor de autorização (administrador do backend)

Seguir a documentação oficial do servidor OAuth do Supabase Auth:

1. **Authentication → OAuth Server → Enable**.
2. **Authorization Path:** `/.lovable/oauth/consent`.
3. **Authentication → URL Configuration → Site URL:** `https://fastcrm.metodopare.ai`.
4. Confirmar que o discovery público responde (GET, sem token):
   `/.well-known/oauth-authorization-server/auth/v1`.

## 3. Registo do cliente OAuth (administrador)

- Tipo: **público**, **sem client_secret**.
- Grant: **Authorization Code + PKCE S256** (obrigatório).
- Redirect URI: copiar **diretamente** do painel da extensão instalada, em «Configurações → URI de retorno OAuth». Não escrever à mão.
- Scope: `email` (sem `openid` até haver chaves de assinatura assimétricas verificadas).
- Nome do cliente visível no consentimento: «FastCRM WhatsApp Pro».
- Guardar o client_id na ficha do piloto. É público, mas só entra no código numa build piloto aprovada.

## 4. Build piloto (programador, após passos 1–3)

1. Preencher `PUBLIC_CLIENT_ID` em `lib/oauth-config.js` **numa build piloto separada** (não no ramo principal até GO).
2. Manter `API_READY=false`.
3. `node scripts/pilot-preflight.mjs --expect=pilot` → PASS.
4. `node scripts/package-extension.mjs --dist-only` e carregar `dist/fastcrm-whatsapp-pro` em Load unpacked (sem ZIP público).

## 5. Testes de login (2 utilizadores, 2 workspaces)

| # | Teste | Resultado esperado |
|---|---|---|
| L1 | Utilizador A: «Iniciar sessão» | Consentimento mostra o cliente; após Autorizar, painel «Ligado» |
| L2 | Recusar no consentimento | Painel «Desligado», sem token |
| L3 | Fechar a janela de login | «Autorização cancelada», desligado |
| L4 | «Terminar sessão» enquanto a janela de login está aberta e depois autorizar | Continua desligado (proteção v0.4.1) |
| L5 | Dois cliques rápidos em «Iniciar sessão» | Só abre uma janela; o segundo recebe «login em curso» |
| L6 | Reiniciar o browser | Desligado (token só em memória de sessão) |
| L7 | Token expira (≤ 1 h) | Desligado, sem refresh |
| L8 | Revogar a autorização do cliente na conta do utilizador | Próximo pedido à API falha e o painel desliga |

## 6. Ativação da API de leitura (administrador do backend, só após L1–L8)

1. Definir as variáveis da função `fastcrm-whatsapp-extension-api`: client_id esperado, origem permitida e **allowlist de workspaces piloto**. Ver `V0.4B-API-LEITURA.md`.
2. Só no fim: flag de ativação (`FASTCRM_WA_EXTENSION_API_ENABLED=true`).
3. Build piloto com `API_READY=true`.

| # | Teste | Resultado esperado |
|---|---|---|
| A1 | A lista workspaces | Só workspaces de A que estão na allowlist |
| A2 | A pesquisa número existente no workspace piloto | Contacto/lead do workspace certo |
| A3 | B pesquisa o mesmo número | Não vê dados do workspace de A |
| A4 | Workspace fora da allowlist | Recusado |
| A5 | Logout a meio de uma pesquisa | Resultado descartado, lista limpa |
| A6 | Instâncias externas do workspace (se existirem) | Confirmado manualmente que a API lê a instância correta ou recusa |

## 7. Critérios GO / NO-GO

**GO** só se todos forem verdadeiros:
- ID estável confirmado (passo 1) e redirect registado corresponde ao ID.
- Preflight PASS em modo seguro (ramo principal) e em modo piloto (build piloto).
- L1–L8 e A1–A6 passaram com 2 utilizadores reais e 2 workspaces.
- Consentimento revisto (ver secção 9) e aceite pelo responsável de segurança.
- Nenhum token visível no painel, consola ou armazenamento persistente.

**NO-GO** se qualquer um: ID instável; redirect diferente; dados de outro workspace visíveis; token persistido fora de `storage.session`; consentimento sem identificação clara do cliente; falha de revogação.

## 8. Rollback

1. Backend: remover/pôr a `false` a flag de ativação (API volta a `503`); retirar workspaces da allowlist.
2. Desativar ou apagar o cliente OAuth (invalida novos logins).
3. Extensão: «Terminar sessão»; repor `PUBLIC_CLIENT_ID=""` e `API_READY=false`; confirmar preflight PASS em modo seguro.
4. Utilizadores: remover a extensão em `chrome://extensions` / `edge://extensions`.

## 9. Auditoria da página de consentimento (não alterada em v0.4.1)

Ficheiro: `src/pages/OAuthConsentPage.tsx`. Pendências para a próxima iteração (fora do âmbito desta):

| Criticidade | Achado |
|---|---|
| Alta | Não mostra os **scopes** pedidos nem o redirect/cliente de forma verificável; só o nome. |
| Alta | Se a resposta trouxer `redirect_url` sem `client`, redireciona **sem consentimento visível**. Confirmar que só acontece em consentimento já concedido. |
| Confirmado | `/login` e `/.lovable/oauth/consent` estão registadas; falta testar o fluxo real de login e retorno com `authorization_id` (incluindo Google/Apple). |
| Média | Mostra `error.message` do servidor tal como vem; preferir mensagens PT-PT controladas. |
| Baixa | Tipos `any` nos detalhes da autorização. |

Nenhum workaround foi aplicado.
