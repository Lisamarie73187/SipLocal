import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Camera, ImagePlus, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useUserLocation } from '@/hooks/useUserLocation'
import { submitCrowdMenuPhoto } from '@/server/menuPhotoSubmissions'
import { readMenuPhotoFile, type MenuPhotoPayload } from '@/utils/menuPhotoFile'
import { userLocationToSubmitterInput } from '@/utils/submitterLocation'
import { cn } from '@/utils'

export interface VenueInfoCorrectionProps {
  venueId: string
  venueSlug: string
}

export function VenueInfoCorrection({ venueId, venueSlug }: VenueInfoCorrectionProps) {
  const { user, loading } = useAuth()
  const { userLocation } = useUserLocation()
  const inputRef = useRef<HTMLInputElement>(null)
  const submittedDialogRef = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [photoPayload, setPhotoPayload] = useState<MenuPhotoPayload | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const dialog = submittedDialogRef.current
    if (!dialog) {
      return
    }

    if (submitted && !dialog.open) {
      dialog.showModal()
    } else if (!submitted && dialog.open) {
      dialog.close()
    }
  }, [submitted])

  if (loading) {
    return null
  }

  const handleOpen = (): void => {
    setError(null)
    setOpen(true)
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) {
      return
    }

    setError(null)

    void readMenuPhotoFile(file)
      .then((payload) => {
        setPhotoPayload(payload)
        setPreviewUrl(URL.createObjectURL(file))
      })
      .catch((readError) => {
        setPhotoPayload(null)
        setPreviewUrl(null)
        setError(readError instanceof Error ? readError.message : 'Could not read photo.')
      })
  }

  const handleSubmit = (): void => {
    if (!photoPayload) {
      setError('Choose a menu photo first.')
      return
    }

    setSubmitting(true)
    setError(null)

    void submitCrowdMenuPhoto({
      data: {
        venueId,
        imageBase64: photoPayload.imageBase64,
        mediaType: photoPayload.mediaType,
        submitterLocation: userLocationToSubmitterInput(userLocation),
      },
    })
      .then(() => {
        setSubmitted(true)
        setOpen(false)
        setPhotoPayload(null)
        setPreviewUrl(null)
      })
      .catch((submitError) => {
        setError(submitError instanceof Error ? submitError.message : 'Submit failed.')
      })
      .finally(() => {
        setSubmitting(false)
      })
  }

  const handleSubmittedDone = (): void => {
    setSubmitted(false)
  }

  const submittedDialog = (
    <dialog
      ref={submittedDialogRef}
      className={cn(
        'venue-info-correction-dialog fixed inset-0 z-50 m-0 h-dvh max-h-none w-full max-w-none',
        'border-0 bg-transparent p-0 backdrop:bg-dark/50',
      )}
      onClose={handleSubmittedDone}
      aria-labelledby="venue-info-correction-dialog-title"
    >
      <div className="flex min-h-full items-end justify-center p-4 sm:items-center">
        <button
          type="button"
          className="absolute inset-0 cursor-default"
          aria-label="Close dialog"
          onClick={handleSubmittedDone}
        />

        <div className="relative z-10 w-full max-w-md rounded-2xl border border-border/70 bg-card p-5 shadow-xl">
          <h2
            id="venue-info-correction-dialog-title"
            className="font-heading text-lg font-semibold text-dark"
          >
            Thanks for the update!
          </h2>
          <p className="mt-2 text-sm text-dark" role="status">
            Nice catch! Consider yourself a certified Happy Hour Fact Checker. We&apos;ll review
            your update shortly.
          </p>
          <Button type="button" className="mt-4 min-h-11 w-full" onClick={handleSubmittedDone}>
            Done
          </Button>
        </div>
      </div>
    </dialog>
  )

  if (!open) {
    return (
      <>
        <button
          type="button"
          className="venue-trust-footer__correction-trigger text-left text-xs font-semibold text-primary underline-offset-2 hover:underline"
          onClick={handleOpen}
        >
          See something off? Let us know
        </button>
        {submittedDialog}
      </>
    )
  }

  if (!user) {
    return (
      <>
        <div className="venue-trust-footer__correction-panel space-y-2">
          <p className="text-xs text-muted-foreground">
            Snap a pic of the happy hour menu and become a local legend. Sign in first so we know
            who to thank.
          </p>
          <Link
            to="/login"
            search={{ redirect: `/venues/${venueSlug}` }}
            className="inline-flex min-h-9 items-center text-xs font-semibold text-primary hover:underline"
          >
            Sign in to submit a correction
          </Link>
          <button
            type="button"
            className="block text-xs text-muted-foreground hover:text-dark"
            onClick={() => setOpen(false)}
          >
            Cancel
          </button>
        </div>
        {submittedDialog}
      </>
    )
  }

  return (
    <>
      <div className="venue-trust-footer__correction-panel space-y-2">
        <p className="text-xs text-muted-foreground">
          Snap a photo of the happy hour menu and our crack team of deal detectives will give it a
          look.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="sr-only"
          onChange={handleFileChange}
        />

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-9"
            disabled={submitting}
            onClick={() => inputRef.current?.click()}
          >
            {photoPayload ? (
              <>
                <ImagePlus className="size-4" />
                Choose another photo
              </>
            ) : (
              <>
                <Camera className="size-4" />
                Take or upload photo
              </>
            )}
          </Button>

          {photoPayload ? (
            <Button
              type="button"
              size="sm"
              className="min-h-9"
              disabled={submitting}
              onClick={handleSubmit}
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Submit for review
            </Button>
          ) : null}
        </div>

        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Selected happy hour menu"
            className="max-h-32 w-full rounded-lg border border-border/70 object-contain bg-muted/20"
          />
        ) : null}

        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-dark"
          onClick={() => {
            setOpen(false)
            setPhotoPayload(null)
            setPreviewUrl(null)
            setError(null)
          }}
        >
          Cancel
        </button>

        {error ? (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      {submittedDialog}
    </>
  )
}
