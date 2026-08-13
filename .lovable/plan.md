# Corrigir a página pública em branco da oferta

## Diagnóstico

O endereço curto resolve corretamente o produto `PORTALDEDENUNCIAS` e o conteúdo é devolvido no DOM. A página publicada também carrega o CSS e, num browser limpo, apresenta a oferta. O risco confirmado está no tratamento de falhas: a loja só tem proteção para erros de carregamento de ficheiros; qualquer exceção normal num componente da oferta desmonta toda a aplicação e deixa um ecrã totalmente branco, sem mensagem nem recuperação.

Foi ainda confirmado um problema de isolamento: se o slug da loja não resolver, a pesquisa do produto pode prosseguir sem filtro de workspace. Não explica este produto em particular, mas deve ser fechado no mesmo fluxo público.

## Decisões de produto/UX

1. Nunca mostrar um ecrã branco: apresentar uma mensagem clara, opção para tentar novamente e ligação para regressar à loja.
2. Isolar a falha à ficha pública, sem afetar o restante FastCRM.
3. Falhar de forma segura quando a loja não existe, sem procurar produtos noutros workspaces.
4. Manter o URL curto atual: `/store/metodopare/product/portal-de-denuncias`.

## Estrutura técnica

1. Criar uma error boundary reutilizável para rotas públicas da loja, com captura técnica do erro e fallback visível.
2. Aplicar a boundary à rota da ficha de produto e às secções dinâmicas da Smart Offer Page, para que uma secção malformada não derrube a página inteira.
3. Consumir o estado `notFound` de `useResolveStoreWorkspace` e mostrar “Loja não encontrada”.
4. Impedir `useStoreProduct` de executar sem `workspaceId`; manter o filtro de workspace também na resolução por prefixo.
5. Tornar o parsing de configuração e especificações tolerante a dados inesperados.

## Plano de implementação

1. Adicionar o fallback de erro da loja e ligá-lo à rota pública.
2. Reforçar a resolução loja → produto e os estados loading/not found/error.
3. Proteger a Smart Offer Page e as secções configuráveis contra dados inválidos.
4. Validar no preview e no endereço publicado em desktop e mobile, com cache limpa e cache existente.

## Critérios de aceitação

- O URL curto apresenta a “Plataforma de Denúncias”.
- Uma exceção numa secção mostra um fallback útil; nunca uma página branca.
- Um slug de loja inválido não devolve produtos de outro workspace.
- Recarregar, navegar diretamente e abrir numa sessão antiga produzem o mesmo resultado.
- Sem erros de consola na navegação normal.
- Layout legível em 1280px e 390px.

## Riscos e pontos por validar

- Uma cache PWA antiga pode manter ficheiros desatualizados até ao novo deploy; a validação inclui atualização e recuperação de cache.
- O erro exato visto na sessão do utilizador pode ser transitório; a boundary permitirá registá-lo e mostrá-lo de forma recuperável se voltar a ocorrer.