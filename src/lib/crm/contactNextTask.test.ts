import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { fetchContactNextTask } from "./contactNextTask";

function clientFor(data: unknown[], error: unknown = null) {
  const query = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({ data, error }),
  };
  const from = vi.fn().mockReturnValue(query);
  return { client: { from } as unknown as SupabaseClient<Database>, query, from };
}

describe("contact next action", () => {
  it("reads only pending tasks scoped to the contact and workspace, with real fields", async () => {
    const task = { id: "task-1", title: "Telefonar", due_at: "2026-10-07T09:00:00Z" };
    const { client, query, from } = clientFor([task]);
    expect(await fetchContactNextTask(client, "workspace-a", "contact-a")).toEqual(task);
    expect(from).toHaveBeenCalledWith("tasks");
    expect(query.select).toHaveBeenCalledWith("id,title,due_at");
    expect(query.eq.mock.calls).toEqual([
      ["workspace_id", "workspace-a"], ["related_type", "contact"],
      ["related_id", "contact-a"], ["status", "pending"],
    ]);
    expect(query.order).toHaveBeenNthCalledWith(1, "due_at", { ascending: true, nullsFirst: false });
    expect(query.limit).toHaveBeenCalledWith(1);
  });
  it("returns explicit null only for a successful empty result", async () => {
    expect(await fetchContactNextTask(clientFor([]).client, "workspace-a", "contact-a")).toBeNull();
  });
  it("propagates permission failures, never showing them as no tasks", async () => {
    const error = { code: "42501", message: "permission denied" };
    await expect(fetchContactNextTask(clientFor([], error).client, "workspace-a", "contact-a")).rejects.toEqual(error);
  });
  it("does not query without contact or workspace context", async () => {
    const { client, from } = clientFor([]);
    await expect(fetchContactNextTask(client, "", "contact-a")).rejects.toThrow();
    await expect(fetchContactNextTask(client, "workspace-a", "")).rejects.toThrow();
    expect(from).not.toHaveBeenCalled();
  });
});