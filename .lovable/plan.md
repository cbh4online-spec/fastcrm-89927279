

# Fase 4: FastMatch Hub Comunitario (6 Canais)

O FastMatch Hub e a rede privada de oportunidades entre membros verificados do FastClub. Funciona como um espaco premium com 6 canais tematicos onde membros podem publicar e interagir em topicos estrategicos de negocio.

---

## O que esta incluido

### 1. Pagina principal FastMatch Hub (`/dashboard/fastclub/fastmatch`)

Pagina dedicada com:
- Header executivo com descricao do conceito (matching estrategico, nao social)
- 6 canais tematicos apresentados como chips/tabs filtráveis (reutilizando o padrao visual do `DraggableChannelList`)
- Feed de topicos do forum filtrado pelo canal selecionado
- Formulario para criar novos topicos dentro de cada canal
- Toda a pagina envolvida em `PremiumGate`

### 2. Os 6 Canais do Hub

Criados como categorias do forum (`forum_categories`) com um campo identificador no metadata:

| Canal | Descricao |
|---|---|
| Oportunidades de Negocio | Partilha de leads, projetos e oportunidades comerciais |
| Parcerias Estrategicas | Propostas de colaboracao e joint ventures |
| Pedidos de Servico | Procura de servicos especificos entre membros |
| Casos de Estudo | Partilha de resultados e aprendizagens reais |
| Ferramentas e Recursos | Recomendacoes de ferramentas, templates e recursos |
| Networking Direto | Apresentacoes profissionais e pedidos de conexao |

### 3. Dados semente

- 6 categorias do forum com `metadata.hub = 'fastmatch'` para distinguir dos canais normais da comunidade
- 2 topicos exemplo por canal (12 topicos totais) para dar vida ao hub

### 4. Navegacao

- Novo item na sidebar (zona premium): "FastMatch Hub"
- Nova rota no App.tsx

---

## Ficheiros a criar

| Ficheiro | Descricao |
|---|---|
| `src/pages/fastclub/FastMatchPage.tsx` | Pagina principal do FastMatch Hub |

## Ficheiros a editar

| Ficheiro | Acao |
|---|---|
| `src/App.tsx` | Adicionar rota `/dashboard/fastclub/fastmatch` |
| `src/components/layout/Sidebar.tsx` | Adicionar item "FastMatch Hub" na zona premium |

---

## Detalhe tecnico

### Dados semente (insert via tool, sem migracao)

Inserir 6 categorias na tabela `forum_categories` existente com um campo de identificacao no nome/slug que permita filtra-las como canais do FastMatch Hub. Usar um prefixo `fastmatch-` no slug para distingui-las dos canais normais da comunidade.

```
Categorias (forum_categories):
- slug: fastmatch-oportunidades, icon: 💼, name: "Oportunidades de Negócio"
- slug: fastmatch-parcerias, icon: 🤝, name: "Parcerias Estratégicas"
- slug: fastmatch-servicos, icon: 🔧, name: "Pedidos de Serviço"
- slug: fastmatch-casos, icon: 📊, name: "Casos de Estudo"
- slug: fastmatch-ferramentas, icon: 🛠️, name: "Ferramentas e Recursos"
- slug: fastmatch-networking, icon: 🌐, name: "Networking Direto"
```

12 topicos exemplo (2 por canal) na tabela `forum_topics`.

### Pagina FastMatchPage

- Envolvida em `PremiumGate` com `featureLabel="FastMatch Hub"`
- Header com gradiente executivo, titulo "FastMatch Hub", subtitulo e badge "Premium"
- Botao "Voltar" no topo
- Lista de canais no topo como chips filtráveis (semelhante ao padrao das outras paginas)
- Ao selecionar canal, mostra topicos desse canal usando `useForumTopics` filtrado por `category_id`
- Botao "Novo Topico" que abre dialog para criar topico no canal selecionado
- Cada topico renderizado como card com titulo, preview do conteudo, autor e data
- Ao clicar num topico, navega para `/dashboard/fastclub/forum/:topicId` (rota ja existente)
- Animacoes framer-motion consistentes (fade + stagger)

### Filtragem dos canais FastMatch

Os canais FastMatch sao distinguidos dos canais normais da comunidade pelo prefixo `fastmatch-` no slug. A pagina carrega categorias com `useForumCategories` e filtra localmente aquelas cujo slug comeca com `fastmatch-`.

### Sidebar

Adicionar item na zona premium (apos "IA Avancada"):
```typescript
{ name: "FastMatch Hub", href: "/dashboard/fastclub/fastmatch", icon: Users, tooltip: "Rede privada de oportunidades" },
```

### Padrao visual

Segue o padrao executivo ja estabelecido:
- Botao "Voltar" com `ArrowLeft`
- Titulo e subtitulo com badges
- Cards com gradientes subtis e hover com elevacao
- Animacoes `motion.div` com stagger (delay 0.05-0.1s)
- CTAs para criar topicos com estilo corporativo
- Empty states motivacionais quando um canal nao tem topicos

