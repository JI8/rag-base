import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get all chunks for this document, ordered by sequence number
    const { data: chunks, error: chunksError } = await supabase
      .from('chunks')
      .select('content')
      .eq('document_id', params.id)
      .order('sequence_number')

    if (chunksError) {
      console.error('Error fetching document chunks:', chunksError)
      return NextResponse.json(
        { error: 'Failed to fetch document content' },
        { status: 500 }
      )
    }

    // Combine all chunks into a single text
    const content = chunks?.map(chunk => chunk.content).join('\n\n') || ''

    return NextResponse.json({ content })
  } catch (error) {
    console.error('Error in document content fetch:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Delete the document and its chunks (cascade delete will handle chunks)
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Error deleting document:', error)
      return NextResponse.json(
        { error: 'Failed to delete document' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in document deletion:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 