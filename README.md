# Quest Compass

Quest Compass is a mobile-first, location-based adventure app for turning real-world places into small playable quests.

It combines three core tools:

- A Quest Journal for saving real-world waypoints
- A compass trail view for following saved places
- A camera scanner for red, yellow, blue, green, and black triangle/circle/square glyphs

The project is intentionally local-first and static. It runs on GitHub Pages with optional Supabase cloud sync and no build step.

## Live Prototype

https://ijustcreate.github.io/location-based-quest-guide-app/

## Current Version

Version 0.8.0 - Full Glyph Scanner and UX Corrections

This pass adds canonical 15-glyph scanner support, fixes early GPS prompts, reset consistency, scanner/settings layering, scanner action placement, cloud-sync messaging, and compass arrow readability for the first shareable playtest.

Current prototype systems include:

- Mobile-safe layout with bottom navigation spacing
- Safe-area-aware page padding for iPhone-style screens
- Trail, Scan, Create, and Library tabs
- Compact header control rail for GPS, compass, scanner, and Quest Journal access
- Centralized app state labels to avoid contradictory UI states
- GPS permission flow and live coordinate tracking
- No GPS prompt on initial app load; GPS is requested only after a clear location-based action
- Compass heading support where the browser/device allows it
- Saved place creation with name, optional hint, captured facing direction, photo, and glyph objectives
- Local saved place persistence with `localStorage`
- Local image compression and quota recovery for saved-place and glyph photos
- Library location selector in the header with full selected-place details below
- Library details that hide raw coordinates by default
- Begin Trail, Edit, Delete, and Clear All actions
- Full location editing through the Create form without replacing coordinates unless requested
- Current GPS and pasted Google Maps coordinates can replace a location's saved coordinates
- In-app modal dialogs instead of native browser alerts
- 15-glyph scanner support: red, yellow, blue, green, and black triangles, circles, and squares
- Canonical glyph ids such as `red_triangle`, `yellow_circle`, and `black_square`
- Scanner states: searching, signal found, holding steady, sigil locked
- Stable hold requirement before scanner lock
- Scanner HUD metrics over the camera for Color, Shape, Light, Stability, and Lock
- Basic PWA metadata and manifest for installable-app behavior
- Landing prompt for every fresh direct/QR entry: `Have you found a glyph?`
- Glyph objective model with `glyphId`, color, shape, required/optional status, points, evidence requirement, minimum confidence, and completion state
- Waypoint progress: `Glyphs Found: X / Y`
- Correct glyph sightings record canvas photo evidence and award points
- Wrong glyphs show mismatch and do not complete objectives
- Felix admin account sees all locally stored locations and can export/import/reset quest data
- Export Quest Data downloads a JSON file instead of opening a blocking overlay
- Clear Local Device Data resets local places, active target, scanner progress, cached public quests, profile progress, and local quest stats
- Cloud save failures are shown as friendly `Cloud sync pending` states with retry instead of raw JavaScript errors
- Settings render above compass/scanner UI with scrollable, footer-safe content

## Product Vision

Quest Compass turns ordinary real-world places into quest waypoints.

The intended loop is:

1. Walk to a real-world place.
2. Save the waypoint.
3. Add a name and optional clue.
4. Follow the saved place with GPS and compass direction.
5. Scan the assigned physical glyphs to confirm the exact discovery.

GPS gets the player close. The marker confirms the moment of discovery.

## Current Tabs

### Trail

Trail is the active navigation screen.

It shows:

- Current trail state
- Compass dial and target bearing
- Active quest name and hint
- Distance and GPS accuracy when GPS is active
- Fantasy proximity label plus exact numeric distance

GPS, compass, scanner, and target/library controls now live in the compact header rail instead of taking up space inside the Trail tab.

Important state rule:

The app only says `Trail Active` when GPS is active and a quest is selected. Otherwise it uses states such as `Trail Idle` or `Quest Locked`.

### Scan

Scan is the camera-based glyph detector.

It looks for thick hand-drawn marker-outline glyphs using lightweight browser camera analysis:

- `getUserMedia` opens the camera
- frames are drawn to a canvas
- red, yellow, blue, green, and black outline regions are detected
- triangle, circle, and square shapes are classified
- exact `glyphId` matches are required for attunement
- candidate marker boxes are scored
- the app requires a stable hold before lock
- the active waypoint's glyph objectives are checked before completion

Scanner HUD metrics:

- Color
- Shape
- Light
- Stable
- Lock

The scanner metrics and lock message are displayed as minimal overlays on the live camera view instead of separate panels below it.

Lock flow:

1. Searching
2. Signal Found
3. Holding Steady
4. Sigil Locked

### Create

Create saves the user's current GPS position or pasted coordinates as a quest waypoint.

It supports:

- Place name
- Optional hint
- Waypoint / symbol photo
- 15-glyph picker grid for triangle, circle, and square objectives in red, yellow, blue, green, and black
- Required or optional glyphs
- GPS accuracy display
- Existing location coordinate preservation while editing
- Use Current GPS For This Waypoint
- Paste Google Maps Coordinates
- Current facing display when compass data exists
- Save This Place
- Save + Follow

If GPS is not active, the app shows a styled `Waypoint Needed` modal instead of a native alert.

Saved places include `facingDegrees` when the compass has a usable heading at save time.

### Library

Library is the Quest Journal.

It supports:

