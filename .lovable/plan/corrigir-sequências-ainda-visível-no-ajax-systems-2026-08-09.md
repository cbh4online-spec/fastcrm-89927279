# Corrigir “Sequências” ainda visível no Ajax Systems

## 1. Diagnóstico

- Confirmado na base de dados: o workspace **Ajax Systems** tem a rota `sequences` definida como `hidden`.
- Confirmado no manifesto: “Sequências” usa exatamente a chave `sequences` e pertence a `comercial-pipeline`.
- As sidebars atuais já contêm um filtro para excluir rotas ocultas. Assim, a configuração está correta; falta identificar por que motivo o cliente apresentado no domínio publicado não está a consumir/aplicar o estado mais recente.

## 2. Decisões de produto/UX

- Uma rota marcada como **Oculto** deve desaparecer imediatamente de todas as formas de navegação.
- O comportamento deve ser consistente na sidebar principal, favoritos, recentes, pesquisa, menu “+ Criar”, mobile e acesso direto por URL.
- Durante carregamento ou falha de leitura, não apresentar menus configuráveis como se estivessem autorizados sem confirmar as regras.

## 3. Estrutura técnica

- Verificar no runtime qual é o `workspace_id` ativo e qual o mapa de overrides recebido no domínio de teste e no domínio publicado.
- Corrigir a origem encontrada: cache/chave de query, sincronização após troca de workspace, leitura com erro silencioso ou versão publicada desatualizada.
- Remover o bypass de itens ocultos em listas derivadas, nomeadamente favoritos e recentes, que atualmente podem voltar a obter itens diretamente do manifesto completo.
- Manter `routeManifest.ts` como fonte única da chave `sequences` e aplicar o mesmo resolvedor de visibilidade em todos os consumidores.

## 4. Plano de implementação

1. Reproduzir no Ajax Systems e inspecionar a resposta real de `workspace_menu_overrides` para a sessão ativa.
2. Corrigir a sincronização/leitura para que a alteração `hidden` invalide o cache certo e seja aplicada após mudança de workspace, refresh e publicação.
3. Filtrar também favoritos, recentes e qualquer fallback construído a partir do manifesto completo.
4. Confirmar que `/dashboard/sequences` redireciona quando a rota está oculta.
5. Validar preview e versão publicada; se o código correto existir apenas no preview, publicar a atualização antes do teste final.

## 5. Critérios de aceitação

- “Sequências” não aparece no Ajax Systems após refresh, novo login ou troca de workspace.
- A rota continua disponível nos workspaces onde está configurada como visível.
- Um item oculto não reaparece em favoritos, recentes, pesquisa, mobile ou “+ Criar”.
- O acesso direto a `/dashboard/sequences` é bloqueado no Ajax Systems.
- Sem novos erros ou avisos de consola relacionados com menus.

## 6. Riscos e pontos por validar

- O domínio publicado pode ainda estar a executar uma versão anterior à correção já existente no preview.
- Uma falha de leitura é atualmente convertida num mapa vazio, o que produz um comportamento permissivo; será necessário distinguir “sem regras” de “erro ao carregar”.