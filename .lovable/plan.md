

# Melhorar Dialog de Criacao de Canal -- Icones Configuraveis, Canal Pago e Atributos

## Visao Geral

Melhorar o dialog "Adicionar Canal" com 3 funcionalidades:
1. **Selector de icones visual** em vez de campo de texto livre
2. **Opcao de canal pago** com campo de preco
3. **Atributos adicionais** (cor do canal, limite de membros)

## Alteracoes na Base de Dados

Adicionar 3 novas colunas a tabela `forum_categories`:

| Coluna | Tipo | Default | Descricao |
|---|---|---|---|
| `is_paid` | boolean | false | Canal requer pagamento |
| `price` | numeric | null | Preco em EUR (ex: 9.99) |
| `color` | text | null | Cor do canal (hex, ex: #8B5CF6) |

## Alteracoes na UI

### 1. Selector de Icones Visual
Substituir o campo de texto do icone por uma grelha clicavel com emojis populares organizados por categoria:

- **Geral**: chatbalao, megafone, estrela, coracao, fogo, raio, foguetao, globo
- **Temas**: livro, paleta, camera, musica, codigo, grafico, trofeu, diamante
- **Social**: grupo, festa, cafe, pizza, gaming, fitness

Apresentar 18-24 emojis numa grelha 6x3/4 com selecao visual (borda activa). Manter opcao de escrever emoji customizado.

### 2. Opcao Canal Pago
Novo toggle "Canal Pago" com campo de preco que aparece condicionalmente:
- Toggle "Canal Pago -- Membros pagam para aceder"
- Quando activo, mostra campo de preco com prefixo EUR
- Validacao: preco minimo 0.50 EUR

### 3. Atributos Extra
- **Cor do canal**: selector de cores predefinidas (8 opcoes) para personalizar a badge do canal na listagem
- **Limite de membros**: campo numerico opcional para restringir o numero maximo de participantes

## Detalhes Tecnicos

### Ficheiros a Modificar/Criar

| Ficheiro | Descricao |
|---|---|
| `src/components/community/AddChannelDialog.tsx` | Redesign com grelha de icones, toggle pago com preco, selector de cor |
| `src/hooks/useForumMutations.ts` | Adicionar campos `is_paid`, `price`, `color` ao mutate |

### Migracao SQL

```sql
ALTER TABLE public.forum_categories
  ADD COLUMN IF NOT EXISTS is_paid boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS price numeric DEFAULT null,
  ADD COLUMN IF NOT EXISTS color text DEFAULT null;
```

### Emojis Predefinidos

```text
GERAL:    💬 📢 ⭐ ❤️ 🔥 ⚡ 🚀 🌍
TEMAS:    📚 🎨 📸 🎵 💻 📊 🏆 💎
SOCIAL:   👥 🎉 ☕ 🍕 🎮 💪 🧠 💡
```

### Cores Predefinidas

```text
#8B5CF6 (violeta), #3B82F6 (azul), #10B981 (verde), #F59E0B (amarelo),
#EF4444 (vermelho), #EC4899 (rosa), #6366F1 (indigo), #14B8A6 (teal)
```

### Fluxo do Dialog

```text
[Grelha de Icones] -> seleccionar emoji ou escrever custom
[Nome do Canal] -> max 25 chars
[Descricao] -> max 60 chars
[Cor do Canal] -> 8 circulos coloridos clicaveis
[Toggle Privado]
[Toggle So Leitura]
[Toggle Canal Pago] -> se activo, mostra campo Preco (EUR)
[Cancelar] [Criar Canal]
```

