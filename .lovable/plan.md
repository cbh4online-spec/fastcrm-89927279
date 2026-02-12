

# Fase 5: Landing Publica FastClub + Integracao Deep-Link SSO com FastCRM

Esta fase cria a pagina de marketing publica do FastClub (acessivel sem autenticacao) e integra deep-links SSO que permitem aos CTAs da landing iniciar sessao automatica no FastCRM.

---

## O que esta incluido

### 1. Landing Publica FastClub (`/fastclub`)

Pagina de marketing publica (fora do `/dashboard`) acessivel por qualquer visitante:

- **Hero section**: Titulo impactante, subtitulo, CTA principal ("Ativar FastCRM" / "Entrar no FastClub")
- **Pilares do ecossistema**: 3 cards (FastCRM, Metodo PARE, Rede Privada) -- reutilizando o conteudo ja definido em `StartHerePage`
- **Como funciona**: 4 passos visuais (timeline horizontal)
- **Beneficios/Features**: Grid de cards com icones e descricoes curtas
- **Prova social**: Metricas agregadas + testemunhos (reutilizando dados de `fastclub_crm_aggregates` e `fastclub_content_sections` page_key='resultados')
- **CTA final**: Seccao de conversao com botao para registo/login
- **SEO**: Meta tags com Helmet, canonical URL via `getPublicBaseUrl()`
- **Responsive**: Mobile-first, animacoes framer-motion

### 2. Integracao Deep-Link SSO

Sistema de deep-links que permite CTAs na landing (e em qualquer pagina do ecossistema) iniciar sessao SSO no FastCRM:

- **Componente `FastCRMDeepLink`**: Componente reutilizavel que encapsula a logica SSO. Recebe `moduleId`, `targetPath` (ex: `/dashboard/pipeline`) e renderiza um botao/link. Ao clicar:
  1. Se utilizador nao autenticado: redireciona para `/auth?redirect=/dashboard/fastclub` (fluxo existente)
  2. Se autenticado: invoca `useModuleSSO` para gerar token, depois redireciona para o `targetPath` no FastCRM com o token como query param
- **Hook `useFastCRMDeepLink`**: Simplifica a integracao SSO para deep-links internos. Wrapper sobre `useModuleSSO` que gere o fluxo redirect automaticamente
- **Integracao nas paginas existentes**: Substituir CTAs estaticos ("Abrir Pipeline", "Executar no FastCRM") nas paginas do Desafio 7 Dias, Missao da Semana e IA Avancada pelo componente `FastCRMDeepLink`

### 3. Navegacao e Rotas

- Nova rota publica `/fastclub` no `App.tsx` (fora do layout autenticado)
- Meta-navegacao na landing: link para login, link para registo, link para a comunidade publica (`/club/fastclub`)

---

## Ficheiros a criar

| Ficheiro | Descricao |
|---|---|
| `src/pages/fastclub/FastClubLandingPage.tsx` | Landing publica de marketing do FastClub |
| `src/components/fastclub/FastCRMDeepLink.tsx` | Componente reutilizavel de deep-link SSO |
| `src/hooks/useFastCRMDeepLink.ts` | Hook simplificado para deep-links SSO internos |

## Ficheiros a editar

| Ficheiro | Acao |
|---|---|
| `src/App.tsx` | Adicionar rota publica `/fastclub` |
| `src/pages/fastclub/DesafioPage.tsx` | Integrar `FastCRMDeepLink` nos CTAs das missoes |
| `src/pages/fastclub/MissaoSemanaPage.tsx` | Integrar `FastCRMDeepLink` nos CTAs |
| `src/pages/fastclub/IAAvancadaPage.tsx` | Integrar `FastCRMDeepLink` nos CTAs |

---

## Detalhe tecnico

### Landing Publica (`FastClubLandingPage.tsx`)

- Rota publica `/fastclub` sem `AuthProvider` wrapper (acesso anonimo)
- Utiliza `getPublicBaseUrl()` para canonical URL e links de partilha
- SEO com `react-helmet-async`: titulo "FastClub - Ecossistema de Aceleracao Comercial", descricao, og:tags
- Navbar minima no topo: logo FastClub, link "Entrar", link "Registar" (apontando para `/auth?redirect=/dashboard/fastclub`)
- Hero com gradiente executivo (padrao visual existente)
- Seccao "Ecossistema" com 3 pilares (dados estaticos inline, mesmo conteudo de `StartHerePage`)
- Seccao "Como Funciona" com 4 passos em timeline horizontal
- Seccao "Resultados" com metricas agregadas (fetch publico de `fastclub_crm_aggregates` com RLS publica ou dados estaticos fallback)
- Seccao "Testemunhos" com citacoes (dados estaticos inline para nao depender de workspace_id)
- Footer com links: Comunidade (`/club/fastclub`), Login (`/auth`), Termos
- Animacoes: `motion.div` com scroll-triggered fade-in

### Componente `FastCRMDeepLink`

```typescript
interface FastCRMDeepLinkProps {
  targetPath: string;           // ex: "/dashboard/pipeline"
  moduleId?: string;            // ID do modulo SSO (opcional)
  children: ReactNode;          // Conteudo do botao
  variant?: "default" | "outline" | "ghost";
  className?: string;
  fallbackBehavior?: "navigate" | "login";  // Se SSO falhar
}
```

Logica:
1. Verifica se utilizador esta autenticado (via `useAuth`)
2. Se nao autenticado: navega para `/auth?redirect={targetPath}`
3. Se autenticado e `moduleId` fornecido: invoca SSO, gera token, navega com `?sso_token=...&nonce=...`
4. Se autenticado sem `moduleId`: navega diretamente para `targetPath` (deep-link simples sem SSO)
5. Estados visuais: loading spinner durante SSO, erro com toast

### Hook `useFastCRMDeepLink`

Wrapper simplificado:
```typescript
function useFastCRMDeepLink(targetPath: string, moduleId?: string) {
  // Retorna { navigate: () => void, isLoading: boolean }
  // Gere automaticamente o fluxo auth check + SSO + redirect
}
```

### Integracao nas paginas existentes

Nas paginas do Desafio, Missao da Semana e IA Avancada, os botoes "Abrir no FastCRM" / "Executar" serao substituidos por `<FastCRMDeepLink targetPath="/dashboard/pipeline">`. Isto mantem o visual igual mas adiciona a logica SSO quando aplicavel.

### Rota publica no App.tsx

```typescript
{/* Public FastClub Landing */}
<Route path="/fastclub" element={<FastClubLandingPage />} />
```

Colocada na zona de rotas publicas, fora dos providers de workspace/autenticacao obrigatoria.

### Padrao visual da Landing

- Navbar fixa/sticky com fundo transparente que fica solido ao scroll
- Hero: gradiente `from-primary via-primary to-primary/80` com pattern overlay (mesmo padrao de `StartHerePage`)
- Seccoes alternadas fundo branco/cinza claro
- Cards com `hover:shadow-lg transition-all`
- CTAs primarios com cor primary, secundarios outline
- Responsivo: stack vertical em mobile, grid em desktop
- Animacoes subtis de entrada ao scroll (intersection observer + framer-motion)

