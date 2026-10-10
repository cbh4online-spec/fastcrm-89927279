import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const lastModal: { props: { profileId?: string; profile: { username: string } } | null } = { props: null };
vi.mock("@/components/instagram-looter/CreateLeadModal", () => ({
  CreateLeadModal: (props: { open: boolean; profileId?: string; profile: { username: string } }) => {
    if (props.open) lastModal.props = props;
    return null;
  },
}));
vi.mock("@/components/instagram-looter/AddToCollectionModal", () => ({ AddToCollectionModal: () => null }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const getProfile = vi.fn((u: string) => Promise.resolve({ profile: { username: u, full_name: u.toUpperCase() } }));
const saveMutate = vi.fn((p: { username: string }) => Promise.resolve({ id: `id-${p.username}` }));
vi.mock("@/hooks/useInstagramLooter", () => ({
  useInstagramLooter: () => ({ getProfile, analyzeProfile: vi.fn(), saveProfile: { mutateAsync: saveMutate, isPending: false } }),
}));

import { ProfileDetailPanel } from "@/components/instagram-looter/ProfileDetailPanel";

describe("ProfileDetailPanel ao mudar de perfil", () => {
  it("nunca associa o lead de B ao ID guardado de A", async () => {
    const { rerender } = render(<ProfileDetailPanel username="perfil_a" onClose={() => {}} />);
    await screen.findByText(/perfil_a/);
    fireEvent.click(screen.getByRole("button", { name: /Guardar/ }));
    await waitFor(() => expect(saveMutate).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: /Criar Lead/ }));
    await waitFor(() => expect(lastModal.props?.profileId).toBe("id-perfil_a"));

    rerender(<ProfileDetailPanel username="perfil_b" onClose={() => {}} />);
    await screen.findByText(/perfil_b/);
    lastModal.props = null;
    fireEvent.click(screen.getByRole("button", { name: /Criar Lead/ }));
    await waitFor(() => expect(lastModal.props?.profile.username).toBe("perfil_b"));
    expect(lastModal.props?.profileId).toBeUndefined();
  });
});
