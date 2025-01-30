import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { data: visibility, error } = await supabase
      .rpc('toggle_document_visibility', {
        p_document_id: params.id
      })

    if (error) {
      console.error('Error toggling document visibility:', error)
      return NextResponse.json(
        { error: 'Failed to update document visibility' },
        { status: 500 }
      )
    }

    return NextResponse.json({ visibility })
  } catch (error) {
    console.error('Error in visibility toggle:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 