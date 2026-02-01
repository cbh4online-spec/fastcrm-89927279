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

interface ChunkResult {
  processedContent: string;
  topics: string[];
  faqs: { question: string; answer: string }[];
  categories: string[];
  summary: string;
}

const CHUNK_SIZE = 30000;
const MAX_TOTAL_CHARS = 100000;

// Main handler - returns immediately, processes in background
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let sourceId: string | undefined;
  
  try {
    const body: ProcessRequest = await req.json();
    sourceId = body.sourceId;
    const { filePath, fileName, mimeType, knowledgeBaseId, workspaceId } = body;

    console.log(`[KNOWLEDGE-DOC] Received request for: ${fileName}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Update status to processing immediately
    await supabase
      .from('knowledge_sources')
      .update({ 
        processing_status: 'processing',
        processing_error: 'A iniciar processamento em background...'
      })
      .eq('id', sourceId);

    // Start background processing with EdgeRuntime.waitUntil
    // This allows us to return immediately while processing continues
    (globalThis as any).EdgeRuntime.waitUntil(
      processDocumentInBackground(
        sourceId,
        filePath,
        fileName,
        mimeType,
        knowledgeBaseId,
        workspaceId
      ).catch(async (error) => {
        console.error("[KNOWLEDGE-DOC] Background processing error:", error);
        await supabase
          .from('knowledge_sources')
          .update({
            processing_status: 'failed',
            processing_error: error instanceof Error ? error.message : 'Background processing failed'
          })
          .eq('id', sourceId);
      })
    );

    // Return immediately
    return new Response(
      JSON.stringify({
        success: true,
        sourceId,
        message: 'Processing started in background'
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[KNOWLEDGE-DOC] Error:", error);
    
    // Update source with error if we have sourceId
    if (sourceId) {
      try {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        
        await supabase
          .from('knowledge_sources')
          .update({
            processing_status: 'failed',
            processing_error: error instanceof Error ? error.message : 'Unknown error'
          })
          .eq('id', sourceId);
      } catch {}
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Background processing function
async function processDocumentInBackground(
  sourceId: string,
  filePath: string,
  fileName: string,
  mimeType: string,
  knowledgeBaseId: string,
  workspaceId: string
) {
  console.log(`[KNOWLEDGE-DOC] Starting background processing: ${fileName}`);
  
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Update progress
  const updateProgress = async (message: string) => {
    await supabase
      .from('knowledge_sources')
      .update({ processing_error: message })
      .eq('id', sourceId);
  };

  await updateProgress('A descarregar ficheiro...');

  // Download file from storage - use streaming for large files
  const { data: fileData, error: downloadError } = await supabase.storage
    .from('knowledge-documents')
    .download(filePath);

  if (downloadError || !fileData) {
    throw new Error(`Failed to download file: ${downloadError?.message}`);
  }

  const fileSize = fileData.size;
  console.log(`[KNOWLEDGE-DOC] File size: ${(fileSize / 1024 / 1024).toFixed(2)}MB`);

  await updateProgress(`Ficheiro descarregado (${(fileSize / 1024 / 1024).toFixed(1)}MB). A extrair texto...`);

  let textContent = '';

  // Extract text based on mime type
  if (mimeType === 'text/plain') {
    textContent = await fileData.text();
  } else if (mimeType === 'application/pdf') {
    // For large PDFs, extract text in smaller batches
    textContent = await extractPDFContentStreaming(fileData, LOVABLE_API_KEY, fileSize, updateProgress);
  } else if (mimeType.includes('word') || mimeType.includes('document')) {
    const arrayBuffer = await fileData.arrayBuffer();
    textContent = await extractDocxContent(new Uint8Array(arrayBuffer));
  }

  if (!textContent || textContent.length < 10) {
    throw new Error('Could not extract text content from document');
  }

  console.log(`[KNOWLEDGE-DOC] Extracted ${textContent.length} characters`);
  await updateProgress(`Texto extraído (${textContent.length} caracteres). A processar com IA...`);

  // Get knowledge base type
  const { data: kb } = await supabase
    .from('knowledge_bases')
    .select('type')
    .eq('id', knowledgeBaseId)
    .single();

  // Process content in chunks
  const totalContent = textContent.slice(0, MAX_TOTAL_CHARS);
  const chunks = splitIntoChunks(totalContent, CHUNK_SIZE);
  
  console.log(`[KNOWLEDGE-DOC] Processing ${chunks.length} chunk(s)`);

  const allResults: ChunkResult[] = [];

  // Process each chunk
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`[KNOWLEDGE-DOC] Processing chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);
    
    await updateProgress(`A processar bloco ${i + 1} de ${chunks.length}...`);

    const result = await processChunkWithAI(
      chunk, 
      fileName, 
      kb?.type || 'general', 
      LOVABLE_API_KEY,
      i + 1,
      chunks.length
    );

    allResults.push(result);
  }

  // Merge results
  const mergedResult = mergeChunkResults(allResults);

  console.log(`[KNOWLEDGE-DOC] Total FAQs extracted: ${mergedResult.faqs.length}`);
  console.log(`[KNOWLEDGE-DOC] Total topics: ${mergedResult.topics.length}`);

  await updateProgress('A guardar resultados...');

  // Update source with processed content
  await supabase
    .from('knowledge_sources')
    .update({
      original_content: totalContent.slice(0, 50000),
      processed_content: mergedResult.processedContent,
      extracted_topics: mergedResult.topics,
      processing_status: 'completed',
      processing_error: null,
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
  if (mergedResult.faqs && mergedResult.faqs.length > 0) {
    const entries = mergedResult.faqs.map((faq) => ({
      knowledge_base_id: knowledgeBaseId,
      source_id: sourceId,
      workspace_id: workspaceId,
      entry_type: 'faq',
      title: faq.question,
      question: faq.question,
      content: faq.answer,
      summary: faq.answer.slice(0, 200),
      keywords: mergedResult.topics,
      category: mergedResult.categories?.[0],
      status: 'draft',
      created_by: sourceData?.created_by
    }));

    const { error: insertError } = await supabase.from('knowledge_entries').insert(entries);
    if (insertError) {
      console.error('[KNOWLEDGE-DOC] Error inserting entries:', insertError);
    }
  }

  // Create main article entry
  const { error: articleError } = await supabase.from('knowledge_entries').insert({
    knowledge_base_id: knowledgeBaseId,
    source_id: sourceId,
    workspace_id: workspaceId,
    entry_type: 'article',
    title: fileName.replace(/\.[^/.]+$/, ''),
    content: mergedResult.processedContent,
    summary: mergedResult.summary,
    keywords: mergedResult.topics,
    category: mergedResult.categories?.[0],
    status: 'draft',
    created_by: sourceData?.created_by
  });

  if (articleError) {
    console.error('[KNOWLEDGE-DOC] Error inserting article:', articleError);
  }

  console.log(`[KNOWLEDGE-DOC] Successfully processed: ${fileName}`);
}

// Streaming PDF extraction for large files
async function extractPDFContentStreaming(
  blob: Blob, 
  apiKey: string, 
  fileSize: number,
  updateProgress: (msg: string) => Promise<void>
): Promise<string> {
  const isLargePDF = fileSize > 20 * 1024 * 1024;
  
  console.log(`[KNOWLEDGE-DOC] PDF extraction - Size: ${(fileSize / 1024 / 1024).toFixed(2)}MB, Large: ${isLargePDF}`);

  // For very large files, we need to be more careful with memory
  if (isLargePDF) {
    await updateProgress('PDF grande detectado. A processar em modo optimizado...');
    
    // For files over 20MB, extract in portions to avoid memory issues
    // We'll take first 10MB worth of the file
    const maxBytes = 10 * 1024 * 1024;
    const portionBlob = blob.slice(0, maxBytes);
    const base64 = await blobToBase64(portionBlob);
    
    return await extractPDFFromBase64(base64, apiKey);
  }
  
  // For smaller files, process normally
  const base64 = await blobToBase64(blob);
  return await extractPDFFromBase64(base64, apiKey);
}

async function extractPDFFromBase64(base64: string, apiKey: string): Promise<string> {
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
              text: "Extract ALL text content from this PDF document. Include all details, numbers, prices, dates. Return only the text, preserving structure with paragraphs."
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
      max_tokens: 16000
    }),
  });

  if (!response.ok) {
    console.warn(`[KNOWLEDGE-DOC] PDF extraction failed: ${response.status}`);
    return "PDF document - text extraction requires manual review";
  }

  const result = await response.json();
  return result.choices?.[0]?.message?.content || "Could not extract PDF content";
}