- Quest Journal, Nearby Adventures, Shared With Me, and Users views
- Saved-waypoint dropdown in the header
- Full detail view for the selected saved place
- Distance when GPS is active
- Creator, glyph count, point value, and completion status
- Hidden technical coordinates by default
- Show technical details toggle
- Begin Trail
- Edit in the full Create form
- Delete confirmation
- Clear All confirmation

Raw latitude and longitude are hidden by default to keep screenshots cleaner and safer.

## Project Structure

This is a static vanilla HTML/CSS/JavaScript project.

- `index.html` - App shell, tab markup, PWA metadata, modal container
- `styles.css` - Mobile UI, compact header controls, safe-area layout, bottom nav, cards, scanner HUD
- `cloud.js` - Supabase browser adapter for public/shared cloud quest reads
- `app.js` - Main app state, UI rendering, GPS, compass, tabs, modals, library behavior
- `camera.js` - Camera startup, 15-glyph color/shape scanner logic, and live HUD overlay drawing
- `navigation.js` - Distance, bearing, direction labels, arrow rotation, arrival detection
- `storage.js` - Local accounts, public quest pool, glyph objectives, and saved place persistence
- `supabase/` - Supabase CLI config and migrations for the shared quest backend
- `manifest.json` - PWA manifest
- `icon.svg` - App icon for the manifest
- `README.md` - Project notes

There is no package manager or build tool required for the browser app. Supabase is used as the optional shared backend for public quests, invites, sightings, rewards, and future cross-device progress.

## Supabase Backend

The linked Supabase project is:

```text
https://livyedmscrkbnoxfpsoy.supabase.co
```

The first migration creates:

- `profiles`
- `locations`
- `quests`
- `quest_locations`
- `glyph_objectives`
- `glyph_sightings`
- `user_glyph_progress`
- `user_location_progress`
- `user_quest_progress`
- `rewards`
- `user_rewards`
- `location_access`
- `quest_access`
- `invites`

It also enables Row Level Security and creates helper functions for admin checks, location/quest access, distance calculation, and nearby public locations.

The static app currently reads public cloud waypoints into the Library tab through `cloud.js`. Public adventures can be browsed without GPS; `Find Nearby Adventures` asks for GPS only when the player wants distance sorting. Local storage remains the fallback/offline path while account auth, invite acceptance, admin cloud creation, and fuller cloud write flows are built out.

The latest Supabase migration expands cloud glyph support to all 15 glyphs and adds a client waypoint id to prevent duplicate public quests when pending sync is retried.

## Scanner Tuning Notes

- Tentative detection starts around 70% confidence.
- Attune requires about 85% confidence plus stable consecutive frames.
- Strong/success detection trends above 93%.
- Black glyphs require stronger shape confidence so shadows are less likely to be treated as black markers.
- The detector is heuristic and optimized for thick marker outlines on light/white paper, mild rotation, and indoor lighting.

## Local Storage

Saved places use this key:

```text
questCompass.savedPlaces.v1
```

Older saves from the prototype key are migrated from:

```text
questCompassLocations
```

Saved places are local to the current browser/device.

## Saved Place Shape

Saved places are normalized into a localStorage-friendly object:

```json
{
  "id": "loc-...",
  "name": "Old Oak",
  "hint": "Look beneath the old oak.",
  "latitude": 37.990211,
  "longitude": -121.34857,
  "accuracy": 10,
  "facingDegrees": 42,
  "category": "landmark",
  "icon": "",
  "sigil": null,
  "createdAt": "2026-06-19T00:00:00.000Z",
  "updatedAt": "2026-06-19T00:00:00.000Z"
}
```

## PWA Notes

The app includes:

- Mobile viewport with `viewport-fit=cover`
- Theme color metadata
- Apple mobile web app metadata
- `manifest.json`
- SVG app icon

It is designed to continue working as a static GitHub Pages site.

## Known Limitations

- Camera marker detection is experimental
- Red triangle detection can be affected by lighting, shadows, blur, distance, and marker size
- Compass behavior varies by browser and phone
- GPS is not precise enough for room-level indoor navigation
- Saved data stays on one browser/device
- No quest-chain editor yet
- No QR generation yet
- No cloud sync yet
- No user accounts yet

These are expected prototype limits.

## Near-Term Roadmap

Next useful improvements:

- Tune red triangle detection thresholds on real phones
- Add scanner snapshot saving after lock
- Add marker binding to a saved place
- Add category/icon selection in Create
- Add Library search and sorting
- Add basic edit support for saved places
- Add service worker caching if it stays safe for GitHub Pages

Not planned for this milestone:

- Multiplayer
- Cloud sync
- User accounts
- Backend database
- Paid APIs
- Heavy AR frameworks

## Design Principles

- Mobile-first
- Local-first
- No account required
- Save locations by standing there
- GPS gets players close
- Physical markers confirm exact discoveries
- Important actions must stay reachable above the bottom nav
- Green means truly active or ready
- Amber means attention needed
- Red means destructive or failed
- Keep the app playful, practical, and readable

## Development Notes

Open `index.html` directly or serve the folder with any static file server.

Example:

```powershell
python -m http.server 5177
```

Then open:

```text
http://127.0.0.1:5177
```

For camera and GPS testing, use a secure context where possible. GitHub Pages uses HTTPS, which is suitable for mobile browser testing.

## Summary

Quest Compass is a prototype for turning real-world spaces into tiny adventure trails.

The current milestone stabilizes the mobile shell, clarifies app state, improves the scanner lock flow, and keeps saved places cleaner and safer to view.
