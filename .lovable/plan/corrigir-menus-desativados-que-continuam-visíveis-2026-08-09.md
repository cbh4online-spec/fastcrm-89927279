# Corrigir menus desativados que continuam visíveis

## Diagnóstico confirmado

- Na workspace **Ajax Systems**, a base de dados tem regras explícitas `hidden` para **Apresentação**, **Contratos de Renting**, **Parque instalado** e **Financiadoras**, mas estes quatro itens continuam visíveis na imagem enviada.
- Os restantes itens visíveis na imagem — **Importar SAF-T PT**, **Cobranças**, **Sequências de cobrança**, **Notas Encomenda**, **Pagamentos**, **Admin Checkout** e **Checkout** — estão atualmente gravados como `visible`. Foram marcados assim pela operação em massa das 22:23, portanto não devem ser removidos sem o utilizador os voltar a marcar como ocultos.
- O código atual tenta filtrar as regras nas três variantes de sidebar, mas a leitura falha de forma permissiva: qualquer erro ao obter as regras é convertido silenciosamente num mapa vazio, fazendo reaparecer todos os menus. A causa concreta da falha no cliente publicado ainda precisa de ser confirmada com a sessão Ajax Systems.
- Existe ainda um bypass confirmado na `WatidySidebar`: favoritos e recentes voltam a adicionar rotas a partir do manifesto completo, mesmo depois de terem sido excluídas da árvore filtrada.

## Decisões de produto/UX

1. **Oculto significa oculto em todo o lado**: sidebar, pesquisa, favoritos, recentes, menu mobile, “+ Criar” e acesso direto por URL.
2. **Não alterar regras legítimas**: a correção não muda automaticamente os itens atualmente gravados como `visible`.
3. **Falhar de forma segura**: durante carregamento, troca de workspace ou erro de leitura, não mostrar temporariamente o catálogo completo de menus.
4. **Estado administrativo claro**: distinguir regra própria, estado herdado e erro de sincronização para evitar que “Aplicar a tudo” produza resultados inesperados.

## Estrutura técnica

1. Reproduzir com a sessão autenticada da Ajax Systems e confirmar:
   - ID real da workspace ativa usado pelo hook;
   - resposta da consulta a `workspace_menu_overrides`;
   - variante de sidebar ativa e estado da cache no momento em que os quatro itens ocultos são renderizados.
2. Corrigir `useWorkspaceMenuOverrides`:
   - deixar de transformar erros em `[]`/“tudo visível”;
   - preservar o último mapa válido durante refetch e troca controlada de estado;
   - atualizar diretamente a cache após guardar, além da invalidação/realtime;
   - expor estado de erro/carregamento para as superfícies consumidoras.
3. Centralizar a decisão de visibilidade num filtro reutilizável e aplicá-lo de forma idêntica em:
   - `AdaptiveSidebar`;
   - `WatidySidebar`, incluindo favoritos e recentes;
   - `InvoiceXpressSidebar`;
   - `MobileBottomNav`, pesquisa global, “+ Criar” e `MenuVisibilityGuard`.
4. Rever a ação **Aplicar a tudo** para mostrar o estado que será efetivamente gravado e impedir aplicação acidental quando o grupo está apenas a herdar um valor.
5. Adicionar testes de regressão para herança, regra própria `hidden`, favoritos/recentes e falha/carregamento da consulta.

## Critérios de aceitação

- Na Ajax Systems, os quatro itens atualmente marcados `hidden` deixam de aparecer sem ser necessário limpar cache ou terminar sessão.
- Um item oculto não reaparece em favoritos, recentes, pesquisa, mobile ou “+ Criar”.
- O URL direto de uma rota oculta redireciona para o painel; uma rota bloqueada mostra o ecrã de acesso condicionado.
- Alterar uma regra no Super Admin atualiza uma sessão aberta da workspace e persiste após recarregar.
- Uma falha de rede/leitura não mostra menus que possam estar ocultos.
- As outras workspaces mantêm as respetivas configurações.

## Riscos e validações

- Validar separadamente preview e versão publicada; a imagem foi capturada no domínio publicado e pode estar a executar uma versão anterior à correção.
- Confirmar o comportamento com utilizador normal e super admin, mantendo as mesmas regras visuais para ambos.
- Testar desktop e mobile, as três variantes de navegação e ausência de erros de consola/rede.