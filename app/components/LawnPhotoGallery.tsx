'use client'

import { useState, useRef } from 'react'
import type { LawnPhoto } from '@/app/lib/types'

export type { LawnPhoto }

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-4 h-4">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 text-gray-300">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}

function formatCapturedAt(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface LightboxProps {
  photo:    LawnPhoto
  onClose:  () => void
  onDelete: () => void
}

function Lightbox({ photo, onClose, onDelete }: LightboxProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={onClose}>
      <div className="relative max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center z-10 hover:bg-gray-100"
        >
          <CloseIcon />
        </button>
        <img
          src={photo.url}
          alt={photo.caption || 'Lawn photo'}
          className="w-full rounded-2xl shadow-2xl max-h-[70vh] object-contain"
        />
        <div className="mt-3 flex items-center justify-between px-1">
          <div>
            {photo.caption && <p className="text-white font-semibold text-sm">{photo.caption}</p>}
            <p className="text-gray-400 text-xs mt-0.5">{formatCapturedAt(photo.capturedAt)}</p>
          </div>
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-white text-xs">Delete?</span>
              <button
                onClick={onDelete}
                className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Yes, delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-red-500/80 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <TrashIcon />
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

interface AddPhotoModalProps {
  onClose: () => void
  onSave:  (file: File, caption: string) => Promise<void>
}

function AddPhotoModal({ onClose, onSave }: AddPhotoModalProps) {
  const [file, setFile]       = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [error, setError]     = useState('')
  const [saving, setSaving]   = useState(false)
  const galleryRef = useRef<HTMLInputElement>(null)
  const cameraRef  = useRef<HTMLInputElement>(null)

  function handleFile(f: File) {
    setError('')
    if (f.size > 5 * 1024 * 1024) {
      setError('Photo must be under 5 MB.')
      return
    }
    setFile(f)
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(f)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  async function handleSave() {
    if (!file || saving) return
    setSaving(true)
    try {
      await onSave(file, caption.trim())
    } catch {
      setError('Upload failed. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Add Lawn Photo</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
            <CloseIcon />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handleInputChange} />
          <input ref={cameraRef}  type="file" accept="image/*" capture="environment" className="hidden" onChange={handleInputChange} />

          {preview ? (
            <div className="relative rounded-xl overflow-hidden">
              <img src={preview} alt="Preview" className="w-full max-h-52 object-cover rounded-xl" />
              <button
                onClick={() => { setFile(null); setPreview(null) }}
                className="absolute top-2 right-2 w-7 h-7 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
              >
                <CloseIcon />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => cameraRef.current?.click()}
                className="flex flex-col items-center gap-2 py-6 border-2 border-dashed border-gray-200 rounded-xl hover:border-green-400 hover:bg-green-50 transition-colors"
              >
                <CameraIcon />
                <span className="text-xs font-semibold text-gray-500">Take Photo</span>
              </button>
              <button
                onClick={() => galleryRef.current?.click()}
                className="flex flex-col items-center gap-2 py-6 border-2 border-dashed border-gray-200 rounded-xl hover:border-green-400 hover:bg-green-50 transition-colors"
              >
                <ImageIcon />
                <span className="text-xs font-semibold text-gray-500">Upload Photo</span>
              </button>
            </div>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Caption (optional)</label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="e.g. Fresh cut, looking good!"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="px-5 pb-5 pt-0 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!file || saving}
            className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed rounded-xl text-sm font-semibold text-white transition-colors"
          >
            {saving ? 'Saving…' : 'Save Photo'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface LawnPhotoGalleryProps {
  photos:   LawnPhoto[]
  onAdd:    (file: File, caption: string) => Promise<void>
  onDelete: (id: string) => void
}

export default function LawnPhotoGallery({ photos, onAdd, onDelete }: LawnPhotoGalleryProps) {
  const [showAdd, setShowAdd]   = useState(false)
  const [lightbox, setLightbox] = useState<LawnPhoto | null>(null)

  async function handleAdd(file: File, caption: string) {
    await onAdd(file, caption)
    setShowAdd(false)
  }

  function handleDelete(id: string) {
    onDelete(id)
    setLightbox(null)
  }

  return (
    <div className="mt-6">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Lawn Photos</h2>
          <p className="text-sm text-gray-400 mt-0.5">{photos.length} {photos.length === 1 ? 'photo' : 'photos'}</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors px-3 py-1.5 rounded-lg"
        >
          <CameraIcon />
          Add Photo
        </button>
      </div>

      {photos.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 flex flex-col items-center text-center">
          <ImageIcon />
          <p className="text-gray-400 text-sm mt-3">No photos yet.</p>
          <button
            onClick={() => setShowAdd(true)}
            className="mt-2 text-sm font-semibold text-green-600 hover:text-green-700"
          >
            Add your first lawn photo →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((photo) => (
            <button
              key={photo.id}
              onClick={() => setLightbox(photo)}
              className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 group focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <img
                src={photo.url}
                alt={photo.caption || 'Lawn photo'}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
              {photo.caption && (
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-2.5 pb-2 pt-6">
                  <p className="text-white text-xs font-semibold truncate">{photo.caption}</p>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {showAdd && <AddPhotoModal onClose={() => setShowAdd(false)} onSave={handleAdd} />}

      {lightbox && (
        <Lightbox
          photo={lightbox}
          onClose={() => setLightbox(null)}
          onDelete={() => handleDelete(lightbox.id)}
        />
      )}
    </div>
  )
}
