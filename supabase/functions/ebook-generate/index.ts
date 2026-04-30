import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

import { logAIUsage } from "../_shared/ai-instrumentation.ts";

// ── AI usage logging helper (auto-injected) ───────────────────────────────────
async function __loggedAIFetch(
  workspaceId: string | null,
  feature: string,
  init: RequestInit,
  urlOverride?: string
): Promise<Response> {
  const start = Date.now();
  const url = urlOverride ?? "https://ai.gateway.lovable.dev/v1/chat/completions";
  const body = init.body ? JSON.parse(init.body as string) : {};
  const model = body.model || "google/gemini-3-flash-preview";
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (e) {
    if (workspaceId) {
      logAIUsage({
        workspace_id: workspaceId, feature, model,
        tokens_input: 0, tokens_output: 0,
        latency_ms: Date.now() - start,
        was_error: true, error_type: "network",
      });
    }
    throw e;
  }
  if (!workspaceId) return response;
  const clone = response.clone();
  clone.json().then((data: any) => {
    logAIUsage({
      workspace_id: workspaceId, feature, model,
      tokens_input: data?.usage?.prompt_tokens ?? 0,
      tokens_output: data?.usage?.completion_tokens ?? 0,
      latency_ms: Date.now() - start,
      was_error: !response.ok,
      error_type: response.ok ? undefined : `http_${response.status}`,
    });
  }).catch(() => {});
  return response;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STEPS = ["generate_outline", "create_ebook", "generate_chapters", "generate_cover", "generate_images", "finalize"] as const;

// Track when function started to avoid timeout
const FUNCTION_START = Date.now();
const MAX_RUNTIME_MS = 55_000; // 55s safety margin (edge functions timeout at ~60s)

function isNearTimeout(): boolean {
  return Date.now() - FUNCTION_START > MAX_RUNTIME_MS;
}

async function callAI(apiKey: string, model: string, systemPrompt: string, userPrompt: string, toolDef?: any) {
  const body: any = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  };
  if (toolDef) {
    body.tools = [{ type: "function", function: toolDef }];
    body.tool_choice = { type: "function", function: { name: toolDef.name } };
  }

  const response = await __loggedAIFetch(null, "ebook-generate", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const status = response.status;
    if (status === 429) throw new Error("RATE_LIMIT");
    if (status === 402) throw new Error("NO_CREDITS");
    throw new Error(`AI gateway error: ${status}`);
  }

  return response.json();
}

async function generateImage(apiKey: string, prompt: string) {
  const response = await __loggedAIFetch(null, "ebook-generate", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3.1-flash-image-preview",
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });

  if (!response.ok) {
    const status = response.status;
    if (status === 429) throw new Error("RATE_LIMIT");
    if (status === 402) throw new Error("NO_CREDITS");
    throw new Error(`AI image error: ${status}`);
  }

  const data = await response.json();
  const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!imageUrl) throw new Error("No image in response");
  return imageUrl;
}

async function uploadBase64Image(supabase: any, base64Url: string, path: string): Promise<string> {
  const base64Data = base64Url.replace(/^data:image\/\w+;base64,/, "");
  const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
  const { error } = await supabase.storage.from("ebook-assets").upload(path, binaryData, { contentType: "image/png", upsert: true });
  if (error) throw new Error("Upload failed: " + error.message);
  const { data } = supabase.storage.from("ebook-assets").getPublicUrl(path);
  return data.publicUrl;
}

