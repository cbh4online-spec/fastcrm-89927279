import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fastcrmUrl, isAllowedUrl } from "../lib/urls.js";

test("lookup tem destino fixo e rejeita telefone no URL", () => {
  assert.equal(fastcrmUrl("lookup"), "https://fastcrm.metodopare.ai/dashboard/whatsapp-pro/lookup");
  assert.equal(isAllowedUrl(fastcrmUrl("lookup")), true);
  assert.equal(isAllowedUrl(`${fastcrmUrl("lookup")}?phone=912345678`), false);
  assert.equal(isAllowedUrl(`${fastcrmUrl("lookup")}#912345678`), false);
});

test("MV3 mantém limites de acesso e todos os paths", () => {
  const base = new URL("../", import.meta.url);
  const manifest = JSON.parse(readFileSync(new URL("manifest.json", base), "utf8"));
  const pkg = JSON.parse(readFileSync(new URL("package.json", base), "utf8"));
  assert.equal(manifest.version, pkg.version, "manifest e package.json devem coincidir");
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions, ["storage", "sidePanel", "identity"]);
  assert.deepEqual(manifest.host_permissions, ["https://eumnfkccyvlyoyjchiwe.supabase.co/*"]);
  assert.equal(manifest.content_scripts, undefined);
  assert.match(manifest.content_security_policy.extension_pages, /connect-src https:\/\/eumnfkccyvlyoyjchiwe\.supabase\.co;/);
  for (const path of [manifest.background.service_worker, manifest.side_panel.default_path, `_locales/${manifest.default_locale}/messages.json`, ...Object.values(manifest.icons)]) {
    assert.ok(existsSync(new URL(path, base)), path);
  }
});