/**
 * Testes de escrita/rollback da importação histórica e da consolidação numa base
 * Postgres isolada em memória (PGlite). Nunca toca na base de produção.
 * Aplica as migrações reais 0140–0142 sobre um esquema mínimo de apoio.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { PGlite } from "@electric-sql/pglite";

const root = resolve(__dirname, "../../..");
const read = (p: string) => readFileSync(resolve(root, p), "utf8");
let res: Record<string, any> = {};

beforeAll(async () => {
  const db = new PGlite();
  await db.exec(read("src/test/studentJourney/fixtures/sjImportStubSchema.sql"));
  for (const m of ["0140_sj_safe_historical_import", "0141_sj_import_contact_created_by", "0142_sj_import_hardening", "0143_sj_profile_stats_identity", "0144_sj_import_homonyms_not_conflict"])
    await db.exec(read(`drizzle/migrations/${m}.sql`));
  const out = await db.exec(read("src/test/studentJourney/fixtures/sjImportScenario.sql"));
  res = Object.fromEntries((out[out.length - 1].rows as any[]).map((r) => [r.k, r.v]));
}, 60_000);

const reasons = (run: any) => Object.fromEntries((run.pending as any[]).map((p) => [p.row, p.reason]));

describe("importação histórica (base isolada)", () => {
  it("contacto existente reconhecido; novo criado; internacional não colide com PT", () => {
    expect(res.preview["2"]).toBe("match|ok");
    expect(res.preview["3"]).toBe("match|ok");   // +44 vs 0044
    expect(res.preview["4"]).toBe("review|needs_decision|ok"); // 7912… sem indicativo: não colide com +44 e fica em revisão
  });
  it("identificadores contraditórios e partilhados ficam pendentes e não podem ser forçados", () => {
    const r1 = reasons(res.run1);
    expect(r1["6"]).toMatch(/^conflict:/);
    expect(r1["7"]).toBe("conflict:identifier_name_mismatch");
    expect(r1["9"]).toMatch(/^conflict:/);          // telefone no campo de e-mail
    expect(r1["13"]).toMatch(/^conflict:/);         // decisão enviada pelo browser ignorada
    expect(res.hard_conflict_decision_refused).toMatch(/Decisão recusada/);
  });
  it("designação ausente, desconhecida ou de outra edição fica pendente", () => {
    const r1 = reasons(res.run1);
    expect(r1["10"]).toBe("label_missing");
    expect(r1["11"]).toBe("label_unmapped");
    expect(r1["12"]).toBe("label_other_edition");
  });
  it("órfão e inscrição sem edição exigem decisão; depois associam sem duplicar", () => {
    const r1 = reasons(res.run1);
    expect(r1["2"]).toBe("legacy_enrollment_needs_decision");
    expect(r1["5"]).toBe("needs_decision");
    expect(res.kept.legacy_null).toBe(true);
    expect(res.run2.enrollments_linked).toBe(1);
    expect(res.orphan_linked).toBe(true);
  });
  it("conclusão aplicada à inscrição existente sem tocar finanças, certificados ou datas", () => {
    expect(res.legacy_after).toEqual({ cohort_ok: true, ped: "completed", fin: "paid", agreed: 300, completed_at_kept: true, cert: 1 });
  });
  it("finanças desconhecidas ficam Não informado", () => {
    expect(res.finance_unknown).toEqual({ unknown: true, pay: "unknown", fin: null, agreed: null, completed_at: null });
    expect(res.kept.contact_source).toBe("origem-antiga");
  });
  it("repetir o mesmo lote cria zero registos e não duplica evidências", () => {
    const r = res.run3_same_batch;
    expect([r.contacts_created, r.profiles_created, r.enrollments_created, r.enrollments_linked]).toEqual([0, 0, 0, 0]);
    expect(r.prov_after).toBe(r.prov_before);
    expect(res.changed_row).toEqual([{ row: "5", reason: "decision_stale" }]);
  });
  it("repetir depois de consolidar usa o perfil final sem criar cópias nem erros", () => {
    expect(res.merge.status).toBe("completed");
    expect(res.run4_after_merge).toMatchObject({ errors: [], contacts_created: 0, profiles_created: 0, enrollments_created: 0 });
  });
  it("consolidação: colisão fica bloqueada sem mover nada; outro workspace bloqueia; reversão restaura", () => {
    expect(res.coincident).toEqual({ status: "blocked", blockers: ["coincident_enrollments"], m3_enr: 1, m3_active: true });
    expect(res.cross_ws).toContain("cross_workspace_dependent:sj_tasks");
    expect(res.revert).toEqual({ m1_active: true, m1_contact: true, m1_enr: 1 });
  });
  it("permissões: exige membership atual; separa workspaces", () => {
    expect(res.old_helper_accepts_exmember).toBe(true); // o helper antigo aceitava — o novo gate não
    expect(res.exmember_blocked).toBe(true);
    expect(res.stranger_merge_blocked).toBe(true);
    expect(res.cross_ws_cohort_blocked).toBe(true);
    expect(res.anon_blocked).toBe(true);
    expect(res.kept.w2_contacts).toBe(1);
  });
  it("estatísticas: histórico sem data não inventa conclusão nem termina curso ativo; inativo mantém-se", () => {
    expect(res.stats["Perfil Ativo"]).toEqual({ stage: "active", total: 1, last: null });
    expect(res.stats["Perfil Inativo"]).toEqual({ stage: "inactive", total: 1, last: null });
    expect(res.stats["Perfil Inscrito"]).toEqual({ stage: "completed", total: 1, last: null });
  });
  it("consolidação e reversão recalculam datas conhecidas sem contaminar o destino", () => {
    expect(res.dates_merge).toMatchObject({ status: "completed", evidence: ["same_email"], target_last: "2023-06-01", target_total: 2 });
    expect(res.dates_revert).toEqual({ target_last: "2021-01-01", source_last: "2023-06-01", target_total: 1 });
  });
  it("consolidação exige prévia atual e prova de identidade; identidades incompatíveis bloqueiam", () => {
    expect(res.merge_bad_fp).toBe(true);
    expect(res.merge_no_evidence).toEqual(["identity_not_proven"]);
    expect(res.incompatible_merge).toEqual(expect.arrayContaining(["different_contacts", "names_incompatible", "different_nif"]));
  });
  it("nome é sempre pista: chaves novas ou campos deslocados ficam em revisão sem criar perfis", () => {
    expect(res.name_hints["50"].reasons).toContain("profile_name_hint");
    expect(res.name_hints["51"].reasons).toContain("name_hint");
    expect(res.name_hints["52"].reasons).toContain("phone_without_country_code");
    expect(res.name_hint_run).toMatchObject({ profiles_created: 0, contacts_created: 0, profiles_delta: 0 });
  });
  it("homónimos só por nome com NIF diferente não bloqueiam a ficha certa; partilha real continua bloqueada", () => {
    const h = res.homonyms;
    expect(h.a).toMatchObject({ status: "match", auto: true, auto_profile: true, homonyms: 2 });
    expect(h.b.status).toBe("review");                       // só nome + NIF diferente: homónimo, nunca liga
    expect(h.b.auto).not.toBe(true);
    expect(h.b.reasons).toContain("homonym_other_nif");
    expect(h.c.pending).toBe("conflict:shared_identifier_different_nif");
    expect(h.d.reasons).toContain("no_identifier");
    expect(h.d.status).toBe("review");
    expect(res.homonyms_run).toMatchObject({ contacts_created: 0, profiles_created: 0, target_enr: 1, profiles_delta: 0 });
    expect(res.homonyms_run.pending).toEqual([{ row: "d", reason: "needs_decision" }]);
  });
});
