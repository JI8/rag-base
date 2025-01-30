import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { ChatMessage, ChatSettings, DEFAULT_CHAT_SETTINGS } from '@/types'
import { supabase } from '@/lib/supabase'
import { getEmbedding } from '@/lib/text-processing'

interface ChunkResult {
  id: string
  content: string
  document_id: string
  document_name: string
  similarity: number
}

// BM25-inspired scoring for keyword matches
function calculateBM25Score(content: string, query: string): number {
  const k1 = 1.2
  const b = 0.75
  const avgDocLength = 1000

  const queryTerms = query.toLowerCase().split(/\s+/)
  const doc = content.toLowerCase()
  const docLength = doc.split(/\s+/).length

  return queryTerms.reduce((score, term) => {
    const tf = (doc.match(new RegExp(term, 'g')) || []).length
    if (tf === 0) return score

    const idf = Math.log(1 + (1 / (tf || 1)))
    const numerator = tf * (k1 + 1)
    const denominator = tf + k1 * (1 - b + b * (docLength / avgDocLength))
    
    return score + (idf * numerator / denominator)
  }, 0)
}

// Calculate cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0)
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))
  return dotProduct / (magnitudeA * magnitudeB)
}

// Maximal Marginal Relevance reranking
function mmrReranking(chunks: ChunkResult[], queryEmbedding: number[], lambda = 0.5, k = 5): ChunkResult[] {
  if (chunks.length <= k) return chunks

  const selected: ChunkResult[] = []
  const remaining = [...chunks]

  while (selected.length < k && remaining.length > 0) {
    let nextBestIdx = -1
    let nextBestScore = -Infinity

    for (let i = 0; i < remaining.length; i++) {
      const chunk = remaining[i]
      
      // Relevance term
      const relevance = chunk.similarity

      // Diversity term
      let maxSimilarity = 0
      for (const selectedChunk of selected) {
        const similarity = cosineSimilarity(
          (chunk as any).embedding,
          (selectedChunk as any).embedding
        )
        maxSimilarity = Math.max(maxSimilarity, similarity)
      }

      // MMR score
      const score = lambda * relevance - (1 - lambda) * maxSimilarity

      if (score > nextBestScore) {
        nextBestScore = score
        nextBestIdx = i
      }
    }

    if (nextBestIdx !== -1) {
      selected.push(remaining[nextBestIdx])
      remaining.splice(nextBestIdx, 1)
    }
  }

  return selected
}

// Hybrid search combining vector similarity and BM25-inspired scoring
function hybridSearch(chunks: ChunkResult[], query: string, queryEmbedding: number[]): ChunkResult[] {
  const initialRanking = chunks
    .map(chunk => {
      const bm25Score = calculateBM25Score(chunk.content, query)
      const hybridScore = (chunk.similarity * 0.6) + (bm25Score * 0.4)
      return { ...chunk, score: hybridScore }
    })
    .sort((a, b) => (b as any).score - (a as any).score)
    .map(({ score, ...chunk }) => chunk)

  return mmrReranking(initialRanking, queryEmbedding)
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Function to expand query with related terms
async function expandQuery(query: string): Promise<string[]> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a query expansion assistant. Given a search query, return 2-3 semantically similar alternative phrasings that could help find relevant information. Return ONLY the alternative phrases, one per line.'
      },
      {
        role: 'user',
        content: query
      }
    ],
    temperature: 0.2,
    max_tokens: 100,
  })

  const expansions = response.choices[0].message.content?.split('\n').filter(Boolean) || []
  return [query, ...expansions]
}

