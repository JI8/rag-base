'use client'

import { ChatMessage } from '@/components/ChatMessage'
import { TopBar } from '@/components/TopBar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Send, Bot, Loader2 } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { ChatMessage as ChatMessageType, ChatSettings as ChatSettingsType, DEFAULT_CHAT_SETTINGS } from '@/types'
import { motion, AnimatePresence } from 'framer-motion'

interface ChatMessageWithSources extends ChatMessageType {
  sources?: {
    content: string
    document_name: string
    similarity: number
  }[]
  searchStats?: {
    chunksFound: number
    relevantChunks: number
    similarityThreshold: number
    maxChunks: number
  }
}

export default function Home() {
  const [messages, setMessages] = useState<ChatMessageWithSources[]>([])
  const [isSending, setIsSending] = useState(false)
  const [currentMessage, setCurrentMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [settings, setSettings] = useState<ChatSettingsType>(DEFAULT_CHAT_SETTINGS)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isSearching, setIsSearching] = useState(false)

  // Load chat history and settings on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem('chatHistory')
    const savedSettings = localStorage.getItem('chatSettings')
    
    if (savedMessages) {
      const parsedMessages = JSON.parse(savedMessages)
      const messagesWithDates = parsedMessages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }))
      setMessages(messagesWithDates)
    }

    if (savedSettings) {
      setSettings(JSON.parse(savedSettings))
    }
  }, [])

  // Save messages and settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('chatHistory', JSON.stringify(messages))
  }, [messages])

  useEffect(() => {
    localStorage.setItem('chatSettings', JSON.stringify(settings))
  }, [settings])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isSending) return

    const userMessage: ChatMessageWithSources = {
      id: Date.now().toString(),
      content: currentMessage,
      isUser: true,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setCurrentMessage('')
    setIsSending(true)
    setIsSearching(true)
    setError(null)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: currentMessage,
          messages: messages,
          settings: settings,
        }),
      })

      const data = await response.json()
      if (data.error) {
        throw new Error(data.error)
      }

      const assistantMessage: ChatMessageWithSources = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        isUser: false,
        timestamp: new Date(),
        sources: data.sources,
        searchStats: data.searchStats
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      setError(error instanceof Error ? error.message : 'Failed to send message')
    } finally {
      setIsSending(false)
      setIsSearching(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-black">
      <TopBar settings={settings} onSettingsChange={setSettings} />
      
      <main className="flex-1 overflow-hidden mx-auto w-full max-w-5xl px-4">
        <div className="flex flex-col h-[calc(100vh-3.5rem)]">
          <ScrollArea className="flex-1 py-4">
            <div className="space-y-4">
              <AnimatePresence initial={false}>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <ChatMessage
                      message={message.content}
                      isUser={message.isUser}
                      sources={message.sources}
                    />
                  </motion.div>
                ))}
                {isSearching && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-3 text-sm text-white/60 pl-8"
                  >
                    <div className="rounded-full bg-white/10 p-1.5">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Doorzoeken kennisbank</span>
                      <Loader2 className="w-3 h-3 animate-spin" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center py-16 text-center"
                >
                  <div className="rounded-full bg-white/10 p-3 mb-4">
                    <Send className="h-6 w-6 text-white/80" />
                  </div>
                  <h2 className="text-lg font-light text-white/80 mb-2">Start een gesprek</h2>
                  <p className="text-sm text-white/40 max-w-sm">
                    Stel vragen over je documenten of start een algemeen gesprek
                  </p>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="py-4 border-t border-white/10">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mb-4 p-3 bg-red-500/10 text-red-500 rounded-lg text-sm"
              >
                {error}
              </motion.div>
            )}
            <div className="flex gap-2 items-center">
              <textarea
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Stel een vraag..."
                rows={1}
                className="flex-1 bg-white/5 rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-white/20 resize-none"
                disabled={isSending}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!currentMessage.trim() || isSending}
                size="icon"
                className="rounded-full w-12 h-12 bg-blue-500 hover:bg-blue-600 transition-colors text-white"
              >
                {isSending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
                <span className="sr-only">Verstuur bericht</span>
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
