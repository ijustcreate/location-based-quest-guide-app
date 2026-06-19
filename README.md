# Quest Compass

Quest Compass is a mobile-first, location-based adventure app for turning real-world places into small playable quests.

It combines three core tools:

- A GPS bookmark library for saving real places
- A compass trail view for following saved places
- A camera scanner for locking onto physical red triangle sigils

The project is intentionally local-first and static. It runs on GitHub Pages with no backend, no accounts, no paid APIs, and no build step.

## Live Prototype

https://ijustcreate.github.io/location-based-quest-guide-app/

## Current Version

Version 0.5.1 - Compact Header, Library Selector, and Scanner HUD

This pass keeps the Milestone 1 stabilization goals and tightens the mobile UI so the header and scanner no longer consume unnecessary vertical space.

Current prototype systems include:

- Mobile-safe layout with bottom navigation spacing
- Safe-area-aware page padding for iPhone-style screens
- Trail, Scan, Create, and Library tabs
- Compact header control rail for GPS, compass, scanner, and target/library access
- Centralized app state labels to avoid contradictory UI states
- GPS permission flow and live coordinate tracking
- Compass heading support where the browser/device allows it
- Saved place creation with name, optional hint, and captured facing direction when compass data is available
- Local saved place persistence with `localStorage`
- Library location selector in the header with full selected-place details below
- Library details that hide raw coordinates by default
- Begin Trail, Edit, Delete, and Clear All actions
- In-app modal dialogs instead of native browser alerts
- Red triangle camera scanner prototype
- Scanner states: searching, signal found, holding steady, sigil locked
- Stable hold requirement before scanner lock
- Scanner HUD metrics over the camera for Color, Shape, Light, Stability, and Lock
- Basic PWA metadata and manifest for installable-app behavior

## Product Vision

Quest Compass turns ordinary real-world places into quest points.

The intended loop is:

1. Walk to a real-world place.
2. Save the location.
3. Add a name and optional clue.
4. Follow the saved place with GPS and compass direction.
5. Scan a physical marker to confirm the exact discovery.

GPS gets the player close. The marker confirms the moment of discovery.

## Current Tabs

### Trail

Trail is the active navigation screen.

It shows:

- Current trail state
- Compass dial and target bearing
- Active target name and hint
- Distance and GPS accuracy when GPS is active
- Save This Place as the only Trail-specific action

GPS, compass, scanner, and target/library controls now live in the compact header rail instead of taking up space inside the Trail tab.

Important state rule:

The app only says `Trail Active` when GPS is active and a target is selected. Otherwise it uses states such as `Trail Idle` or `Target Locked`.

### Scan

Scan is the camera-based sigil detector.

It looks for a red triangle marker using lightweight browser camera analysis:

- `getUserMedia` opens the camera
- frames are drawn to a canvas
- red regions are detected
- candidate marker boxes are scored
- the app requires a stable hold before lock

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

Create saves the user's current GPS location as a quest point.

It supports:

- Place name
- Optional hint
- GPS accuracy display
- Current facing display when compass data exists
- Save This Place
- Save + Follow

If GPS is not active, the app shows a styled `Location Needed` modal instead of a native alert.

Saved places include `facingDegrees` when the compass has a usable heading at save time.

### Library

Library is the saved place notebook.

It supports:

- Saved-location dropdown in the header
- Full detail view for the selected saved place
- Distance when GPS is active
- Hidden technical coordinates by default
- Show technical details toggle
- Begin Trail
- Edit placeholder modal
- Delete confirmation
- Clear All confirmation

Raw latitude and longitude are hidden by default to keep screenshots cleaner and safer.

## Project Structure

This is a static vanilla HTML/CSS/JavaScript project.

- `index.html` - App shell, tab markup, PWA metadata, modal container
- `styles.css` - Mobile UI, compact header controls, safe-area layout, bottom nav, cards, scanner HUD
- `app.js` - Main app state, UI rendering, GPS, compass, tabs, modals, library behavior
- `camera.js` - Camera startup and red triangle scanner logic
- `navigation.js` - Distance, bearing, direction labels, arrow rotation, arrival detection
- `storage.js` - Local saved place persistence
- `manifest.json` - PWA manifest
- `icon.svg` - App icon for the manifest
- `README.md` - Project notes

There is no package manager, build tool, server, or database required.

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
