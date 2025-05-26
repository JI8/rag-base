import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('*')

    if (error) {
      console.error('Error fetching settings:', error)
      return NextResponse.json(
        { error: 'Failed to fetch settings' },
        { status: 500 }
      )
    }

    // Transform results into key-value map
    const settings: Record<string, string> = {}
    for (const row of data || []) {
      settings[row.key] = row.value
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Error in settings fetch:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { key, value } = body

    if (!key) {
      return NextResponse.json(
        { error: 'Missing key' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('settings')
      .upsert({ key, value })

    if (error) {
      console.error('Error saving setting:', error)
      return NextResponse.json(
        { error: 'Failed to save setting' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in settings update:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
