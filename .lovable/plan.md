

# Perguntas de Adesao -- CRUD Completo e Respostas Visiveis para Admin

## Objectivo

Implementar o sistema completo de perguntas de adesao: admins criam/editam perguntas, novos membros respondem ao registar-se, e admins podem ver as respostas de cada membro.

## O Que Vai Ser Feito

### 1. Nova Tabela `community_membership_answers`
Guardar as respostas dos membros as perguntas de adesao.

| Coluna | Tipo | Descricao |
|---|---|---|
| id | uuid PK | Identificador |
| workspace_id | uuid FK | Workspace |
| question_id | uuid FK | Referencia a pergunta |
| member_id | uuid FK | Referencia ao community_member |
| user_id | uuid | Auth user (quem respondeu) |
| answer_text | text | Resposta livre ou valor seleccionado |
| created_at | timestamptz | Data |

### 2. CRUD de Perguntas no Tab "Adesao"
Substituir o placeholder actual no `CommunitySettingsDialog.tsx` (tab "questions") por um CRUD completo:
- **Lista** de perguntas existentes com drag-to-reorder (sort_order)
- **Adicionar pergunta**: campo de texto + tipo (text, textarea, select) + opcoes (se select)
- **Editar**: inline editing do texto e tipo
- **Remover**: botao de eliminar com confirmacao
- **Activar/Desactivar**: toggle por pergunta (is_active)
- Toggle global "Perguntas de Adesao" ja existente mantido

### 3. Perguntas no Fluxo de Registo
Actualizar `CommunityAuthPage.tsx`:
- Apos preencher nome/email/password, se `membership_questions_enabled` estiver activo, mostrar um passo adicional com as perguntas activas
- Campos dinamicos baseados no `question_type`: text input, textarea, ou select
- Respostas guardadas em `community_membership_answers` apos registo

### 4. Respostas Visiveis para Admin
Novo componente `MemberAnswersDialog.tsx`:
- Acessivel na lista de membros (botao "Ver respostas" em cada membro)
- Mostra todas as perguntas e respectivas respostas do membro
- Formato simples: pergunta em bold, resposta abaixo

## Detalhes Tecnicos

### Migracao SQL

```sql
CREATE TABLE public.community_membership_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.community_membership_questions(id) ON DELETE CASCADE,
  member_id uuid REFERENCES public.community_members(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  answer_text text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.community_membership_answers ENABLE ROW LEVEL SECURITY;

-- Admins podem ler/gerir respostas
CREATE POLICY "Workspace admins can manage answers"
  ON public.community_membership_answers FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Utilizador pode inserir as suas proprias respostas
CREATE POLICY "Users can insert own answers"
  ON public.community_membership_answers FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Anon pode inserir (para registo via invite)
CREATE POLICY "Anon can insert answers"
  ON public.community_membership_answers FOR INSERT
  TO anon
  WITH CHECK (true);
```

### Ficheiros a Criar

| Ficheiro | Descricao |
|---|---|
| `src/hooks/useMembershipQuestions.ts` | Hook CRUD: listar, adicionar, editar, remover, reordenar perguntas + listar respostas |
| `src/components/community/MemberAnswersDialog.tsx` | Dialog para admin ver respostas de um membro |

### Ficheiros a Modificar

| Ficheiro | Descricao |
|---|---|
| `src/components/community/CommunitySettingsDialog.tsx` | Tab "Adesao" com CRUD completo de perguntas |
| `src/pages/community/CommunityAuthPage.tsx` | Passo adicional com perguntas apos signup |
| `src/components/community/CommunityMembersList.tsx` | Botao "Ver respostas" por membro |

### Tipos de Pergunta Suportados

| Tipo | UI | Dados em `options` |
|---|---|---|
| text | Input simples | null |
| textarea | Textarea | null |
| select | Select dropdown | `["Opcao 1", "Opcao 2", ...]` |

### Fluxo de Registo com Perguntas

```text
1. Visitante acede /community/:slug/auth
2. Preenche nome, email, password
3. Se membership_questions_enabled:
   - Formulario mostra as perguntas activas (ordenadas por sort_order)
   - Campos obrigatorios para avançar
4. Ao submeter:
   - Cria conta (auth.signUp)
   - Guarda respostas em community_membership_answers
   - Activa membro se invite token presente
5. Admin ve respostas no painel de membros
```

### Fluxo Admin -- Gerir Perguntas

```text
1. Definicoes da Comunidade > Adesao
2. Toggle "Perguntas de Adesao" (activa/desactiva globalmente)
3. Lista de perguntas com:
   - Texto da pergunta (editavel inline)
   - Tipo (text/textarea/select)
   - Opcoes (se select, lista editavel)
   - Toggle activo/inactivo
   - Botao eliminar
4. Botao "+ Adicionar pergunta" no fundo
5. Guardar automatico por accao
```
