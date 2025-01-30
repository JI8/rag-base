import { encode as gptEncode } from 'gpt-tokenizer'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export function encode(text: string): number[] {
  return gptEncode(text)
}

// Constants for token limits and chunking
export const MAX_EMBEDDING_TOKENS = 8000 // Leave some buffer for the embedding model's 8192 limit
export const DEFAULT_CHUNK_SIZE = 2000 // Smaller default size for better handling
export const CHUNK_OVERLAP = 200 // Increased overlap for better context

export async function getEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    encoding_format: 'float',
  })

  return response.data[0].embedding
}

// Helper to identify section boundaries
function isSectionBoundary(line: string): boolean {
  // Check for common section markers
  const sectionPatterns = [
    /^#{1,6}\s+\w+/,          // Markdown headers
    /^[A-Z][A-Za-z\s]{0,50}$/, // Capitalized titles
    /^\d+\.\s+[A-Z]/,         // Numbered sections
    /^[A-Z][A-Z\s]{0,50}:/    // ALL CAPS sections
  ]
  return sectionPatterns.some(pattern => pattern.test(line))
}

// Helper to check if text is a continuation
function isContinuation(text: string): boolean {
  const continuationPatterns = [
    /^(and|or|but|nor|for|yet|so|because|thus|hence|therefore|however|moreover|furthermore|consequently)\s+/i,
    /^[a-z]/,  // Starts with lowercase
    /^[,;]/    // Starts with continuation punctuation
  ]
  return continuationPatterns.some(pattern => pattern.test(text))
}

export function splitIntoChunks(text: string, maxTokens: number = 1500, overlap: number = 150): string[] {
  // First, split into potential sections
  const lines = text.split(/\n/)
  const sections: string[][] = []
  let currentSection: string[] = []

  lines.forEach((line, i) => {
    const trimmedLine = line.trim()
    if (trimmedLine === '') {
      if (currentSection.length > 0) {
        sections.push(currentSection)
        currentSection = []
      }
      return
    }

    if (isSectionBoundary(trimmedLine) && !isContinuation(trimmedLine)) {
      if (currentSection.length > 0) {
        sections.push(currentSection)
        currentSection = []
      }
    }
    currentSection.push(line)

    // Handle last section
    if (i === lines.length - 1 && currentSection.length > 0) {
      sections.push(currentSection)
    }
  })

  // Now process sections into chunks
  const chunks: string[] = []
  let currentChunk: string[] = []
  let currentLength = 0
  let lastChunkContent = ''

  sections.forEach((section, sectionIndex) => {
    const sectionText = section.join('\n')
    const sectionTokens = encode(sectionText)

    // If section fits in a chunk
    if (sectionTokens.length <= maxTokens) {
      if (currentLength + sectionTokens.length <= maxTokens) {
        currentChunk.push(sectionText)
        currentLength += sectionTokens.length
      } else {
        // Save current chunk and start new one
        const chunkText = currentChunk.join('\n\n')
        chunks.push(chunkText)
        lastChunkContent = chunkText

        // Start new chunk with overlap
        const overlapText = currentChunk[currentChunk.length - 1]
        currentChunk = overlapText ? [overlapText] : []
        currentChunk.push(sectionText)
        currentLength = encode(currentChunk.join('\n\n')).length
      }
    } else {
      // Split large section into smaller parts
      const sentences = sectionText.match(/[^.!?]+[.!?]+/g) || [sectionText]
      let sentenceChunk: string[] = []
      let sentenceLength = 0

      sentences.forEach((sentence, i) => {
        const sentenceTokens = encode(sentence)
        if (sentenceLength + sentenceTokens.length <= maxTokens) {
          sentenceChunk.push(sentence)
          sentenceLength += sentenceTokens.length
        } else {
          if (sentenceChunk.length > 0) {
            chunks.push(sentenceChunk.join(' '))
            // Keep last sentence for overlap
            sentenceChunk = [sentences[i - 1], sentence]
            sentenceLength = encode(sentenceChunk.join(' ')).length
          } else {
            chunks.push(sentence)
            sentenceChunk = []
            sentenceLength = 0
          }
        }
      })

      if (sentenceChunk.length > 0) {
        chunks.push(sentenceChunk.join(' '))
      }
    }
  })

  // Add final chunk if needed
  if (currentChunk.length > 0) {
    const finalChunkText = currentChunk.join('\n\n')
    if (finalChunkText !== lastChunkContent) {
      chunks.push(finalChunkText)
    }
  }

  return chunks
}

function decode(tokens: number[]): string {
  return tokens.map(t => String.fromCharCode(t)).join('')
}

export async function generateResponse(
  query: string,
  relevantChunks: string[],
  model: string = 'gpt-4-turbo-preview'
): Promise<string> {
  const context = relevantChunks.join('\n\n')
  const prompt = `Context information is below.
---------------------
${context}
---------------------
Given the context information and no other information, answer the following query:
${query}

If the answer cannot be found in the context information, say "I cannot find information about that in the provided context."
`

  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant that answers questions based on the provided context.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 500,
  })

  return response.choices[0].message.content || 'No response generated.'
} 