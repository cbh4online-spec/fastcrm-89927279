# Navegação "contacto anterior / seguinte" sem sair do ecrã

## Objetivo
Ao abrir um contacto a partir da lista, poder saltar para o contacto anterior ou seguinte diretamente no cabeçalho — tanto na ficha de detalhe como no formulário de edição — sem voltar à listagem.

## Comportamento
- Controlo compacto no cabeçalho: `‹` `Contacto 7 de 128` `›`.
- A ordem segue exatamente a lista de Contactos de onde o utilizador veio (pesquisa, ordenação e direção aplicadas). A paginação não limita: a navegação percorre todo o conjunto filtrado, não apenas a página visível.
- Atalhos de teclado: `Alt + ←` / `Alt + →` (ignorados quando o foco está num campo de texto).
- Botões desativados nos extremos (primeiro / último), com tooltip explicativo.
- Se o utilizador chegou por link direto (sem passar pela lista), o controlo não aparece.
- No formulário de edição, se houver alterações por guardar, mostrar diálogo de confirmação antes de mudar de contacto: "Guardar e continuar" / "Descartar" / "Cancelar".
- Estado de carregamento: ao mudar de contacto mantém-se o cabeçalho e mostra-se skeleton no corpo; erro de contacto inexistente mostra estado de erro com opção de voltar à lista.

## Estrutura técnica
1. **`src/hooks/useEntityListNavigation.ts`** (novo)
   - Guarda em `sessionStorage` (chave por entidade, ex. `nav-ctx:contact`) a lista ordenada de IDs + assinatura dos filtros, com validade de sessão.
   - Expõe `{ ids, index, total, prevId, nextId, goPrev, goNext, hasContext }` a partir do `id` da rota.
   - Se o `id` atual não existir na lista guardada, devolve `hasContext: false`.

2. **`src/components/contacts/ContactsListIX.tsx`**
   - Ao clicar numa linha, gravar o contexto com os IDs de `filtered` (conjunto completo já ordenado/filtrado) antes de navegar.

3. **`src/components/entity/EntityRecordPager.tsx`** (novo, reutilizável)
   - UI do controlo (setas + contador), acessível (`aria-label`, foco visível), com registo dos atalhos de teclado e prop opcional `onBeforeNavigate` para interceção (usada na edição).

4. **`src/components/contacts/eni/ENIContactDetailWithSidebar.tsx`**
   - Inserir `EntityRecordPager` na barra do cabeçalho, junto ao botão de voltar.

5. **`src/pages/contacts/EditContactPage.tsx`**
   - Inserir o mesmo componente no cabeçalho do `IXFormLayout`, ligando `onBeforeNavigate` ao estado "dirty" do formulário e ao diálogo de confirmação.

Sem alterações de base de dados.

## Critérios de aceitação
- Abrir um contacto a partir da lista mostra `X de Y` correto face aos filtros ativos.
- `›` avança para o contacto seguinte da mesma ordem, atualizando URL e conteúdo, incluindo ao atravessar fronteiras de página.
- Nos extremos as setas ficam desativadas.
- Em edição com alterações por guardar, não se perde trabalho sem confirmação.
- Acesso por link direto não mostra o controlo e não gera erros de consola.
- Funciona em mobile (setas visíveis, contador abreviado).

## Riscos
- O contexto vive na sessão do browser; abrir noutro separador não herda a lista (comportamento aceite).
- Contactos criados ou eliminados após guardar o contexto podem gerar saltos; o hook ignora IDs já inexistentes.
