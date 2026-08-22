# Importar imagens da pesquisa online sem bloqueios

## Diagnóstico

O diálogo "Pesquisar imagens online" encontra e mostra as imagens, mas a importação falha porque o download é feito **no browser**:

- `ProductImageWebSearchDialog.tsx` faz `fetch(url, { mode: "cors" })` a cada imagem escolhida.
- Os sites de origem (Ajax, lojas, CDNs) não enviam cabeçalhos CORS, por isso o browser bloqueia a leitura do ficheiro.
- Quando todos os downloads falham, a app mostra "Não foi possível descarregar nenhuma imagem (CORS bloqueado pela origem)" — a mensagem de "bloqueado" que estás a ver.

A miniatura aparece porque `<img src>` não está sujeito a CORS; a leitura dos bytes está. Ou seja, não é possível resolver isto só no frontend.

## Solução

Passar o download para o servidor: uma Edge Function descarrega as imagens (sem restrição de CORS) e grava-as diretamente no storage do produto, devolvendo os URLs finais.

### O que vai ser feito

1. **Nova Edge Function `product-images-import-url`**
   - Valida JWT + pertença ao workspace (mesmo padrão da `product-images-presign`), com bypass de super admin.
   - Recebe até 6 URLs; para cada uma: `fetch` server-side com `User-Agent` de browser e `Referer` da página de origem, timeout de ~10s.
   - Valida que o `content-type` é imagem e o tamanho é <= 8 MB.
   - Faz upload para o bucket `product-images` em `workspaces/{id}/products/tmp/{uuid}.{ext}` e regista o intent, como hoje.
   - Devolve `{ imported: [{ url, public_url }], failed: [{ url, reason }] }` — nunca falha o pedido inteiro por causa de um URL.
   - CORS em todas as respostas, incluindo erros; erros aplicacionais devolvidos com 200 + payload para não rebentar o cliente.

2. **Atualizar `ProductImageWebSearchDialog.tsx`**
   - Remover o `fetch` no browser e o fluxo de presign/PUT.
   - Chamar a nova função e usar os `public_url` devolvidos em `onPicked`.
   - Estados claros: "A importar…" com progresso, sucesso parcial ("3 de 4 importadas — 1 falhou"), e lista dos motivos de falha em vez da mensagem genérica de CORS.
   - Manter o limite `remainingSlots` e a pré-visualização atual.

## Critérios de aceitação

- Selecionar 4 imagens e carregar em "Adicionar ao produto" adiciona-as ao produto, sem mensagem de bloqueio.
- Se um URL específico falhar (404, não é imagem, demasiado grande), as restantes são importadas e o motivo é indicado.
- Só membros do workspace conseguem importar; os ficheiros ficam no caminho do próprio workspace.
- Sem erros de consola; comportamento igual em desktop e mobile.

## Riscos

- Alguns sites bloqueiam também pedidos de servidor (403 anti-bot); nesse caso a imagem é reportada como falhada, com opção de tentar outra.
- Imagens muito grandes são rejeitadas pelo limite de 8 MB (mantém o limite atual do upload de produtos).
