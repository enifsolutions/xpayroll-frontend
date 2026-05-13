'use client'

import { useState, useRef, useEffect } from 'react'
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { Camera, Upload, X, Check, RotateCcw } from 'lucide-react'
import api from '@/lib/axios'

interface EmployeePhotoUploadProps {
  employeeId: string
  currentUrl: string | null
  onUploaded: (url: string) => void
}

function centerSquareCrop(w: number, h: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 90 }, 1, w, h),
    w,
    h
  )
}

async function getCroppedBlob(image: HTMLImageElement, crop: Crop): Promise<Blob> {
  const canvas = document.createElement('canvas')
  const scaleX = image.naturalWidth  / image.width
  const scaleY = image.naturalHeight / image.height
  const pr     = window.devicePixelRatio
  const cw     = (crop.width  / 100) * image.width  * scaleX
  const ch     = (crop.height / 100) * image.height * scaleY
  const cx     = (crop.x     / 100) * image.width  * scaleX
  const cy     = (crop.y     / 100) * image.height * scaleY

  canvas.width  = cw * pr
  canvas.height = ch * pr

  const ctx = canvas.getContext('2d')!
  ctx.scale(pr, pr)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(image, cx, cy, cw, ch, 0, 0, cw, ch)

  return new Promise((res, rej) =>
    canvas.toBlob(
      (b) => (b ? res(b) : rej(new Error('Canvas empty'))),
      'image/jpeg',
      0.92
    )
  )
}

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col items-center gap-4">
        {children}
      </div>
    </div>
  )
}

export default function EmployeePhotoUpload({
  employeeId,
  currentUrl,
  onUploaded,
}: EmployeePhotoUploadProps) {
  const [mode,      setMode]      = useState<'idle' | 'camera' | 'crop'>('idle')
  const [srcImage,  setSrcImage]  = useState<string | null>(null)
  const [crop,      setCrop]      = useState<Crop>()
  const [uploading, setUploading] = useState(false)
  const [cameraErr, setCameraErr] = useState<string | null>(null)
  const [preview,   setPreview]   = useState<string | null>(null)

  const fileRef   = useRef<HTMLInputElement>(null)
  const imgRef    = useRef<HTMLImageElement>(null)
  const videoRef  = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Stop camera stream when leaving camera mode
  useEffect(() => {
    if (mode !== 'camera') {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [mode])

  // ── File pick ────────────────────────────────────────────────────────────
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSrcImage(URL.createObjectURL(file))
    setMode('crop')
    e.target.value = ''
  }

  // ── Camera ───────────────────────────────────────────────────────────────
  const openCamera = async () => {
    setCameraErr(null)
    setMode('camera')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 960 }, facingMode: 'user' },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch {
      setCameraErr('Camera access denied. Check browser permissions.')
    }
  }

  const captureFrame = () => {
    const video = videoRef.current
    if (!video) return
    const canvas  = document.createElement('canvas')
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')!.drawImage(video, 0, 0)
    setSrcImage(canvas.toDataURL('image/jpeg'))
    setMode('crop')
  }

  // ── Crop ─────────────────────────────────────────────────────────────────
  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget
    setCrop(centerSquareCrop(width, height))
  }

  const confirmCrop = async () => {
    if (!imgRef.current || !crop) return
    setUploading(true)
    try {
      const blob     = await getCroppedBlob(imgRef.current, crop)
      const formData = new FormData()
      formData.append('file', blob, 'profile.jpg')

      // No Content-Type header — let browser set multipart boundary
      const res = await api.post<{ url: string }>(
        `files/upload/profile?employeeId=${employeeId}`,
        formData
      )

      const localUrl = URL.createObjectURL(blob)
      setPreview(localUrl)
      onUploaded(res.data.url)
      setMode('idle')
      setSrcImage(null)
    } catch {
      alert('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const cancel = () => { setSrcImage(null); setMode('idle') }

  // Display: local preview > passed-in currentUrl via proxy
  const displayUrl = preview ?? (currentUrl
    ? `/api/image-proxy?path=${encodeURIComponent(currentUrl)}`
    : null)

  return (
    <>
      <div className="relative flex-shrink-0 group">
        {/* Avatar circle */}
        <div className="w-14 h-14 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center ring-2 ring-white dark:ring-gray-800">
          {displayUrl ? (
            <img
              src={displayUrl}
              alt="Profile"
              className="w-full h-full object-cover"
              onError={() => setPreview(null)}
            />
          ) : (
            <span className="text-primary font-semibold text-lg select-none">
              {/* initials rendered by parent */}
            </span>
          )}
          {uploading && (
            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Hover overlay — show both options as small buttons */}
        {!uploading && (
          <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => fileRef.current?.click()}
              className="p-1 rounded-full bg-white/20 hover:bg-white/40 transition-colors"
              title="Upload file"
            >
              <Upload size={11} className="text-white" />
            </button>
            <button
              onClick={openCamera}
              className="p-1 rounded-full bg-white/20 hover:bg-white/40 transition-colors"
              title="Take photo"
            >
              <Camera size={11} className="text-white" />
            </button>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileChange}
        />
      </div>

      {/* ── Camera Modal ─────────────────────────────────────────────────── */}
      {mode === 'camera' && (
        <Modal onClose={cancel}>
          <div className="flex items-center justify-between w-full">
            <span className="font-semibold text-gray-900 dark:text-white">Take a Photo</span>
            <button onClick={cancel} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
              <X size={16} />
            </button>
          </div>

          {cameraErr ? (
            <p className="text-error text-sm text-center py-4">{cameraErr}</p>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full rounded-xl bg-black"
              style={{ minHeight: 240 }}
            />
          )}

          <div className="flex gap-3 w-full">
            <button
              onClick={cancel}
              className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            {!cameraErr && (
              <button
                onClick={captureFrame}
                className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <Camera size={15} /> Capture
              </button>
            )}
          </div>
        </Modal>
      )}

      {/* ── Crop Modal ───────────────────────────────────────────────────── */}
      {mode === 'crop' && srcImage && (
        <Modal onClose={cancel}>
          <div className="flex items-center justify-between w-full">
            <span className="font-semibold text-gray-900 dark:text-white">Crop Photo</span>
            <button onClick={cancel} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
              <X size={16} />
            </button>
          </div>
          <p className="text-xs text-gray-400 -mt-2 self-start">Drag to adjust — square crop</p>

          <div className="w-full">
            <ReactCrop
              crop={crop}
              onChange={(_, pct) => setCrop(pct)}
              aspect={1}
              minWidth={30}
              circularCrop
            >
              <img
                ref={imgRef}
                src={srcImage}
                alt="Crop preview"
                onLoad={onImageLoad}
                className="max-w-full rounded-lg"
              />
            </ReactCrop>
          </div>

          <div className="flex gap-3 w-full">
            <button
              onClick={cancel}
              className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-1.5"
            >
              <RotateCcw size={14} /> Retake
            </button>
            <button
              onClick={confirmCrop}
              disabled={uploading}
              className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors flex items-center justify-center gap-1.5"
            >
              {uploading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <><Check size={15} /> Save</>
              )}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
