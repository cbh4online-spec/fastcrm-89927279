# FastCRM WhatsApp Pro — Extensão Chrome/Edge (Iteração 1)

Prova de conceito de extensão **Manifest V3** com **side panel** para trabalho
assistido junto do WhatsApp Web, integrada no ecossistema FastCRM.

> Estado: **prova de conceito, não publicada, não distribuída.**
> Sem envio automático, sem scraping, sem automação de DOM no WhatsApp Web.

## O que faz nesta iteração

- Ícone na barra de ferramentas que abre um **painel lateral** (side panel).
- Painel em português (PT-PT) com:
  - Estado fixo «Não ligado» — a extensão **não** verifica nem deduz a sessão;
    a autenticação acontece no separador do FastCRM.
  - Botão «Abrir página de entrada do FastCRM» (`/auth`).
  - Ações rápidas: abrir FastCRM, abrir Inbox do FastCRM, abrir WhatsApp Web.
  - Configuração do URL base do FastCRM (apenas `https://`, normalizado a
    origem, persistido em `chrome.storage.local`).

## O que NÃO faz (deliberadamente)

- Não injeta content scripts em nenhuma página.
- Não lê cookies, tokens, sessões ou `localStorage` de outros sites.
- Não faz fetch cross-origin (sem `host_permissions`: um pedido falharia por
  CORS e seria indistinguível de indisponibilidade real — por isso a
  «verificação de sessão» por HEAD foi removida).
- Não lê, copia ou extrai mensagens do WhatsApp Web.
- Não automatiza o DOM do WhatsApp Web (nada de cliques simulados ou envios).
- Não comunica com o backend do FastCRM (sem chamadas autenticadas nesta fase).
- Não contém URLs privados, segredos ou credenciais.

## Permissões pedidas

| Permissão   | Para quê                                              |
| ----------- | ----------------------------------------------------- |
| `storage`   | Guardar o URL do FastCRM configurado pelo utilizador. |
| `sidePanel` | Mostrar o painel lateral.                             |

Sem `host_permissions`, sem `tabs`, sem `cookies`, sem `webRequest`.

## Estrutura

```
extensions/fastcrm-whatsapp-pro/
├── manifest.json              # Manifest V3 (default_locale pt_PT)
├── background.js              # Service worker (abre painel, abre separadores https)
├── sidepanel.html             # Interface do painel lateral (PT-PT)
├── sidepanel.js               # Lógica do painel
├── sidepanel.css              # Estilos
├── icons/                     # icon16/48/128.png
├── _locales/pt_PT/            # Locale por omissão (obrigatório com default_locale)
└── README.md                  # Este ficheiro
```

## Como testar (Chrome ou Edge)

1. Abrir `chrome://extensions` (Chrome) ou `edge://extensions` (Edge).
2. Ativar o **Modo de programador** (toggle no canto superior direito).
3. Clicar em **Carregar sem pacote / Load unpacked**.
4. Selecionar a pasta `extensions/fastcrm-whatsapp-pro/`.
5. Clicar no ícone da extensão na barra de ferramentas — o painel lateral abre.
6. No painel:
   - Estado deve mostrar «Não ligado» (fixo, por desenho).
   - «Abrir página de entrada do FastCRM» abre `<url-configurado>/auth`.
   - Alterar o URL para `http://...` → deve recusar com mensagem de erro.
   - Guardar `https://exemplo.pt/qualquer/caminho?x=1` → fica `https://exemplo.pt`.

### Build

Não há build step: a extensão é JavaScript puro, sem dependências npm, e é
carregada diretamente. Para distribuir internamente, basta compactar a pasta:

```bash
cd extensions/fastcrm-whatsapp-pro
zip -r fastcrm-whatsapp-pro.zip .
```

## Validação estática (comandos)

```bash
cd extensions/fastcrm-whatsapp-pro
python3 -c "import json; json.load(open('manifest.json')); json.load(open('_locales/pt_PT/messages.json')); print('JSON OK')"
node --check background.js && node --check sidepanel.js && echo 'JS OK'
```

## Integração futura (próximas iterações)

Planeado, **não implementado** nesta iteração:

1. **Autenticação segura** — login via página do FastCRM (fluxo oficial),
   nunca por leitura de cookies. Quando existir, o URL base passa a ser
   validado contra uma **lista fechada de origens permitidas** (allowlist),
   para que nenhum token ou dado seja enviado a origens arbitrárias.
2. **Contexto de contacto** — o utilizador, estando numa conversa do WhatsApp
   Web, indica manualmente o contacto; a extensão mostra a ficha FastCRM
   correspondente via API oficial do backend (edge functions com JWT).
3. **Ações assistidas** — criar lead/contacto/tarefa a partir do painel, com
   confirmação explícita do utilizador; envios sempre via motor WhatsApp do
   FastCRM (Z-API/Meta), nunca pela interface do WhatsApp Web.
4. **Templates** — inserir templates de mensagem aprovados, com o utilizador
   a confirmar cada envio.

Qualquer integração futura com o backend usa exclusivamente as APIs oficiais
do FastCRM (edge functions autenticadas), respeitando workspace/RBAC.
