import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";
import {
  InstagramApiError,
  collectUsernames,
  findCursor,
  looterGet,
  parseProfile,
} from "../_shared/instagramLooter.ts";
import { extractContactsFromBio } from "../_shared/instagramContacts.ts";
import {
  firecrawlProfile,
  firecrawlSearchUsernames,
  type FirecrawlProfileResult,
} from "../_shared/instagramFirecrawl.ts";

const log = (step: string, details?: unknown) =>
  console.log(`[IG-EXTRACT-WORKER] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);

/** Limites por execução — mantêm o trabalho dentro do tempo da função. */
const PROFILES_PER_RUN = 12;
const LEASE_SECONDS = 180;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  let jobId: string | null = null;

  try {
    const body = await req.json().catch(() => null);
    jobId = typeof body?.jobId === "string" ? body.jobId : null;
    if (!jobId) return json({ success: false, error: "jobId em falta" }, 400);

    const apiKey = Deno.env.get("RAPIDAPI_KEY") ?? null;
    const hasFirecrawl = !!Deno.env.get("FIRECRAWL_API_KEY");

    const { data: job } = await admin
      .from("instagram_extraction_jobs")
      .select("*")
      .eq("id", jobId)
      .maybeSingle();

    if (!job) return json({ success: false, error: "Trabalho não encontrado" }, 404);

    // Guarda de estado: pausado/cancelado/terminado não trabalha
    if (["paused", "cancelled", "completed", "failed"].includes(job.status)) {
      return json({ success: true, skipped: job.status });
    }

    // Requisitos por origem: cada origem depende do serviço que a alimenta
    const needsApi = ["followers", "following", "hashtag", "location"].includes(job.source);
    const missing = needsApi && !apiKey
      ? "A recolha por seguidores, hashtag ou localização exige a API de Instagram configurada."
      : job.source === "web_search" && !hasFirecrawl
      ? "A pesquisa web exige o Firecrawl ligado ao projeto."
      : !apiKey && !hasFirecrawl
      ? "Nenhum serviço de recolha está configurado."
      : null;

    if (missing) {
      await admin
        .from("instagram_extraction_jobs")
        .update({
          status: "failed",
          error: missing,
          lease_until: null,
          finished_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);
      return json({ success: false, error: missing }, 200);
    }

    // Single-flight: só avança quem conseguir a lease
    const nowIso = new Date().toISOString();
    const leaseUntil = new Date(Date.now() + LEASE_SECONDS * 1000).toISOString();
    const { data: claimed } = await admin
      .from("instagram_extraction_jobs")
      .update({ status: "running", lease_until: leaseUntil, updated_at: nowIso })
      .eq("id", jobId)
      .or(`lease_until.is.null,lease_until.lt.${nowIso}`)
      .select("id")
      .maybeSingle();

    if (!claimed) return json({ success: true, skipped: "locked" });

    let queued = job.queued_count as number;
    let listingDone = job.listing_done as boolean;
    let cursor = job.next_cursor as string | null;
    let found = job.found_count as number;
    let processed = job.processed_count as number;
    let rateLimited = false;

    // ---------- 1) Listagem (uma página por execução) ----------
    if (!listingDone && queued < job.limit_count) {
      try {
        let payload: unknown;
        if (job.source === "followers" || job.source === "following") {
          const profile = parseProfile(
            await looterGet("/profile", { username: job.target }, apiKey),
            job.target,
          );
          if (!profile.userId) throw new Error("Perfil não encontrado ou privado");
          const params: Record<string, string> = { id: profile.userId, count: "50" };
          if (cursor) params.end_cursor = cursor;
          payload = await looterGet(
            job.source === "followers" ? "/followers" : "/following",
            params,
            apiKey,
          );
        } else if (job.source === "hashtag") {
          const params: Record<string, string> = { hashtag: job.target };
          if (cursor) params.end_cursor = cursor;
          payload = await looterGet("/hashtag-medias", params, apiKey);
        } else {
          const params: Record<string, string> = { id: job.target };
          if (cursor) params.end_cursor = cursor;
          payload = await looterGet("/location-medias", params, apiKey);
        }

        const usernames = collectUsernames(payload).filter((u) => u !== job.target);
        const page = findCursor(payload);
        const room = Math.max(0, job.limit_count - queued);
        const slice = usernames.slice(0, room);

        if (slice.length > 0) {
          const rows = slice.map((username) => ({
            job_id: job.id,
            workspace_id: job.workspace_id,
            username: username.toLowerCase(),
          }));
          await admin
            .from("instagram_extraction_items")
            .upsert(rows, { onConflict: "job_id,username", ignoreDuplicates: true });
        }

        const { count } = await admin
          .from("instagram_extraction_items")
          .select("id", { count: "exact", head: true })
          .eq("job_id", job.id);
        queued = count ?? queued + slice.length;

        cursor = page.cursor;
        listingDone = !page.hasNext || !page.cursor || queued >= job.limit_count;
        log("Listing page", { queued, listingDone, added: slice.length });
      } catch (error) {
        if (error instanceof InstagramApiError && error.fatal) {
          await admin
            .from("instagram_extraction_jobs")
            .update({
              status: "failed",
              error: error.message,
              lease_until: null,
              finished_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", job.id);
          return json({ success: false, error: error.message }, 200);
        }
        if (error instanceof InstagramApiError && error.status === 429) {
          rateLimited = true;
        } else {
          // Falha de listagem não apaga o já recolhido: fecha a listagem com nota
          listingDone = true;
          await admin
            .from("instagram_extraction_jobs")
            .update({ error: error instanceof Error ? error.message : String(error) })
            .eq("id", job.id);
        }
      }
    }

    // ---------- 2) Recolha de perfis ----------
    if (!rateLimited) {
      const { data: items } = await admin
        .from("instagram_extraction_items")
        .select("id, username, attempts")
        .eq("job_id", job.id)
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(PROFILES_PER_RUN);

      for (const item of items ?? []) {
        try {
          const profile = parseProfile(
            await looterGet("/profile", { username: item.username }, apiKey),
            item.username,
          );
          const contacts = extractContactsFromBio(profile.biography, profile.externalUrl);

          const { data: saved, error: saveError } = await admin
            .from("professional_prospecting_profiles")
            .upsert(
              {
                workspace_id: job.workspace_id,
                extraction_job_id: job.id,
                platform: "instagram",
                instagram_username: profile.username.toLowerCase(),
                profile_url: `https://www.instagram.com/${profile.username}/`,
                profile_link: `https://www.instagram.com/${profile.username}/`,
                profile_name: profile.fullName,
                profile_bio: profile.biography,
                profile_image_url: profile.profilePicUrl,
                instagram_followers_count: profile.followers,
                instagram_following_count: profile.following,
                instagram_posts_count: profile.posts,
                instagram_full_bio: profile.biography,
                instagram_external_url: profile.externalUrl,
                instagram_category: profile.category,
                instagram_is_verified: profile.isVerified,
                instagram_is_business: profile.isBusiness,
                instagram_enriched_at: new Date().toISOString(),
                instagram_raw_data: profile.raw as Record<string, unknown>,
                is_private: profile.isPrivate,
                inferred_location: profile.city,
                extracted_email: contacts.email,
                extracted_phone: contacts.phone,
                contact_source: contacts.source,
                status: "pending",
              },
              { onConflict: "workspace_id,instagram_username" },
            )
            .select("id")
            .maybeSingle();

          if (saveError) throw new Error(saveError.message);

          await admin
            .from("instagram_extraction_items")
            .update({
              status: "done",
              profile_id: saved?.id ?? null,
              processed_at: new Date().toISOString(),
              attempts: (item.attempts ?? 0) + 1,
            })
            .eq("id", item.id);

          processed += 1;
          found += 1;
        } catch (error) {
          if (error instanceof InstagramApiError && error.fatal) {
            await admin
              .from("instagram_extraction_jobs")
              .update({
                status: "failed",
                error: error.message,
                processed_count: processed,
                found_count: found,
                lease_until: null,
                finished_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("id", job.id);
            return json({ success: false, error: error.message }, 200);
          }
          if (error instanceof InstagramApiError && error.status === 429) {
            rateLimited = true;
            break;
          }
          const attempts = (item.attempts ?? 0) + 1;
          await admin
            .from("instagram_extraction_items")
            .update({
              status: attempts >= 3 ? "failed" : "pending",
              attempts,
              error: error instanceof Error ? error.message : String(error),
              processed_at: new Date().toISOString(),
            })
            .eq("id", item.id);
          if (attempts >= 3) processed += 1;
        }
      }
    }

    // ---------- 3) Estado e próxima passagem ----------
    const { count: pending } = await admin
      .from("instagram_extraction_items")
      .select("id", { count: "exact", head: true })
      .eq("job_id", job.id)
      .eq("status", "pending");

    const { data: fresh } = await admin
      .from("instagram_extraction_jobs")
      .select("status")
      .eq("id", job.id)
      .maybeSingle();

    const userStopped = fresh?.status === "paused" || fresh?.status === "cancelled";
    const hasWork = (pending ?? 0) > 0 || !listingDone;
    const done = !hasWork && !rateLimited;

    await admin
      .from("instagram_extraction_jobs")
      .update({
        status: userStopped ? fresh!.status : done ? "completed" : "running",
        queued_count: queued,
        processed_count: processed,
        found_count: found,
        next_cursor: cursor,
        listing_done: listingDone,
        lease_until: null,
        finished_at: done ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    if (!userStopped && hasWork) {
      // Arrefecimento antes da próxima passagem, e só porque há trabalho pendente
      const delay = rateLimited ? 30_000 : 1_500;
      setTimeout(() => {
        admin.functions
          .invoke("instagram-extract-worker", { body: { jobId: job.id } })
          .then(() => undefined, (e) => log("next hop failed", { error: String(e) }));
      }, delay);
      // Mantém a função viva o suficiente para disparar a próxima passagem
      await new Promise((r) => setTimeout(r, delay + 500));
    }

    log("Run finished", { jobId: job.id, processed, queued, pending, done });
    return json({ success: true, processed, queued, pending: pending ?? 0, done });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("ERROR", { message });
    if (jobId) {
      await admin
        .from("instagram_extraction_jobs")
        .update({ lease_until: null, error: message, updated_at: new Date().toISOString() })
        .eq("id", jobId);
    }
    return json({ success: false, error: message }, 500);
  }
});
