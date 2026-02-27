

# Diagnosticar e Corrigir Notas de Encomenda

## Problema Identificado

Ao navegar para `/dashboard/order-notes`, a pagina redireciona para `/dashboard` (Dashboard principal) em vez de mostrar a pagina de Notas de Encomenda. Isto significa que o componente `OrderNotesPage` nunca chega a renderizar.

## Causa Provavel

O link na sidebar so aparece se o modulo `b2b-portal` estiver instalado no workspace (e registado como extensao). Se o modulo nao estiver activo, o link desaparece da navegacao. Contudo, a rota existe em `App.tsx` e deveria funcionar por acesso directo via URL.

A questao do redirect para `/dashboard` pode estar relacionada com a ordem das rotas ou com um guard de autenticacao que falha silenciosamente.

## Solucao Proposta

### 1. Adicionar link directo "Notas de Encomenda" na sidebar

Actualmente, "Notas Encomenda" so aparece se o modulo `b2b-portal` estiver instalado via extensoes. Para garantir que a funcionalidade esta sempre acessivel, adicionar um link fixo na navegacao principal da sidebar (tanto `Sidebar.tsx` como `SidebarV1.tsx`), semelhante a "Leads", "Contactos", etc.

Ficheiros a alterar:
- `src/components/layout/Sidebar.tsx` — adicionar item de navegacao "Notas Encomenda" com icone `FileText` e rota `/dashboard/order-notes`
- `src/components/layout/SidebarV1.tsx` — adicionar o mesmo item de navegacao

### 2. Verificar e corrigir a navegacao no SidebarV1

Verificar onde os `navItems` sao definidos e adicionar o item "Notas Encomenda" na seccao de Vendas, garantindo que aparece independentemente de extensoes.

### 3. Manter rota no extensionRegistry como complemento

O registo no `extensionRegistry.ts` mantem-se para quem usa o Marketplace, mas a navegacao principal passa a ter o link sempre visivel.

## Ficheiros a Alterar

| Ficheiro | Accao |
|---|---|
| `src/components/layout/Sidebar.tsx` | Adicionar "Notas Encomenda" nos itens de navegacao fixos |
| `src/components/layout/SidebarV1.tsx` | Adicionar "Notas Encomenda" nos itens de navegacao fixos |

