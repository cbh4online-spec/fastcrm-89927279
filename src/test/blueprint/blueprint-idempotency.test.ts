import { describe, expect, it } from "vitest";
import {
  isCustomFieldUniqueConflict,
  normalizeDuplicateName,
} from "@/lib/duplicateDetection";

describe("idempotência dos campos de blueprint", () => {
  it("normaliza nomes equivalentes antes de tentar criar", () => {
    expect(normalizeDuplicateName("  Emprésa ")).toBe("empresa");
    expect(normalizeDuplicateName("Website")).toBe(normalizeDuplicateName("web-site"));
  });

  it("reconhece apenas o conflito da chave única de custom_fields", () => {
    expect(isCustomFieldUniqueConflict({
      code: "23505",
      message: 'duplicate key value violates unique constraint "custom_fields_workspace_id_entity_type_name_key"',
    })).toBe(true);

    expect(isCustomFieldUniqueConflict({
      code: "23505",
      message: 'duplicate key value violates unique constraint "another_constraint"',
    })).toBe(false);
    expect(isCustomFieldUniqueConflict({ code: "42501", message: "permission denied" })).toBe(false);
  });
});