export async function POST(request: Request) {
  try {
    const { query, messages, settings = DEFAULT_CHAT_SETTINGS } = await request.json()

    if (!query) {
      return NextResponse.json(
        { error: 'Geen vraag opgegeven' },
        { status: 400 }
      )
    }

    // Expand the query with related terms
    const expandedQueries = await expandQuery(query)
    
    // Get embeddings for all query variations
    const queryEmbeddings: number[][] = []
    try {
      for (const q of expandedQueries) {
        const embedding = await getEmbedding(q)
        queryEmbeddings.push(embedding)
      }
    } catch (error) {
      console.error('Error generating embeddings:', error)
      return NextResponse.json(
        { error: 'Kan de vraag niet verwerken' },
        { status: 500 }
      )
    }

    // Search with each query variation
    let allChunks: ChunkResult[] = []
    for (const embedding of queryEmbeddings) {
      const { data, error: searchError } = await supabase
        .rpc('match_chunks', {
          query_embedding: embedding,
          match_threshold: settings.similarityThreshold * 0.7,
          match_count: Math.ceil(settings.maxChunks / queryEmbeddings.length)
        })

      if (searchError) {
        console.error('Error searching chunks:', searchError)
        return NextResponse.json(
          { error: 'Kan de kennisbank niet doorzoeken' },
          { status: 500 }
        )
      }

      allChunks = allChunks.concat((data || []) as ChunkResult[])
    }

    // Remove duplicates and sort by similarity
    const uniqueChunks = Array.from(new Map(allChunks.map(chunk => [chunk.id, chunk])).values())
    let chunks = uniqueChunks.sort((a, b) => b.similarity - a.similarity)
    
    if (chunks.length > 0) {
      chunks = hybridSearch(chunks, query, queryEmbeddings[0])
      chunks = chunks.slice(0, settings.maxChunks)
    }

    const messageHistory = messages?.map((msg: ChatMessage) => ({
      role: msg.isUser ? 'user' : 'assistant',
      content: msg.content,
    })) || []

    const hasRelevantContext = chunks.length > 0 && chunks[0].similarity > settings.similarityThreshold

    const systemPrompt = hasRelevantContext
      ? `Je bent een behulpzame AI-assistent die in het Nederlands antwoord geeft.
Volg deze richtlijnen:
0. Je hebt kennis over juridische zaken, en wijst de vraag ALTIJD vriendelijk af als deze niet juridisch relevant is.
1. Geef ALTIJD antwoord in het Nederlands
2. Gebruik ALLEEN de informatie uit de context als basis
3. Houd antwoorden beknopt maar informatief
4. Verwijs naar bronnen met **documentnaam**
5. Gebruik een vriendelijke toon
6. Begin met een korte vermelding van waar je de informatie hebt gevonden
7. Gebruik markdown voor opmaak waar nodig`
      : `Je bent een behulpzame AI-assistent die in het Nederlands antwoord geeft zonder emojis.
Volg deze richtlijnen:
1. Geef ALTIJD antwoord in het Nederlands
2. Houd antwoorden beknopt maar informatief
3. Gebruik een vriendelijke, informele toon
4. Gebruik markdown voor opmaak waar nodig`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        ...messageHistory,
        {
          role: 'user',
          content: hasRelevantContext 
            ? `Context:
${chunks.map(chunk => `[${chunk.document_name}]:
${chunk.content.trim()}`).join('\n\n')}

Vraag: ${query}`
            : query
        }
      ],
      temperature: 0.4,
      max_tokens: 250,
    })

    return NextResponse.json({ 
      response: response.choices[0].message.content || 'Geen antwoord gegenereerd.',
      sources: chunks.map(chunk => ({
        content: chunk.content,
        document_name: chunk.document_name,
        similarity: chunk.similarity
      })),
      searchStats: {
        chunksFound: allChunks.length,
        relevantChunks: chunks.length,
        similarityThreshold: settings.similarityThreshold,
        maxChunks: settings.maxChunks
      }
    })
  } catch (error) {
    console.error('Error in chat endpoint:', error)
    return NextResponse.json(
      { error: 'Kan geen antwoord genereren' },
      { status: 500 }
    )
  }
} 