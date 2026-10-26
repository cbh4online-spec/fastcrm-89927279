# Piloto local myMYA Hub — v0.4.1 inativo

1. Extrair `fastcrm-whatsapp-pro-v0.4.1-inactivo.zip` para uma pasta fixa no computador.
2. Abrir `chrome://extensions` e ativar **Modo de programador**.
3. Escolher **Carregar sem compactação** (ou **Carregar descompactada**, conforme o navegador).
4. Selecionar a pasta que contém `manifest.json`, não o ficheiro ZIP.
5. Abrir o painel **FastCRM WhatsApp Pro** → **Configurações** → **Copiar URI de retorno OAuth**.

O painel deve mostrar **Configuração OAuth pendente**. Este pacote não faz login nem pesquisa autenticada: `PUBLIC_CLIENT_ID` está vazio e `API_READY=false`. O registo de um cliente OAuth público e qualquer ativação exigem aprovação separada; não são executados por esta instalação.

Manter a mesma pasta e máquina para conservar o ID local do Chrome; não presumir o mesmo ID noutro computador ou no Edge. Não enviar passwords, tokens ou dados de clientes para obter o URI.

Pacote apenas para instalação local, não publicado nem instalado automaticamente no navegador do utilizador.

## Reprodução sem dependências globais

Usar `packageExtension({ distOnly: true, distDir: <pasta temporária> })` de `../scripts/package-extension.mjs` para obter exclusivamente os ficheiros autorizados. Criar o ZIP com a biblioteca padrão `zipfile` do Python, entradas ordenadas, data fixa `2026-01-01 00:00:00`, modo `0644`, sem extras/comentários e método `ZIP_STORED`. O manifesto fica na raiz. Validar com `unzip -t` e `unzip -Z1`, e comparar SHA-256 de duas reproduções.