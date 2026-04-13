import { aiGate } from '../_shared/ai-gate.ts';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { decode as base64Decode, encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_IMAGE_DIM = 1568; // Anthropic recommends max 1568px for multi-image; well under 2000px limit

/**
 * Resize a base64-encoded image so neither dimension exceeds MAX_IMAGE_DIM.
 * Uses a simple approach: fetch the image as a blob, decode dimensions, 
 * and if oversized, re-encode at smaller size using Canvas API (not available in Deno).
 * 
 * For Deno we use a different approach: we parse JPEG/PNG headers to get dimensions,
 * and if oversized, we use the image_url detail parameter to let Anthropic resize.
 */
function getJpegDimensions(data: Uint8Array): { width: number; height: number } | null {
  let i = 2; // skip SOI marker
  while (i < data.length - 1) {
    if (data[i] !== 0xFF) return null;
    const marker = data[i + 1];
    if (marker === 0xD9) return null; // EOI
    if (marker === 0xC0 || marker === 0xC1 || marker === 0xC2) {
      // SOF marker
      const height = (data[i + 5] << 8) | data[i + 6];
      const width = (data[i + 7] << 8) | data[i + 8];
      return { width, height };
    }
    const segLen = (data[i + 2] << 8) | data[i + 3];
    i += 2 + segLen;
  }
  return null;
}

function getPngDimensions(data: Uint8Array): { width: number; height: number } | null {
  // PNG header: 8 bytes signature, then IHDR chunk
  if (data[0] !== 0x89 || data[1] !== 0x50) return null;
  const width = (data[16] << 24) | (data[17] << 16) | (data[18] << 8) | data[19];
  const height = (data[20] << 24) | (data[21] << 16) | (data[22] << 8) | data[23];
  return { width, height };
}

function getImageDimensions(base64Data: string, mimeType: string): { width: number; height: number } | null {
  try {
    const bytes = base64Decode(base64Data);
    if (mimeType.includes("jpeg") || mimeType.includes("jpg")) {
      return getJpegDimensions(bytes);
    }
    if (mimeType.includes("png")) {
      return getPngDimensions(bytes);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Count images in messages and check if any exceed the limit.
 * If so, add "detail: low" to force Anthropic to resize them.
 */
function preprocessMessages(messages: any[]): any[] {
  let imageCount = 0;

  // First pass: count images
  for (const msg of messages) {
    if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === "image_url" || part.type === "image") {
          imageCount++;
        }
      }
    }
  }

  // If multiple images, enforce size limits
  if (imageCount <= 1) return messages;

  return messages.map((msg: any) => {
    if (!Array.isArray(msg.content)) return msg;

    const newContent = msg.content.map((part: any) => {
      if (part.type === "image_url" && part.image_url) {
        const url = part.image_url.url || "";
        const dataMatch = url.match(/^data:image\/([\w+]+);base64,(.+)$/s);

        if (dataMatch) {
          const mimeType = dataMatch[1];
          const b64Data = dataMatch[2];
          const dims = getImageDimensions(b64Data, mimeType);

          if (dims && (dims.width > MAX_IMAGE_DIM || dims.height > MAX_IMAGE_DIM)) {
            // Tell Anthropic to auto-resize by setting detail to "low"
            return {
              ...part,
              image_url: {
                ...part.image_url,
                detail: "low",
              },
            };
          }
        }

        return part;
      }
      return part;
    });

    return { ...msg, content: newContent };
  });
}

/**
 * Convert OpenAI-style image_url content blocks to Anthropic's native format.
 * Anthropic uses { type: "image", source: { type: "base64", media_type, data } }
 */
function convertToAnthropicFormat(messages: any[]): any[] {
  return messages.map((msg: any) => {
    if (!Array.isArray(msg.content)) return msg;

    const newContent = msg.content.map((part: any) => {
      if (part.type === "image_url" && part.image_url?.url) {
        const url = part.image_url.url;
        const dataMatch = url.match(/^data:image\/([\w+]+);base64,(.+)$/s);

        if (dataMatch) {
          const mediaType = `image/${dataMatch[1]}`;
          const data = dataMatch[2];
          return {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data,
            },
          };
        }

        // URL-based image — use Anthropic's url source
        return {
          type: "image",
          source: {
            type: "url",
            url,
          },
        };
      }
      return part;
    });

    return { ...msg, content: newContent };
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "ANTHROPIC_API_KEY is not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const {
      messages,
      model = "claude-sonnet-4-20250514",
      system,
      max_tokens = 4096,
      stream = false,
      tools,
      tool_choice,
      workspace_id,
      user_id,
    } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // AI Gate — enforce credit consumption when workspace context is available
    if (workspace_id) {
      const gate = await aiGate(workspace_id, 'heavy', 'claude-chat', user_id);
      if (!gate.allowed) {
        return new Response(
          JSON.stringify({ success: false, error: 'quota_exceeded', upgrade_required: true }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Preprocess messages: handle oversized images for multi-image requests
    const processedMessages = preprocessMessages(messages);
    // Convert OpenAI-style image content blocks to Anthropic native format
    const anthropicMessages = convertToAnthropicFormat(processedMessages);

    // Build Anthropic API request
    const anthropicBody: Record<string, unknown> = {
      model,
      max_tokens,
      messages: anthropicMessages,
    };

    if (system) {
      anthropicBody.system = system;
    }

    if (tools) {
      anthropicBody.tools = tools;
    }

    if (tool_choice) {
      anthropicBody.tool_choice = tool_choice;
    }

    if (stream) {
      anthropicBody.stream = true;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(anthropicBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Anthropic API error:", response.status, errorText);

        if (response.status === 429) {
          return new Response(
            JSON.stringify({ success: false, error: "Rate limit exceeded. Aguarda um momento e tenta novamente." }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (response.status === 402 || response.status === 400) {
          return new Response(
            JSON.stringify({ success: false, error: `Anthropic API error: ${response.status} - ${errorText}` }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: false, error: `Anthropic API error: ${response.status}` }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Transform Anthropic SSE stream to OpenAI-compatible SSE format
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();

      (async () => {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            let newlineIndex: number;
            while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
              const line = buffer.slice(0, newlineIndex).trim();
              buffer = buffer.slice(newlineIndex + 1);

              if (!line.startsWith("data: ")) continue;
              const jsonStr = line.slice(6).trim();
              if (!jsonStr || jsonStr === "[DONE]") continue;

              try {
                const event = JSON.parse(jsonStr);
                
                // Convert Anthropic events to OpenAI-compatible format
                if (event.type === "content_block_delta" && event.delta?.text) {
                  const openaiEvent = {
                    choices: [{ delta: { content: event.delta.text } }],
                  };
                  await writer.write(
                    encoder.encode(`data: ${JSON.stringify(openaiEvent)}\n\n`)
                  );
                } else if (event.type === "message_stop") {
                  await writer.write(encoder.encode("data: [DONE]\n\n"));
                }
              } catch {
                // Skip malformed JSON
              }
            }
          }
          await writer.write(encoder.encode("data: [DONE]\n\n"));
        } catch (e) {
          console.error("Stream error:", e);
        } finally {
          await writer.close();
        }
      })();

      return new Response(readable, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Non-streaming request
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(anthropicBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Rate limit exceeded. Aguarda um momento e tenta novamente." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: `Anthropic API error: ${response.status} - ${errorText}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();

    // Extract text from Anthropic response format
    const textContent = data.content
      ?.filter((c: any) => c.type === "text")
      .map((c: any) => c.text)
      .join("") || "";

    return new Response(
      JSON.stringify({
        success: true,
        content: textContent,
        model: data.model,
        usage: data.usage,
        stop_reason: data.stop_reason,
        // Include full response for tool use cases
        raw: data,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("claude-chat error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
