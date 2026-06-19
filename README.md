Quest Compass 🧭

Quest Compass is a mobile-first, location-based adventure guide app that turns real-world places into playable quests.

It is designed for:

* Teachers
* Parents
* Museums
* D&D groups
* Geocachers
* Parks
* Classrooms
* Birthday adventures
* Story-driven walking tours

The core idea is simple:

Save real-world locations, guide players toward them, and unlock clues using GPS, compass direction, QR codes, symbols, or camera-detected markers.

Quest Compass is not just a map app.
It is a real-world adventure engine.

⸻

Live Prototype

https://ijustcreate.github.io/location-based-quest-guide-app/

⸻

Current Version

Version 0.4 — Compass + Camera Marker Prototype

Current prototype systems include:

* GPS permission flow
* Live GPS coordinate tracking
* Save current location from the phone
* Local saved location list
* Delete saved locations
* Navigate to saved locations
* Distance calculation
* Direction/bearing calculation
* Directional arrow
* Compass heading support
* Phone-relative arrow correction
* Camera marker section
* Red triangle marker detection prototype
* Lighting correction estimate for marker color detection

⸻

Current App Structure

The project is intentionally split into separate files so it does not become one massive index.html file.

index.html

Defines the page layout.

Contains:

* GPS section
* Compass section
* Current Target section
* Camera Marker section
* Saved Locations section
* Script links

styles.css

Controls the visual design.

Contains:

* Dark mobile UI
* Cards
* Buttons
* Saved location cards
* Navigation arrow styling
* Camera display styling
* Marker status colors

storage.js

Handles saving and loading user data.

Currently uses browser localStorage.

This means saved locations are stored only on the current phone/browser.

navigation.js

Handles navigation math.

Contains:

* Distance calculation
* Bearing calculation
* Direction labels
* Arrow rotation correction
* Arrival detection

camera.js

Handles camera access and simple red triangle marker detection.

The detector currently:

* Opens the rear camera
* Samples the camera frame
* Estimates lighting color
* Corrects color readings
* Searches for red pixels
* Estimates triangle-like shape confidence
* Displays marker detection status

app.js

Controls the main app behavior.

Contains:

* Button wiring
* GPS updates
* Compass updates
* Saved location rendering
* Navigation target selection
* Camera marker startup

⸻

Core Product Vision

Quest Compass lets creators build location-based adventures without needing to manually type GPS coordinates.

The ideal creator flow is:

1. Walk to a real-world place.
2. Tap Save Current Location.
3. Name the location.
4. Add it to a quest.
5. Generate a QR code or symbol marker.
6. Place that marker in the world.
7. Let players follow the quest.

The world becomes the level editor.

⸻

Intended Player Experience

A player scans a QR code, finds a symbol, or opens a quest.

The app guides them using one or more navigation styles:

* GPS distance
* Directional compass arrow
* Walking directions
* Sonar-style feedback
* Attunement-style signal feedback
* QR confirmation
* Symbol confirmation
* Camera marker detection

The goal is to make navigation feel like discovery, not errands.

⸻

Navigation Modes

Compass Mode

Points toward a saved target location using bearing calculations.

Phone-Relative Compass Mode

Uses the phone’s heading sensor so the arrow responds to the way the player is physically holding the phone.

Map Mode

Planned mode that opens Apple Maps or Google Maps walking directions.

Sonar Mode

Planned mode where sound or vibration changes as the player gets closer.

Attunement Mode

Planned mode where visual effects, glow, particles, or signal strength guide the player without giving exact directions.

Marker Mode

Uses QR codes, symbols, or camera-detected shapes to confirm a clue location.

⸻

Marker System Vision

Quest markers should support multiple types.

Reliable Markers

* QR codes
* Short text codes
* Manual symbol selection

Magical Markers

* Painted symbols
* Carved symbols
* Stickers
* Runes
* Color shapes
* Camera-detected glyphs

Future Marker Types

* Black/white custom glyphs
* AprilTag-style markers
* Image recognition markers
* Object/photo matching
* Multi-symbol clue locks

The red triangle detector is the first prototype of this larger symbol-recognition system.

⸻

Why Camera Marker Detection Matters

