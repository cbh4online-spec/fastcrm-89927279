
# Criar Area do Vendedor dedicada

## Contexto

Atualmente, as funcionalidades de vendedor estao dispersas por varias paginas no sidebar (Meus Anuncios, Analytics, Impulsionar) sem uma pagina central unificada. O vendedor nao tem um hub proprio com acesso rapido a todas as suas ferramentas e link para o seu perfil publico.

## O que sera criado

Uma nova pagina **"Area do Vendedor"** (`/dashboard/c2c/seller-area`) que serve como hub central para vendedores, com:

1. **Cabecalho do perfil** -- Nome, status de verificacao, rating, e link direto para o perfil publico
2. **KPIs resumidos** -- Anuncios ativos, vendas, receita, avaliacao media
3. **Acoes rapidas** -- Botoes para criar anuncio, ver anuncios, mensagens, impulsionar, editar perfil
4. **Link para perfil publico** -- Botao visivel com URL copiavel para o vendedor partilhar
5. **Resumo de atividade recente** -- Ultimas vendas e avaliacoes

## Alteracoes tecnicas

### 1. Nova pagina: `src/pages/c2c/C2CSellerArea.tsx`

Pagina hub que:
- Usa `useMySellerProfile` para obter dados do vendedor autenticado
- Usa `useSellerAnalytics` para KPIs
- Usa `useWorkspace` para obter o slug do workspace e construir o link publico (`/c2c/{slug}/seller/{userId}`)
- Mostra estado da conta (aprovado, pendente, suspenso)
- Se o utilizador nao for vendedor, mostra CTA para se registar

### 2. Atualizar rotas em `src/App.tsx`

Adicionar rota:
```
/dashboard/c2c/seller-area -> C2CSellerArea
```

### 3. Atualizar sidebar em `src/components/layout/Sidebar.tsx`

Adicionar item "Area do Vendedor" ao grupo Marketplace C2C:
```
{ name: "Area do Vendedor", href: "/dashboard/c2c/seller-area", icon: UserCircle, tooltip: "Gerir a tua conta de vendedor" }
```

### 4. Estrutura da pagina

A pagina tera estas secoes:

- **Header**: Avatar, nome, badges (verificado, status), botao "Ver Perfil Publico" com link externo
- **Grid de KPIs**: 4 cards (Anuncios Ativos, Total Vendas, Receita Liquida, Rating)
- **Acoes Rapidas**: Grid de botoes (Novo Anuncio, Meus Anuncios, Mensagens, Analytics, Impulsionar)
- **Link Publico**: Card com URL copiavel do perfil publico para o vendedor partilhar nas redes sociais
- **Estado nao-vendedor**: Se o utilizador nao tiver perfil de vendedor, mostra card com CTA para se registar
