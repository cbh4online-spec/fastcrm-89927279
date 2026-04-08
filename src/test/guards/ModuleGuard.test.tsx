import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
