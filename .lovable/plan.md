
# Melhorias ao FastClub -- Funcionalidades em Falta

## Resumo

Comparando o estado atual do FastClub com as referencias do GoKollab, faltam 7 funcionalidades principais no dialog de definicoes e 1 funcionalidade de canais. O plano inclui tambem integracao com IA para sugestao automatica de categoria da comunidade.

## Funcionalidades a Implementar

### 1. Gestao de Canais (Adicionar Canal)
Dialog para criar/gerir canais (forum_categories) com:
- Nome (max 25 chars) e descricao (max 60 chars)
- Icone do canal (emoji picker ou texto)
- Toggle "Tornar canal privado"
- Toggle "Canal so de leitura" (apenas admins publicam)

### 2. Tab "Assinatura" nas Definicoes
Escolha entre acesso gratuito ou pago:
- Radio: Gratis / Preco (valor mensal editavel)
- Integracao com campos existentes em community_settings

### 3. Tab "Marca" Melhorada
Upload de favicon e imagem de capa:
- Upload de favicon (1:1) para logo_url
- Upload de imagem de capa (16:9) para banner_url
- Usa Lovable Cloud Storage para guardar ficheiros

### 4. Tab "Tema"
Selecao de tema visual da comunidade:
- Toggle claro/escuro
- Grid de temas pre-definidos (Predefinicao, Cinzento Citrico, Veludo Real, etc.)
- Tab "Tema Personalizado" com color picker
- Guarda em community_settings.primary_color

### 5. Tab "Mostrar/Ocultar Separadores"
Controlar quais tabs aparecem no hub:
- Discussao, Aprendizagem, Eventos, Tabela de Classificacao, Membros, Acerca de
- Cada um com icone, descricao e toggle on/off
- Guarda como JSON em community_settings (novo campo visible_tabs)

### 6. Tab "Duvidas sobre a Associacao" Melhorada
CRUD completo de perguntas de adesao:
- Toggle geral on/off (membership_questions_enabled)
- Lista de perguntas com tipo (Caixa de Texto / Selecao Unica)
- Botoes editar e eliminar em cada pergunta
- Botao "+ Adicionar Questao"
- Usa tabela community_membership_questions existente

### 7. Tab "Gamificacao e Recompensas"
Personalizar niveis de fidelidade:
- Lista dos niveis existentes (Bronze, Silver, Gold, Platinum) com % de membros
- Botao "Editar" para cada nivel (nome, pontos necessarios, recompensas)
- Possibilidade de adicionar niveis extra

### 8. Tab "Descobrir" com IA
Sugestao automatica de categoria:
- Toggle "Descoberta" (comunidade visivel publicamente)
- Slug/URL da comunidade
- Campo "Categoria" com sugestao automatica via IA baseada no nome e descricao
- Botao refresh para re-gerar sugestao
- Usa Lovable AI (gemini-2.5-flash) para gerar a categoria

## Detalhes Tecnicos

### Migracao SQL

Nova coluna em `community_settings`:
- `visible_tabs` (JSONB, default com todas ativas)
- `subscription_type` (TEXT, 'free' ou 'paid')
- `subscription_price` (NUMERIC, nullable)
- `theme_preset` (TEXT, nullable)
- `category` (TEXT, nullable -- sugerida por IA)
- `is_discoverable` (BOOLEAN, default false)

Novas colunas em `forum_categories`:
- `is_private` (BOOLEAN, default false)
- `is_read_only` (BOOLEAN, default false)

### Ficheiros a Modificar

| Ficheiro | Descricao |
|---|---|
| `src/components/community/CommunitySettingsDialog.tsx` | Adicionar 6 novas tabs (Assinatura, Tema, Mostrar/Ocultar, Duvidas, Gamificacao, Descobrir) |
| `src/components/community/AddChannelDialog.tsx` | **Novo** -- Dialog para criar canal com nome, descricao, icone, toggles privado/leitura |
| `src/hooks/useCommunitySettings.ts` | Actualizar interface com novos campos |
| `src/pages/community/FastClubPage.tsx` | Respeitar visible_tabs para mostrar/esconder separadores; adicionar botao "+ Adicionar Canal" na sidebar |
| `src/hooks/useForum.ts` | Adicionar mutacao para criar/editar forum_categories |

### Edge Function para IA (sugestao de categoria)

Reutilizar a infraestrutura existente de Lovable AI para chamar gemini-2.5-flash com prompt:
- Input: nome e descricao da comunidade
- Output: uma categoria (ex: "Productivity", "Marketing", "Education")
- Chamada direta no componente via edge function

### Storage

Criar bucket `community-assets` para uploads de favicon e banner com politicas de acesso publico para leitura.

### Fluxo de Dados

O `CommunitySettingsDialog` passa de 4 tabs para 10 tabs com scroll lateral no menu. Cada tab guarda independentemente via `useUpsertCommunitySettings`. O `FastClubPage` le `visible_tabs` do settings para filtrar quais TabsTrigger renderizar. O `AddChannelDialog` cria entradas em `forum_categories` com os novos campos.
