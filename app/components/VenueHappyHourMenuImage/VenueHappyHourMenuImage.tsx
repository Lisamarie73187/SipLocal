import { useEffect, useRef } from 'react'
import { X, ZoomIn } from 'lucide-react'

import { useVenueMenuImage } from '@/hooks/useVenueMenuImage'
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
  const { menuImageUrl, loading } = useVenueMenuImage(venueId)
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

  if (loading || !menuImageUrl) {
    return null
  }

  const openViewer = (): void => {
    const dialog = dialogRef.current
    if (!dialog) {
      return
    }
    document.body.style.overflow = 'hidden'
    dialog.showModal()
  }

  const closeViewer = (): void => {
    dialogRef.current?.close()
  }

  return (
    <>
      <section className={cn('venue-happy-hour-menu-image', className)} aria-label="Happy hour menu photo">
        <h3 className="font-heading text-xs font-bold tracking-wide text-dark uppercase">
          Menu photo
        </h3>
        <button
          type="button"
          onClick={openViewer}
          className="group relative mt-2 block w-full overflow-hidden rounded-xl border border-border/70 bg-muted/20 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <img
            src={menuImageUrl}
            alt={`Happy hour menu for ${venueName}`}
            className="max-h-48 w-full object-contain"
          />
          <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-dark/55 px-3 py-2 text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            <ZoomIn className="size-3.5" aria-hidden />
            View full menu
          </span>
        </button>
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
          <div className="flex shrink-0 items-center justify-end p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <button
              type="button"
              onClick={closeViewer}
              className="flex size-10 items-center justify-center rounded-full bg-card/90 text-dark shadow-sm"
              aria-label="Close menu photo"
            >
              <X className="size-5" />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <img
              src={menuImageUrl}
              alt={`Happy hour menu for ${venueName}`}
              className="max-h-[85dvh] w-full max-w-3xl object-contain"
            />
          </div>
        </div>
      </dialog>
    </>
  )
}
