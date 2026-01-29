import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProcessRequest {
  sourceId: string;
  filePath: string;
  fileName: string;
  mimeType: string;
  knowledgeBaseId: string;
  workspaceId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: ProcessRequest = await req.json();
    const { sourceId, filePath, fileName, mimeType, knowledgeBaseId, workspaceId } = body;

    console.log(`[KNOWLEDGE-DOC] Processing document: ${fileName}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Update status to processing
    await supabase
      .from('knowledge_sources')
      .update({ processing_status: 'processing' })
      .eq('id', sourceId);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('knowledge-documents')
      .download(filePath);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message}`);
    }

    let textContent = '';

    // Extract text based on mime type
    if (mimeType === 'text/plain') {
      textContent = await fileData.text();
    } else if (mimeType === 'application/pdf') {
      // For PDF, we'll use the AI to extract/summarize
      const base64 = await blobToBase64(fileData);
      textContent = await extractPDFContent(base64, LOVABLE_API_KEY);
    } else if (mimeType.includes('word') || mimeType.includes('document')) {
      // For Word docs, extract text (simplified - use docx library in production)
      const arrayBuffer = await fileData.arrayBuffer();
      textContent = await extractDocxContent(new Uint8Array(arrayBuffer));
    }

    if (!textContent || textContent.length < 10) {
      throw new Error('Could not extract text content from document');
    }

    console.log(`[KNOWLEDGE-DOC] Extracted ${textContent.length} characters`);

    // Get knowledge base type
    const { data: kb } = await supabase
      .from('knowledge_bases')
      .select('type')
      .eq('id', knowledgeBaseId)
      .single();

    // Process with AI to extract structured knowledge
    const systemPrompt = `És um processador de conhecimento para CRM.
Analisa o documento fornecido e extrai informação estruturada.

Contexto: Base de conhecimento do tipo "${kb?.type || 'general'}"
Nome do ficheiro: ${fileName}

Tarefas:
1. Resume o conteúdo principal em linguagem clara
2. Identifica tópicos/conceitos-chave
3. Gera FAQs relevantes (perguntas e respostas)
4. Sugere categorias para organização

Regras:
- Nunca inventes informação
- Mantém a precisão do conteúdo original
- Usa linguagem simples e acessível
- Foca no que é útil para atendimento, vendas ou suporte

Responde em JSON:
{
  "processedContent": "Conteúdo processado e resumido...",
  "topics": ["tópico1", "tópico2"],
  "faqs": [
    { "question": "Pergunta?", "answer": "Resposta." }
  ],
  "categories": ["categoria1"],
  "summary": "Resumo em 2-3 frases"
}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Processa este documento:\n\n${textContent.slice(0, 50000)}` }
        ],
        temperature: 0.3,
        max_tokens: 4000
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        await supabase
          .from('knowledge_sources')
          .update({ 
            processing_status: 'pending',
            processing_error: 'Rate limit - will retry'
          })
          .eq('id', sourceId);
        
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, will retry" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    const contentText = aiResult.choices?.[0]?.message?.content || "";

    let result;
    try {
      const jsonMatch = contentText.match(/```json\n?([\s\S]*?)\n?```/) || 
                        contentText.match(/```\n?([\s\S]*?)\n?```/) ||
                        [null, contentText];
      result = JSON.parse(jsonMatch[1] || contentText);
    } catch {
      result = {
        processedContent: contentText,
        topics: [],
        faqs: [],
        categories: [],
        summary: contentText.slice(0, 200)
      };
    }

    // Update source with processed content
    await supabase
      .from('knowledge_sources')
      .update({
        original_content: textContent.slice(0, 50000),
        processed_content: result.processedContent,
        extracted_topics: result.topics,
        processing_status: 'completed',
        last_processed_at: new Date().toISOString()
      })
      .eq('id', sourceId);

    // Get user from source
    const { data: sourceData } = await supabase
      .from('knowledge_sources')
      .select('created_by')
      .eq('id', sourceId)
      .single();

    // Create entries from FAQs
    if (result.faqs && result.faqs.length > 0) {
      const entries = result.faqs.map((faq: { question: string; answer: string }) => ({
        knowledge_base_id: knowledgeBaseId,
        source_id: sourceId,
        workspace_id: workspaceId,
        entry_type: 'faq',
        title: faq.question,
        question: faq.question,
        content: faq.answer,
        summary: faq.answer.slice(0, 200),
        keywords: result.topics,
        category: result.categories?.[0],
        status: 'draft',
        created_by: sourceData?.created_by
      }));

      const { error: insertError } = await supabase.from('knowledge_entries').insert(entries);
      if (insertError) {
        console.error('[KNOWLEDGE-DOC] Error inserting entries:', insertError);
      }
    }

    // Create main article entry from processed content
    const { error: articleError } = await supabase.from('knowledge_entries').insert({
      knowledge_base_id: knowledgeBaseId,
      source_id: sourceId,
      workspace_id: workspaceId,
      entry_type: 'article',
      title: fileName.replace(/\.[^/.]+$/, ''), // Remove extension
      content: result.processedContent,
      summary: result.summary,
      keywords: result.topics,
      category: result.categories?.[0],
      status: 'draft',
      created_by: sourceData?.created_by
    });

    if (articleError) {
      console.error('[KNOWLEDGE-DOC] Error inserting article:', articleError);
    }

    console.log(`[KNOWLEDGE-DOC] Successfully processed: ${fileName}`);

    return new Response(
      JSON.stringify({
        success: true,
        sourceId,
        entriesCreated: (result.faqs?.length || 0) + 1,
        topics: result.topics,
        summary: result.summary
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[KNOWLEDGE-DOC] Error:", error);
    
    // Update source with error
    try {
      const body = await (error as any).request?.json?.() || {};
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      
      if (body.sourceId) {
        await supabase
          .from('knowledge_sources')
          .update({
            processing_status: 'failed',
            processing_error: error instanceof Error ? error.message : 'Unknown error'
          })
          .eq('id', body.sourceId);
      }
    } catch {}
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function blobToBase64(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function extractPDFContent(base64: string, apiKey: string): Promise<string> {
  // Use vision model to extract text from PDF
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all text content from this PDF document. Return only the text, no formatting or commentary."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:application/pdf;base64,${base64}`
              }
            }
          ]
        }
      ],
      max_tokens: 8000
    }),
  });

  if (!response.ok) {
    // Fallback: just note that it's a PDF
    return "PDF document - text extraction requires manual review";
  }

  const result = await response.json();
  return result.choices?.[0]?.message?.content || "Could not extract PDF content";
}

async function extractDocxContent(data: Uint8Array): Promise<string> {
  // Basic DOCX extraction - look for document.xml content
  try {
    const decoder = new TextDecoder('utf-8');
    const text = decoder.decode(data);
    
    // DOCX is a ZIP file, try to find text patterns
    const textMatches = text.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
    if (textMatches) {
      return textMatches
        .map(match => match.replace(/<[^>]+>/g, ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
    
    // Fallback: extract any readable text
    return text.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 50000);
  } catch {
    return "Document content - text extraction requires manual review";
  }
}
