# Corrigir lentidão e falha intermitente ao abrir o FastCRM

## 1. Diagnóstico

- O domínio `fastcrm.metodopare.ai` está ligado, publicado e com os registos públicos corretos.
- O backend está disponível e respondeu normalmente.
- Numa sessão limpa, a página inicial respondeu com HTTP 200, apresentou o conteúdo completo e não gerou erros da aplicação.
- O ecrã da captura é o fallback de `ChunkErrorBoundary`, apresentado quando o navegador não consegue obter um módulo JavaScript carregado dinamicamente.
- A aplicação mantém um service worker/PWA com atualização automática e recarregamento em `controllerchange`; em paralelo, o botão atual apenas repete um reload normal. Esta combinação não recupera de forma garantida quando o navegador conserva uma versão antiga dos ficheiros.
- O arranque também importa antecipadamente grupos de rotas grandes — incluindo CRM, loja e portais — apesar de o utilizador visitar apenas uma área, aumentando o volume inicial e o risco de falha em ligações lentas.

## 2. Decisões de produto e UX

- Manter a PWA, mas impedir que uma atualização troque ficheiros a meio de uma sessão.
- Recuperar automaticamente uma única vez de ficheiros desatualizados, sem criar ciclos de reload.
- Se a recuperação automática não resultar, mostrar um erro útil com nova tentativa real, preservando a página pretendida.
- Carregar primeiro apenas a área necessária para a rota visitada; CRM, loja, portais e páginas públicas ficam independentes.
- Não alterar conteúdos, permissões, dados, rotas públicas ou aparência da landing page.

## 3. Estrutura técnica

### Atualização e cache

- Rever a estratégia do service worker para evitar ativação/reivindicação imediata durante uma sessão aberta.
- Substituir o reload global em `controllerchange` por um fluxo coordenado e limitado por versão.
- Criar uma rotina de recuperação para erros de módulos: atualizar/remover o service worker problemático, limpar apenas caches da aplicação e recarregar com bypass de cache uma única vez.
- Limpar a marca de recuperação após um arranque bem-sucedido, para que uma atualização futura possa recuperar novamente.
- Fazer o botão “Tentar novamente” executar esta recuperação, em vez de um reload simples.

### Desempenho inicial

- Transformar os grandes grupos de rotas atualmente importados no arranque em imports lazy por área.
- Retirar ferramentas de desenvolvimento do pacote de produção ou carregá-las apenas em desenvolvimento.
- Confirmar que a landing pública não inicializa providers e módulos exclusivos do CRM sem necessidade.
- Comparar os ficheiros e pedidos iniciais antes/depois para evitar mover o problema para outra rota.

### Observabilidade

- Registar apenas dados técnicos não sensíveis do erro de carregamento: versão, rota, estado online e nome do módulo falhado.
- Distinguir falha de rede, ficheiro desatualizado e erro real da aplicação para não mostrar uma mensagem enganadora.

## 4. Plano de implementação

1. Medir o arranque publicado e confirmar os headers/versões do HTML, service worker e módulos com hash.
2. Corrigir a política de atualização da PWA e remover o caminho que pode recarregar a aplicação sem coordenação.
3. Implementar recuperação única e segura no erro de módulos e ligar o botão de nova tentativa.
4. Dividir o carregamento inicial por grupos de rotas e limitar ferramentas de desenvolvimento ao ambiente de desenvolvimento.
5. Validar landing, login, dashboard e loja em sessão limpa e numa sessão com cache de versão anterior.
6. Executar typecheck, testes relevantes e build; depois validar desktop e mobile no site publicado.

## 5. Critérios de aceitação

- A página inicial abre numa sessão limpa e numa sessão que ainda tenha cache da versão anterior.
- Um módulo desatualizado recupera automaticamente no máximo uma vez e mantém a rota original.
- Não existe ciclo de reload nem atualização inesperada durante utilização normal.
- “Tentar novamente” faz uma recuperação efetiva e não repete indefinidamente o mesmo erro.
- Landing, login, dashboard e `/store/ajax` continuam acessíveis.
- O arranque da landing deixa de descarregar antecipadamente os grandes módulos internos não utilizados.
- Sem novos erros de consola; typecheck, testes e build aprovados.

## 6. Riscos e pontos por validar

- A falha não apareceu numa sessão limpa, por isso será reproduzida através de uma versão antiga do service worker/cache antes de fechar o diagnóstico.
- Alterar a política PWA exige testar atualização entre duas builds, não apenas a build atual.
- A divisão de código deve preservar exports, providers e limites de erro específicos de cada grupo de rotas.
- A correção só ficará disponível no domínio depois de uma nova publicação.
