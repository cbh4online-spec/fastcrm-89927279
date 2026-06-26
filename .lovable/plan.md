## Diagnóstico

A `WatidySidebar` actual tem duas colunas em simultâneo:
- **Rail (56px)** — ícones de todos os mega-grupos (Comercial, Marketing, IA, Loja…), favoritos, recentes e avatar
- **Painel (248px)** — mostra apenas as secções **de UM** mega-grupo de cada vez (o seleccionado no rail)

Daí a confusão na captura: o rail mostra ~12 ícones de áreas, mas o painel só revela "CRM / Pipeline & Contas / Prospecção / Performance" do grupo Comercial. O utilizador não percebe que os outros ícones do rail são módulos distintos.

## Decisão

Modo "Só painel expandido" — remover o rail por completo e mostrar **todos os mega-grupos numa só coluna vertical**, cada um como uma secção colapsável (estilo InvoiceXpress / Linear).

## Alterações

### `src/components/layout/WatidySidebar.tsx`
1. Remover o bloco `RAIL` (linhas 339–562): logo, ícones de mega-grupos, favoritos no rail, recentes, footer rail.
2. Largura única: `w-[288px]` (sem `w-14 + w-[248px]`).
3. Reorganizar o **painel** para iterar sobre **todos** os `megaGroups` em vez de apenas `activeMegaData`:
   - Cabeçalho com logo do workspace + nome + switcher (mantém o que já existe no panel header)
   - Barra de pesquisa global (já existente)
   - Para cada mega-grupo: cabeçalho clicável (ícone colorido + label + contagem + chevron) que expande/colapsa as suas secções e itens
   - Estado: o mega-grupo da rota actual fica expandido por omissão; os outros colapsados
   - Persistir estado expandido em `localStorage` (`watidy.sidebar.expandedGroups`)
4. **Favoritos**: passar para uma secção fixa no topo (acima dos mega-grupos), apenas quando existirem
5. **Recentes**: secção colapsada por baixo dos favoritos
6. **Footer**: manter avatar + atalhos + theme switcher + copyright (já existe no painel) — só mudar para ocupar toda a largura
7. Eliminar estado `panelOpen` / `togglePanel` e o atalho ⌘B (deixa de fazer sentido sem rail). Em mobile mantém o drawer (`open` / `onClose`).

### Componentes auxiliares
- Reutilizar `SidebarNavItem` e `SidebarSectionLabel` já existentes.
- Novo helper local `<MegaGroupAccordion>` dentro do mesmo ficheiro para o cabeçalho colapsável de cada grupo (não vale extrair).

### Sem mexer
- `AdaptiveSidebar`, `SuperAdminSidebar`, `MobileBottomNav`, `routeManifest.ts`, capabilities, badges, lógica de visibilidade por plano.
- Os hover-cards/popovers do rail desaparecem naturalmente porque o rail deixa de existir.

## Critérios de aceitação

- [ ] Sidebar mostra **uma única coluna** com largura ~288px
- [ ] Todos os mega-grupos (Comercial, Marketing, IA, Loja, HR, etc.) aparecem listados verticalmente, colapsáveis
- [ ] O mega-grupo da rota actual abre automaticamente; itens activos mantêm a pílula azul FastCRM
- [ ] Favoritos e Recentes aparecem como secções próprias quando têm conteúdo
- [ ] Footer (atalhos, theme switcher, copyright) mantém-se
- [ ] Mobile: drawer continua a abrir/fechar via TopBar
- [ ] Sem erros de consola; typecheck limpo
- [ ] Badges, locks de plano e contagens continuam a funcionar

## Riscos

- Sidebar fica mais longa verticalmente — mitigado com scroll interno e grupos colapsáveis
- Utilizadores habituados ao rail rápido perdem o acesso "1 clique" aos módulos — aceite porque foi a escolha explícita
- Persistência do estado expandido por localStorage (não sincronizado entre dispositivos) — aceitável nesta fase
