

# Fase 1: Design System — Dark + Gold Premium

## Contexto

O FastCRM usa `next-themes` (class-based) com tema light como padrão. As variáveis CSS estão em `src/index.css` com `:root` (light) e `.dark` (dark). O toggle de tema existe em `AppearanceSettings.tsx`.

A transformação visual requer alterar o **dark mode** para usar dourado como cor de acento primária e torná-lo o tema **padrão**, mantendo light mode como opção.

## Alterações

### 1. `src/index.css` — Redesign do Dark Mode para "AI Revenue OS"

**Dark mode (`.dark`):**
- **Background**: Preto mais profundo (`222 47% 3%` → quase preto puro)
- **Card**: Superfícies ligeiramente elevadas com tom mais quente (`230 15% 7%`)
- **Primary**: Trocar azul por dourado (`43 96% 56%` — HSL do #F5A623-ish gold)
- **Primary-foreground**: Preto (`0 0% 0%`) para contraste
- **Ring**: Dourado
- **Muted**: Tons cinza escuro mais neutros
- **Accent**: Dourado subtil (`43 30% 12%`)
- **Border**: Mais subtil, escuro (`230 15% 12%`)
- **Sidebar**: Background mais escuro, accent dourado
- **Gradients**: Substituir azul→violeta por dourado→âmbar
- **Shadow-glow**: Glow dourado (`0 0 30px hsl(43 96% 56% / 0.3)`)

**Adicionar tokens novos:**
- `--gold`: `43 96% 56%` (dourado primário)
- `--gold-foreground`: `0 0% 0%`
- `--gradient-gold`: `linear-gradient(135deg, hsl(43 96% 56%) 0%, hsl(35 95% 45%) 100%)`

**Light mode (`:root`):**
- Manter essencialmente igual mas ajustar `--primary` para um tom dourado/âmbar escuro para consistência de marca

**Novas utilities:**
- `.gradient-gold` — gradiente dourado
- `.glow-gold` — box-shadow dourado subtil
- `.glass-premium` — glass effect com tint dourado

### 2. `tailwind.config.ts` — Adicionar cores gold ao tema

- Adicionar `gold` ao objeto `colors` com DEFAULT e foreground
- Adicionar keyframe `glow-pulse-gold` com pulsação dourada
- Adicionar animação correspondente

### 3. `src/App.tsx` ou entry point — Definir dark como tema padrão

- Configurar `next-themes` `ThemeProvider` com `defaultTheme="dark"` (ou onde o provider estiver montado)

### 4. `src/components/layout/TopBar.tsx` — Rebranding subtil

- Badge "FastCRM 2.0" → "FastCRM OS" (no Dashboard.tsx)
- Ajustar avatar fallback gradient para usar dourado

### 5. `src/components/layout/SidebarV1.tsx` — Identidade visual premium

- Logo/Brand area: Adicionar subtítulo "AI Revenue OS" em texto dourado pequeno
- Ajustar o item activo para usar highlight dourado em vez de azul

### 6. `src/pages/Dashboard.tsx` — Badge e branding

- Trocar `FastCRM 2.0` por `FastCRM OS`
- Subtítulo: "AI Revenue Operating System"

## Ficheiros a alterar

| Ficheiro | Acção |
|---|---|
| `src/index.css` | Redesign completo do dark mode (gold), novos tokens e utilities |
| `tailwind.config.ts` | Adicionar cor gold, keyframes e animação gold glow |
| `src/pages/Dashboard.tsx` | Badge FastCRM OS, subtítulo |
| `src/components/layout/TopBar.tsx` | Avatar gradient dourado |
| `src/components/layout/SidebarV1.tsx` | Subtítulo "AI Revenue OS", item activo dourado |

## Notas Técnicas

- O `next-themes` já está configurado com `darkMode: ["class"]` no tailwind.config
- O provider do tema precisa ser localizado para mudar o `defaultTheme` para `"dark"`
- Todas as referências a `from-primary to-violet-600` nos gradients ficarão automaticamente douradas ao mudar `--primary`
- As cores semânticas dos ícones da sidebar (violet, emerald, amber etc.) mantêm-se inalteradas — só o primary muda

