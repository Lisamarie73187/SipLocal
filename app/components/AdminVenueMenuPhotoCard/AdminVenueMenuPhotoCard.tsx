import { useRef, useState } from 'react'
import { ImagePlus, Loader2, Trash2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { clearVenueMenuPhoto, setVenueMenuPhoto, setVenueMenuPhotoUrl } from '@/server/venueMenuImage'
import { useVenueMenuImage } from '@/hooks/useVenueMenuImage'
import { isMenuPhotoMediaType, type MenuPhotoMediaType } from '@/utils/menuPhotoFile'

export interface AdminVenueMenuPhotoCardProps {
  venueId: string
}

type UploadState = 'idle' | 'uploading' | 'saving_url' | 'clearing' | 'error'

export function AdminVenueMenuPhotoCard({ venueId }: AdminVenueMenuPhotoCardProps) {
  const { menuImageUrl, loading: imageLoading, reload: reloadImage } = useVenueMenuImage(venueId)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [urlDraft, setUrlDraft] = useState('')
  const [showUrlInput, setShowUrlInput] = useState(false)

  const busy = uploadState !== 'idle' && uploadState !== 'error'

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0]
    if (!file) return

    const mediaType = file.type
    if (!isMenuPhotoMediaType(mediaType)) {
      setErrorMsg('Use a JPEG, PNG, or WebP image.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image must be under 5 MB.')
      return
    }

    setUploadState('uploading')
    setErrorMsg(null)

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const base64 = dataUrl.split(',')[1]
      if (!base64) {
        setUploadState('error')
        setErrorMsg('Could not read image.')
        return
      }

      void setVenueMenuPhoto({
        data: {
          venueId,
          imageBase64: base64,
          mediaType: mediaType as MenuPhotoMediaType,
        },
      })
        .then(() => {
          setUploadState('idle')
          void reloadImage()
        })
        .catch((err) => {
          setUploadState('error')
          setErrorMsg(err instanceof Error ? err.message : 'Upload failed.')
        })
    }
    reader.onerror = () => {
      setUploadState('error')
      setErrorMsg('Could not read image.')
    }
    reader.readAsDataURL(file)

    event.target.value = ''
  }

  const handleSaveUrl = (): void => {
    const url = urlDraft.trim()
    if (!url) return
    if (!url.startsWith('https://')) {
      setErrorMsg('URL must start with https://')
      return
    }

    setUploadState('saving_url')
    setErrorMsg(null)

    void setVenueMenuPhotoUrl({ data: { venueId, url } })
      .then(() => {
        setUploadState('idle')
        setUrlDraft('')
        setShowUrlInput(false)
        void reloadImage()
      })
      .catch((err) => {
        setUploadState('error')
        setErrorMsg(err instanceof Error ? err.message : 'Could not save URL.')
      })
  }

  const handleClear = (): void => {
    setUploadState('clearing')
    setErrorMsg(null)

    void clearVenueMenuPhoto({ data: { venueId } })
      .then(() => {
        setUploadState('idle')
        void reloadImage()
      })
      .catch((err) => {
        setUploadState('error')
        setErrorMsg(err instanceof Error ? err.message : 'Could not remove photo.')
      })
  }

  return (
    <section className="space-y-4 rounded-xl border border-border/70 bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-heading text-lg font-semibold text-dark">Menu photo</h2>
        {menuImageUrl && !imageLoading ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="min-h-9 gap-1.5 text-muted-foreground hover:text-destructive"
            disabled={busy}
            onClick={handleClear}
          >
            {uploadState === 'clearing' ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Trash2 className="size-3.5" />
            )}
            Remove
          </Button>
        ) : null}
      </div>

      {imageLoading ? (
        <div className="flex h-24 items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : menuImageUrl ? (
        <div className="overflow-hidden rounded-xl border border-border/70">
          <img
            src={menuImageUrl}
            alt="Happy hour menu"
            className="max-h-48 w-full object-contain bg-muted/30"
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No menu photo set. Upload one or paste an image URL.</p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="min-h-9 gap-1.5"
          disabled={busy}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploadState === 'uploading' ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <ImagePlus className="size-3.5" />
          )}
          {uploadState === 'uploading' ? 'Uploading…' : 'Upload photo'}
        </Button>

        {!showUrlInput ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="min-h-9 text-muted-foreground"
            disabled={busy}
            onClick={() => setShowUrlInput(true)}
          >
            Paste image URL
          </Button>
        ) : null}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {showUrlInput ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="url"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            placeholder="https://example.com/menu.jpg"
            className="h-11 flex-1 rounded-xl border border-border/70 bg-background px-3 text-sm text-dark focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleSaveUrl()
              }
            }}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              className="min-h-9"
              disabled={busy || !urlDraft.trim()}
              onClick={handleSaveUrl}
            >
              {uploadState === 'saving_url' ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {uploadState === 'saving_url' ? 'Saving…' : 'Save URL'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="min-h-9"
              onClick={() => {
                setShowUrlInput(false)
                setUrlDraft('')
                setErrorMsg(null)
              }}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </div>
      ) : null}

      {errorMsg ? (
        <p className="text-sm text-destructive" role="alert">{errorMsg}</p>
      ) : null}
    </section>
  )
}
