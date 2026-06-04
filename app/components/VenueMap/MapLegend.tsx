export function MapLegend() {
  return (
    <div
      className="map-legend pointer-events-none absolute inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20 flex justify-center"
      aria-label="Map legend"
    >
      <ul className="map-legend__bar inline-flex flex-wrap items-center justify-center gap-x-5 gap-y-2 rounded-full border border-border/80 bg-card px-4 py-2.5 shadow-lg sm:gap-x-6 sm:px-5">
        <li className="flex items-center gap-2">
          <span className="map-legend__icon map-legend__icon--now" aria-hidden>
            <svg viewBox="0 0 24 24" width="12" height="12" focusable="false">
              <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
              <path
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                d="M12 8v4l2.5 2.5"
              />
            </svg>
          </span>
          <span className="map-legend__label--now text-xs font-semibold sm:text-[13px]">
            Happening Now
          </span>
        </li>
        <li className="flex items-center gap-2">
          <span className="map-legend__icon map-legend__icon--soon" aria-hidden>
            <svg viewBox="0 0 24 24" width="12" height="12" focusable="false">
              <circle cx="12" cy="13" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
              <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M12 13V9" />
              <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M10 3h4" />
            </svg>
          </span>
          <span className="map-legend__label--soon text-xs font-semibold sm:text-[13px]">
            Starting Soon
          </span>
        </li>
        <li className="flex items-center gap-2">
          <span className="map-legend__icon map-legend__icon--later" aria-hidden>
            <svg viewBox="0 0 24 24" width="12" height="12" focusable="false">
              <path fill="currentColor" d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9" />
            </svg>
          </span>
          <span className="map-legend__label--later text-xs font-semibold sm:text-[13px]">
            Later Tonight
          </span>
        </li>
      </ul>
    </div>
  )
}
