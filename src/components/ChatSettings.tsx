import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Settings2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ChatSettings as ChatSettingsType, DEFAULT_CHAT_SETTINGS } from "@/types"
import { useState } from "react"

interface ChatSettingsProps {
  settings: ChatSettingsType
  onSettingsChange: (settings: ChatSettingsType) => void
}

export function ChatSettings({ settings, onSettingsChange }: ChatSettingsProps) {
  const [localSettings, setLocalSettings] = useState(settings)

  const handleChange = (key: keyof ChatSettingsType, value: number[]) => {
    const newSettings = { ...localSettings, [key]: value[0] }
    setLocalSettings(newSettings)
    onSettingsChange(newSettings)
  }

  const resetToDefaults = () => {
    setLocalSettings(DEFAULT_CHAT_SETTINGS)
    onSettingsChange(DEFAULT_CHAT_SETTINGS)
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Settings2 className="h-5 w-5" />
          <span className="sr-only">Open chat settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Chat Settings</DialogTitle>
          <DialogDescription>
            Configure how the assistant uses your knowledge base to answer questions.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-6 space-y-6">
          <div className="space-y-2">
            <Label>
              Relevancy Threshold ({localSettings.similarityThreshold})
              <span className="text-xs text-white/40 ml-2">How similar content needs to be to be included</span>
            </Label>
            <Slider
              value={[localSettings.similarityThreshold]}
              min={0.5}
              max={0.9}
              step={0.05}
              onValueChange={(value: number[]) => handleChange('similarityThreshold', value)}
            />
          </div>

          <div className="space-y-2">
            <Label>
              Max Sources ({localSettings.maxChunks})
              <span className="text-xs text-white/40 ml-2">Number of relevant passages to consider</span>
            </Label>
            <Slider
              value={[localSettings.maxChunks]}
              min={1}
              max={10}
              step={1}
              onValueChange={(value: number[]) => handleChange('maxChunks', value)}
            />
          </div>

          <div className="space-y-2">
            <Label>
              Chunk Size ({localSettings.chunkSize})
              <span className="text-xs text-white/40 ml-2">Size of text chunks when processing documents</span>
            </Label>
            <Slider
              value={[localSettings.chunkSize]}
              min={500}
              max={3000}
              step={100}
              onValueChange={(value: number[]) => handleChange('chunkSize', value)}
            />
          </div>

          <div className="space-y-2">
            <Label>
              Chunk Overlap ({localSettings.chunkOverlap})
              <span className="text-xs text-white/40 ml-2">How much chunks should overlap for context</span>
            </Label>
            <Slider
              value={[localSettings.chunkOverlap]}
              min={50}
              max={500}
              step={50}
              onValueChange={(value: number[]) => handleChange('chunkOverlap', value)}
            />
          </div>

          <Button onClick={resetToDefaults} variant="secondary" className="w-full">
            Reset to Defaults
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 