import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react'

import { useVenueMenuImages } from '@/hooks/useVenueMenuImage'
import { cn } from '@/utils'

export interface VenueHappyHourMenuImageProps {
  venueId: string
  venueName: string
  className?: string
}

export function VenueHappyHourMenuImage({
  venueId,
  venueName,
  className,
}: VenueHappyHourMenuImageProps) {
  const { images, loading } = useVenueMenuImages(venueId)
  const [activeIndex, setActiveIndex] = useState(0)
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) {
      return
    }

    const handleClose = (): void => {
      document.body.style.overflow = ''
    }

    dialog.addEventListener('close', handleClose)
    return () => {
      dialog.removeEventListener('close', handleClose)
    }
  }, [])

  if (loading || images.length === 0) {
    return null
  }

  const openViewer = (index: number): void => {
    const dialog = dialogRef.current
    if (!dialog) {
      return
    }
    setActiveIndex(index)
    document.body.style.overflow = 'hidden'
    dialog.showModal()
  }

  const closeViewer = (): void => {
    dialogRef.current?.close()
  }

  const showPrev = (): void => {
    setActiveIndex((i) => (i - 1 + images.length) % images.length)
  }

  const showNext = (): void => {
    setActiveIndex((i) => (i + 1) % images.length)
  }

  return (
    <>
      <section className={cn('venue-happy-hour-menu-image', className)} aria-label="Happy hour menu photos">
        <h3 className="font-heading text-xs font-bold tracking-wide text-dark uppercase">
          Menu photo{images.length > 1 ? 's' : ''}
        </h3>
        <div className="mt-2 -mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => openViewer(index)}
              className="group relative block w-full shrink-0 snap-center overflow-hidden rounded-xl border border-border/70 bg-muted/20 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <img
                src={image.url}
                alt={`Happy hour menu for ${venueName}${images.length > 1 ? ` (${index + 1} of ${images.length})` : ''}`}
                className="max-h-48 w-full object-contain"
              />
              <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-dark/55 px-3 py-2 text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                <ZoomIn className="size-3.5" aria-hidden />
                View full menu
              </span>
            </button>
          ))}
        </div>
        {images.length > 1 ? (
          <div className="mt-2 flex justify-center gap-1.5" aria-hidden>
            {images.map((image, index) => (
              <span
                key={image.id}
                className={cn(
                  'h-1.5 w-1.5 rounded-full bg-border',
                  index === activeIndex && 'bg-primary',
                )}
              />
            ))}
          </div>
        ) : null}
      </section>

      <dialog
        ref={dialogRef}
        className="venue-happy-hour-menu-image__dialog fixed inset-0 z-[100] m-0 h-dvh max-h-none w-full max-w-none border-0 bg-transparent p-0 backdrop:bg-dark/80"
        aria-label={`Happy hour menu for ${venueName}`}
        onClick={(event) => {
          if (event.target === dialogRef.current) {
            closeViewer()
          }
        }}
      >
        <div className="flex min-h-full flex-col">
          <div className="flex shrink-0 items-center justify-between p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            {images.length > 1 ? (
              <span className="rounded-full bg-card/90 px-3 py-1.5 text-xs font-semibold text-dark shadow-sm">
                {activeIndex + 1} / {images.length}
              </span>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={closeViewer}
              className="flex size-10 items-center justify-center rounded-full bg-card/90 text-dark shadow-sm"
              aria-label="Close menu photo"
            >
              <X className="size-5" />
            </button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <img
              src={images[activeIndex]?.url}
              alt={`Happy hour menu for ${venueName}${images.length > 1 ? ` (${activeIndex + 1} of ${images.length})` : ''}`}
              className="max-h-[85dvh] w-full max-w-3xl object-contain"
            />
            {images.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={showPrev}
                  className="absolute left-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-card/90 text-dark shadow-sm"
                  aria-label="Previous menu photo"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={showNext}
                  className="absolute right-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-card/90 text-dark shadow-sm"
                  aria-label="Next menu photo"
                >
                  <ChevronRight className="size-5" />
                </button>
              </>
            ) : null}
          </div>
        </div>
      </dialog>
    </>
  )
}
