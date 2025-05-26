'use client'

import { useEffect, useState } from 'react'
import { TopBar } from '@/components/TopBar'
import { Button } from '@/components/ui/button'

export default function SettingsPage() {
  const [logoUrl, setLogoUrl] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings')
        const data = await res.json()
        if (data.settings && data.settings.logo_url) {
          setLogoUrl(data.settings.logo_url)
          setNewUrl(data.settings.logo_url)
        }
      } catch (e) {
        console.error('Failed to load settings', e)
      }
    }
    fetchSettings()
  }, [])

  const saveLogo = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'logo_url', value: newUrl })
      })
      const data = await res.json()
      if (data.error) {
        throw new Error(data.error)
      }
      setLogoUrl(newUrl)
    } catch (e) {
      console.error('Failed to save logo', e)
      setError('Failed to save logo')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      <TopBar />
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-6 space-y-6">
        <h1 className="text-xl font-light">Settings</h1>
        <div className="space-y-2">
          <label className="block text-sm">Logo URL</label>
          <input
            type="text"
            value={newUrl}
            onChange={e => setNewUrl(e.target.value)}
            className="w-full p-2 bg-white/5 rounded"
          />
          <Button onClick={saveLogo} disabled={saving} className="mt-2">
            Save
          </Button>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
        {logoUrl && (
          <div className="mt-6">
            <p className="text-sm mb-2">Preview:</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt="Logo" className="h-16" />
          </div>
        )}
      </main>
    </div>
  )
}
