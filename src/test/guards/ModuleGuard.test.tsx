import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
const screen = {
  getByTestId: (id: string) => document.querySelector(`[data-testid="${id}"]`),
  queryByTestId: (id: string) => document.querySelector(`[data-testid="${id}"]`),
  getByText: (text: string | RegExp) => {
    const el = Array.from(document.querySelectorAll('*')).find(e => 
      typeof text === 'string' ? e.textContent?.includes(text) : text.test(e.textContent || '')
    );
    if (!el) throw new Error(`Unable to find element with text: ${text}`);
    return el;
  },
  queryByText: (text: string | RegExp) => {
    return Array.from(document.querySelectorAll('*')).find(e => 
      typeof text === 'string' ? e.textContent?.includes(text) : text.test(e.textContent || '')
    ) || null;
  },
};
import { MemoryRouter } from "react-router-dom";
import { ModuleGuard } from "@/components/guards/ModuleGuard";

// Mock the hook
vi.mock("@/hooks/useWorkspaceModules", () => ({
  useWorkspaceModules: vi.fn(),
}));

// Mock DashboardLayout to avoid provider dependencies
vi.mock("@/components/layout/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

import { useWorkspaceModules } from "@/hooks/useWorkspaceModules";

const mockedUseModules = vi.mocked(useWorkspaceModules);

describe("ModuleGuard", () => {
  it("renders children when module is installed", () => {
    mockedUseModules.mockReturnValue({
      installedModuleIds: ["proposals"],
      isLoading: false,
      modules: [],
      installedModules: [],
    } as any);

    render(
      <MemoryRouter>
        <ModuleGuard moduleSlug="proposals" moduleName="Propostas">
          <div data-testid="protected-content">Conteúdo protegido</div>
        </ModuleGuard>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("protected-content")).toBeInTheDocument();
  });

  it("shows lock screen when module is NOT installed", () => {
    mockedUseModules.mockReturnValue({
      installedModuleIds: [],
      isLoading: false,
      modules: [],
      installedModules: [],
    } as any);

    render(
      <MemoryRouter>
        <ModuleGuard moduleSlug="proposals" moduleName="Propostas">
          <div data-testid="protected-content">Conteúdo protegido</div>
        </ModuleGuard>
      </MemoryRouter>,
    );

    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    expect(screen.getByText(/não está instalado/i)).toBeInTheDocument();
  });

  it("shows loader while checking modules", () => {
    mockedUseModules.mockReturnValue({
      installedModuleIds: [],
      isLoading: true,
      modules: [],
      installedModules: [],
    } as any);

    render(
      <MemoryRouter>
        <ModuleGuard moduleSlug="proposals" moduleName="Propostas">
          <div>Conteúdo</div>
        </ModuleGuard>
      </MemoryRouter>,
    );

    expect(screen.queryByText("Conteúdo")).not.toBeInTheDocument();
  });
});
