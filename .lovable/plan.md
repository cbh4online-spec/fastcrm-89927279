
# Unificar Funis e Landing Pages num unico modulo

## Contexto

O utilizador confirmou que funis e landing pages sao a mesma coisa no contexto desta aplicacao. Nao faz sentido ter dois itens separados no menu.

## Alteracoes

### 1. Remover "Landing Pages" do menu lateral

**Ficheiro:** `src/components/layout/Sidebar.tsx`

Remover a linha:
```
{ name: "Landing Pages", href: "/dashboard/landing-pages", icon: FileEdit, tooltip: "Paginas de captura" },
```

Manter apenas:
```
{ name: "Funis", href: "/dashboard/funnels", icon: Globe, tooltip: "Funis de conversao" },
```

### 2. Redirecionar a rota antiga

**Ficheiro:** `src/App.tsx`

Alterar a rota `/dashboard/landing-pages` para redirecionar para `/dashboard/funnels`:

```
Antes:  <Route path="/dashboard/landing-pages" element={<LandingPages />} />
Depois: <Route path="/dashboard/landing-pages" element={<Navigate to="/dashboard/funnels" replace />} />
```

Remover o import de `LandingPages` se deixar de ser usado.

## Resultado

- Um unico item "Funis" no menu lateral
- Qualquer link antigo para `/dashboard/landing-pages` redireciona automaticamente para `/dashboard/funnels`
- O modulo de Funis passa a ser o ponto central para criar paginas e funis de conversao
