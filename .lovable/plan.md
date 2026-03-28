

# Instagram Looter — Sidebar em falta e visual upgrade

## Problema

A página `InstagramLooterPage.tsx` **não está envolvida** no `DashboardLayout`, ao contrário de todas as outras ~190 páginas do dashboard. Por isso, a barra lateral do menu não aparece. Visualmente, a interface também é básica — tabs genéricos, sem gradientes ou estilo Instagram.

## Correção

### 1. Adicionar `DashboardLayout`

Envolver todo o conteúdo de `InstagramLooterPage.tsx` com `<DashboardLayout>`:

```tsx
import { DashboardLayout } from "@/components/layout/DashboardLayout";
// ...
return (
  <DashboardLayout>
    <div className="space-y-6">
      {/* existing content */}
    </div>
  </DashboardLayout>
);
```

### 2. Visual upgrade do header e tabs

- **Header**: Adicionar gradiente estilo Instagram (rosa → roxo → laranja) como accent bar no topo, ícone do Instagram estilizado, e o badge de quota com progress bar circular em vez de texto simples.
- **Tabs**: Substituir os tabs genéricos por tabs com ícones coloridos, hover effects suaves, e indicador ativo mais visível (underline gradient).
- **Search bar**: Elevar visualmente com sombra, bordas arredondadas maiores, e placeholder mais descritivo.
- **Quick filters (Dentistas, Cabeleireiros, etc.)**: Transformar em chips com ícones e cores distintas em vez de badges outline monótonos.

### Ficheiro a modificar

| Ficheiro | Mudança |
|---|---|
| `src/pages/dashboard/InstagramLooterPage.tsx` | Envolver em `DashboardLayout`, redesign do header com gradiente Instagram, tabs mais apelativos, quota com progress visual |

