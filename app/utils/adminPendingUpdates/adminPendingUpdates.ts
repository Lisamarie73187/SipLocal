export type PendingVenueUpdateSource = 'manager' | 'staff'

export function classifyPendingVenueUpdate(
  hasManager: boolean,
  pendingSlotCount: number,
  dataStatus: string,
): PendingVenueUpdateSource {
  if (
    hasManager &&
    (pendingSlotCount > 0 || dataStatus === 'pending_review' || dataStatus === 'flagged')
  ) {
    return 'manager'
  }
  return 'staff'
}
