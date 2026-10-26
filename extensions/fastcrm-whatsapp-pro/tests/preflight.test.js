import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runPreflight, formatReport } from "../scripts/pilot-preflight.mjs";

const src = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function copyExt() {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "fastcrm-preflight-"));
  const dst = path.join(tmp, "ext");
  await fs.cp(src, dst, { recursive: true, filter: (p) => !p.includes(`${path.sep}dist`) });
  return { tmp, dst };
}
const patchCfg = async (dir, from, to) => {
  const f = path.join(dir, "lib/oauth-config.js");
  await fs.writeFile(f, (await fs.readFile(f, "utf8")).replace(from, to));
};

test("v0.4.2 no repositório está fail-closed e passa o preflight", async () => {
  const r = await runPreflight();
  assert.equal(r.ok, true, formatReport(r));
  assert.equal(r.active.apiPainel, "inativo");
  assert.match(r.active.oauth, /inativo/);
  assert.equal(r.repoChecks, true);
});

test("preflight deteta API_READY=true prematuro", async () => {
  const { tmp, dst } = await copyExt();
  try {
    await patchCfg(dst, "API_READY = false", "API_READY = true");
    const r = await runPreflight({ root: dst, repoRoot: tmp });
    assert.equal(r.ok, false);
    assert.ok(r.checks.find((c) => c.name === "API_READY=false" && !c.ok));
  } finally { await fs.rm(tmp, { recursive: true, force: true }); }
});

test("preflight deteta client_id preenchido em estado seguro, sem o imprimir", async () => {
  const { tmp, dst } = await copyExt();
  try {
    await patchCfg(dst, 'PUBLIC_CLIENT_ID = ""', 'PUBLIC_CLIENT_ID = "segredo-nao-mostrar-123"');
    const r = await runPreflight({ root: dst, repoRoot: tmp });
    assert.equal(r.ok, false);
    assert.equal(formatReport(r).includes("segredo-nao-mostrar-123"), false);
  } finally { await fs.rm(tmp, { recursive: true, force: true }); }
});

test("preflight deteta permissão extra e scope alterado", async () => {
  const { tmp, dst } = await copyExt();
  try {
    const mf = path.join(dst, "manifest.json");
    const m = JSON.parse(await fs.readFile(mf, "utf8"));
    m.permissions.push("tabs");
    await fs.writeFile(mf, JSON.stringify(m));
    await patchCfg(dst, 'SCOPES = "email"', 'SCOPES = "openid email"');
    const r = await runPreflight({ root: dst, repoRoot: tmp });
    assert.equal(r.ok, false);
    assert.equal(r.repoChecks, false, "sem src/docs não falha por ausência do repositório");
    assert.ok(r.checks.find((c) => c.name.startsWith("Permissões") && !c.ok));
    assert.ok(r.checks.find((c) => c.name.startsWith("Scope") && !c.ok));
  } finally { await fs.rm(tmp, { recursive: true, force: true }); }
});
