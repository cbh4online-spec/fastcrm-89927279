

# Adicionar partilha via link e redes sociais ao convite de membros do clube

## Problema

Atualmente, o dialog de convite para a comunidade (`InviteToCommunityDialog`) so permite convidar membros por email (selecionando contactos do CRM ou inserindo manualmente). Nao existe forma de partilhar o link publico do clube via WhatsApp, Facebook ou copiar o link diretamente.

## Solucao

Adicionar um terceiro separador "Link" ao dialog de convite que mostra o URL publico do clube e botoes de partilha rapida para WhatsApp, Facebook, e copiar link.

## Alteracoes

### 1. Editar `src/components/community/InviteToCommunityDialog.tsx`

Adicionar um terceiro tab ao dialog existente:

- **Novo tab "Link"** com icone `Share2`
- Mostrar o URL publico do clube (construido com `getPublicBaseUrl()` + `/club/${slug}`)
- Campo de texto com o link (readonly, selecao facil)
- Botoes de partilha:
  - **WhatsApp**: abre `wa.me` com texto pre-formatado e link
  - **Facebook**: abre sharer do Facebook com o link
  - **Copiar link**: copia para o clipboard com feedback visual
- Texto de contexto explicando que qualquer pessoa com o link pode pedir adesao

Imports adicionais necessarios:
- `getPublicBaseUrl` de `@/utils/getPublicDomain`
- `useCommunitySettings` de `@/hooks/useCommunitySettings`
- `useWorkspace` de `@/contexts/WorkspaceContext`
- Icones: `Share2`, `Copy`, `Check` do lucide-react

### 2. Logica do link publico

```text
slug = communitySettings.slug
baseUrl = getPublicBaseUrl()
publicUrl = baseUrl + "/club/" + slug
```

O texto de partilha para WhatsApp sera:
```
Junta-te a {communityName}! {publicUrl}
```

## Ficheiros

| Ficheiro | Acao |
|---|---|
| `src/components/community/InviteToCommunityDialog.tsx` | Editar (adicionar tab de partilha por link) |

Apenas 1 ficheiro editado. Reutiliza a logica de `getPublicBaseUrl()` ja existente e o hook `useCommunitySettings` ja disponivel no projeto.
