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

    console.log(`[KNOWLEDGE-TRIGGER] Processing large document: ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)}MB)`);

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
    console.log(`[KNOWLEDGE-TRIGGER] Downloaded: ${(fileData.size / 1024 / 1024).toFixed(2)}MB`);

    await updateProgress('A extrair texto do documento...');

    let textContent = '';

    // Extract text based on mime type
    if (mimeType === 'text/plain') {
      textContent = await fileData.text();
    } else if (mimeType === 'application/pdf') {
      textContent = await extractPDFContent(fileData, LOVABLE_API_KEY, updateProgress);
    } else if (mimeType.includes('word') || mimeType.includes('document')) {
      const arrayBuffer = await fileData.arrayBuffer();
      textContent = await extractDocxContent(new Uint8Array(arrayBuffer));
    }

    if (!textContent || textContent.length < 10) {
      throw new Error('Não foi possível extrair texto do documento');
    }

    console.log(`[KNOWLEDGE-TRIGGER] Extracted ${textContent.length} characters`);
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
    
    console.log(`[KNOWLEDGE-TRIGGER] Processing ${chunks.length} chunk(s)`);

    const allResults: ChunkResult[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`[KNOWLEDGE-TRIGGER] Processing chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);
      
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

    console.log(`[KNOWLEDGE-TRIGGER] Total FAQs extracted: ${mergedResult.faqs.length}`);
    console.log(`[KNOWLEDGE-TRIGGER] Total topics: ${mergedResult.topics.length}`);

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
        console.error('[KNOWLEDGE-TRIGGER] Error inserting entries:', insertError);
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
      console.error('[KNOWLEDGE-TRIGGER] Error inserting article:', articleError);
    }

    console.log(`[KNOWLEDGE-TRIGGER] Successfully processed: ${fileName}`);

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
    console.error('[KNOWLEDGE-TRIGGER] Error:', error);
    
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

// PDF extraction using AI vision - process in larger chunks for Trigger.dev
async function extractPDFContent(
  blob: Blob, 
  apiKey: string,
  updateProgress: (msg: string) => Promise<void>
): Promise<string> {
  const MAX_CHUNK_SIZE = 15 * 1024 * 1024; // 15MB per chunk for PDF
  const chunks: string[] = [];
  
  // Split large PDFs into chunks for vision API
  const totalChunks = Math.ceil(blob.size / MAX_CHUNK_SIZE);
  
  for (let i = 0; i < totalChunks; i++) {
    const start = i * MAX_CHUNK_SIZE;
    const end = Math.min(start + MAX_CHUNK_SIZE, blob.size);
    const chunkBlob = blob.slice(start, end);
    
    await updateProgress(`A extrair texto do PDF (parte ${i + 1} de ${totalChunks})...`);
    
    const base64 = await blobToBase64(chunkBlob);
    const text = await extractPDFFromBase64(base64, apiKey);
    chunks.push(text);
    
    // Small delay between API calls
    if (i < totalChunks - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return chunks.join('\n\n---\n\n');
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
    console.warn(`[KNOWLEDGE-TRIGGER] PDF extraction failed: ${response.status}`);
    return "PDF document - text extraction requires manual review";
  }

  const result = await response.json();
  return result.choices?.[0]?.message?.content || "Could not extract PDF content";
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
    console.error('[KNOWLEDGE-TRIGGER] DOCX extraction error:', error);
    return 'Could not extract DOCX content';
  }
}
