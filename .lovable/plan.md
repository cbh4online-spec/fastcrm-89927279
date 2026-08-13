# Botão "Nova ação" do backoffice sem comportamento

## Diagnóstico

No cabeçalho do backoffice (`src/components/backoffice-v2/BackofficeShellV2.tsx`) o botão "Nova ação" é um `<button type="button">` sem `onClick` nem handler — apenas estilo. O mesmo se passa com o sino de Notificações e com o campo de pesquisa (`Input` sem estado nem submissão), que também são inertes.

## Decisões de produto/UX

- "Nova ação" passa a abrir um menu com atalhos rápidos para as tarefas mais comuns do backoffice, em vez de um ecrã novo. Menu com teclado acessível e fecho por Esc.
- Atalhos propostos (todos com rota já existente):
  - Nova workspace → `/super-admin-v2/workspaces`
  - Novo utilizador → `/super-admin-v2/users`
  - Novo plano/preço → `/super-admin-v2/pricing`
  - Configurar menus da workspace → `/super-admin-v2/workspace-menus`
  - Registar incidente → `/super-admin-v2/incidents`
- Pesquisa do cabeçalho passa a funcionar: escrever + Enter (ou ⌘K) navega para `/super-admin-v2/workspaces?q=...`, filtrando pela pesquisa.
- Sino de notificações: reutilizar o componente existente `AdminNotificationsBell` em vez do botão decorativo, se compatível; caso contrário, ligar a `/super-admin-v2/alerts`.

## Estrutura técnica

- `BackofficeShellV2.tsx`:
  - envolver o botão num `DropdownMenu` (shadcn) com `DropdownMenuItem` por atalho, cada um a fazer `navigate(...)` via `useNavigate`.
  - `Input` de pesquisa controlado com `useState` + `onKeyDown` (Enter) e `aria-label`; ⌘K/Ctrl+K foca o input.
  - substituir o `<button>` do sino por `AdminNotificationsBell` (verificar props) ou dar-lhe `onClick` para `/super-admin-v2/alerts`.
- Sem alterações de base de dados nem de lógica de negócio; camada de navegação/apresentação apenas.

## Critérios de aceitação

- Clicar em "Nova ação" abre menu; cada item navega para a página correta.
- Enter na pesquisa navega para Workspaces com o termo aplicado; ⌘K foca a pesquisa.
- Sino deixa de ser inerte.
- Navegação por teclado e foco visível funcionam; consola limpa.

## Riscos

- A página de Workspaces tem de ler `?q=` para o filtro; se ainda não ler, acrescenta-se essa leitura no mesmo passo.
