# Piloto local myMYA Hub — v0.4.2 inativo

1. Extrair `fastcrm-whatsapp-pro-v0.4.2-inactivo.zip` para uma nova pasta fixa no computador.
2. Abrir `chrome://extensions` e ativar **Modo de programador**.
3. Escolher **Carregar sem compactação** (ou **Carregar descompactada**, conforme o navegador).
4. Selecionar a pasta que contém `manifest.json`, não o ficheiro ZIP.
5. Confirmar a versão **0.4.2** em `chrome://extensions`.
6. Abrir o painel **FastCRM WhatsApp Pro** → **Configurações** → **Copiar URI de retorno OAuth**.

Para atualizar mantendo o ID local anterior, substituir os ficheiros de execução da pasta original pelos ficheiros extraídos do novo ZIP e clicar **Recarregar** em `chrome://extensions`. Confirmar novamente a versão **0.4.2**. Uma nova pasta pode produzir outro ID: copiar sempre o URI efetivo da instalação usada no piloto. O ZIP piloto v0.4.1 permanece preservado.

O painel deve mostrar **Configuração OAuth pendente**. Este pacote não faz login nem pesquisa autenticada: `PUBLIC_CLIENT_ID` está vazio e `API_READY=false`. O registo de um cliente OAuth público e qualquer ativação exigem aprovação separada; não são executados por esta instalação.

Manter a mesma pasta e máquina para conservar o ID local do Chrome; não presumir o mesmo ID noutro computador ou no Edge. Não enviar passwords, tokens ou dados de clientes para obter o URI.

Pacote apenas para instalação local, não publicado nem instalado automaticamente no navegador do utilizador.

## Correção e auditoria v0.4.2

O botão de ligação captura a referência antes da espera assíncrona e é reativado em `finally`; falhas inesperadas têm feedback PT-PT e estado desligado/configuração pendente. O teste executa o código real do painel num harness Node VM: os seis casos de login falhavam no código original, incluindo `currentTarget=null`, sucesso, falha, cancelamento e transporte inesperado.

Auditoria dos handlers assíncronos: apenas o login lia `currentTarget` depois de `await`. Carregar workspaces já capturava o botão; a seleção de workspace é síncrona. Cópias de telefone, pesquisa manual e URI já tratavam erros. Foram também protegidas falhas inesperadas de transporte nas mensagens de pesquisa e no logout/estado inicial, sem alterar OAuth nem ativar chamadas ao backend.

## Reprodução sem dependências globais

Usar `packageExtension({ distOnly: true, distDir: <pasta temporária> })` de `../scripts/package-extension.mjs` para obter exclusivamente os ficheiros autorizados. Criar o ZIP com a biblioteca padrão `zipfile` do Python, entradas ordenadas, data fixa `2026-01-01 00:00:00`, modo `0644`, sem extras/comentários e método `ZIP_STORED`. O manifesto fica na raiz. Validar com `unzip -t` e `unzip -Z1`, e comparar SHA-256 de duas reproduções.