

# Organizar Modulo Loja no Menu Lateral

O grupo "Vendas" tem atualmente 13 itens, incluindo 6 itens da loja misturados com pipeline, propostas e faturas. Vamos separar a loja num grupo proprio, mais limpo e profissional.

---

## Alteracao

Extrair os itens da loja do grupo "Vendas" para um novo grupo **"Loja Online"** com icone `Store`, posicionado logo abaixo do grupo "Vendas".

### Grupo "Vendas" (fica com 7 itens)
- Pipeline
- Propostas
- Faturas
- Agendamento
- Produtos
- Notas de Encomenda
- Clientes B2B
- Portal B2B

### Novo grupo "Loja Online" (6 itens)
- Loja Online (gerir produtos publicados)
- Categorias Loja
- Cupoes
- Encomendas Loja
- Analytics Loja
- Config. Loja

O novo grupo tera `highlight: true` e icone `Store` para destaque visual. Sera adicionado imediatamente apos o grupo "Vendas" no array `navigationGroups`.

---

## Detalhe Tecnico

Ficheiro a modificar: `src/components/layout/Sidebar.tsx`

Mover as 6 entradas da loja (linhas 196-201) do array de items do grupo "Vendas" para um novo objeto `NavGroup` inserido na posicao 5 do array `navigationGroups` (entre Vendas e Marketing).