QR codes are reliable, but they feel technological.

Symbols feel like clues.

A red triangle on paper, a spiral painted on a rock, or a rune carved into wood feels more like an adventure artifact.

The long-term goal is:

GPS gets the player near the clue.
The marker confirms the exact discovery.

This solves the problem of GPS being too imprecise indoors, under trees, or near buildings.

⸻

GPS Accuracy Notes

Phone GPS is not exact.

Expected accuracy:

* Indoors: often 5–30 meters
* Outdoors: often 2–10 meters
* Under trees/buildings: may drift
* Room-level indoor tracking: not reliable with GPS alone

Quest Compass should treat GPS as a “get close” system, not an exact location validator.

Exact confirmation should come from:

* QR codes
* Symbols
* Camera markers
* Manual clue answers
* Short codes
* Photos

⸻

Current Limitations

The current prototype is intentionally simple.

Known limitations:

* Saved data is only stored locally on one phone/browser
* Camera marker detection is experimental
* Red triangle detection may be affected by lighting, blur, distance, shadows, and marker size
* Compass behavior can vary by browser and phone
* Indoor GPS is not precise enough for couch-vs-kitchen navigation
* No quest editor yet
* No QR generation yet
* No cloud sync yet
* No user accounts yet

These are expected prototype limits.

⸻

Near-Term Roadmap

v0.5 — Improve Camera Marker Detection

Planned improvements:

* Better lighting correction
* Marker confidence tuning
* Clearer visual feedback
* “Too dark” / “move closer” / “hold steady” messages
* Shape-specific detection modes
* Triangle, circle, square, spiral prototypes

v0.6 — QR Code Tools

Planned features:

* Generate QR codes
* Save QR image
* Share QR image
* Print QR page
* QR opens a specific clue or saved location

v0.7 — Quest Creator

Planned features:

* Create quest
* Add clue locations
* Add hints
* Add marker type
* Reorder clue steps
* Save quest locally
* Play quest

v0.8 — Quest Export / Import

Planned features:

* Export quest as JSON
* Import quest JSON
* Share quests without accounts
* Backup local quests

v1.0 — Public Quest System

Possible later features:

* Creator accounts
* Public quest library
* Ratings
* Teams
* Multiplayer progress
* Museum/teacher modes
* Supabase or similar database backend

⸻

Design Principles

* Mobile-first
* No account required for players
* Save locations by standing there
* Do not require manual coordinate typing
* GPS gets players close
* Markers confirm exact discoveries
* QR codes should contain IDs, not full quest data
* The app should work for families before it tries to become a platform
* Keep files modular
* Keep the experience playful, practical, and readable

⸻

Example Use Cases

Parent Adventure

A parent creates a backyard treasure hunt.

The child follows clues from:

1. Front door
2. Tree
3. Garden rock
4. Hidden treasure box

Classroom Quest

A teacher creates a campus science trail.

Students find markers at:

1. Tree
2. Garden
3. Weather station
4. Class mural

Museum Guide

A museum creates an exhibit hunt.

Visitors scan or identify symbols near exhibits to unlock story text.

D&D Campaign

A dungeon master creates a real-world rune hunt.

Players follow GPS signals, identify symbols, and unlock story encounters.

Geocaching Variant

A creator builds a clue chain where each discovery points to the next physical marker.

⸻

Development Notes

This project is currently a static website hosted with GitHub Pages.

There is no build system.

There is no backend.

There is no package manager.

That is intentional.

The current goal is to keep the app easy to edit from a phone while proving the core interaction loop:

Save location → Navigate to location → Confirm clue marker

⸻

Current File List

* README.md
* index.html
* styles.css
* storage.js
* navigation.js
* camera.js
* app.js

⸻

Future File Ideas

Potential future files:

* quests.js
* qr.js
* symbols.js
* markers.js
* attunement.js
* sonar.js
* export.js
* import.js
* creator.js

Each system should stay modular instead of being merged into one giant file.

⸻

Project Summary

Quest Compass is a prototype for turning real-world spaces into playable adventures.

A teacher could use it.

A parent could use it.

A museum could use it.

A D&D group could use it.

A geocacher could use it.

The long-term goal is simple:

Turn any real-world place into a quest.