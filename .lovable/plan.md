

## Persistir Candidaturas FastClub e Acionar Workflow

**Problema identificado**: O formulario de candidatura na pagina `/fastclub` apenas mostra um toast e limpa o formulario. Os dados nao sao guardados na base de dados e nenhum workflow e acionado.

---

### O que sera feito

1. **Criar tabela `fastclub_applications`** na base de dados para armazenar as candidaturas com todos os campos do formulario (nome, empresa, cargo, setor, colaboradores, faturacao, website/linkedin, motivacao) e um campo `status` (pending/approved/rejected).

2. **Politica RLS**: Permitir inserts anonimos (formulario publico) e leitura apenas para utilizadores autenticados com papel de admin no workspace.

3. **Atualizar o formulario** (`FastClubLandingPage.tsx`):
   - Capturar todos os campos com `useState` ou `FormData`.
   - No `handleSubmit`, inserir os dados na tabela `fastclub_applications` via Supabase client.
   - Apos insercao com sucesso, acionar o workflow existente (`useWorkflowExecution`) com o codigo adequado para notificar os admins.
   - Manter o toast de confirmacao e o reset do formulario.

4. **Criar workflow template** para processamento da candidatura (notificacao ao admin, registo de atividade).

---

### Detalhes Tecnicos

**Migracao SQL**:
```text
CREATE TABLE public.fastclub_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  sector TEXT NOT NULL,
  employees TEXT,
  revenue TEXT,
  website_linkedin TEXT,
  motivation TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fastclub_applications ENABLE ROW LEVEL SECURITY;

-- Allow public inserts (form is public, no auth required)
CREATE POLICY "Allow public insert" ON public.fastclub_applications
  FOR INSERT TO anon WITH CHECK (true);

-- Allow authenticated users to read (admin review)
CREATE POLICY "Allow authenticated read" ON public.fastclub_applications
  FOR SELECT TO authenticated USING (true);
```

**Ficheiro**: `src/pages/fastclub/FastClubLandingPage.tsx`
- Adicionar `name` attributes a cada Input/Textarea do formulario.
- No `handleSubmit`, extrair dados via `FormData`, inserir na tabela `fastclub_applications` com o Supabase client, e apresentar feedback adequado (sucesso ou erro).

**Workflow** (opcional, segunda fase):
- Adicionar template `fastclub_application_review` ao `workflowTemplates.ts` para notificacao automatica aos admins quando uma nova candidatura e submetida.

