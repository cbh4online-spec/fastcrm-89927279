import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { extractCloudtalkAi, parseAiSummary } from "./cloudtalkAi.ts";

Deno.test("extracts CloudTalk transcript, summary and sentiment", () => {
  const r = extractCloudtalkAi({ data: {
    transcription: [{ speaker: "agent", text: "Bom dia" }, { speaker: "customer", text: "Olá" }],
    ai_summary: "Cliente pediu proposta.", sentiment: "VERY_POSITIVE", action_items: ["Enviar proposta"],
  } });
  assertEquals(r.transcript?.map((s) => s.speaker), ["agent", "customer"]);
  assertEquals(r.summary, "Cliente pediu proposta.");
  assertEquals(r.sentiment, "positive");
  assertEquals(r.action_items, ["Enviar proposta"]);
});

Deno.test("payload without AI fields yields nulls", () => {
  const r = extractCloudtalkAi({ call_id: 1 });
  assertEquals([r.transcript, r.summary, r.sentiment, r.action_items], [null, null, null, null]);
});

Deno.test("rejects invalid AI summary", () => {
  assertEquals(parseAiSummary({ summary: "ok", sentiment: "happy", action_items: [] }), null);
  assertEquals(parseAiSummary({ summary: "Resumo válido da chamada.", sentiment: "neutral", action_items: [] })?.sentiment, "neutral");
});
