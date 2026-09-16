# Selecionar várias imagens de uma só vez (ficha de produto)

## Diagnóstico

No separador Conteúdo → Imagens da ficha de produto:

- **Upload**: o seletor de ficheiros só permite escolher **um** ficheiro e o código processa apenas o primeiro (`files?.[0]`).
- **Adicionar URL**: só aceita um endereço por vez.
- **Pesquisar Web**: já permite escolher várias imagens (está correto).

## O que vai mudar

### Upload de vários ficheiros
- O seletor passa a aceitar seleção múltipla (e também arrastar vários ficheiros para a área de imagens).
- Cada ficheiro é validado (tem de ser imagem), comprimido e enviado em sequência, mantendo a numeração/ordem correta e os nomes otimizados para SEO.
- Respeita o limite de 10 imagens por produto: se a seleção exceder o espaço disponível, envia as que couberem e avisa quantas ficaram de fora.
- Indicador de progresso "A enviar 3 de 5…" enquanto decorre.
- Se um ficheiro falhar, os restantes continuam; ao fim mostra o resumo ("4 imagens adicionadas, 1 falhou") em vez de interromper tudo.

### Adicionar por URL (vários)
- O campo de URL passa a aceitar vários endereços, um por linha (ou separados por vírgula).
- Valida cada endereço; ignora linhas vazias e endereços inválidos, indicando quais foram rejeitados.
- Texto alternativo opcional aplicado a todos, com o texto automático do produto como base.

### Consistência
- Mensagens e estados (a carregar, sucesso parcial, erro) em português de Portugal.
- Comportamento igual em desktop e mobile; botões desativados durante o envio.

## Notas técnicas

- Ficheiro alterado: `src/components/products/ProductImagesGallery.tsx`.
- `<input type="file">` com `multiple`; `handleFileUpload` passa a iterar `Array.from(e.target.files)` limitado ao espaço restante.
- Cada imagem continua a usar `compressImageFile`, upload para o bucket `product-images` em `${workspaceId}/products/...` com sufixo único, e `useAddProductImage` para registar posição/alt/título.
- `handleAddUrl` passa a `handleAddUrls`, com `Textarea` em vez de `Input` e validação por linha.
- Sem alterações de base de dados, políticas de acesso ou lógica de negócio.

## Critérios de aceitação

- Selecionar 5 ficheiros no Upload adiciona as 5 imagens, na ordem escolhida.
- Colar 3 URLs em linhas separadas adiciona as 3 imagens.
- Ao exceder o limite de 10, as que couberem são adicionadas e o utilizador é avisado.
- Uma falha individual não impede as restantes; o resumo indica o que falhou.
- Sem erros de consola.
