import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { Bot, User, ChevronDown, ChevronRight } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import type { ReactMarkdownOptions } from 'react-markdown/lib/react-markdown'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import type { ReactNode } from 'react'
import type { DetailedHTMLProps, HTMLAttributes } from 'react'
import type { Components } from 'react-markdown'

interface ChatMessageProps {
  message: string
  isUser: boolean
  sources?: {
    content: string
    document_name: string
    similarity: number
  }[]
}

interface CodeProps extends HTMLAttributes<HTMLElement> {
  inline?: boolean
  className?: string
}

export function ChatMessage({ message, isUser, sources }: ChatMessageProps) {
  const [showSources, setShowSources] = useState(false)

  const components: Partial<Components> = {
    p: ({ children }) => <p className="leading-7 mb-3 last:mb-0">{children}</p>,
    ul: ({ children }) => <ul className="list-disc pl-6 mb-3 last:mb-0">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal pl-6 mb-3 last:mb-0">{children}</ol>,
    li: ({ children }) => <li className="my-1">{children}</li>,
    h2: ({ children }) => <h2 className="text-lg font-semibold mt-6 mb-3">{children}</h2>,
    h3: ({ children }) => <h3 className="text-base font-semibold mt-4 mb-2">{children}</h3>,
    strong: ({ children }) => <strong className="font-semibold text-white/95">{children}</strong>,
    em: ({ children }) => <em className="italic text-white/90">{children}</em>,
    code: ({ children }) => (
      <code className="bg-white/10 rounded px-1.5 py-0.5 text-sm">{children}</code>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-white/20 pl-4 my-3 italic text-white/75 last:mb-0">
        {children}
      </blockquote>
    ),
  }

  return (
    <div className={cn(
      "flex gap-3 text-sm text-white/90 my-3",
      isUser ? "flex-row-reverse" : "flex-row"
    )}>
      <div className={cn(
        "rounded-full p-1.5 h-fit shrink-0",
        isUser ? "bg-blue-500/20" : "bg-white/10"
      )}>
        {isUser ? (
          <User className="w-4 h-4" />
        ) : (
          <Bot className="w-4 h-4" />
        )}
      </div>
      <div className={cn(
        "flex flex-col gap-2",
        isUser ? "items-end" : "items-start",
        "max-w-[80%]"
      )}>
        <div className={cn(
          "rounded-2xl px-4 py-2",
          isUser ? "bg-blue-500/20" : "bg-white/10"
        )}>
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
              className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
              components={components}
            >
              {message}
            </ReactMarkdown>
          </div>
          {!isUser && sources && sources.length > 0 && (
            <div className="mt-2 pt-2 border-t border-white/10">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSources(!showSources)}
                className="h-6 px-2 text-xs text-white/40 hover:text-white/60 -ml-2"
              >
                {showSources ? (
                  <ChevronDown className="h-3 w-3 mr-1.5" />
                ) : (
                  <ChevronRight className="h-3 w-3 mr-1.5" />
                )}
                {sources.length} source{sources.length !== 1 ? 's' : ''}
              </Button>
              <AnimatePresence>
                {showSources && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2 mt-2">
                      {sources.map((source, i) => (
                        <div key={i} className="text-xs bg-white/5 rounded p-2 space-y-1">
                          <p className="text-white/60 font-medium">{source.document_name}</p>
                          <p className="text-white/40 line-clamp-2">{source.content}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 