function splitIntoChunks(text: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    let end = start + chunkSize;
    
    if (end < text.length) {
      const paragraphBreak = text.lastIndexOf('\n\n', end);
      const sentenceBreak = text.lastIndexOf('. ', end);
      
      if (paragraphBreak > start + chunkSize * 0.7) {
        end = paragraphBreak + 2;
      } else if (sentenceBreak > start + chunkSize * 0.7) {
        end = sentenceBreak + 2;
      }
    }
    
    chunks.push(text.slice(start, end).trim());
    start = end;
  }
  
  return chunks.filter(c => c.length > 0);
}

async function processChunkWithAI(
  content: string, 
  fileName: string, 
  kbType: string, 
  apiKey: string,
  chunkNum: number,
  totalChunks: number
): Promise<ChunkResult> {
  const isPartial = totalChunks > 1;
  
  const systemPrompt = `És um processador de conhecimento para CRM.
Analisa o documento fornecido e extrai informação estruturada.

Contexto: Base de conhecimento do tipo "${kbType}"
Nome do ficheiro: ${fileName}
${isPartial ? `NOTA: Esta é a parte ${chunkNum} de ${totalChunks} do documento. Extrai informação relevante desta secção.` : ''}

IMPORTANTE: Extrai TODOS os detalhes relevantes, incluindo:
- Preços, valores, custos
- Datas, horários, durações
- Localizações, moradas
- Requisitos, pré-requisitos
- Certificações, acreditações
- Público-alvo
- Metodologias, conteúdos programáticos
- Formadores, instrutores
- Materiais incluídos
- Formas de pagamento
- Contactos

Tarefas:
1. Resume o conteúdo principal preservando TODOS os dados específicos
2. Identifica tópicos/conceitos-chave
3. Gera FAQs relevantes (perguntas e respostas) baseadas no conteúdo
4. Sugere categorias para organização

Regras:
- Nunca inventes informação
- Mantém a precisão do conteúdo original
- PRESERVA números, preços, datas exatamente como aparecem
- Usa linguagem simples e acessível
- Foca no que é útil para atendimento, vendas ou suporte

Responde em JSON:
{
  "processedContent": "Conteúdo processado mantendo todos os detalhes...",
  "topics": ["tópico1", "tópico2"],
  "faqs": [
    { "question": "Pergunta?", "answer": "Resposta completa." }
  ],
  "categories": ["categoria1"],
  "summary": "Resumo em 2-3 frases com dados principais"
}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Processa este documento e extrai TODA a informação:\n\n${content}` }
      ],
      temperature: 0.2,
      max_tokens: 6000
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      return processChunkWithAI(content, fileName, kbType, apiKey, chunkNum, totalChunks);
    }
    throw new Error(`AI gateway error: ${response.status}`);
  }

  const aiResult = await response.json();
  const contentText = aiResult.choices?.[0]?.message?.content || "";

  try {
    const jsonMatch = contentText.match(/```json\n?([\s\S]*?)\n?```/) || 
                      contentText.match(/```\n?([\s\S]*?)\n?```/) ||
                      [null, contentText];
    return JSON.parse(jsonMatch[1] || contentText);
  } catch {
    return {
      processedContent: contentText,
      topics: [],
      faqs: [],
      categories: [],
      summary: contentText.slice(0, 200)
    };
  }
}

