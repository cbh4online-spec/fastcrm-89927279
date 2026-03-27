

# Marcar páginas não implementadas como hidden/missing no Route Manifest

## Problemas encontrados

Após auditar o manifest (`routeManifest.ts`) contra os ficheiros de rotas reais (`src/routes/**/*.tsx`), identifiquei:

| Entry no Manifest | href no Manifest | Rota Real | Problema |
|---|---|---|---|
| `diagnostics` | `/dashboard/diagnostics` | **Não existe** | Nenhum ficheiro `DiagnosticsPage.tsx` nem rota registada |
| `system-health` | `/dashboard/system-health` | `/dashboard/system/health` | **href errado** — a rota real tem `/system/health` |

Todas as outras entradas foram verificadas e têm rotas reais correspondentes nos ficheiros de routes.

---

## Alterações a fazer

### 1. `src/config/routeManifest.ts`

**Corrigir** `system-health`:
```typescript
// ANTES
e("system-health", "System Health", "/dashboard/system-health", HeartPulse, "administracao")
// DEPOIS  
e("system-health", "System Health", "/dashboard/system/health", HeartPulse, "administracao")
```

**Marcar** `diagnostics` como hidden (página não implementada):
```typescript
// ANTES
e("diagnostics", "Diagnósticos", "/dashboard/diagnostics", Stethoscope, "administracao")
// DEPOIS
e("diagnostics", "Diagnósticos", "/dashboard/diagnostics", Stethoscope, "administracao", { 
  status: "hidden", 
  visibleInSidebar: false, 
  visibleInSearch: false 
})
```

### 2. `src/test/navigation.test.ts`

Adicionar um teste que valide que entradas com `status: "hidden"` não aparecem na sidebar nem na pesquisa, e incluir um bloco de documentação/relatório com a lista de rotas marcadas como missing.

### 3. Relatório final (como comentário no manifest)

Adicionar um bloco de comentário no `routeManifest.ts` com o relatório de auditoria:
```typescript
/**
 * AUDIT REPORT — Unimplemented/Missing Pages
 * 
 * - diagnostics (/dashboard/diagnostics) — No page file exists. Hidden from sidebar and search.
 * 
 * FIXED HREFS:
 * - system-health: /dashboard/system-health → /dashboard/system/health
 */
```

---

## Ficheiros a alterar

| Ficheiro | Ação |
|---|---|
| `src/config/routeManifest.ts` | Corrigir href de system-health, marcar diagnostics como hidden, adicionar audit comment |
| `src/test/navigation.test.ts` | Adicionar teste para entradas hidden não aparecerem em sidebar/search |

