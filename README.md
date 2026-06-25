# Quest Compass

**Version 0.7 — True Glyph Quest Engine**

Quest Compass is a mobile-first, location-based scavenger hunt app for creating real-world quests. Players follow a compass to saved locations, search for physical glyphs, scan them with the camera, and complete objectives for points.

Built as a static GitHub Pages app using vanilla HTML, CSS, and JavaScript.

---

## Live App

https://ijustcreate.github.io/location-based-quest-guide-app/

---

## What 0.7 Adds

Version 0.7 turns the app from a simple location marker prototype into a real glyph-objective quest engine.

### Core Additions

- Multiple glyph objectives per quest location
- “I found the symbol” button
- Scanner flow connected to active quest objectives
- Red, green, pink, and blue hollow triangle glyph support
- Per-glyph completion tracking
- Per-glyph point values
- Wrong-glyph rejection
- Required glyph completion logic
- Quest completion state
- Scanner evidence snapshot support
- Local admin export/reset tools
- Cleaner mobile-first Quest Compass UI

---

## Core Player Loop

```text
Create or select a quest location
↓
Follow the compass to the real-world spot
↓
Tap “I found the symbol”
↓
Scan the physical glyph
↓
If the glyph matches an active objective, it is completed
↓
Earn points
↓
Find all required glyphs
↓
Complete the quest location