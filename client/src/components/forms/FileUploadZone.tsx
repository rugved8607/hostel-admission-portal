'use client'

import {
  useRef,
  useState,
  useCallback,
  type DragEvent,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react'
import { Upload, FileText, FileImage, X, AlertCircle, CheckCircle2 } from 'lucide-react'

interface FileUploadZoneProps {
  label: string
  required?: boolean
  /** Comma-separated accepted extensions/mime types, e.g. ".pdf,.jpg,.jpeg,.png" */
  accept: string
  maxSizeMB: number
  value: File | null
  onChange: (file: File | null) => void
  /** External validation error from parent form */
  error?: string
  hint?: string
  disabled?: boolean
  name: string
}

// ─── Utilities ──────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function getDisplayAccept(accept: string): string {
  return accept
    .split(',')
    .map((a) => a.trim().toUpperCase().replace('.', ''))
    .join(', ')
}

function validateFile(file: File, accept: string, maxSizeMB: number): string | null {
  // Size check
  if (file.size > maxSizeMB * 1024 * 1024) {
    return `File exceeds the ${maxSizeMB} MB limit (uploaded: ${formatBytes(file.size)}).`
  }
  // Type check
  const accepted = accept
    .split(',')
    .map((a) => a.trim().toLowerCase())
  const ext = `.${(file.name.split('.').pop() ?? '').toLowerCase()}`
  const mime = file.type.toLowerCase()

  const isValid = accepted.some((token) => {
    if (token.startsWith('.')) return token === ext
    if (token.endsWith('/*')) return mime.startsWith(token.slice(0, -2))
    return mime === token
  })

  if (!isValid) {
    return `Unsupported format. Accepted: ${getDisplayAccept(accept)}`
  }
  return null
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function FileUploadZone({
  label,
  required = false,
  accept,
  maxSizeMB,
  value,
  onChange,
  error,
  hint,
  disabled = false,
  name,
}: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const process = useCallback(
    (file: File) => {
      const err = validateFile(file, accept, maxSizeMB)
      if (err) {
        setLocalError(err)
        onChange(null)
      } else {
        setLocalError(null)
        onChange(file)
      }
    },
    [accept, maxSizeMB, onChange]
  )

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragging(false)
      if (disabled) return
      const file = e.dataTransfer.files[0]
      if (file) process(file)
    },
    [disabled, process]
  )

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) process(file)
      // Reset so same file can be re-selected after removal
      e.target.value = ''
    },
    [process]
  )

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
      e.preventDefault()
      inputRef.current?.click()
    }
  }

  const handleRemove = () => {
    onChange(null)
    setLocalError(null)
  }

  const displayError = localError ?? error
  const isPdf = value?.type === 'application/pdf'

  return (
    <div className="space-y-1.5">
      {/* Label */}
      <label htmlFor={name} className="block text-xs font-semibold text-slate-700">
        {label}
        {required && <span className="text-red-500 ml-0.5" aria-hidden>*</span>}
      </label>

      {/* File selected — preview row */}
      {value ? (
        <div className={`flex items-center gap-3 px-3 py-2.5 border rounded-lg transition-colors ${
          displayError
            ? 'bg-red-50 border-red-200'
            : 'bg-emerald-50 border-emerald-200'
        }`}>
          <div className="flex-shrink-0 text-slate-500">
            {isPdf
              ? <FileText size={18} className="text-red-400" />
              : <FileImage size={18} className="text-blue-400" />}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-800 truncate leading-tight">{value.name}</p>
            <p className="text-xs text-slate-400 mt-0.5">{formatBytes(value.size)}</p>
          </div>

          {!displayError && (
            <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
          )}

          {!disabled && (
            <button
              type="button"
              onClick={handleRemove}
              className="p-1 text-slate-300 hover:text-red-500 rounded transition-colors flex-shrink-0"
              aria-label="Remove file"
              title="Remove and re-upload"
            >
              <X size={14} />
            </button>
          )}
        </div>
      ) : (
        /* Drop zone */
        <div
          id={name}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled}
          onClick={() => !disabled && inputRef.current?.click()}
          onKeyDown={handleKeyDown}
          onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true) }}
          onDragEnter={(e) => { e.preventDefault(); if (!disabled) setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center gap-2 px-4 py-5 border-2 border-dashed rounded-lg
            transition-all outline-none select-none
            ${disabled
              ? 'border-slate-200 bg-slate-50/50 cursor-not-allowed'
              : dragging
                ? 'border-blue-500 bg-blue-50 scale-[1.01]'
                : displayError
                  ? 'border-red-300 bg-red-50/60 hover:border-red-400 cursor-pointer'
                  : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
            }`}
        >
          <input
            ref={inputRef}
            id={`${name}-input`}
            type="file"
            accept={accept}
            onChange={handleInputChange}
            disabled={disabled}
            className="hidden"
            aria-label={label}
          />
          <Upload
            size={20}
            className={`${dragging ? 'text-blue-500' : displayError ? 'text-red-400' : 'text-slate-400'} transition-colors`}
          />
          <div className="text-center">
            <p className="text-xs font-medium text-slate-600">
              {dragging ? 'Release to upload' : 'Click to browse or drag & drop'}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {getDisplayAccept(accept)} &middot; Max {maxSizeMB}&thinsp;MB
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {displayError && (
        <p className="flex items-start gap-1.5 text-xs text-red-600">
          <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
          {displayError}
        </p>
      )}

      {/* Hint — only show when no error */}
      {hint && !displayError && (
        <p className="text-xs text-slate-400">{hint}</p>
      )}
    </div>
  )
}