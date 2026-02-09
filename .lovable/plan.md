
# Organizar Modulo Portal B2B no Menu Lateral

Atualmente, os itens "Clientes B2B" e "Portal B2B" estao misturados no grupo "Vendas" junto com Pipeline, Propostas e Faturas. Tal como fizemos com a Loja Online, vamos extrair o Portal B2B para o seu proprio grupo.

---

## Alteracao

Extrair "Clientes B2B" e "Portal B2B" do grupo "Vendas" para um novo grupo **"Portal B2B"** com icone `Landmark`, posicionado entre "Vendas" e "Loja Online". Tambem mover "Notas de Encomenda" para este grupo, ja que as encomendas B2B pertencem ao contexto do portal.

### Grupo "Vendas" (fica com 5 itens)
- Pipeline
- Propostas
- Faturas
- Agendamento
- Produtos

### Novo grupo "Portal B2B" (3 itens)
- Clientes B2B
- Notas de Encomenda
- Portal B2B (configuracao)

O novo grupo tera `highlight: true` e icone `Landmark`, inserido entre "Vendas" e "Loja Online".

---

## Detalhe Tecnico

Ficheiro a modificar: `src/components/layout/Sidebar.tsx`

Remover as 3 entradas (Notas de Encomenda, Clientes B2B, Portal B2B) do grupo "Vendas" (linhas 193-195) e criar um novo `NavGroup` com essas entradas, posicionado na posicao 5 do array (entre Vendas e Loja Online).
