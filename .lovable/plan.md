
# Plano: Instalar Google Tag Manager em Todas as Páginas

## Objetivo
Instalar o código do Google Tag Manager (GTM-WLVH4TJJ) no `<head>` de todas as páginas da aplicação.

## Análise da Situação Atual

### ✅ O que já existe:
- Componente `GTMProvider` em `src/modules/growth-seo/components/tracking/GTMProvider.tsx`
- Este componente já está envolvendo toda a aplicação em `App.tsx` (linha 137)
- O componente suporta GDPR Consent Mode v2 (respeita consentimentos)

### ❌ O que falta:
- O `GTMProvider` está a ser usado SEM o `containerId` configurado
- Actualmente: `<GTMProvider>` (sem props)
- Necessário: `<GTMProvider containerId="GTM-WLVH4TJJ">`

## Alterações Necessárias

### Ficheiro: `src/App.tsx`
Alterar a linha 137 para passar o container ID:

```typescript
// De:
<GTMProvider>

// Para:
<GTMProvider containerId="GTM-WLVH4TJJ">
```

## Como Vai Funcionar

1. **Carregamento Automático**: O GTMProvider vai injectar o script do GTM no `<head>` assim que a aplicação carregar

2. **Consent Mode v2**: O script já está configurado para:
   - Iniciar com todos os consentimentos negados por defeito
   - Actualizar consentimentos quando o utilizador interage com o banner GDPR
   - Analytics e Marketing só ficam activos após consentimento explícito

3. **Noscript Fallback**: Também adiciona automaticamente o iframe `<noscript>` no início do `<body>` para browsers sem JavaScript

## Verificação Pós-Implementação

Após a alteração, podes verificar se o GTM está a funcionar:
1. Abrir as DevTools do browser (F12)
2. Ir ao separador "Network"
3. Filtrar por "gtm.js"
4. Deves ver um request para `https://www.googletagmanager.com/gtm.js?id=GTM-WLVH4TJJ`

---

**Resumo**: Apenas 1 alteração simples em `App.tsx` - adicionar `containerId="GTM-WLVH4TJJ"` ao GTMProvider existente.
