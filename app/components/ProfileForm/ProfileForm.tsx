import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

import { VisitorTypePicker } from '@/components/VisitorTypePicker/VisitorTypePicker'
import { Button } from '@/components/ui/button'
import {
  getUserProfile,
  updateUserProfile,
  type UserProfileData,
} from '@/server/profile'
import type { Database } from '@/types/database'
import { PROFILE_GENDER_OPTIONS, type ProfileGender } from '@/utils/profileGender'

type VisitorType = Database['public']['Enums']['profile_visitor_type']

const inputClassName =
  'h-11 w-full rounded-xl border border-border/70 bg-background px-3 text-base text-dark focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20'

const labelClassName = 'text-sm font-medium text-dark'

interface ProfileFormState {
  displayName: string
  preferredCityId: string
  visitorType: VisitorType | null
  dateOfBirth: string
  gender: ProfileGender | null
  neighborhoodOrZip: string
  notifications: UserProfileData['notifications']
}

function profileToFormState(profile: UserProfileData): ProfileFormState {
  return {
    displayName: profile.displayName,
    preferredCityId: profile.preferredCityId ?? profile.cities[0]?.id ?? '',
    visitorType: profile.visitorType,
    dateOfBirth: profile.dateOfBirth ?? '',
    gender: profile.gender,
    neighborhoodOrZip: profile.neighborhoodOrZip ?? '',
    notifications: { ...profile.notifications },
  }
}

