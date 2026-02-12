

# Enriquecer ícones e adicionar IA para descrição de canais

## O que muda

### 1. Expandir a grelha de emojis/ícones

A grelha atual tem apenas 24 emojis em 3 grupos. Vamos expandir para ~72 emojis organizados em 8 categorias tematicas:

| Categoria | Exemplos |
|---|---|
| Geral | 💬 📢 ⭐ ❤️ 🔥 ⚡ 🚀 🌍 ✅ 📌 |
| Educacao | 📚 🎓 📝 ✏️ 🧪 🔬 📖 🏫 📐 🗂️ |
| Negocios | 💼 📊 💰 🏦 📈 🤝 🏢 💳 🧾 📋 |
| Criatividade | 🎨 📸 🎵 🎬 🖌️ 🎭 ✨ 🪄 🎤 🎹 |
| Tecnologia | 💻 🖥️ 📱 ⚙️ 🔧 🤖 🌐 🔒 🛠️ 📡 |
| Social | 👥 🎉 ☕ 🍕 🎮 💪 🧠 💡 🫂 🗣️ |
| Lifestyle | 🏋️ 🧘 🍽️ ✈️ 🏠 🌱 🎯 🏆 💎 🧳 |
| Emocoes | ❤️‍🔥 💯 👏 🙌 🔑 🌟 ⭕ 🎁 🪩 💫 |

A grelha sera scrollable com `ScrollArea` para nao ocupar demasiado espaco vertical.

### 2. Botao IA para gerar descricao do canal

Ao lado do campo "Descricao", adicionar um botao com icone `Sparkles` que:
- Usa o nome do canal como input
- Chama uma nova funcao no edge function `community-ai-category` (novo modo `suggest-channel-description`)
- Retorna uma descricao curta (max 60 chars) em portugues
- Preenche automaticamente o campo de descricao

### 3. Atualizar edge function `community-ai-category`

Adicionar suporte para um campo `mode`:
- `mode: "category"` (default, comportamento atual)
- `mode: "suggest-channel-description"` -- recebe `channelName` e devolve uma descricao curta e apelativa

### 4. Hook `useCommunityAI.ts`

Adicionar nova mutation `useSuggestChannelDescription` que invoca o edge function com o novo modo.

## Ficheiros

| Ficheiro | Acao |
|---|---|
| `src/components/community/AddChannelDialog.tsx` | Expandir emojis, adicionar botao IA para descricao |
| `src/hooks/useCommunityAI.ts` | Adicionar `useSuggestChannelDescription` |
| `supabase/functions/community-ai-category/index.ts` | Adicionar modo `suggest-channel-description` |

Total: 3 ficheiros editados, 0 criados.

