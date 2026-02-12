import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendMessageRequest {
  conversationId: string;
  message: string;
  channel?: string; // sms, email, whatsapp, etc.
  phone?: string; // For new outbound messages
  instagramUsername?: string; // For new Instagram DMs
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { conversationId, message, channel, phone, instagramUsername }: SendMessageRequest = await req.json();

    console.log("[GHL-SEND] Received request", { conversationId, messageLength: message?.length, channel, phone, instagramUsername });

    if (!conversationId || !message) {
      return new Response(
        JSON.stringify({ error: "Missing conversationId or message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Get conversation with lead/contact and GHL details
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select(`
        id,
        workspace_id,
        lead_id,
        contact_id,
        channel,
        channel_metadata,
        lead:leads(id, ghl_contact_id, phone, email),
        contact:contacts(id, ghl_contact_id, phone, email)
      `)
      .eq("id", conversationId)
      .single();

    if (convError || !conversation) {
      console.error("[GHL-SEND] Conversation not found", convError);
      return new Response(
        JSON.stringify({ error: "Conversation not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Get GHL contact ID from lead or contact
    const leadData = conversation.lead as unknown;
    const contactData = conversation.contact as unknown;
    const lead = (Array.isArray(leadData) ? leadData[0] : leadData) as { id: string; ghl_contact_id: string | null; phone: string | null; email: string | null } | null;
    const contact = (Array.isArray(contactData) ? contactData[0] : contactData) as { id: string; ghl_contact_id: string | null; phone: string | null; email: string | null } | null;
    
    const ghlContactId = lead?.ghl_contact_id || contact?.ghl_contact_id;
    const channelMetadata = conversation.channel_metadata as Record<string, unknown> | null;
    const ghlConversationId = channelMetadata?.ghl_conversation_id as string | undefined;
    
    // Also try to get from channel_metadata
    const metaGhlContactId = channelMetadata?.ghl_contact_id as string | undefined;
    let finalGhlContactId = ghlContactId || metaGhlContactId;

    // If no GHL contact exists, we need to create one first
    if (!finalGhlContactId) {
      console.log("[GHL-SEND] No GHL contact ID found, attempting to create contact in GHL");
      
      // First, get GHL config (we'll need it for creating contact)
      const { data: configForCreate, error: configCreateError } = await supabase
        .from("workspace_ghl_config")
        .select("ghl_location_id, ghl_api_key_encrypted")
        .eq("workspace_id", conversation.workspace_id)
        .eq("is_active", true)
        .maybeSingle();

      if (configCreateError || !configForCreate?.ghl_api_key_encrypted) {
        console.error("[GHL-SEND] Cannot create contact - GHL not configured");
        return new Response(
          JSON.stringify({ error: "GHL integration not configured" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const ghlBaseUrl = "https://services.leadconnectorhq.com";
      
      // Build contact payload based on available data
      const contactPayload: Record<string, unknown> = {
        locationId: configForCreate.ghl_location_id,
      };
      
      // Add phone if available
      const contactPhone = phone || lead?.phone || contact?.phone;
      if (contactPhone) {
        contactPayload.phone = contactPhone;
      }
      
      // Add email if available
      const contactEmail = lead?.email || contact?.email;
      if (contactEmail) {
        contactPayload.email = contactEmail;
      }
      
      // Get name from lead/contact
      const leadObj = conversation.lead as { name?: string } | null;
      const contactObj = conversation.contact as { name?: string } | null;
      const fullName = (Array.isArray(leadObj) ? leadObj[0]?.name : leadObj?.name) || 
                       (Array.isArray(contactObj) ? contactObj[0]?.name : contactObj?.name) || "";
      
      // GHL requires at least firstName or lastName (does not accept just "name")
      if (fullName && !fullName.startsWith("@")) {
        const nameParts = fullName.trim().split(" ");
        contactPayload.firstName = nameParts[0];
        if (nameParts.length > 1) {
          contactPayload.lastName = nameParts.slice(1).join(" ");
        }
      } else if (instagramUsername) {
        // For Instagram without real name, use username as firstName
        contactPayload.firstName = instagramUsername;
        contactPayload.lastName = "(Instagram)";
      } else if (contactPhone) {
        // For contacts with only phone
        contactPayload.firstName = "Contacto";
        contactPayload.lastName = contactPhone;
      } else {
        // Absolute fallback
        contactPayload.firstName = "Contacto";
        contactPayload.lastName = "Desconhecido";
      }
      
      // For Instagram, add tags and custom fields
      if (instagramUsername) {
        contactPayload.tags = ["instagram", `ig:${instagramUsername}`];
        contactPayload.customFields = [
          { key: "instagram_username", value: instagramUsername }
        ];
      }

      console.log("[GHL-SEND] Creating GHL contact", contactPayload);

      // Create contact in GHL
      const createContactResponse = await fetch(`${ghlBaseUrl}/contacts/`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${configForCreate.ghl_api_key_encrypted}`,
          "Version": "2021-07-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(contactPayload),
      });

      const createContactText = await createContactResponse.text();
      let createContactData: Record<string, unknown> = {};
      
      try {
        createContactData = JSON.parse(createContactText);
      } catch {
        console.error("[GHL-SEND] Failed to parse create contact response", createContactText);
      }

      if (!createContactResponse.ok) {
        console.error("[GHL-SEND] Failed to create GHL contact", { 
          status: createContactResponse.status, 
          response: createContactText 
        });
        
        // Check if it's a duplicate error - in that case, try to search for existing contact
        if (createContactResponse.status === 400 && createContactText.includes("duplicate")) {
          console.log("[GHL-SEND] Duplicate contact, searching for existing...");
          
          // Try to search by phone or email
          const searchQuery = contactPhone || contactEmail || instagramUsername;
          if (searchQuery) {
            const searchResponse = await fetch(
              `${ghlBaseUrl}/contacts/search?locationId=${configForCreate.ghl_location_id}&query=${encodeURIComponent(searchQuery)}`, 
              {
                method: "GET",
                headers: {
                  "Authorization": `Bearer ${configForCreate.ghl_api_key_encrypted}`,
                  "Version": "2021-07-28",
                },
              }
            );
            
            if (searchResponse.ok) {
              const searchData = await searchResponse.json();
              const foundContact = searchData.contacts?.[0];
              if (foundContact?.id) {
                finalGhlContactId = foundContact.id;
                console.log("[GHL-SEND] Found existing GHL contact", { finalGhlContactId });
              }
            }
          }
        }
        
        if (!finalGhlContactId) {
          return new Response(
            JSON.stringify({ error: "Failed to create contact in GHL", details: createContactData }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        // Contact created successfully
        finalGhlContactId = (createContactData.contact as Record<string, unknown>)?.id as string || 
                            createContactData.id as string;
        console.log("[GHL-SEND] Created GHL contact", { finalGhlContactId });
      }

      // Update the lead with the new GHL contact ID
      if (finalGhlContactId && conversation.lead_id) {
        await supabase
          .from("leads")
          .update({ 
            ghl_contact_id: finalGhlContactId,
            ghl_synced_at: new Date().toISOString()
          })
          .eq("id", conversation.lead_id);
        
        // Also update conversation metadata
        await supabase
          .from("conversations")
          .update({
            channel_metadata: {
              ...channelMetadata,
              ghl_contact_id: finalGhlContactId,
            }
          })
          .eq("id", conversationId);
          
        console.log("[GHL-SEND] Updated lead and conversation with GHL contact ID");
      }
    }

    if (!finalGhlContactId) {
      console.error("[GHL-SEND] Still no GHL contact ID after creation attempt", { conversationId });
      return new Response(
        JSON.stringify({ error: "Could not link or create GHL contact" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Get GHL config for workspace
    const { data: config, error: configError } = await supabase
      .from("workspace_ghl_config")
      .select("ghl_location_id, ghl_api_key_encrypted")
      .eq("workspace_id", conversation.workspace_id)
      .eq("is_active", true)
      .maybeSingle();

    if (configError || !config) {
      console.error("[GHL-SEND] GHL config not found", configError);
      return new Response(
        JSON.stringify({ error: "GHL integration not configured for this workspace" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!config.ghl_api_key_encrypted) {
      console.error("[GHL-SEND] GHL API key not configured");
      return new Response(
        JSON.stringify({ error: "GHL API key not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Use API key directly (stored as plain text in this implementation)
    // Note: For production, consider implementing proper encryption with Supabase Vault
    const ghlApiKey = config.ghl_api_key_encrypted;

    // 5. Determine message type based on channel
    const messageChannel = channel || conversation.channel || "sms";
    const ghlMessageType = mapChannelToGHLType(messageChannel);

    console.log("[GHL-SEND] Sending to GHL", { 
      ghlContactId: finalGhlContactId, 
      ghlConversationId,
      messageType: ghlMessageType,
      channel: messageChannel
    });

    // 6. Send message to GHL API
    // GHL Conversations API: POST /conversations/messages
    const ghlBaseUrl = "https://services.leadconnectorhq.com";
    
    // First, try to get or create a GHL conversation if we don't have one
    let targetConversationId = ghlConversationId;
    
    if (!targetConversationId) {
      // Create conversation with GHL
      const createConvResponse = await fetch(`${ghlBaseUrl}/conversations/`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ghlApiKey}`,
          "Version": "2021-04-15",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          locationId: config.ghl_location_id,
          contactId: finalGhlContactId,
        }),
      });

      if (createConvResponse.ok) {
        const convData = await createConvResponse.json();
        targetConversationId = convData.conversation?.id || convData.id;
        console.log("[GHL-SEND] Created GHL conversation", { targetConversationId });
      } else {
        const errorText = await createConvResponse.text();
        console.error("[GHL-SEND] Failed to create GHL conversation", { 
          status: createConvResponse.status, 
          error: errorText 
        });
      }
    }

    // Send message via GHL Messages API
    const sendMessageUrl = `${ghlBaseUrl}/conversations/messages`;
    
    const ghlPayload: Record<string, unknown> = {
      type: ghlMessageType,
      contactId: finalGhlContactId,
      message: message,
    };

    // Add conversation ID if we have one
    if (targetConversationId) {
      ghlPayload.conversationId = targetConversationId;
    }

    console.log("[GHL-SEND] Sending payload", ghlPayload);

    const sendResponse = await fetch(sendMessageUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ghlApiKey}`,
        "Version": "2021-04-15",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(ghlPayload),
    });

    const responseText = await sendResponse.text();
    let responseData: Record<string, unknown> = {};
    
    try {
      responseData = JSON.parse(responseText);
    } catch {
      console.log("[GHL-SEND] Non-JSON response", responseText);
    }

    if (!sendResponse.ok) {
      console.error("[GHL-SEND] GHL API error", { 
        status: sendResponse.status, 
        response: responseText 
      });
      
      // Detect Instagram-specific error - user hasn't initiated contact
      if (responseText.includes("no Instagram id") || responseText.includes("skipping")) {
        return new Response(
          JSON.stringify({ 
            error: "O contacto não tem uma conta Instagram vinculada no GHL. O Instagram só permite respostas a mensagens recebidas.",
            ghlStatus: sendResponse.status,
            details: responseData
          }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Try to provide a helpful error message
      const errorMessage = (responseData?.message as string) || 
                          (responseData?.error as string) || 
                          `GHL API returned ${sendResponse.status}`;
      
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          ghlStatus: sendResponse.status,
          details: responseData
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[GHL-SEND] Message sent successfully", responseData);

    const ghlMessageId = (responseData?.messageId as string) || 
                         (responseData?.id as string) || 
                         `ghl_out_${Date.now()}`;

    // 7. Save message to our database
    const { data: savedMessage, error: saveError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        workspace_id: conversation.workspace_id,
        content: message,
        direction: "outbound",
        sent_at: new Date().toISOString(),
        delivered_at: new Date().toISOString(),
        ghl_message_id: ghlMessageId,
        external_message_id: ghlMessageId,
      })
      .select("id")
      .single();

    if (saveError) {
      console.error("[GHL-SEND] Failed to save message locally", saveError);
      // Don't fail - message was sent to GHL successfully
    }

    // 8. Update conversation
    await supabase
      .from("conversations")
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: message.substring(0, 100),
        updated_at: new Date().toISOString(),
        // Update channel_metadata with GHL conversation ID if we created one
        ...(targetConversationId && !ghlConversationId ? {
          channel_metadata: {
            ...channelMetadata,
            ghl_conversation_id: targetConversationId,
          }
        } : {})
      })
      .eq("id", conversationId);

    // 9. Update lead's last_contact_at
    if (conversation.lead_id) {
      await supabase
        .from("leads")
        .update({ last_contact_at: new Date().toISOString() })
        .eq("id", conversation.lead_id);
    }

    // 10. Log sync event
    await supabase
      .from("ghl_sync_log")
      .insert({
        workspace_id: conversation.workspace_id,
        ghl_entity_type: "message_outbound",
        ghl_entity_id: ghlMessageId,
        fastcrm_entity_type: "message",
        fastcrm_entity_id: savedMessage?.id || conversationId,
        event_type: "sent",
        payload: { message, channel: messageChannel, ghlContactId: finalGhlContactId }
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: savedMessage?.id,
        ghlMessageId,
        ghlConversationId: targetConversationId
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[GHL-SEND] Unexpected error", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Map our channel names to GHL message types
function mapChannelToGHLType(channel: string): string {
  const typeMap: Record<string, string> = {
    "sms": "SMS",
    "whatsapp": "WhatsApp",
    "email": "Email",
    "messenger": "FB",
    "facebook": "FB",
    "instagram": "IG",
    "ig": "IG",
    "chat": "Live_Chat",
    "live_chat": "Live_Chat",
    "call": "SMS",
    "phone": "SMS",
    "other": "SMS",
    "google": "GMB",
  };
  
  return typeMap[channel.toLowerCase()] || "SMS";
}
