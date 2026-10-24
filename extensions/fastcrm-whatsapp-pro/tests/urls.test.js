import { test } from "node:test";
import assert from "node:assert/strict";
import { isAllowedUrl, fastcrmUrl, FASTCRM_ROUTES, DEV_EXTRA_ORIGINS } from "../lib/urls.js";

test("rotas confirmadas são permitidas", () => {
  for (const key of Object.keys(FASTCRM_ROUTES)) assert.ok(isAllowedUrl(fastcrmUrl(key)), key);
  assert.ok(isAllowedUrl("https://web.whatsapp.com/"));
});

test("override DEV vazio no repositório", () => {
  assert.equal(DEV_EXTRA_ORIGINS.length, 0);
});

test("rejeita destinos fora da allowlist", () => {
  const rejected = [
    "http://fastcrm.metodopare.ai/dashboard/inbox",
    "https://fastcrm.metodopare.ai.evil.com/dashboard/inbox",
    "https://evil.com/dashboard/inbox",
    "https://user:pw@fastcrm.metodopare.ai/dashboard/inbox",
    "https://fastcrm.metodopare.ai/dashboard/contacts?q=+351912345678",
    "https://fastcrm.metodopare.ai/dashboard/contacts#x",
    "https://fastcrm.metodopare.ai/admin",
    "https://fastcrm.lovable.app/dashboard/inbox",
    "https://web.whatsapp.com/send?phone=351912345678",
    "javascript:alert(1)",
    "data:text/html,x",
    "",
    null,
  ];
  for (const u of rejected) assert.equal(isAllowedUrl(u), false, String(u));
  assert.equal(fastcrmUrl("inexistente"), null);
});
