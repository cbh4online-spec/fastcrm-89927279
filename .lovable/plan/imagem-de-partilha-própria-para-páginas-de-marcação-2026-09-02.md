# Imagem de partilha própria para páginas de marcação

## Diagnóstico

O link `https://fastcrm.metodopare.ai/mymya-hub/book/onboarding-formadores-mymia-academy` corresponde a uma página de marcação real (workspace `mymya-hub`, página "Onboarding Formadores myMia Academy").

Duas razões para a pré-visualização mostrar a imagem genérica do FastCRM:

1. A tabela das páginas de marcação não tem qualquer campo de imagem, título ou descrição de partilha — não existe imagem específica para mostrar.
2. O mecanismo que serve pré-visualizações a crawlers (WhatsApp, Facebook, LinkedIn) só intercepta caminhos de loja, bio, landing pages e marketplace. Caminhos `/…/book/…` nunca são tratados, pelo que os crawlers recebem o `index.html` genérico com a imagem global do FastCRM.

## Decisões de produto/UX

- Cada página de marcação passa a poder ter **imagem de partilha, título de partilha e descrição de partilha** próprios, editáveis no separador de páginas de marcação.
- Se nada for definido, a pré-visualização usa, por ordem: imagem da página → logótipo/banner do workspace → imagem genérica do FastCRM. O título passa a ser o título da reunião e a descrição a descrição da reunião com a duração ("30 min · Onboarding…").
- Upload da imagem com recomendação visível de 1200×630 e pré-visualização de como fica no WhatsApp.

## Estrutura técnica

1. **Base de dados**: migração aditiva em `booking_pages` — `share_image_url text`, `seo_title text`, `seo_description text`. Sem alteração de dados existentes; RLS existente mantém-se (leitura pública já usada pela página).
2. **Storage**: reutilizar o bucket público já usado para imagens de marketing; upload por workspace (`{workspace_id}/booking/{page_id}`).
3. **UI**: `BookingPageModal.tsx` ganha secção "Partilha e SEO" com upload de imagem, título e descrição (validação zod: limites de comprimento, tipos de imagem, tamanho máximo).
4. **Pré-visualização (og-proxy)**: novo tipo `booking` na edge function — reconhecer `/{workspaceSlug}/book/{slug}` e `/book/{slug}` em `parsePathToTypeSlug`, procurar a página, construir título/descrição/imagem com os fallbacks acima e devolver HTML OG para crawlers ou redirecionar utilizadores reais.
5. **Cloudflare Worker** (`cloudflare-worker-og-rewrite.js`): passar a intercetar também caminhos que contenham `/book/`, e documentar a rota `fastcrm.metodopare.ai/*/book/*` a acrescentar no painel Cloudflare.

## Plano de implementação

1. Migração aditiva dos três campos.
2. Extensão do og-proxy (parsing + tipo `booking` + fallbacks).
3. Atualização do worker e da respetiva documentação de rotas.
4. UI de partilha no modal da página de marcação.
5. Teste com o link real via debugger de pré-visualização.

## Critérios de aceitação

- Partilhar o link no WhatsApp mostra o título da reunião, a descrição e a imagem definida.
- Sem imagem definida, mostra logótipo do workspace em vez da imagem genérica do FastCRM.
- Utilizadores reais continuam a abrir a página de marcação normalmente, sem redirecionamentos visíveis.
- Nenhuma alteração ao fluxo de marcação em si.

## Riscos e pontos por validar

- A rota do Worker no Cloudflare tem de ser adicionada manualmente (`fastcrm.metodopare.ai/*/book/*`) — sem isso, a correção não chega aos crawlers.
- O WhatsApp/Facebook mantêm cache das pré-visualizações; o link só muda depois de nova recolha ou de forçar refresh no debugger.
- Confirmar qual o bucket público preferido para estas imagens caso não queira reutilizar o de marketing.
