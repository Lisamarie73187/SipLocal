export interface VenueMapOverlaySpecialsProps {
  chips: string[]
}

export function VenueMapOverlaySpecials({ chips }: VenueMapOverlaySpecialsProps) {
  if (chips.length === 0) {
    return null
  }

  return (
    <div className="mt-3">
      <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
        Specials
      </p>
      <ul className="mt-1.5 flex flex-wrap gap-2">
        {chips.map((chip) => (
          <li key={chip}>
            <span className="venue-deal-chip">{chip}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
