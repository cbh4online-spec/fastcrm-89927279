const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ProfileInput {
  id: string;
  name: string;
  profession?: string;
  specialty?: string;
  bio?: string;
  location?: string;
  followers?: number;
  category?: string;
  isVerified?: boolean;
  isBusiness?: boolean;
  profileUrl?: string;
}

async function generateForProfile(
  profile: ProfileInput,
  tone: string,
  workspaceContext: Record<string, string> | null,
  serviceContext: Record<string, string> | null,
  supabaseUrl: string,
  anonKey: string,
): Promise<{ profileId: string; message: string; message_plain: string; error?: string }> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/generate-prospecting-message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${anonKey}`,
        "apikey": anonKey,
      },
      body: JSON.stringify({
        profile: {
          name: profile.name,
          profession: profile.profession,
          specialty: profile.specialty,
          bio: profile.bio,
          location: profile.location,
          followers: profile.followers,
          category: profile.category,
          isVerified: profile.isVerified,
          isBusiness: profile.isBusiness,
        },
        tone,
        workspaceContext,
        serviceContext,
        sequenceStep: 1,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return { profileId: profile.id, message: "", message_plain: "", error: `HTTP ${response.status}: ${text}` };
    }

    const data = await response.json();
    return {
      profileId: profile.id,
      message: data.message || "",
      message_plain: data.message_plain || "",
    };
  } catch (err) {
    return {
      profileId: profile.id,
      message: "",
      message_plain: "",
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { profiles, tone = "casual", workspaceContext, serviceContext } = await req.json();

    if (!Array.isArray(profiles) || profiles.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhum perfil fornecido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[PROSPECTING] Batch generate: ${profiles.length} profiles`);

    if (profiles.length > 20) {
      return new Response(JSON.stringify({ error: "Máximo 20 perfis por batch" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Process in batches of 5
    const BATCH_SIZE = 5;
    const results: Array<{ profileId: string; message: string; message_plain: string; error?: string }> = [];

    for (let i = 0; i < profiles.length; i += BATCH_SIZE) {
      const batch = profiles.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map((p: ProfileInput) =>
          generateForProfile(p, tone, workspaceContext, serviceContext, supabaseUrl, anonKey)
        )
      );

      for (const result of batchResults) {
        if (result.status === "fulfilled") {
          results.push(result.value);
        } else {
          results.push({
            profileId: "unknown",
            message: "",
            message_plain: "",
            error: result.reason?.message || "Failed",
          });
        }
      }
    }

    const errors = results.filter(r => r.error).length;
    console.log(`[PROSPECTING] Batch done: ${results.length} results, ${errors} errors`);

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[PROSPECTING] BATCH_GENERATE_FAILED", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
