
## Add Mobile Navigation Menu to Landing Page

**Problem**: The landing page navigation (`hidden md:flex`) is completely hidden on mobile with no alternative menu, violating mobile-first principles.

**Solution**: Add a hamburger menu button (visible only on mobile) that opens a Sheet/drawer from the right side, containing all navigation links and CTA buttons.

---

### Technical Details

**File**: `src/components/landing-fastcrm/LandingStickyHeader.tsx`

**Changes**:
1. Import `Menu` and `X` icons from lucide-react
2. Import `Sheet`, `SheetContent`, `SheetTrigger` from `@/components/ui/sheet`
3. Add state `mobileOpen` to control the sheet
4. Add a hamburger `Menu` button visible only on mobile (`md:hidden`)
5. Inside the Sheet, render all 6 nav links (Problema, Solucao, Arquitectura, Metricas, Investimento, FAQ) as vertical list items styled for dark theme
6. Include "Entrar" and "Criar Workspace" CTAs at the bottom of the mobile menu
7. Auto-close the sheet when a nav link is clicked (using `onClick` to set `mobileOpen = false`)
8. Hide the "Criar Workspace" desktop button on small screens to avoid clutter (it will be in the mobile menu instead)
