import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-workspace-id, x-idempotency-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_SIZE_BYTES = 524_288_000; // 500MB
const ALLOWED_TYPES = [
  "audio/mpeg", "audio/wav", "audio/webm", "audio/ogg", "audio/mp4",
  "video/mp4", "video/webm", "video/quicktime",
];

function errorResponse(status: number, error: string, message: string) {
  return new Response(
    JSON.stringify({ success: false, error, message }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse(401, "UNAUTHORIZED", "Missing or invalid Authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return errorResponse(401, "UNAUTHORIZED", "Invalid token");
    }

    const userId = claimsData.claims.sub as string;

    // 2. Get workspace ID
    const workspaceId = req.headers.get("X-Workspace-Id");
    if (!workspaceId) {
      return errorResponse(400, "VALIDATION_ERROR", "X-Workspace-Id header required");
    }

    // 3. Validate workspace membership
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: membership, error: memberError } = await adminClient
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .maybeSingle();

    if (memberError || !membership) {
      return errorResponse(403, "FORBIDDEN", "Not a member of this workspace");
    }

    // 4. Parse body
    const body = await req.json();
    const { meeting_id, filename, content_type, size_bytes } = body;

    if (!meeting_id || !filename || !content_type) {
      return errorResponse(400, "VALIDATION_ERROR", "meeting_id, filename, and content_type are required");
    }

    if (!ALLOWED_TYPES.includes(content_type)) {
      return errorResponse(400, "VALIDATION_ERROR", `Invalid content_type. Allowed: ${ALLOWED_TYPES.join(", ")}`);
    }

    if (typeof size_bytes === "number" && (size_bytes <= 0 || size_bytes > MAX_SIZE_BYTES)) {
      return errorResponse(400, "VALIDATION_ERROR", `size_bytes must be between 1 and ${MAX_SIZE_BYTES}`);
    }

    // 5. Look up meeting for CRM entities
    const { data: meeting, error: meetingError } = await adminClient
      .from("meetings")
      .select("id, contact_id, company_id, opportunity_id, workspace_id")
      .eq("id", meeting_id)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (meetingError || !meeting) {
      return errorResponse(404, "NOT_FOUND", "Meeting not found in this workspace");
    }

    // 6. Create or update meeting_recordings row
    const { data: existingRecording } = await adminClient
      .from("meeting_recordings")
      .select("id")
      .eq("meeting_id", meeting_id)
      .maybeSingle();

    let recordingId: string;

    if (existingRecording) {
      recordingId = existingRecording.id;
      await adminClient
        .from("meeting_recordings")
        .update({
          status: "uploading",
          file_size_bytes: size_bytes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", recordingId);
    } else {
      const { data: newRec, error: insertErr } = await adminClient
        .from("meeting_recordings")
        .insert({
          workspace_id: workspaceId,
          meeting_id: meeting_id,
          status: "uploading",
          file_size_bytes: size_bytes || null,
        })
        .select("id")
        .single();

      if (insertErr || !newRec) {
        console.error("Failed to create recording row:", insertErr);
        return errorResponse(500, "INTERNAL_ERROR", "Failed to create recording entry");
      }
      recordingId = newRec.id;
    }

    // 7. Generate signed upload URL
    const storagePath = `workspaces/${workspaceId}/recordings/${recordingId}/${filename}`;

    const { data: signedData, error: signedError } = await adminClient.storage
      .from("call-recordings")
      .createSignedUploadUrl(storagePath);

    if (signedError || !signedData) {
      console.error("Failed to create signed URL:", signedError);
      return errorResponse(500, "INTERNAL_ERROR", "Failed to generate upload URL");
    }

    // Update file_url on the recording
    const fileUrl = `${supabaseUrl}/storage/v1/object/call-recordings/${storagePath}`;
    await adminClient
      .from("meeting_recordings")
      .update({ file_url: fileUrl })
      .eq("id", recordingId);

    // 8. Auto-create CRM links from meeting
    const crmLinks: { entity_type: string; entity_id: string; entity_name: string | null }[] = [];

    const linkEntities = [
      { type: "contact", id: meeting.contact_id, table: "contacts", nameField: "name" },
      { type: "company", id: meeting.company_id, table: "companies", nameField: "name" },
      { type: "opportunity", id: meeting.opportunity_id, table: "opportunities", nameField: "title" },
    ];

    for (const entity of linkEntities) {
      if (!entity.id) continue;

      let entityName: string | null = null;
      try {
        const { data: entityData } = await adminClient
          .from(entity.table)
          .select(entity.nameField)
          .eq("id", entity.id)
          .maybeSingle();
        entityName = entityData?.[entity.nameField] || null;
      } catch {
        // Non-critical
      }

      const { error: linkErr } = await adminClient
        .from("recording_crm_links")
        .upsert(
          {
            recording_id: recordingId,
            workspace_id: workspaceId,
            entity_type: entity.type,
            entity_id: entity.id,
            entity_name: entityName,
            linked_by: "auto",
          },
          { onConflict: "recording_id,entity_type,entity_id", ignoreDuplicates: true }
        );

      if (!linkErr) {
        crmLinks.push({ entity_type: entity.type, entity_id: entity.id, entity_name: entityName });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          recording_id: recordingId,
          signed_upload_url: signedData.signedUrl,
          storage_path: storagePath,
          file_url: fileUrl,
          crm_links: crmLinks,
          expires_in_seconds: 600,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("recording-upload error:", err);
    return errorResponse(500, "INTERNAL_ERROR", "Internal server error");
  }
});
