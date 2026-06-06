import { useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useUserLocation } from '@/hooks/useUserLocation'
import { submitCrowdMenuPhoto } from '@/server/menuPhotoSubmissions'
import { readMenuPhotoFile, type MenuPhotoPayload } from '@/utils/menuPhotoFile'
import { userLocationToSubmitterInput } from '@/utils/submitterLocation'

export interface VenueInfoCorrectionProps {
  venueId: string
  venueSlug: string
}

export function VenueInfoCorrection({ venueId, venueSlug }: VenueInfoCorrectionProps) {
  const { user, loading } = useAuth()
  const { userLocation } = useUserLocation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [photoPayload, setPhotoPayload] = useState<MenuPhotoPayload | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (loading) {
    return null
  }

  if (submitted) {
    return (
      <p className="venue-trust-footer__correction-status text-xs text-dark" role="status">
        Nice catch! Consider yourself a certified Happy Hour Fact Checker. We&apos;ll review your
        update shortly.
      </p>
    )
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

  if (!open) {
    return (
      <button
        type="button"
        className="venue-trust-footer__correction-trigger text-left text-xs font-semibold text-primary underline-offset-2 hover:underline"
        onClick={handleOpen}
      >
        Is this information incorrect?
      </button>
    )
  }

  if (!user) {
    return (
      <div className="venue-trust-footer__correction-panel space-y-2">
        <p className="text-xs text-muted-foreground">
          Sign in to upload a photo of the happy hour menu so we can review it.
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
    )
  }

  return (
    <div className="venue-trust-footer__correction-panel space-y-2">
      <p className="text-xs text-muted-foreground">
        Upload a photo of the happy hour menu and we will review any updates.
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
          {photoPayload ? 'Choose another photo' : 'Take or upload photo'}
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
  )
}
