import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Loader2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useUserLocation } from '@/hooks/useUserLocation'
import { submitVenueSuggestion } from '@/server/venueSuggestions'
import { readMenuPhotoFile, type MenuPhotoPayload } from '@/utils/menuPhotoFile'
import { userLocationToSubmitterInput } from '@/utils/submitterLocation'
import { cn } from '@/utils'

export interface SuggestVenueDialogProps {
  citySlug: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SuggestVenueDialog({ citySlug, open, onOpenChange }: SuggestVenueDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { user, loading: authLoading } = useAuth()
  const {
    userLocation,
    loading: locatingUser,
    error: locationError,
    requestLocation,
  } = useUserLocation()
  const [venueName, setVenueName] = useState('')
  const [userDescription, setUserDescription] = useState('')
  const [photoPayload, setPhotoPayload] = useState<MenuPhotoPayload | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) {
      return
    }

    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  const resetForm = (): void => {
    setVenueName('')
    setUserDescription('')
    setPhotoPayload(null)
    setPreviewUrl(null)
    setError(null)
    setSubmitted(false)
  }

  const handleClose = (): void => {
    resetForm()
    onOpenChange(false)
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
    const trimmedName = venueName.trim()
    if (trimmedName.length < 2) {
      setError('Enter the venue name.')
      return
    }

    if (!photoPayload) {
      setError('Add a photo of the happy hour menu or specials board.')
      return
    }

    setSubmitting(true)
    setError(null)

    void submitVenueSuggestion({
      data: {
        citySlug,
        venueName: trimmedName,
        userDescription: userDescription.trim() || undefined,
        imageBase64: photoPayload.imageBase64,
        mediaType: photoPayload.mediaType,
        submitterLocation: userLocationToSubmitterInput(userLocation),
      },
    })
      .then(() => {
        setSubmitted(true)
      })
      .catch((submitError) => {
        setError(submitError instanceof Error ? submitError.message : 'Submit failed.')
      })
      .finally(() => {
        setSubmitting(false)
      })
  }

  return (
    <dialog
      ref={dialogRef}
      className={cn(
        'suggest-venue-dialog fixed inset-0 z-50 m-0 h-dvh max-h-none w-full max-w-none',
        'border-0 bg-transparent p-0 backdrop:bg-dark/50',
      )}
      onClose={handleClose}
      aria-labelledby="suggest-venue-dialog-title"
    >
      <div className="flex min-h-full items-end justify-center p-4 sm:items-center">
        <button
          type="button"
          className="absolute inset-0 cursor-default"
          aria-label="Close dialog"
          onClick={handleClose}
        />

        <div className="relative z-10 w-full max-w-md rounded-2xl border border-border/70 bg-card p-5 shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2
                id="suggest-venue-dialog-title"
                className="font-heading text-lg font-semibold text-dark"
              >
                Suggest a venue
              </h2>
              {!submitted ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  Tell us the name and share a photo of their happy hour so we can add it for review.
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-dark"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>

          {submitted ? (
            <div className="mt-5 space-y-4">
              <p className="text-sm text-dark" role="status">
                Thanks! Nice find! You&apos;ve helped fellow sippers discover a new happy hour.
              </p>
              <Button type="button" className="min-h-11 w-full" onClick={handleClose}>
                Done
              </Button>
            </div>
          ) : authLoading ? (
            <div className="mt-8 flex justify-center py-6">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          ) : !user ? (
            <div className="mt-5 space-y-3">
              <p className="text-sm text-muted-foreground">
                Sign in to suggest a missing venue and upload a happy hour photo.
              </p>
              <Button asChild className="min-h-11 w-full">
                <Link to="/login" search={{ redirect: '/', mode: 'sign-in' }}>
                  Sign in to continue
                </Link>
              </Button>
              <Button type="button" variant="outline" className="min-h-11 w-full" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-dark">Venue name</span>
                <input
                  type="text"
                  value={venueName}
                  onChange={(event) => setVenueName(event.target.value)}
                  placeholder="e.g. The Lot"
                  className="h-11 w-full rounded-xl border border-border/70 bg-background px-3 text-base text-dark focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  autoComplete="organization"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-dark">
                  Comments{' '}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </span>
                <textarea
                  value={userDescription}
                  onChange={(event) => setUserDescription(event.target.value)}
                  placeholder="Anything helpful — hours, vibe, what you ordered…"
                  rows={3}
                  maxLength={500}
                  className="w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-base text-dark focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <div className="space-y-2">
                <span className="text-sm font-medium text-dark">Happy hour photo</span>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  className="sr-only"
                  onChange={handleFileChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 w-full"
                  disabled={submitting}
                  onClick={() => inputRef.current?.click()}
                >
                  {photoPayload ? 'Choose another photo' : 'Take or upload photo'}
                </Button>
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Selected happy hour menu"
                    className="max-h-40 w-full rounded-xl border border-border/70 object-contain bg-muted/20"
                  />
                ) : null}
              </div>

              {userLocation ? (
                <p className="text-xs text-muted-foreground">
                  Your current location will be included to help us place this venue.
                </p>
              ) : (
                <div className="space-y-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto min-h-9 px-0 text-xs font-semibold text-primary hover:bg-transparent"
                    disabled={submitting || locatingUser}
                    onClick={requestLocation}
                  >
                    {locatingUser ? 'Getting location…' : 'Include my location'}
                  </Button>
                  {locationError ? (
                    <p className="text-xs text-destructive" role="alert">
                      {locationError}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Optional — helps us find the right spot on the map.
                    </p>
                  )}
                </div>
              )}

              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  className="min-h-11 flex-1"
                  disabled={submitting}
                  onClick={handleSubmit}
                >
                  {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
                  Submit for review
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 flex-1"
                  disabled={submitting}
                  onClick={handleClose}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </dialog>
  )
}
