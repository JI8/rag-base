import { Bot, Database, Settings } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChatSettings } from '@/components/ChatSettings'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ChatSettings as ChatSettingsType } from '@/types'
import { useEffect, useState } from 'react'

interface TopBarProps {
  settings?: ChatSettingsType
  onSettingsChange?: (settings: ChatSettingsType) => void
}

export function TopBar({ settings, onSettingsChange }: TopBarProps) {
  const pathname = usePathname()
  const isKnowledgePage = pathname === '/knowledge'
  const isSettingsPage = pathname === '/settings'

  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  useEffect(() => {
    const loadLogo = async () => {
      try {
        const res = await fetch('/api/settings')
        const data = await res.json()
        if (data.settings && data.settings.logo_url) {
          setLogoUrl(data.settings.logo_url as string)
        }
      } catch (e) {
        console.error('Failed to load logo', e)
      }
    }
    loadLogo()
  }, [])

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/50 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-white/10 p-1.5 overflow-hidden">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Logo" className="h-4 w-4 object-contain" />
            ) : (
              <Bot className="h-4 w-4 text-white/80" />
            )}
          </div>
          <span className="font-light text-white/80">
            {isKnowledgePage ? 'Knowledge Base' : isSettingsPage ? 'Settings' : 'Chat'}
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
          {!isSettingsPage && (
            <Link href="/settings">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-white/60 hover:text-white hover:bg-white/5"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
} 