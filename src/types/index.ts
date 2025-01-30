export interface ChatMessage {
  id: string
  content: string
  isUser: boolean
  timestamp: Date
  sources?: {
    content: string
    document_name: string
    similarity: number
  }[]
}

export interface Document {
  id: string
  name: string
  type: string
  size: number
  status: 'processing' | 'complete' | 'failed'
  visibility: 'enabled' | 'disabled'
  error_message?: string
  content?: string
  created_at: string
  updated_at: string
  metadata?: {
    chunk_count?: number
    total_tokens?: number
    processing_completed?: string
    original_name?: string
    mime_type?: string
    size_bytes?: number
  }
}

export interface DocumentUploadResponse {
  document: Document | null
  error?: string
}

export interface ChatSettings {
  similarityThreshold: number  // How similar chunks need to be to be included (0.5-0.9)
  maxChunks: number           // How many chunks to include in context (1-10)
  chunkSize: number          // Size of chunks when processing documents (500-3000 tokens)
  chunkOverlap: number       // How much chunks should overlap (50-500 tokens)
}

export const DEFAULT_CHAT_SETTINGS: ChatSettings = {
  similarityThreshold: 0.7,
  maxChunks: 5,
  chunkSize: 2000,
  chunkOverlap: 200
} 