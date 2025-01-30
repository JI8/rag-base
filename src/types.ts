export interface ChatMessage {
  id: string
  content: string
  isUser: boolean
  timestamp: Date
}

export interface ChatSettings {
  similarityThreshold: number
  maxChunks: number
  chunkSize: number
  chunkOverlap: number
}

export const DEFAULT_CHAT_SETTINGS: ChatSettings = {
  similarityThreshold: 0.7, // Higher threshold for more precise matches
  maxChunks: 5,
  chunkSize: 1500,
  chunkOverlap: 150
} 