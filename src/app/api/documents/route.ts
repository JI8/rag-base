import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getEmbedding, splitIntoChunks, encode } from '@/lib/text-processing'
import { Document } from '@/types'

export const config = {
  api: {
    bodyParser: false,
  },
}

// Helper function to sanitize text
function sanitizeText(text: string): string {
  return text
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .normalize('NFKC')
    .trim()
}

// Helper function to validate file type
function isValidFileType(type: string): boolean {
  const validTypes = [
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/json',
    'text/javascript',
    'text/typescript',
    'text/html',
    'text/css',
    'application/xml',
    'text/xml',
    'application/x-yaml',
    'text/yaml',
    'text/x-python',
    'text/x-java',
    'text/x-c',
    'text/x-cpp',
    'text/x-ruby',
    'text/x-php',
    'text/x-go',
    'text/x-rust',
    'text/x-swift'
  ]
  return validTypes.includes(type) || type.startsWith('text/')
}

async function processChunk(
  chunk: string,
  documentId: string,
  sequenceNumber: number
): Promise<void> {
  try {
    // Validate chunk size
    const tokens = encode(chunk)

    // Generate embedding
    const embedding = await getEmbedding(chunk)

    // Insert chunk with embedding
    const { error: chunkError } = await supabase
      .from('chunks')
      .insert({
        document_id: documentId,
        content: chunk,
        embedding,
        sequence_number: sequenceNumber,
        token_count: tokens.length
      })

    if (chunkError) {
      console.error(`Error inserting chunk ${sequenceNumber}:`, chunkError)
      throw chunkError
    }
  } catch (error) {
    console.error(`Error processing chunk ${sequenceNumber}:`, error)
    throw error
  }
}

export async function GET() {
  try {
    const { data: documents, error } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching documents:', error)
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      )
    }

    return NextResponse.json({ documents })
  } catch (error) {
    console.error('Error in documents fetch:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!isValidFileType(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only text-based files are currently supported.' },
        { status: 400 }
      )
    }

    // Create document record
    const { data: documentId, error: docError } = await supabase
      .rpc('upsert_document', {
        p_name: file.name,
        p_type: file.type,
        p_size: file.size,
        p_metadata: {
          original_name: file.name,
          mime_type: file.type,
          size_bytes: file.size,
          upload_timestamp: new Date().toISOString()
        }
      })

    if (docError) {
      console.error('Error creating document:', docError)
      return NextResponse.json(
        { error: 'Failed to create document record' },
        { status: 500 }
      )
    }

    try {
      // Read and sanitize text content
      const text = sanitizeText(await file.text())
      
      if (!text.trim()) {
        throw new Error('File is empty or contains no valid text')
      }

      // Split text into chunks
      const chunks = splitIntoChunks(text)
      console.log(`Processing ${chunks.length} chunks for document ${documentId}`)

      // Process chunks sequentially
      for (let i = 0; i < chunks.length; i++) {
        try {
          await processChunk(chunks[i], documentId, i)
          console.log(`Successfully processed chunk ${i + 1}/${chunks.length}`)
        } catch (error) {
          // Update document status to failed with error message
          const { error: updateError } = await supabase
            .from('documents')
            .update({
              status: 'failed',
              error_message: `Failed to process chunk ${i + 1}/${chunks.length}: ${error instanceof Error ? error.message : 'Unknown error'}`
            })
            .eq('id', documentId)

          if (updateError) {
            console.error('Error updating document status:', updateError)
          }

          return NextResponse.json(
            { error: 'Failed to process document chunks' },
            { status: 500 }
          )
        }
      }

      // Update document status to complete
      const { data: document, error: updateError } = await supabase
        .from('documents')
        .update({
          status: 'complete',
          error_message: null,
          metadata: {
            chunk_count: chunks.length,
            total_tokens: chunks.reduce((sum, chunk) => sum + encode(chunk).length, 0),
            processing_completed: new Date().toISOString()
          }
        })
        .eq('id', documentId)
        .select()
        .single()

      if (updateError) {
        throw updateError
      }

      return NextResponse.json({ document })
    } catch (error) {
      console.error('Error processing document:', error)
      
      // Update document status to failed
      const { error: updateError } = await supabase
        .from('documents')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', documentId)

      if (updateError) {
        console.error('Error updating document status:', updateError)
      }

      return NextResponse.json(
        { error: 'Failed to process document' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in document upload:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 