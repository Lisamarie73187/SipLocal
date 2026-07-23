export interface Debounced<Args extends unknown[]> {
  run: (...args: Args) => void
  cancel: () => void
}

export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  waitMs: number,
): Debounced<Args> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return {
    run: (...args: Args) => {
      if (timeoutId != null) {
        clearTimeout(timeoutId)
      }
      timeoutId = setTimeout(() => {
        timeoutId = null
        fn(...args)
      }, waitMs)
    },
    cancel: () => {
      if (timeoutId != null) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
    },
  }
}
