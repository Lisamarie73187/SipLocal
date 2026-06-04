import { useEffect, useId, type ReactNode, type RefObject } from 'react'

import { cn } from '@/utils'

export interface FilterPopoverPanelProps {
  open: boolean
  onClose: () => void
  anchorRef: RefObject<HTMLElement | null>
  children: ReactNode
  align?: 'start' | 'end'
}

export function FilterPopoverPanel({
  open,
  onClose,
  anchorRef,
  children,
  align = 'start',
}: FilterPopoverPanelProps) {
  const panelId = useId()

  useEffect(() => {
    if (!open) {
      return
    }
    const onPointerDown = (event: MouseEvent): void => {
      const target = event.target as Node
      if (anchorRef.current?.contains(target)) {
        return
      }
      onClose()
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose, anchorRef])

  if (!open) {
    return null
  }

  return (
    <div
      id={panelId}
      role="dialog"
      className={cn(
        'absolute top-[calc(100%+0.5rem)] z-50 min-w-[18rem] rounded-xl border border-border bg-card p-3 shadow-lg',
        align === 'end' ? 'right-0' : 'left-0',
      )}
    >
      {children}
    </div>
  )
}
