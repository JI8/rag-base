import { Bot, Database } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChatSettings } from '@/components/ChatSettings'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ChatSettings as ChatSettingsType } from '@/types'

interface TopBarProps {
  settings?: ChatSettingsType
  onSettingsChange?: (settings: ChatSettingsType) => void
}

export function TopBar({ settings, onSettingsChange }: TopBarProps) {
  const pathname = usePathname()
  const isKnowledgePage = pathname === '/knowledge'

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/50 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-white/10 p-1.5">
            <Bot className="h-4 w-4 text-white/80" />
          </div>
          <span className="font-light text-white/80">
            {isKnowledgePage ? 'Knowledge Base' : 'Chat'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!isKnowledgePage && settings && onSettingsChange && (
            <ChatSettings settings={settings} onSettingsChange={onSettingsChange} />
          )}
          <Link href={isKnowledgePage ? '/' : '/knowledge'}>
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn(
                "gap-2 text-white/60 hover:text-white hover:bg-white/5",
                "transition-colors duration-200"
              )}
            >
              {isKnowledgePage ? (
                'Back to Chat'
              ) : (
                <>
                  <Database className="h-4 w-4" />
                  Knowledge Base
                </>
              )}
            </Button>
          </Link>
        </div>
      </div>
    </header>
  )
} 