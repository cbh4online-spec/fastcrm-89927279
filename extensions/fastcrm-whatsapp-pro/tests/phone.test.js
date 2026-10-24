import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizePhone } from "../lib/phone.js";

const ok = (input, e164) => assert.deepEqual(normalizePhone(input), { ok: true, e164 }, input);
const bad = (input) => assert.equal(normalizePhone(input).ok, false, String(input));

test("9 dígitos portugueses recebem +351", () => {
  ok("912345678", "+351912345678");
  ok("912 345 678", "+351912345678");
  ok("212-345-678", "+351212345678");
  ok("(21) 234 5678", "+351212345678");
  ok("300 123 456", "+351300123456");
});

test("prefixos + e 00", () => {
  ok("+351 912 345 678", "+351912345678");
  ok("00351912345678", "+351912345678");
  ok("+55 11 91234 5678", "+5511912345678");
  ok("0034 612 345 678", "+34612345678");
});

test("rejeita entradas inválidas", () => {
  bad("");
  bad("   ");
  bad(null);
  bad("abc");
  bad("91234567"); // 8 dígitos sem indicativo
  bad("812345678"); // PT não começa por 8
  bad("+351 81234567");
  bad("+351 9123456789"); // 10 dígitos nacionais
  bad("+1234567"); // curto demais
  bad("+1234567890123456"); // >15
  bad("+0351912345678");
  bad("+351 912 345 678 ext 2");
  bad("1".repeat(41));
  bad("++351912345678");
});
