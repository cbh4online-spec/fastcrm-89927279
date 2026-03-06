import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Knowledge Document Trigger Processor
 * 
 * Processes large documents (>20MB) via Trigger.dev job queue.
 * This function is called by the trigger-dispatch system for heavy document processing.
 */

interface JobPayload {
  workspaceId: string;
  inputData: {
    sourceId: string;
    filePath: string;
    fileName: string;
    mimeType: string;
    knowledgeBaseId: string;
    fileSize: number;
  };
}

interface ChunkResult {
  processedContent: string;
  topics: string[];
  faqs: { question: string; answer: string }[];
  categories: string[];
  summary: string;
}

const CHUNK_SIZE = 30000;
const MAX_TOTAL_CHARS = 200000; // Higher limit for Trigger.dev (more time/memory available)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: JobPayload = await req.json();
    const { workspaceId, inputData } = body;
    
    // Validate required fields with fallbacks
    const sourceId = inputData?.sourceId;
    const filePath = inputData?.filePath;
    const fileName = inputData?.fileName || (filePath ? filePath.split('/').pop() : 'document');
    const mimeType = inputData?.mimeType || 'application/octet-stream';
    const knowledgeBaseId = inputData?.knowledgeBaseId;
    const fileSize = inputData?.fileSize || 0;
    
    if (!sourceId || !filePath) {
      throw new Error('Missing required fields: sourceId, filePath');
    }

    console.log(`[AI-DOCINT] Processing large document: ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)}MB)`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Update progress helper
    const updateProgress = async (message: string, status: 'processing' | 'completed' | 'failed' = 'processing') => {
      await supabase
        .from('knowledge_sources')
        .update({ 
          processing_status: status,
          processing_error: status === 'processing' ? message : (status === 'failed' ? message : null)
        })
        .eq('id', sourceId);
    };

    await updateProgress('A obter ficheiro do armazenamento...');

    // Get signed URL for file download
    const { data: urlData, error: urlError } = await supabase.storage
      .from('knowledge-documents')
      .createSignedUrl(filePath, 600); // 10 minutes for large files

    if (urlError || !urlData) {
      throw new Error(`Failed to get file URL: ${urlError?.message}`);
    }

    await updateProgress('A descarregar ficheiro completo...');

    // Download full file - Trigger.dev has more resources
    const response = await fetch(urlData.signedUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status}`);
    }

    const fileData = await response.blob();
    console.log(`[AI-DOCINT] Downloaded: ${(fileData.size / 1024 / 1024).toFixed(2)}MB`);

    await updateProgress('A extrair texto do documento...');

    let textContent = '';
    
    // Detect file type from extension if mimeType is generic
    const fileExtension = fileName.toLowerCase().split('.').pop() || '';
    const isPDF = mimeType === 'application/pdf' || mimeType.includes('pdf') || fileExtension === 'pdf';
    const isWord = mimeType.includes('word') || mimeType.includes('document') || fileExtension === 'docx' || fileExtension === 'doc';
    const isText = mimeType === 'text/plain' || fileExtension === 'txt';
    
    console.log(`[AI-DOCINT] Detecting file type - mimeType: ${mimeType}, extension: ${fileExtension}, isPDF: ${isPDF}, isWord: ${isWord}`);

    // Extract text based on mime type
    if (isText) {
      textContent = await fileData.text();
    } else if (isPDF) {
      console.log(`[AI-DOCINT] Starting PDF extraction for ${fileName}`);
      textContent = await extractPDFContent(fileData, LOVABLE_API_KEY, updateProgress);
      console.log(`[AI-DOCINT] PDF extraction returned ${textContent.length} characters`);
    } else if (isWord) {
      const arrayBuffer = await fileData.arrayBuffer();
      textContent = await extractDocxContent(new Uint8Array(arrayBuffer));
    } else {
      // Try PDF extraction as fallback for unknown types
      console.log(`[AI-DOCINT] Unknown type, trying PDF extraction as fallback`);
      textContent = await extractPDFContent(fileData, LOVABLE_API_KEY, updateProgress);
    }

    // Check if we got a limitation message instead of actual content
    const isLimitationMessage = textContent.includes('excede o limite') || textContent.includes('NOTA:');
    
    if (isLimitationMessage) {
      // Large file that couldn't be processed - save the message and mark as completed with warning
      console.log(`[AI-DOCINT] Large file limitation - saving info message`);

      // Emit DOCINT.MANUAL_REVIEW_REQUIRED kernel event
      await supabase.from('kernel_events').insert({
        workspace_id: workspaceId,
        type: 'DOCINT.MANUAL_REVIEW_REQUIRED',
        entity_kind: 'knowledge_source',
        entity_id: sourceId,
        source_module: 'ai-docint',
        actor_type: 'system',
        payload: { file_name: fileName, reason: 'File too large for automatic processing' },
        occurred_at: new Date().toISOString(),
        ingested_at: new Date().toISOString(),
        schema_version: 1,
      }).then(() => {});
      
      await supabase
        .from('knowledge_sources')
        .update({
          processed_content: textContent,
          processing_status: 'completed',
          processing_error: `Ficheiro muito grande (${(fileSize / 1024 / 1024).toFixed(0)}MB). Por favor, divida em ficheiros menores.`,
          last_processed_at: new Date().toISOString()
        })
        .eq('id', sourceId);
      
      // Create an info entry
      const { data: sourceData } = await supabase
        .from('knowledge_sources')
        .select('created_by')
        .eq('id', sourceId)
        .single();
      
      await supabase.from('knowledge_entries').insert({
        knowledge_base_id: knowledgeBaseId,
        source_id: sourceId,
        workspace_id: workspaceId,
        entry_type: 'article',
        title: `${fileName} - Ficheiro Grande`,
        content: textContent,
        summary: `Este ficheiro (${(fileSize / 1024 / 1024).toFixed(0)}MB) excede o limite de processamento automático. Considere dividir em partes menores.`,
        status: 'draft',
        created_by: sourceData?.created_by
      });
      
      return new Response(
        JSON.stringify({
          success: true,
          output: {
            sourceId,
            entriesCreated: 1,
            message: 'File too large for full processing - info entry created'
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!textContent || textContent.length < 10) {
      console.error(`[AI-DOCINT] Text extraction failed - length: ${textContent?.length || 0}`);
      throw new Error('Não foi possível extrair texto do documento');
    }

    console.log(`[AI-DOCINT] Extracted ${textContent.length} characters`);
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
    
    console.log(`[AI-DOCINT] Processing ${chunks.length} chunk(s)`);

    const allResults: ChunkResult[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`[AI-DOCINT] Processing chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);
      
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
      
      // Small delay between chunks to avoid rate limits
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const mergedResult = mergeChunkResults(allResults);

    console.log(`[AI-DOCINT] Total FAQs extracted: ${mergedResult.faqs.length}`);
    console.log(`[AI-DOCINT] Total topics: ${mergedResult.topics.length}`);

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
        console.error('[AI-DOCINT] Error inserting entries:', insertError);
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
      console.error('[AI-DOCINT] Error inserting article:', articleError);
    }

    console.log(`[AI-DOCINT] Successfully processed: ${fileName}`);

    // Emit DOCINT.EXTRACTED kernel event
    await supabase.from('kernel_events').insert({
      workspace_id: workspaceId,
      type: 'DOCINT.EXTRACTED',
      entity_kind: 'knowledge_source',
      entity_id: sourceId,
      source_module: 'ai-docint',
      actor_type: 'system',
      payload: {
        file_name: fileName,
        chars_extracted: totalContent.length,
        faqs_count: mergedResult.faqs?.length || 0,
        topics_count: mergedResult.topics?.length || 0,
      },
      occurred_at: new Date().toISOString(),
      ingested_at: new Date().toISOString(),
      schema_version: 1,
    }).then(() => {});

    return new Response(
      JSON.stringify({
        success: true,
        output: {
          sourceId,
          entriesCreated: (mergedResult.faqs?.length || 0) + 1,
          faqsExtracted: mergedResult.faqs?.length || 0,
          topicsIdentified: mergedResult.topics?.length || 0,
          charactersProcessed: totalContent.length,
          processingMode: chunks.length > 1 ? 'chunked' : 'full',
          summary: mergedResult.summary,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[AI-DOCINT] Error:', error);

    // Emit DOCINT.OCR_FAILED kernel event
    try {
      const body2 = await new Response(req.clone().body).json();
      if (body2?.inputData?.sourceId && body2?.workspaceId) {
        const sb = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );
        await sb.from('kernel_events').insert({
          workspace_id: body2.workspaceId,
          type: 'DOCINT.OCR_FAILED',
          entity_kind: 'knowledge_source',
          entity_id: body2.inputData.sourceId,
          source_module: 'ai-docint',
          actor_type: 'system',
          payload: { file_name: body2.inputData.fileName || 'unknown', error: error instanceof Error ? error.message : 'Unknown error' },
          occurred_at: new Date().toISOString(),
          ingested_at: new Date().toISOString(),
          schema_version: 1,
        }).then(() => {});
      }
    } catch {}
    
    // Try to update source status to failed
    try {
      const body = await new Response(req.clone().body).json();
      if (body?.inputData?.sourceId) {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );
        await supabase
          .from('knowledge_sources')
          .update({
            processing_status: 'failed',
            processing_error: error instanceof Error ? error.message : 'Erro no processamento'
          })
          .eq('id', body.inputData.sourceId);
      }
    } catch {}

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// PDF extraction using AI vision
// IMPORTANT: PDFs cannot be split into arbitrary byte chunks - they need complete structure
// Strategy: Send full PDF if small enough, otherwise truncate to max size that API can handle
async function extractPDFContent(
  blob: Blob, 
  apiKey: string,
  updateProgress: (msg: string) => Promise<void>
): Promise<string> {
  // Maximum PDF size that can be processed (~3MB file = ~4MB base64)
  const MAX_PDF_SIZE = 3 * 1024 * 1024; // 3MB
  
  console.log(`[AI-DOCINT] PDF size: ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
  
  // For very large PDFs, we can only process a portion
  // The beginning of the PDF typically contains the most important pages
  let pdfToProcess = blob;
  let isPartial = false;
  
  if (blob.size > MAX_PDF_SIZE) {
    console.log(`[AI-DOCINT] PDF too large, will process first ${(MAX_PDF_SIZE / 1024 / 1024).toFixed(0)}MB only`);
    isPartial = true;
    // Note: This truncation won't produce a valid PDF structure
    // We need to inform the user about this limitation
  }
  
  await updateProgress(isPartial 
    ? `PDF muito grande (${(blob.size / 1024 / 1024).toFixed(0)}MB). A extrair conteúdo parcial...`
    : 'A extrair texto do PDF...'
  );
  
  // For large PDFs, try to extract text from the full file in one go
  // The AI model will handle what it can
  const base64 = await blobToBase64(pdfToProcess);
  console.log(`[AI-DOCINT] PDF base64 length: ${(base64.length / 1024 / 1024).toFixed(2)}MB`);
  
  // If base64 is too large for the API, we need to inform the user
  if (base64.length > 20 * 1024 * 1024) {
    console.warn(`[AI-DOCINT] PDF base64 too large for API: ${(base64.length / 1024 / 1024).toFixed(2)}MB`);
    return `NOTA: Este PDF (${(blob.size / 1024 / 1024).toFixed(0)}MB) excede o limite de processamento automático.
    
Por favor, considere:
1. Dividir o PDF em ficheiros menores (< 20MB cada)
2. Converter para formato texto antes de carregar
3. Extrair manualmente as secções mais importantes

Ficheiro: TRICOLOGIA.pdf
Tamanho: ${(blob.size / 1024 / 1024).toFixed(2)}MB`;
  }
  
  const text = await extractPDFFromBase64(base64, apiKey, isPartial);
  
  if (!text || text.length < 50) {
    console.warn('[AI-DOCINT] PDF extraction returned minimal content');
    return '';
  }
  
  console.log(`[AI-DOCINT] Extracted ${text.length} characters from PDF`);
  return text;
}

async function extractPDFFromBase64(base64: string, apiKey: string, isPartial: boolean): Promise<string> {
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
              text: `Extract ALL text content from this PDF document${isPartial ? ' (this is a large document, extract as much as possible)' : ''}. Include all details, numbers, prices, dates, course content, schedules. Return only the extracted text, preserving structure with paragraphs and sections.`
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
    const errorText = await response.text();
    console.warn(`[AI-DOCINT] PDF extraction failed: ${response.status} - ${errorText.slice(0, 300)}`);
    return '';
  }

  const result = await response.json();
  return result.choices?.[0]?.message?.content || '';
}

async function blobToBase64(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  const chunkSize = 32768;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.slice(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
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
        const exists = allFaqs.some(f => 
          f.question.toLowerCase() === faq.question.toLowerCase()
        );
        if (!exists) {
          allFaqs.push(faq);
        }
      }
    }
  }

  return {
    processedContent: processedContents.join('\n\n---\n\n'),
    topics: Array.from(allTopics).slice(0, 30),
    faqs: allFaqs.slice(0, 50),
    categories: Array.from(allCategories).slice(0, 5),
    summary: summaries.join(' ').slice(0, 500)
  };
}

async function extractDocxContent(data: Uint8Array): Promise<string> {
  try {
    const decoder = new TextDecoder('utf-8');
    const text = decoder.decode(data);
    
    const xmlContentMatch = text.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
    if (xmlContentMatch) {
      const extractedText = xmlContentMatch
        .map(match => {
          const content = match.replace(/<[^>]+>/g, '');
          return content;
        })
        .join(' ');
      
      if (extractedText.length > 50) {
        return extractedText;
      }
    }
    
    const cleanText = text
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    return cleanText.slice(0, 100000); // Higher limit for Trigger.dev
  } catch (error) {
    console.error('[AI-DOCINT] DOCX extraction error:', error);
    return 'Could not extract DOCX content';
  }
}