async function updateJob(supabase: any, jobId: string, updates: Record<string, any>) {
  await supabase.from("ebook_generation_jobs").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", jobId);
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // ── Auth guard ──
  let auth;
  try {
    const { requireAuth, securityLog, getClientIP } = await import("../_shared/security.ts");
    auth = await requireAuth(req);
    securityLog({ event: "auth_success", functionName: "ebook-generate", userId: auth.userId, ip: getClientIP(req) });
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  try {
    const { job_id } = await req.json();
    if (!job_id) return new Response(JSON.stringify({ error: "job_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Load job
    const { data: job, error: jobErr } = await supabase.from("ebook_generation_jobs").select("*").eq("id", job_id).single();
    if (jobErr || !job) return new Response(JSON.stringify({ error: "Job not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (job.status === "completed" || job.status === "cancelled") {
      return new Response(JSON.stringify({ status: job.status }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const config = job.config || {};
    const result = job.result || {};
    const stepsCompleted = job.steps_completed || [];

    // Determine starting step (for retry support)
    let startIdx = 0;
    if (job.error_step) {
      startIdx = STEPS.indexOf(job.error_step as any);
      if (startIdx === -1) startIdx = 0;
    } else if (stepsCompleted.length > 0) {
      const lastDone = stepsCompleted[stepsCompleted.length - 1];
      const lastIdx = STEPS.indexOf(lastDone as any);
      startIdx = lastIdx >= 0 ? lastIdx + 1 : 0;
    }

    await updateJob(supabase, job_id, { status: "running", error_message: null, error_step: null });

    // Also mark ebook as generating
    if (job.ebook_id) {
      await supabase.from("ebooks").update({ status: "generating", updated_at: new Date().toISOString() }).eq("id", job.ebook_id);
    }

    let hitTimeout = false;

    for (let i = startIdx; i < STEPS.length; i++) {
      const step = STEPS[i];
      const progressPct = Math.round(((i + 1) / STEPS.length) * 100);

      // Check timeout before starting a new step (except finalize — always run finalize)
      if (step !== "finalize" && isNearTimeout()) {
        console.warn(`Near timeout at step ${step}, skipping to finalize`);
        hitTimeout = true;
        // Jump to finalize
        const finalizeIdx = STEPS.indexOf("finalize");
        if (finalizeIdx > i) {
          i = finalizeIdx - 1; // loop will increment
          continue;
        }
      }

      try {
        await updateJob(supabase, job_id, { current_step: step, progress: Math.max(progressPct - 15, 0) });

        if (step === "generate_outline") {
          const outlineToolDef = {
            name: "create_outline",
            description: "Create an eBook outline with chapters",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string" },
                subtitle: { type: "string" },
                chapters: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                      sections: { type: "array", items: { type: "string" } },
                    },
                    required: ["title", "description", "sections"],
                  },
                },
              },
              required: ["title", "subtitle", "chapters"],
            },
          };

          const specialElementsStr = config.specialElements?.length ? `\nSpecial elements: ${config.specialElements.join(", ")}` : "";
          const keywordsStr = config.contentKeywords?.length ? `\nKey terms: ${config.contentKeywords.join(", ")}` : "";

          const data = await callAI(
            LOVABLE_API_KEY,
            "google/gemini-3-flash-preview",
            `You are an expert eBook content strategist. Generate a structured eBook outline in Portuguese (PT-PT).${specialElementsStr}${keywordsStr}`,
            `Create an eBook outline:\nTitle/Theme: ${config.prompt}\nAudience: ${config.audience || "General"}\nObjective: ${config.objective || "Educate"}\nDepth: ${config.depth || "Intermediate"}\nTone: ${config.tone || "Professional"}\nChapters: ${config.chapterCount || 7}${specialElementsStr}${keywordsStr}`,
            outlineToolDef
          );

          const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
          if (!toolCall) throw new Error("No outline in response");
          const outline = JSON.parse(toolCall.function.arguments);
          result.outline = outline;

        } else if (step === "create_ebook") {
          const outline = result.outline;
          if (!outline) throw new Error("No outline available");

          const chapters = (outline.chapters || []).map((ch: any, i: number) => ({
            id: `ch-${i}`,
            title: ch.title,
            description: ch.description,
            content: "",
            sections: ch.sections || [],
          }));

          if (job.ebook_id) {
            await supabase.from("ebooks").update({
              title: outline.title || config.prompt,
              subtitle: outline.subtitle,
              chapters,
              status: "generating",
              updated_at: new Date().toISOString(),
            }).eq("id", job.ebook_id);
            result.ebook_id = job.ebook_id;
          } else {
            result.ebook_id = job.ebook_id;
          }
          result.chapters = chapters;

        } else if (step === "generate_chapters") {
          if (config.mode !== "generate") {
            // Structure-only mode: skip content generation
          } else {
            const chapters = result.chapters || [];
            const outline = result.outline || {};

            for (let j = 0; j < chapters.length; j++) {
              // Check timeout before each chapter
              if (isNearTimeout()) {
                console.warn(`Near timeout during chapter ${j}/${chapters.length}, saving progress`);
                hitTimeout = true;
                break;
              }

              const ch = chapters[j];
              await updateJob(supabase, job_id, {
                current_step: `generate_chapters`,
                progress: Math.round(20 + ((j + 1) / chapters.length) * 40),
              });

              const data = await callAI(
                LOVABLE_API_KEY,
                "google/gemini-3-flash-preview",
                `You are an expert eBook writer. Write detailed, engaging chapter content in Portuguese (PT-PT). Use markdown formatting. Write at least 800 words.`,
                `Write this chapter for "${outline.title}":\nChapter: ${ch.title}\nContext: ${ch.description || ""}\nTone: ${config.tone || "Professional"}`
              );

              chapters[j] = { ...chapters[j], content: data.choices?.[0]?.message?.content || "" };

              // Small delay between chapters to avoid rate limits
              if (j < chapters.length - 1) await delay(500);
            }

            result.chapters = chapters;

            // Save chapters to ebook
            if (result.ebook_id) {
              await supabase.from("ebooks").update({
                chapters,
                updated_at: new Date().toISOString(),
              }).eq("id", result.ebook_id);
            }
          }

        } else if (step === "generate_cover") {
          if (isNearTimeout()) {
            console.warn("Near timeout, skipping cover generation");
            hitTimeout = true;
          } else {
            const outline = result.outline || {};
            const coverPrompt = `Create a professional eBook cover image for "${outline.title || config.prompt}". Style: editorial, modern. No text in image.`;

            try {
              const base64 = await generateImage(LOVABLE_API_KEY, coverPrompt);
              const filePath = `ai-generated/${result.ebook_id || "misc"}/cover_${Date.now()}.png`;
              const publicUrl = await uploadBase64Image(supabase, base64, filePath);
              result.cover_url = publicUrl;

              if (result.ebook_id) {
                await supabase.from("ebooks").update({ cover_url: publicUrl, updated_at: new Date().toISOString() }).eq("id", result.ebook_id);
              }
            } catch (coverErr) {
              console.error("Cover generation failed:", coverErr);
              // Non-fatal — continue without cover
            }
          }

        } else if (step === "generate_images") {
          if (!config.generateImages) {
            // Skip image generation
          } else {
            const chapters = result.chapters || [];
            const outline = result.outline || {};
            let imagesGenerated = 0;

            for (let j = 0; j < chapters.length; j++) {
              // Check timeout before each image
              if (isNearTimeout()) {
                console.warn(`Near timeout during image ${j}/${chapters.length}, stopping image generation`);
                hitTimeout = true;
                break;
              }

              const ch = chapters[j];
              await updateJob(supabase, job_id, {
                progress: Math.round(70 + ((j + 1) / chapters.length) * 25),
              });

              try {
                const imgPrompt = `Create an atmospheric illustration for "${ch.title}" from book "${outline.title || config.prompt}". Style: editorial. No text.`;
                const base64 = await generateImage(LOVABLE_API_KEY, imgPrompt);
                const filePath = `ai-generated/${result.ebook_id || "misc"}/chapter-${ch.id}_${Date.now()}.png`;
                const publicUrl = await uploadBase64Image(supabase, base64, filePath);
                chapters[j] = { ...chapters[j], cover_image: publicUrl };
                imagesGenerated++;
              } catch (imgErr) {
                console.error(`Image gen failed for chapter ${j}:`, imgErr);
                // Continue — partial images are acceptable
              }

              // Delay between image generations to avoid rate limits
              if (j < chapters.length - 1) await delay(1000);
            }

            console.log(`Generated ${imagesGenerated}/${chapters.length} chapter images`);
            result.chapters = chapters;

            if (result.ebook_id) {
              await supabase.from("ebooks").update({
                chapters,
                updated_at: new Date().toISOString(),
              }).eq("id", result.ebook_id);
            }
          }

        } else if (step === "finalize") {
          // Always mark ebook as draft (ready for editing) — even on partial completion
          if (result.ebook_id) {
            await supabase.from("ebooks").update({
              status: "draft",
              updated_at: new Date().toISOString(),
            }).eq("id", result.ebook_id);
          }
        }

        // Mark step as completed
        stepsCompleted.push(step);
        await updateJob(supabase, job_id, {
          steps_completed: stepsCompleted,
          result,
          progress: progressPct,
        });

      } catch (stepErr: any) {
        console.error(`Step ${step} failed:`, stepErr);

        // For non-critical steps (cover, images), save progress and continue to finalize
        if (step === "generate_cover" || step === "generate_images") {
          console.warn(`Non-critical step ${step} failed, continuing to finalize`);
          stepsCompleted.push(step);
          await updateJob(supabase, job_id, {
            steps_completed: stepsCompleted,
            result,
            progress: progressPct,
          });
          continue;
        }

        await updateJob(supabase, job_id, {
          status: "failed",
          error_step: step,
          error_message: stepErr.message || "Unknown error",
          result,
          steps_completed: stepsCompleted,
        });

        // Mark ebook as generation_failed
        if (result.ebook_id || job.ebook_id) {
          await supabase.from("ebooks").update({
            status: "generation_failed",
            updated_at: new Date().toISOString(),
          }).eq("id", result.ebook_id || job.ebook_id);
        }

        return new Response(JSON.stringify({ status: "failed", error_step: step, error: stepErr.message }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // All steps completed (or partial due to timeout)
    const finalStatus = hitTimeout ? "completed" : "completed"; // Still mark as completed — content is usable
    await updateJob(supabase, job_id, {
      status: finalStatus,
      progress: 100,
      current_step: null,
      error_message: hitTimeout ? "Geração parcial: algumas imagens podem não ter sido geradas devido a tempo limite." : null,
    });

    return new Response(JSON.stringify({ status: finalStatus, ebook_id: result.ebook_id, partial: hitTimeout }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("ebook-generate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
