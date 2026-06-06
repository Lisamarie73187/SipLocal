import type { Database } from '@/types/database'

export type ProfileGender = Database['public']['Enums']['profile_gender']

export const PROFILE_GENDER_OPTIONS: ReadonlyArray<{
  value: ProfileGender
  label: string
}> = [
  { value: 'woman', label: 'Woman' },
  { value: 'man', label: 'Man' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
]

export function profileGenderLabel(value: ProfileGender | null | undefined): string | null {
  if (!value) {
    return null
  }

  return PROFILE_GENDER_OPTIONS.find((option) => option.value === value)?.label ?? null
}