export function ProfileForm() {
  const [profile, setProfile] = useState<UserProfileData | null>(null)
  const [form, setForm] = useState<ProfileFormState | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    void getUserProfile()
      .then((data) => {
        setProfile(data)
        setForm(profileToFormState(data))
        setError(null)
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load profile')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  if (loading || !form || !profile) {
    return (
      <div className="flex justify-center py-12">
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : (
          <Loader2 className="size-6 animate-spin text-primary" />
        )}
      </div>
    )
  }

  const handleSave = (): void => {
    if (!form.displayName.trim()) {
      setError('Enter a display name.')
      return
    }

    if (!form.preferredCityId) {
      setError('Choose a preferred city.')
      return
    }

    setSaving(true)
    setError(null)
    setFeedback(null)

    void updateUserProfile({
      data: {
        displayName: form.displayName.trim(),
        preferredCityId: form.preferredCityId,
        visitorType: form.visitorType,
        dateOfBirth: form.dateOfBirth.trim() || null,
        gender: form.gender,
        neighborhoodOrZip: form.neighborhoodOrZip.trim() || undefined,
        notifications: form.notifications,
      },
    })
      .then((result) => {
        setFeedback(result.message)
        setProfile((current) =>
          current
            ? {
                ...current,
                displayName: form.displayName.trim(),
                preferredCityId: form.preferredCityId,
                visitorType: form.visitorType,
                dateOfBirth: form.dateOfBirth.trim() || null,
                gender: form.gender,
                neighborhoodOrZip: form.neighborhoodOrZip.trim() || null,
                notifications: { ...form.notifications },
                preferredCitySlug:
                  profile.cities.find((city) => city.id === form.preferredCityId)?.slug ?? null,
                preferredCityName:
                  profile.cities.find((city) => city.id === form.preferredCityId)?.name ?? null,
              }
            : current,
        )
      })
      .catch((saveError) => {
        setError(saveError instanceof Error ? saveError.message : 'Save failed')
      })
      .finally(() => {
        setSaving(false)
      })
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault()
        handleSave()
      }}
    >
      <section className="space-y-4 rounded-xl border border-border/70 bg-card p-4 shadow-sm">
        <h2 className="font-heading text-base font-semibold text-dark">About you</h2>

        <label className="block space-y-1.5">
          <span className={labelClassName}>Display name</span>
          <input
            type="text"
            value={form.displayName}
            onChange={(event) =>
              setForm((current) =>
                current ? { ...current, displayName: event.target.value } : current,
              )
            }
            autoComplete="nickname"
            className={inputClassName}
          />
        </label>

        <label className="block space-y-1.5">
          <span className={labelClassName}>Preferred city</span>
          <select
            value={form.preferredCityId}
            onChange={(event) =>
              setForm((current) =>
                current ? { ...current, preferredCityId: event.target.value } : current,
              )
            }
            className={inputClassName}
          >
            {profile.cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}, {city.state}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="space-y-2">
          <legend className={labelClassName}>Local or tourist?</legend>
          <VisitorTypePicker
            value={form.visitorType}
            onChange={(next) =>
              setForm((current) => (current ? { ...current, visitorType: next } : current))
            }
          />
          <p className="text-xs text-muted-foreground">
            Optional — tap again to clear. Set during signup on the welcome screen.
          </p>
        </fieldset>

        <label className="block space-y-1.5">
          <span className={labelClassName}>
            Date of birth <span className="font-normal text-muted-foreground">(optional)</span>
          </span>
          <input
            type="date"
            value={form.dateOfBirth}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(event) =>
              setForm((current) =>
                current ? { ...current, dateOfBirth: event.target.value } : current,
              )
            }
            className={inputClassName}
          />
        </label>

        <label className="block space-y-1.5">
          <span className={labelClassName}>
            Gender <span className="font-normal text-muted-foreground">(optional)</span>
          </span>
          <select
            value={form.gender ?? ''}
            onChange={(event) =>
              setForm((current) =>
                current
                  ? {
                      ...current,
                      gender: event.target.value
                        ? (event.target.value as ProfileGender)
                        : null,
                    }
                  : current,
              )
            }
            className={inputClassName}
          >
            <option value="">Prefer not to answer yet</option>
            {PROFILE_GENDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className={labelClassName}>
            Neighborhood or ZIP <span className="font-normal text-muted-foreground">(optional)</span>
          </span>
          <input
            type="text"
            value={form.neighborhoodOrZip}
            onChange={(event) =>
              setForm((current) =>
                current ? { ...current, neighborhoodOrZip: event.target.value } : current,
              )
            }
            placeholder="e.g. Downtown or 97702"
            autoComplete="postal-code"
            className={inputClassName}
          />
        </label>
      </section>

      <section className="space-y-4 rounded-xl border border-border/70 bg-card p-4 shadow-sm">
        <div>
          <h2 className="font-heading text-base font-semibold text-dark">Notifications</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            We will use these when email and push alerts launch. You can change them anytime.
          </p>
        </div>

        <label className="flex min-h-11 items-start gap-3 text-sm text-dark">
          <input
            type="checkbox"
            checked={form.notifications.favoriteUpdates}
            onChange={(event) =>
              setForm((current) =>
                current
                  ? {
                      ...current,
                      notifications: {
                        ...current.notifications,
                        favoriteUpdates: event.target.checked,
                      },
                    }
                  : current,
              )
            }
            className="mt-1 size-5 rounded border-border"
          />
          <span>
            <span className="font-medium">Favorite venue updates</span>
            <span className="mt-0.5 block text-muted-foreground">
              When a saved venue changes its happy hour schedule.
            </span>
          </span>
        </label>

        <label className="flex min-h-11 items-start gap-3 text-sm text-dark">
          <input
            type="checkbox"
            checked={form.notifications.startingSoon}
            onChange={(event) =>
              setForm((current) =>
                current
                  ? {
                      ...current,
                      notifications: {
                        ...current.notifications,
                        startingSoon: event.target.checked,
                      },
                    }
                  : current,
              )
            }
            className="mt-1 size-5 rounded border-border"
          />
          <span>
            <span className="font-medium">Starting soon</span>
            <span className="mt-0.5 block text-muted-foreground">
              A heads-up before happy hour starts at a favorited spot.
            </span>
          </span>
        </label>

        <label className="flex min-h-11 items-start gap-3 text-sm text-dark">
          <input
            type="checkbox"
            checked={form.notifications.newVenuesInCity}
            onChange={(event) =>
              setForm((current) =>
                current
                  ? {
                      ...current,
                      notifications: {
                        ...current.notifications,
                        newVenuesInCity: event.target.checked,
                      },
                    }
                  : current,
              )
            }
            className="mt-1 size-5 rounded border-border"
          />
          <span>
            <span className="font-medium">New venues in my city</span>
            <span className="mt-0.5 block text-muted-foreground">
              When we add new happy hours in your preferred city.
            </span>
          </span>
        </label>
      </section>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {feedback ? (
        <p className="text-sm text-dark" role="status">
          {feedback}
        </p>
      ) : null}

      <Button type="submit" className="min-h-11 w-full" disabled={saving}>
        {saving ? <Loader2 className="size-4 animate-spin" /> : null}
        Save profile
      </Button>
    </form>
  )
}
