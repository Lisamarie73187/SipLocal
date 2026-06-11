import { useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  addVenueMenuPhoto,
  deleteVenueMenuPhoto,
  reorderVenueMenuPhotos,
} from '@/server/venueMenuImage'
import { useAdminVenueMenuImages } from '@/hooks/useVenueMenuImage'
import { isMenuPhotoMediaType, type MenuPhotoMediaType } from '@/utils/menuPhotoFile'

export interface AdminVenueMenuPhotoCardProps {
  venueId: string
}

export function AdminVenueMenuPhotoCard({ venueId }: AdminVenueMenuPhotoCardProps) {
  const { images, loading: imagesLoading, reload: reloadImages } = useAdminVenueMenuImages(venueId)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [busyImageId, setBusyImageId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const busy = uploading || busyImageId !== null

  const readFileAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        const base64 = dataUrl.split(',')[1]
        if (!base64) {
          reject(new Error('Could not read image.'))
          return
        }
        resolve(base64)
      }
      reader.onerror = () => reject(new Error('Could not read image.'))
      reader.readAsDataURL(file)
    })

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (files.length === 0) return

    for (const file of files) {
      if (!isMenuPhotoMediaType(file.type)) {
        setErrorMsg('Use JPEG, PNG, or WebP images.')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg('Each image must be under 5 MB.')
        return
      }
    }

    setErrorMsg(null)
    setUploading(true)

    void (async () => {
      try {
        for (const file of files) {
          const base64 = await readFileAsBase64(file)
          await addVenueMenuPhoto({
            data: {
              venueId,
              imageBase64: base64,
              mediaType: file.type as MenuPhotoMediaType,
            },
          })
        }
        await reloadImages()
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Upload failed.')
      } finally {
        setUploading(false)
      }
    })()
  }

  const handleDelete = (imageId: string): void => {
    setErrorMsg(null)
    setBusyImageId(imageId)

    void deleteVenueMenuPhoto({ data: { venueId, imageId } })
      .then(() => reloadImages())
      .catch((err) => {
        setErrorMsg(err instanceof Error ? err.message : 'Could not remove photo.')
      })
      .finally(() => setBusyImageId(null))
  }

  const handleMove = (index: number, direction: -1 | 1): void => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= images.length) return

    const reordered = [...images]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(targetIndex, 0, moved)

    setErrorMsg(null)
    setBusyImageId(images[index].id)

    void reorderVenueMenuPhotos({
      data: { venueId, imageIds: reordered.map((image) => image.id) },
    })
      .then(() => reloadImages())
      .catch((err) => {
        setErrorMsg(err instanceof Error ? err.message : 'Could not reorder photos.')
      })
      .finally(() => setBusyImageId(null))
  }

  return (
    <section className="space-y-4 rounded-xl border border-border/70 bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-heading text-lg font-semibold text-dark">Menu photos</h2>
      </div>

      {imagesLoading ? (
        <div className="flex h-24 items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : images.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((image, index) => (
            <li key={image.id} className="space-y-2">
              <div className="overflow-hidden rounded-xl border border-border/70">
                <img
                  src={image.url}
                  alt={`Menu photo ${index + 1}`}
                  className="aspect-square w-full object-cover bg-muted/30"
                />
              </div>
              <div className="flex items-center justify-between gap-1">
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="size-9"
                    disabled={busy || index === 0}
                    onClick={() => handleMove(index, -1)}
                    aria-label="Move photo earlier"
                  >
                    <ArrowLeft className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="size-9"
                    disabled={busy || index === images.length - 1}
                    onClick={() => handleMove(index, 1)}
                    aria-label="Move photo later"
                  >
                    <ArrowRight className="size-3.5" />
                  </Button>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-9 text-muted-foreground hover:text-destructive"
                  disabled={busy}
                  onClick={() => handleDelete(image.id)}
                  aria-label="Remove photo"
                >
                  {busyImageId === image.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No menu photos yet. Upload one or more below.</p>
      )}

      <div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="min-h-9 gap-1.5"
          disabled={busy}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <ImagePlus className="size-3.5" />
          )}
          {uploading ? 'Uploading…' : 'Upload photos'}
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {errorMsg ? (
        <p className="text-sm text-destructive" role="alert">{errorMsg}</p>
      ) : null}
    </section>
  )
}
