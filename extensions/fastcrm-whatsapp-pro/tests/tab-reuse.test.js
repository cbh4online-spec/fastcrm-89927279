import { test } from "node:test";
import assert from "node:assert/strict";
import { createTabReuser, isSendUrl } from "../lib/tab-reuse.js";

const fake = (tabs) => {
  const calls = [];
  return { calls, tabs: {
    query: async () => tabs,
    update: async (id, p) => calls.push(["update", id, p.url]),
    remove: async (id) => calls.push(["remove", id]),
  }, windows: { update: async () => {} } };
};

test("só reconhece web.whatsapp.com/send com número", () => {
  assert.equal(isSendUrl("https://web.whatsapp.com/send?phone=351932380092"), true);
  assert.equal(isSendUrl("https://web.whatsapp.com/"), false);
  assert.equal(isSendUrl("https://evil.com/send?phone=351932380092"), false);
});

test("abre a conversa no separador existente e fecha o novo", async () => {
  const url = "https://web.whatsapp.com/send?phone=351932380092";
  const c = fake([{ id: 1, windowId: 1, url: "https://web.whatsapp.com/" }, { id: 9, windowId: 1, url }]);
  assert.equal(await createTabReuser(c)(9, url), true);
  assert.deepEqual(c.calls, [["update", 1, url], ["remove", 9]]);
});

test("sem outro separador, deixa o novo aberto", async () => {
  const url = "https://web.whatsapp.com/send?phone=351932380092";
  const c = fake([{ id: 9, windowId: 1, url }]);
  assert.equal(await createTabReuser(c)(9, url), false);
  assert.deepEqual(c.calls, []);
});
