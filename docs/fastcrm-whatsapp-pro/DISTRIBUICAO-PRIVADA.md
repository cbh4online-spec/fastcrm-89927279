# FastCRM WhatsApp Pro — Distribuição privada (v0.4.3)

**Estado real:** pacote **INATIVO**, apto apenas a piloto manual (instalação «Carregar sem compactação»).
**Não** está pronto para submissão na Chrome Web Store nem para OAuth em produção.
`PUBLIC_CLIENT_ID = ""` e `API_READY = false` (inalterados).

## 1. O que muda na v0.4.3

| Antes (0.4.2) | Agora (0.4.3) |
|---|---|
| `host_permissions: ["https://eumnfkccyvlyoyjchiwe.supabase.co/*"]` (obrigatório na instalação) | sem `host_permissions`; `optional_host_permissions` com **exatamente** esse host |
| Chrome avisava acesso ao servidor logo ao instalar | o acesso só é pedido ao clicar **Ligar** numa futura build configurada |

- Permissões nomeadas mantêm-se: `storage`, `sidePanel`, `identity`. CSP inalterada (`connect-src` só esse host).
- Nada é escondido: o host continua declarado no manifest como opcional e é visível em `chrome://extensions` → Detalhes.
- O hostname `eumnfkccyvlyoyjchiwe.supabase.co` é público (está no manifest) — não é segredo.

## 2. Comportamento (código em `lib/server-permission.js`)

1. **Build atual (cliente OAuth vazio):** clicar «Ligar» mostra «Configuração OAuth pendente»; **zero** `permissions.request`, **zero** `AUTH_START`.
2. **Futura build configurada:** `chrome.permissions.request({origins:[host]})` é chamado diretamente no clique, antes de qualquer `await`/mensagem. Só com `true` é enviado `AUTH_START`. Recusa, erro, rejeição ou API ausente ⇒ «Desligado» com mensagem PT-PT; botão reativado.
3. **Service worker (defesa em profundidade):** `permissions.contains` é verificado antes de abrir OAuth, antes da troca de token, antes de gravar o token, em cada leitura do token e antes de cada pedido à API. Sem permissão ⇒ `sem_permissao_servidor`, zero rede. A geração/mutex da v0.4.1 mantém-se; uma revogação durante a espera invalida a tentativa.
4. **Revogação** (`chrome.permissions.onRemoved` dessa origem): SW faz logout, limpa workspaces e epoch; painel limpa telefone, workspace e resultados; respostas atrasadas são descartadas.
5. Nada é pedido ao abrir o painel, ao ler o estado nem ao pesquisar.

## 3. Migração do piloto 0.4.2

Uma permissão de host obrigatória concedida antes **pode continuar concedida** depois de passar a opcional.
Em `onInstalled`/`onStartup`, **só** quando `PUBLIC_CLIENT_ID` vazio **e** `API_READY=false`, a extensão chama `chrome.permissions.remove` para esse host (sem rede, sem logs com tokens). Numa build configurada nunca remove automaticamente.

**Não garantido sem teste real.** Verificar após atualizar:

1. `chrome://extensions` → FastCRM WhatsApp Pro → **Detalhes** → «Acesso ao site»: o host não deve aparecer como concedido.
2. Consola do service worker (Inspecionar visualizações):
   `chrome.permissions.getAll(console.log)` e
   `chrome.permissions.contains({origins:["https://eumnfkccyvlyoyjchiwe.supabase.co/*"]}, console.log)` ⇒ esperado `false`.
3. Se continuar concedido (aviso «host antigo não removido»): revogar manualmente em Detalhes → Acesso ao site, ou remover a extensão e fazer instalação limpa.
4. Repetir na instalação limpa (pasta nova ⇒ ID novo; copiar de novo o URI OAuth).

## 4. Domínio próprio — não configurado

- `api.fastcrm.metodopare.ai` é **apenas proposta**. Não está configurado, não existe proxy, e a extensão continua a usar o host atual.
- Leitura deste projeto: o backend é **Lovable Cloud gerido** (não um projeto Supabase próprio do cliente).
- Os domínios personalizados do Lovable aplicam-se ao **site/frontend publicado** (ex.: `fastcrm.metodopare.ai`). **Não confirmado** que exista domínio personalizado para API/Auth do Lovable Cloud; o «custom domain» do Supabase é uma funcionalidade do projeto Supabase, não demonstrada na UI/docs do Lovable Cloud. Mudar o host obrigaria a nova versão do manifest, CSP e novo pedido de permissão.

## 5. Lista de verificação para distribuição privada / loja

| Item | Estado |
|---|---|
| Pacote inativo determinístico (`pilot/fastcrm-whatsapp-pro-v0.4.3-inactivo.zip`) | Feito |
| Permissões mínimas + host opcional | Feito (código e testes) |
| Teste real de upgrade 0.4.2→0.4.3 e instalação limpa no Chrome | **Por fazer** |
| Conta Chrome Web Store developer confirmada | **Por confirmar** |
| Ficha da loja, política de privacidade pública específica da extensão | **Por fazer** (materiais preparados em paralelo) |
| Screenshots/ícones promocionais | **Por fazer** |
| Visibilidade «Privada»/grupo Google ou domínio Workspace | **Por decidir** |
| Registo do cliente OAuth público (PKCE, redirect com ID estável da loja) | **Por fazer** |
| E2E com dois utilizadores/workspaces | **Por fazer** |
| Domínio próprio para API | **Não configurado** |

O ID da extensão na loja difere do ID «sem compactação»: o redirect OAuth tem de ser registado com o ID definitivo.

## 6. Referências oficiais

- chrome.permissions: https://developer.chrome.com/docs/extensions/reference/api/permissions
- Permissões opcionais / declarar: https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions
- Distribuição privada (Web Store): https://support.google.com/chrome/a/answer/2663860 e https://developer.chrome.com/docs/webstore/cws-dashboard-distribution
- Domínios personalizados Lovable (frontend): https://docs.lovable.dev/features/custom-domain
- Custom domains Supabase (projeto Supabase próprio): https://supabase.com/docs/guides/platform/custom-domains
