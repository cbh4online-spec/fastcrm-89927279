

# Gerador de Mensagem IA (Metodo AIDA) na Prospecao Profissional

## Resumo

Adicionar um botao "Gerar Mensagem" em cada perfil nos resultados de prospecao que usa IA para criar uma mensagem personalizada pronta a colar no Instagram DM, usando o metodo AIDA (Atencao, Interesse, Desejo, Acao) com base nos dados do perfil (profissao, especialidade, bio, localizacao, seguidores).

## Como Funciona para o Utilizador

1. Nos resultados de prospecao, ao lado de "Criar Lead" e "Rejeitar", aparece um botao "Gerar Mensagem"
2. Abre um dialog com a mensagem gerada pela IA, personalizada ao perfil
3. O utilizador pode editar a mensagem, regenerar com tom diferente (formal, casual, direto) e copiar com um clique
4. Cola diretamente no Instagram DM

## Seccao Tecnica

### Nova Edge Function: `supabase/functions/generate-prospecting-message/index.ts`

Chama o Lovable AI Gateway (google/gemini-3-flash-preview) com um prompt que:
- Recebe os dados do perfil (nome, profissao, especialidade, bio, localizacao, seguidores)
- Recebe o contexto do workspace (nome da empresa, o que vendem)
- Aplica o metodo AIDA para estruturar a mensagem
- Gera uma mensagem curta (max 300 caracteres ideal para Instagram DM)
- Suporta 3 tons: formal, casual, direto
- Retorna: mensagem formatada + versao sem emojis

### Novo Componente: `src/components/professional-prospecting/ProspectingMessageDialog.tsx`

Dialog com:
- Mensagem gerada em textarea editavel
- Seletor de tom (formal/casual/direto)
- Botao regenerar
- Botao copiar (com feedback visual)
- Contador de caracteres
- Preview do perfil alvo (nome, profissao, plataforma)

### Ficheiro Modificado: `src/components/professional-prospecting/ProspectingResults.tsx`

- Adicionar botao "Gerar Mensagem" (icone MessageSquare) na barra de acoes de cada perfil
- Estado para controlar o dialog e o perfil selecionado

### Ficheiro: `supabase/config.toml`

- Registar a nova edge function

| Ficheiro | Tipo | Descricao |
|---|---|---|
| `supabase/functions/generate-prospecting-message/index.ts` | Criar | Edge function com prompt AIDA + Lovable AI |
| `src/components/professional-prospecting/ProspectingMessageDialog.tsx` | Criar | Dialog de mensagem com edicao, tons e copiar |
| `src/components/professional-prospecting/ProspectingResults.tsx` | Modificar | Adicionar botao e estado para o dialog de mensagem |

