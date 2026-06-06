import { useCallback, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  inviteVenueManager,
  listVenueManagers,
  removeVenueManager,
  type VenueManagerListItem,
} from '@/server/adminVenues'

const inputClassName =
  'h-11 w-full rounded-xl border border-border/70 bg-background px-3 text-sm text-dark focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20'

export interface AdminVenueManagersSectionProps {
  venueId: string
  venueSlug: string
}

export function AdminVenueManagersSection({
  venueId,
  venueSlug,
}: AdminVenueManagersSectionProps) {
  const [managers, setManagers] = useState<VenueManagerListItem[]>([])
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [inviting, setInviting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadManagers = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const rows = await listVenueManagers({ data: { venueId } })
      setManagers(rows)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load managers')
    } finally {
      setLoading(false)
    }
  }, [venueId])

  useEffect(() => {
    void loadManagers()
  }, [loadManagers])

  const handleInvite = (): void => {
    setInviting(true)
    setError(null)
    setMessage(null)
    void inviteVenueManager({ data: { venueId, email: email.trim() } })
      .then((result) => {
        setMessage(`Manager added. Share this link: /manage/${venueSlug} (${result.email})`)
        setEmail('')
        return loadManagers()
      })
      .catch((inviteError) => {
        setError(inviteError instanceof Error ? inviteError.message : 'Invite failed')
      })
      .finally(() => setInviting(false))
  }

  return (
    <section className="space-y-4 rounded-xl border border-border/70 bg-card p-4 shadow-sm">
      <div>
        <h2 className="font-heading text-lg font-semibold text-dark">Venue managers</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Grant access to /manage for this venue only. Does not grant admin access.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="manager@restaurant.com"
          className={inputClassName}
          aria-label="Manager email"
        />
        <Button
          type="button"
          className="min-h-11"
          disabled={inviting || email.trim().length === 0}
          onClick={handleInvite}
        >
          {inviting ? <Loader2 className="size-4 animate-spin" /> : null}
          Add manager
        </Button>
      </div>

      {message ? (
        <p className="text-sm text-dark" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading managers…</p>
      ) : managers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No managers linked yet.</p>
      ) : (
        <ul className="space-y-2">
          {managers.map((manager) => (
            <li
              key={manager.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 px-3 py-2 text-sm"
            >
              <span className="text-dark">{manager.email ?? manager.user_id}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{manager.role}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-9"
                  onClick={() => {
                    void removeVenueManager({ data: { managerId: manager.id } }).then(() =>
                      loadManagers(),
                    )
                  }}
                >
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
