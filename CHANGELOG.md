# Changelog

User-requested changes, newest first.

---

## In progress



---

## Done

- **Image URL field in venue editor** — view, edit, and preview a venue's cover image (`image_url`) directly in the venue editor.
- **Venue scrub pulls a cover photo from Google Places** — if a venue has no `image_url`, scrubbing now downloads a Google Place photo, uploads it to a public `venue-images` storage bucket, and sets it as the venue's image.
- **Bulk-mark events high confidence & publish** — button in the venue editor's Events section sets confidence to "high" and publishes all events at once (still requires "Save events" to persist).
- **Archive cascade** — archiving a venue now also unpublishes its events, sets its happy hour slots to inactive/pending review, and marks the venue's data status as pending review.
- **"Any day" filter shows all venues** — venues with no happy hour today (or no slots at all) now appear in a "More venues" section instead of being hidden when the day filter is set to "Any day".
- **Venue scrub: short description** — AI instructed to keep description to one sentence, 150 chars max, no em dashes.
- **Venue scrub: sub-page fetch for hours of operation** — `scrubVenueInfo` now also fetches `/hours`, `/contact`, `/about`, `/location`, `/visit`, `/find-us` and combines the text before sending to AI, so hours on a separate page are captured.
- **Hours of operation paste parser** — text area above the hours grid in the venue editor; paste any format and click "Parse hours" to auto-fill the day rows.
- **Manual "Mark verified now" button** — in the Data quality section of the venue editor; also auto-sets `last_verified_at` when a menu photo submission is approved.
- **Admin menu photo upload + URL paste** — new Menu photo card in the venue editor; upload a file or paste an external URL; shows thumbnail preview with remove button.
- **`get-venue-menu-image` edge function** — secure mobile endpoint for menu photos; bucket stays private, service role generates signed URLs after verifying venue is published.
- **`happy_hour_menu_url` column** — stores externally-hosted menu image URLs on the venues table; included in the main venue save flow.
- **Venue scrub system** — Google Places city-level discovery panel on admin venues list; per-venue rescrub card (venue info / happy hours / events / all); `adminVenueRescrub.ts` with AI extraction of description, types, vibes, hours, price level.
- **`hours_of_operation` structured editor** — per-day open/close time inputs in the venue editor; stored as jsonb on the venues table.
- **Venue suggestion photo optional** — mobile can submit venue suggestions without a photo.
- **`user_description` on venue suggestions** — optional comments field in the suggest venue flow; shown on admin review card.
- **Admin notes on venues** — `admin_notes` field in the venue editor (internal, not shown to users).
