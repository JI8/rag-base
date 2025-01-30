'use client'

import { TopBar } from '@/components/TopBar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { File, Upload, Trash2, Eye, EyeOff } from 'lucide-react'
import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from '@/lib/utils'

interface Document {
  id: string
  name: string
  type: string
  size: number
  status: 'processing' | 'complete' | 'failed'
  visibility: 'enabled' | 'disabled'
  description?: string
  error_message?: string
  created_at: Date
  content?: string
  metadata?: {
    chunk_count?: number
    total_tokens?: number
    processing_completed?: string
    original_name?: string
    mime_type?: string
    size_bytes?: number
  }
}

export default function KnowledgePage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [deleteDoc, setDeleteDoc] = useState<Document | null>(null)

  // Load documents on mount
  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const response = await fetch('/api/documents')
        const data = await response.json()
        
        if (data.error) {
          throw new Error(data.error)
        }

        setDocuments(data.documents.map((doc: any) => ({
          ...doc,
          created_at: new Date(doc.created_at)
        })))
      } catch (error) {
        console.error('Error loading documents:', error)
        setError('Failed to load documents')
      }
    }

    loadDocuments()
  }, [])

  const fetchDocumentContent = async (doc: Document) => {
    if (!doc.id) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/documents/${doc.id}`)
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      setSelectedDoc({ ...doc, content: data.content })
    } catch (error) {
      console.error('Error fetching document content:', error)
      setError('Failed to load document content')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDocumentSelect = async (doc: Document) => {
    setSelectedDoc(doc)
    if (doc.status === 'complete' && !doc.content) {
      await fetchDocumentContent(doc)
    }
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setIsUploading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      if (data.error) {
        throw new Error(data.error)
      }

      setDocuments(prev => [...prev, {
        ...data.document,
        created_at: new Date(data.document.created_at)
      }])
    } catch (error) {
      console.error('Error uploading document:', error)
      setError(error instanceof Error ? error.message : 'Failed to upload document')
    } finally {
      setIsUploading(false)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'text/markdown': ['.md', '.markdown'],
      'text/csv': ['.csv'],
      'application/json': ['.json'],
      'text/javascript': ['.js'],
      'text/typescript': ['.ts'],
      'text/html': ['.html', '.htm'],
      'text/css': ['.css'],
      'application/xml': ['.xml'],
      'text/xml': ['.xml'],
      'application/x-yaml': ['.yaml', '.yml'],
      'text/yaml': ['.yaml', '.yml'],
      'text/x-python': ['.py'],
      'text/x-java': ['.java'],
      'text/x-c': ['.c', '.h'],
      'text/x-cpp': ['.cpp', '.hpp'],
      'text/x-ruby': ['.rb'],
      'text/x-php': ['.php'],
      'text/x-go': ['.go'],
      'text/x-rust': ['.rs'],
      'text/x-swift': ['.swift']
    },
    maxFiles: 1
  })

  const confirmDelete = (doc: Document, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeleteDoc(doc)
  }

  const handleDeleteConfirmed = async () => {
    if (!deleteDoc) return

    try {
      await fetch(`/api/documents/${deleteDoc.id}`, {
        method: 'DELETE',
      })
      setDocuments(prev => prev.filter(doc => doc.id !== deleteDoc.id))
      if (selectedDoc?.id === deleteDoc.id) {
        setSelectedDoc(null)
      }
    } catch (error) {
      console.error('Error deleting document:', error)
      setError('Failed to delete document')
    } finally {
      setDeleteDoc(null)
    }
  }

  const toggleVisibility = async (doc: Document, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const response = await fetch(`/api/documents/${doc.id}/visibility`, {
        method: 'POST'
      })
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      setDocuments(prev => prev.map(d => 
        d.id === doc.id 
          ? { ...d, visibility: data.visibility }
          : d
      ))
    } catch (error) {
      console.error('Error toggling visibility:', error)
      setError('Failed to update document visibility')
    }
  }

  const getStatusDisplay = (doc: Document) => {
    if (doc.status === 'complete') {
      return {
        text: doc.visibility === 'enabled' ? 'Ready' : 'Disabled',
        color: doc.visibility === 'enabled' ? 'text-green-400' : 'text-gray-400'
      }
    }
    if (doc.status === 'failed') return { text: 'Failed', color: 'text-red-400' }
    return { text: 'Processing...', color: 'text-yellow-400' }
  }

  return (
    <div className="flex flex-col min-h-screen bg-black">
      <TopBar />
      
      <main className="flex-1 overflow-hidden mx-auto w-full max-w-5xl px-4">
        <div className="flex h-[calc(100vh-3.5rem)] gap-6 py-6">
          {/* Left side: Document list and upload */}
          <div className="flex flex-col gap-6 w-1/2">
            {/* Upload area */}
            <div
              {...getRootProps()}
              className={cn(
                "relative flex flex-col items-center justify-center h-48",
                "rounded-lg border-2 border-dashed transition-colors duration-200",
                isDragActive 
                  ? "border-white/40 bg-white/5" 
                  : "border-white/10 hover:border-white/20"
              )}
            >
              <input {...getInputProps()} />
              <AnimatePresence mode="wait">
                {isUploading ? (
                  <motion.div
                    key="uploading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-3 text-white/60"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-6 h-6 border-2 border-current border-t-transparent rounded-full"
                    />
                    <span className="text-sm">Uploading...</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="upload"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-3 text-white/60"
                  >
                    <Upload className="w-6 h-6" />
                    <div className="text-center">
                      <p className="text-sm">
                        {isDragActive
                          ? "Drop your document here"
                          : "Drag & drop your document here"}
                      </p>
                      <p className="text-xs text-white/40 mt-1">
                        Supports various text-based files (.txt, .md, .json, .js, .ts, etc.)
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Document list */}
            <ScrollArea className="flex-1 -mx-2 px-2">
              <div className="flex flex-col gap-2">
                <AnimatePresence initial={false}>
                  {documents.map(doc => {
                    const status = getStatusDisplay(doc)
                    return (
                      <motion.div
                        key={doc.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className={cn(
                          "group flex items-center gap-3 p-3 rounded-lg",
                          "transition-colors duration-200 cursor-pointer",
                          selectedDoc?.id === doc.id 
                            ? 'bg-white/10' 
                            : 'hover:bg-white/5',
                          doc.visibility === 'disabled' ? 'opacity-50' : ''
                        )}
                        onClick={() => handleDocumentSelect(doc)}
                      >
                        <File className="shrink-0 w-4 h-4 text-white/60" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white/80 truncate">
                            {doc.name}
                          </p>
                          <div className="flex items-center gap-2">
                            <p className={cn("text-xs", status.color)}>
                              {status.text}
                            </p>
                            {doc.metadata?.chunk_count && (
                              <p className="text-xs text-white/40">
                                {doc.metadata.chunk_count} chunks
                              </p>
                            )}
                          </div>
                          {doc.error_message && (
                            <p className="text-xs text-red-400/60 truncate mt-1">
                              {doc.error_message}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {doc.status === 'complete' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="shrink-0 w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => toggleVisibility(doc, e)}
                            >
                              {doc.visibility === 'enabled' ? (
                                <EyeOff className="w-4 h-4 text-white/60" />
                              ) : (
                                <Eye className="w-4 h-4 text-white/60" />
                              )}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0 w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => confirmDelete(doc, e)}
                          >
                            <Trash2 className="w-4 h-4 text-white/60" />
                          </Button>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
                {documents.length === 0 && !isUploading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-3 py-12 text-white/40"
                  >
                    <File className="w-8 h-8" />
                    <p className="text-sm text-center">
                      No documents yet
                    </p>
                  </motion.div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right side: Document viewer */}
          <div className="w-1/2 rounded-lg border border-white/10 bg-white/5">
            <ScrollArea className="h-full">
              {selectedDoc ? (
                <div className="prose prose-invert max-w-none p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-light text-white/80 m-0">
                        {selectedDoc.name}
                      </h2>
                      {selectedDoc.metadata && (
                        <p className="text-xs text-white/40 mt-1">
                          {selectedDoc.metadata.total_tokens?.toLocaleString()} tokens in {selectedDoc.metadata.chunk_count} chunks
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedDoc.status === 'complete' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => toggleVisibility(selectedDoc, e)}
                          className="gap-2 text-white/60 hover:text-white hover:bg-white/5"
                        >
                          {selectedDoc.visibility === 'enabled' ? (
                            <>
                              <EyeOff className="w-4 h-4" />
                              Disable
                            </>
                          ) : (
                            <>
                              <Eye className="w-4 h-4" />
                              Enable
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full"
                      />
                    </div>
                  ) : selectedDoc.status === 'processing' ? (
                    <p className="text-sm text-yellow-400/60 italic">
                      Document is being processed...
                    </p>
                  ) : selectedDoc.status === 'failed' ? (
                    <div className="text-sm text-red-400/60">
                      <p className="font-medium">Processing failed</p>
                      {selectedDoc.error_message && (
                        <p className="mt-2 italic">{selectedDoc.error_message}</p>
                      )}
                    </div>
                  ) : selectedDoc.content ? (
                    <div className="text-sm text-white/60 whitespace-pre-wrap font-mono">
                      {selectedDoc.content}
                    </div>
                  ) : (
                    <p className="text-sm text-white/40 italic">
                      Loading document content...
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-white/40 p-6">
                  <File className="w-8 h-8 mb-3" />
                  <p className="text-sm text-center">
                    Select a document to view
                  </p>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 p-4 bg-red-500/10 text-red-400 rounded-lg text-sm"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete confirmation dialog */}
        <AlertDialog open={!!deleteDoc} onOpenChange={() => setDeleteDoc(null)}>
          <AlertDialogContent className="bg-black/90 border border-white/10">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white/90">Delete Document</AlertDialogTitle>
              <AlertDialogDescription className="text-white/60">
                Are you sure you want to delete "{deleteDoc?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-white/5 text-white/60 hover:bg-white/10 hover:text-white">Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-500/10 text-red-400 hover:bg-red-500/20"
                onClick={handleDeleteConfirmed}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  )
} 