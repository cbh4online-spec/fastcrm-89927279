

## Correção dos Links do Marketplace C2C

### Problemas identificados

1. **Botão "Vender" na página pública** — navega para `/marketplace/:slug/sell` mas essa rota **não existe**. Só existe `/c2c/:slug/sell`.

2. **Rotas `/marketplace/` incompletas** — faltam equivalentes `/marketplace/` para: `sell`, `sponsor`, `invite/:token`, `seller/:sellerId`.

3. **Links de partilha (WhatsApp/Facebook)** — `C2CPublicListingDetail` usa `window.location.href` em vez do `getShareUrl()` que passa pelo `og-proxy` para gerar previews com metadados OG corretos.

4. **`C2CSellerInviteActivation`** — após activação, navega para `/c2c/${slug}` em vez de `/marketplace/${slug}`.

5. **`getShareUrl` usa project ID antigo** — o fallback hardcoded é `eumnfkccyvlyoyjchiwe` mas o projecto actual é `xqepxufdrsuxlnubuatz`.

---

### Plano de alterações

#### 1. `src/App.tsx` — Adicionar rotas `/marketplace/` em falta
Duplicar as rotas `/c2c/` existentes com o prefixo `/marketplace/`:
```tsx
<Route path="/marketplace/:workspaceSlug/sell" element={<AuthProvider><C2CSellerRegistration /></AuthProvider>} />
<Route path="/marketplace/:workspaceSlug/sponsor" element={<AuthProvider><C2CSponsorPortal /></AuthProvider>} />
<Route path="/marketplace/:workspaceSlug/invite/:token" element={<C2CSellerInviteActivation />} />
<Route path="/marketplace/:workspaceSlug/seller/:sellerId" element={<C2CPublicSellerProfile />} />
```

#### 2. `src/utils/getShareUrl.ts` — Corrigir project ID fallback
Alterar `eumnfkccyvlyoyjchiwe` → `xqepxufdrsuxlnubuatz` (ou melhor, usar `import.meta.env.VITE_SUPABASE_PROJECT_ID` sem fallback errado).

#### 3. `src/pages/c2c/C2CPublicListingDetail.tsx` — Usar `getShareUrl` nos ShareButtons
Substituir `window.location.href` por `getShareUrl("c2c-listing", workspaceSlug + "/" + id)` para que previews sociais funcionem.

#### 4. `src/pages/c2c/C2CSellerInviteActivation.tsx` — Corrigir redirect pós-activação
Alterar `navigate(/c2c/${slug})` → `navigate(/marketplace/${slug})`.

#### 5. `src/pages/c2c/C2CPublicMarketplace.tsx` — Usar `getShareUrl` no shareUrl
Substituir `getPublicBaseUrl()/marketplace/${slug}` por `getShareUrl("store", workspaceSlug)` para que os botões de partilha gerem links com OG proxy.

---

### Ficheiros a editar (5)
| Ficheiro | Alteração |
|---|---|
| `src/App.tsx` | +4 rotas `/marketplace/` |
| `src/utils/getShareUrl.ts` | Corrigir project ID |
| `src/pages/c2c/C2CPublicListingDetail.tsx` | ShareButtons com `getShareUrl` |
| `src/pages/c2c/C2CPublicMarketplace.tsx` | shareUrl com `getShareUrl` |
| `src/pages/c2c/C2CSellerInviteActivation.tsx` | Redirect `/marketplace/` |

