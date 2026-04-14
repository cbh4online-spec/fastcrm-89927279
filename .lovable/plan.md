

## Diagnóstico

O link partilhado é `/dashboard/marketplace/lives/90146ef5-...` — este é o URL do **dashboard**, que requer autenticação. Quando alguém sem sessão abre este link (ex: no telemóvel), recebe 404 porque o router não encontra a rota sem o wrapper de autenticação.

O botão "Partilhar" no viewer **deveria** gerar o URL público `/marketplace/:workspaceSlug/live/:id`, mas há duas falhas:

1. **Fallback perigoso**: Se a query do `workspaceSlug` falhar ou ainda não tiver carregado, o código cai no fallback que gera o URL do dashboard (linha 89 do `C2CLivestreamViewer.tsx`)
2. **RLS na tabela `workspaces`**: A query usa `supabase.from("workspaces").select("slug")` com o tipo `any`, e a tabela `workspaces` tem RLS restrito a membros autenticados — pode falhar silenciosamente
3. **URL da barra do browser**: O utilizador pode estar a copiar o URL do browser (`/dashboard/...`) em vez de usar o botão Partilhar

## Plano de correção

### 1. Eliminar o fallback para URL do dashboard
Em `C2CLivestreamViewer.tsx`, quando `workspaceSlug` não está disponível, o `liveUrl` deve ficar vazio e o botão Partilhar deve ficar desativado — nunca partilhar o URL do dashboard.

### 2. Obter o slug de forma fiável
Usar a tabela `c2c_livestreams` que já tem `workspace_id`, e juntar com `store_settings.store_slug` ou `workspaces.slug` via uma query server-side (edge function) ou via uma coluna desnormalizada. Alternativa mais simples: guardar o `workspace_slug` diretamente na tabela `c2c_livestreams` (migration).

### 3. Adicionar redirect do dashboard para o público
Criar um redirect automático: quando um utilizador **não autenticado** acede a `/dashboard/marketplace/lives/:id`, redirecionar para `/marketplace/:workspaceSlug/live/:id`. Isto cobre links antigos já partilhados.

### 4. Mostrar aviso visual ao owner
No viewer do dashboard, mostrar o URL público real que está a ser partilhado, para que o owner saiba que é diferente do URL na barra do browser.

## Implementação

### Ficheiro 1 — Migration: adicionar `workspace_slug` à tabela `c2c_livestreams`
```sql
ALTER TABLE public.c2c_livestreams 
ADD COLUMN IF NOT EXISTS workspace_slug text;

-- Preencher retroactivamente
UPDATE public.c2c_livestreams l
SET workspace_slug = w.slug
FROM public.workspaces w
WHERE l.workspace_id = w.id AND l.workspace_slug IS NULL;

-- Trigger para manter sincronizado em novos inserts
CREATE OR REPLACE FUNCTION public.set_livestream_workspace_slug()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  SELECT slug INTO NEW.workspace_slug FROM public.workspaces WHERE id = NEW.workspace_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_livestream_workspace_slug
BEFORE INSERT ON public.c2c_livestreams
FOR EACH ROW EXECUTE FUNCTION public.set_livestream_workspace_slug();
```

### Ficheiro 2 — `C2CLivestreamViewer.tsx`
- Remover a query separada de `workspaceSlug` e usar `live?.workspace_slug` directamente
- Remover o fallback para URL do dashboard — se slug não existir, desabilitar partilha
- Adicionar tooltip no botão Partilhar com o URL público real

### Ficheiro 3 — `C2CPublicLivestreamViewer.tsx`
- Sem alterações necessárias (já funciona com `workspaceSlug` do URL)

### Ficheiro 4 — Redirect para links antigos
Em `App.tsx` ou num componente wrapper, adicionar:
- Rota `/dashboard/marketplace/lives/:id` acessível sem auth que faz redirect para a versão pública
- OU componente no `C2CLivestreamViewer.tsx` que, se o user não está autenticado, redireciona para `/marketplace/:slug/live/:id`

## Critérios de aceitação
- Botão Partilhar gera sempre URL público (`/marketplace/.../live/...`)
- Nunca é partilhado o URL do dashboard
- Links antigos do dashboard fazem redirect para o URL público
- Espectadores sem auth veem a live sem erro 404
- Owner vê indicação do URL público que está a ser partilhado

## Riscos
- Lives existentes sem `workspace_slug` preenchido — mitigado pelo UPDATE retroactivo na migration
- Cache de types do Supabase precisa regenerar para incluir o novo campo

