

## Diagnóstico

O módulo Helpdesk tem `moduleSlug: "helpdesk"` no `routeManifest.ts`, mas **não existe nenhum registo** na tabela `marketplace_modules` com `slug = 'helpdesk'`. A sidebar filtra items cujo `moduleSlug` não esteja instalado, tornando o Helpdesk invisível na navegação.

## Plano

### 1. Criar o módulo "Helpdesk" no marketplace
Inserir um registo na tabela `marketplace_modules` com `slug: 'helpdesk'`, nome, descrição, ícone e categoria adequados — seguindo o padrão dos módulos existentes.

### 2. Auto-instalar o módulo no workspace atual
Inserir um registo em `workspace_modules` para o workspace ativo, com `status: 'active'`, para que o módulo fique imediatamente visível sem necessidade de ir ao Marketplace manualmente.

### Resultado esperado
- O grupo "Suporte" aparece na sidebar com as 3 rotas: Dashboard Suporte, Tickets, Respostas Rápidas
- As páginas `/dashboard/helpdesk/*` ficam acessíveis

### Ficheiros alterados
Nenhum ficheiro de código precisa de ser alterado — apenas inserções na base de dados via migration.