function mergeChunkResults(results: ChunkResult[]): ChunkResult {
  const allTopics = new Set<string>();
  const allCategories = new Set<string>();
  const allFaqs: { question: string; answer: string }[] = [];
  const processedContents: string[] = [];
  const summaries: string[] = [];

  for (const result of results) {
    if (result.processedContent) {
      processedContents.push(result.processedContent);
    }
    if (result.summary) {
      summaries.push(result.summary);
    }
    if (result.topics) {
      result.topics.forEach(t => allTopics.add(t));
    }
    if (result.categories) {
      result.categories.forEach(c => allCategories.add(c));
    }
    if (result.faqs) {
      for (const faq of result.faqs) {
        const isDuplicate = allFaqs.some(existing => 
          similarity(existing.question, faq.question) > 0.85
        );
        if (!isDuplicate) {
          allFaqs.push(faq);
        }
      }
    }
  }

  return {
    processedContent: processedContents.join('\n\n---\n\n'),
    topics: Array.from(allTopics).slice(0, 20),
    faqs: allFaqs,
    categories: Array.from(allCategories).slice(0, 10),
    summary: summaries.length > 0 
      ? summaries.join(' ').slice(0, 500) 
      : processedContents[0]?.slice(0, 200) || ''
  };
}

function similarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1.0;
  
  const costs: number[] = [];
  for (let i = 0; i <= shorter.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= longer.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (shorter.charAt(i - 1) !== longer.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[longer.length] = lastValue;
  }
  
  return (longer.length - costs[longer.length]) / longer.length;
}

async function blobToBase64(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function extractDocxContent(data: Uint8Array): Promise<string> {
  try {
    const decoder = new TextDecoder('utf-8');
    const content = decoder.decode(data);
    
    const xmlMatch = content.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
    if (xmlMatch) {
      const text = xmlMatch
        .map(match => match.replace(/<[^>]+>/g, ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (text.length > 100) {
        return text;
      }
    }
    
    let text = content
      .replace(/<[^>]+>/g, ' ')
      .replace(/[^\x20-\x7E\u00C0-\u024F\u1E00-\u1EFF]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    return text || 'Could not extract document content';
  } catch (error) {
    console.error('[KNOWLEDGE-DOC] DOCX extraction error:', error);
    return 'Document extraction failed';
  }
}
