
# Plano: Instalar Meta Pixel em Todas as Paginas

## Objetivo
Adicionar o Meta Pixel Code (ID: `909068581793930`) que o utilizador forneceu a todas as paginas publicas do FastCRM.

---

## Situacao Atual

O projeto ja tem infraestrutura de tracking:
- Funcao `initializeMetaPixel()` definida em `GTMProvider.tsx`
- Campo `metaPixelId` nas configuracoes SEO
- Sistema de consentimento GDPR

**Problema identificado**: A funcao `initializeMetaPixel` nunca e chamada!

---

## Estrategia de Implementacao

Existem duas opcoes:

### Opcao A: Configuravel via Settings (Recomendado)
- Utiliza o ID configurado nas SEO Settings
- Respeita o consentimento GDPR
- Mais flexivel para mudar o ID no futuro

### Opcao B: Hardcoded Global
- Adiciona o pixel fixo em `index.html`
- Nao respeita GDPR
- Mais simples mas menos flexivel

**Recomendacao**: Opcao A (configuravel + GDPR compliant)

---

## Implementacao Tecnica

### Passo 1: Criar componente MetaPixelLoader

Novo componente que:
1. Le o Pixel ID das settings (growth_settings)
2. Verifica consentimento de marketing
3. Carrega o script do Meta Pixel

```typescript
// src/modules/growth-seo/components/tracking/MetaPixelLoader.tsx
export function MetaPixelLoader() {
  const { consent } = useConsent();
  const { currentWorkspace } = useWorkspace();
  const [pixelId, setPixelId] = useState<string | null>(null);

  // Load pixel ID from settings
  useEffect(() => {
    // Fetch from growth_settings table
  }, [currentWorkspace?.id]);

  // Initialize pixel when consent + ID available
  useEffect(() => {
    if (pixelId && consent.marketing) {
      initializeMetaPixel(pixelId, true);
    }
  }, [pixelId, consent.marketing]);

  return null;
}
```

### Passo 2: Corrigir funcao initializeMetaPixel

A funcao atual tem um problema - nao inicializa `fbq` antes do script carregar:

```typescript
export function initializeMetaPixel(pixelId: string, hasConsent: boolean) {
  if (!pixelId || !hasConsent) return;
  
  // Inicializar fbq ANTES do script carregar (como no codigo original)
  (function(f: Window, b, e, v, n?: any, t?: any, s?: any) {
    if (f.fbq) return;
    n = f.fbq = function() {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = '2.0';
    n.queue = [];
    t = b.createElement(e);
    t.async = true;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode?.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  
  window.fbq?.('init', pixelId);
  window.fbq?.('track', 'PageView');
}
```

### Passo 3: Integrar no App.tsx

Adicionar o loader dentro do GTMProvider:

```tsx
<GTMProvider>
  <MetaPixelLoader />  {/* NOVO */}
  <AuthProvider>
    ...
  </AuthProvider>
</GTMProvider>
```

### Passo 4: Adicionar fallback noscript

Adicionar a imagem 1x1 de fallback para browsers sem JavaScript.

---

## Ficheiros a Modificar

| Ficheiro | Alteracao |
|----------|-----------|
| `src/modules/growth-seo/components/tracking/GTMProvider.tsx` | Corrigir `initializeMetaPixel` com o codigo original do Meta |
| `src/modules/growth-seo/components/tracking/MetaPixelLoader.tsx` | **NOVO** - Componente que carrega o pixel |
| `src/modules/growth-seo/index.ts` | Exportar `MetaPixelLoader` |
| `src/App.tsx` | Adicionar `MetaPixelLoader` |

---

## Configuracao Imediata

Apos implementacao, vai ao **Dashboard SEO > Settings** e insere o Pixel ID:
- **Meta Pixel ID**: `909068581793930`

---

## Beneficios

1. **GDPR Compliant** - So carrega apos consentimento de marketing
2. **Configuravel** - Pode mudar o ID sem editar codigo
3. **Trackea PageViews** - Automaticamente em todas as navegacoes
4. **Eventos customizados** - Ja integrado com `useTracking` hook
