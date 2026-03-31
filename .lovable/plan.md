

## Foto de Perfil para Funcionários — Plano

### Diagnóstico

A tabela `hr_employees` já tem o campo `avatar_url` e é mostrado em toda a UI (lista, detalhe, dashboard, check-ins, feedback). Porém, **não existe nenhum mecanismo de upload** — o campo depende da sincronização inicial com `profiles` e nunca pode ser alterado manualmente.

O projecto já tem:
- `ImageUpload` (de `FileUpload.tsx`) com drag-and-drop, compressão e preview
- Padrão de upload para storage em `bio-assets`, `ebook-assets`, `c2c-photos`, etc.
- `useUpdateHREmployee` já aceita qualquer campo do `hr_employees` incluindo `avatar_url`

### Plano

**1. Criar bucket de storage `hr-avatars`** (migração SQL)
- Política pública de leitura (para avatars serem visíveis)
- Política de escrita autenticada

**2. Criar componente `HREmployeeAvatarUpload.tsx`**
- Avatar circular com overlay de câmara/upload ao hover
- Click abre file picker (aceita jpeg, png, webp, max 5MB)
- Compressão automática via `imageCompression` (já instalado)
- Upload para `hr-avatars/{workspace_id}/{employee_id}.{ext}`
- Actualiza `hr_employees.avatar_url` via `useUpdateHREmployee`
- Preview imediato, loading state, erro

**3. Integrar nos 2 locais relevantes:**
- `HREmployeeDetailPage.tsx` — substituir o Avatar estático (h-16 w-16) pelo componente com upload
- `HREmployeesPage.tsx` — no dialog de edição, adicionar o avatar upload no topo

### Ficheiros a criar
| Ficheiro | Descrição |
|----------|-----------|
| `src/components/hr/HREmployeeAvatarUpload.tsx` | Componente avatar com upload |

### Ficheiros a alterar
| Ficheiro | Alteração |
|----------|-----------|
| `src/pages/dashboard/hr/HREmployeeDetailPage.tsx` | Substituir Avatar por `HREmployeeAvatarUpload` |
| `src/pages/dashboard/hr/HREmployeesPage.tsx` | Adicionar avatar upload no topo do dialog de edição |
| `src/hooks/hr/useHREmployees.ts` | Adicionar `avatar_url` ao tipo do `useUpdateHREmployee` (já aceita, confirmar) |

### Migração SQL
```sql
INSERT INTO storage.buckets (id, name, public) 
VALUES ('hr-avatars', 'hr-avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view hr avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'hr-avatars');

CREATE POLICY "Authenticated users can upload hr avatars" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'hr-avatars');

CREATE POLICY "Authenticated users can update hr avatars" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'hr-avatars');
```

### UX
- Avatar mostra ícone de câmara ao hover
- Click abre selector de ficheiro
- Imagem comprimida automaticamente
- Feedback visual: loading spinner durante upload, toast de sucesso/erro
- Funciona tanto na página de detalhe como no dialog de edição

