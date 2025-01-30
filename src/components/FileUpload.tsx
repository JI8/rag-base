import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

interface FileUploadProps {
  onFileSelect: (file: File) => void
  disabled?: boolean
}

export function FileUpload({ onFileSelect, disabled = false }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0])
    }
  }, [onFileSelect])

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    multiple: false,
    disabled
  })

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
        disabled ? 'bg-gray-100 cursor-not-allowed' :
        isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 cursor-pointer'
      }`}
      onDragEnter={() => !disabled && setIsDragging(true)}
      onDragLeave={() => !disabled && setIsDragging(false)}
      onDrop={() => !disabled && setIsDragging(false)}
    >
      <input {...getInputProps()} />
      <div className="space-y-2">
        <div className="text-4xl">📄</div>
        <p className={`text-gray-600 ${disabled ? 'opacity-50' : ''}`}>
          {disabled ? 'Processing...' : 'Drag and drop a file here, or click to select'}
        </p>
        <p className={`text-sm text-gray-500 ${disabled ? 'opacity-50' : ''}`}>
          Supported formats: PDF, TXT, DOC, DOCX
        </p>
      </div>
    </div>
  )
} 