# Handoff: FitNext — "Sacred Marble" Theme (Dashboard + Coach Chat, mobile & desktop)

## Overview
A full visual re-theme of the FitNext dashboard and Coach AI chat, from the current dark "Olympian Green" look to **Sacred Marble**: a light Greek-temple aesthetic — ivory marble surfaces, engraved antique gold, chiseled square panels, meander (Greek-key) bands, Roman numerals, and an arched "shrine" coach portrait. Includes subtle Greek-flavored tap animations. Covers the mobile layout, the desktop/laptop two-column layout, and the **public landing page** (`Sacred Marble Landing.dc.html`).

Target codebase: `vibejedi/Fitnext` (Next.js App Router + Tailwind v4 `@theme`, framer-motion, lucide-react, zustand). All existing behavior/state (`useFit` store, `coach-ask` events, streaming chat, ICS download) stays as-is — this is a restyle plus new micro-interactions.

## About the Design Files
The files in this bundle are **design references created in HTML** — prototypes showing intended look and behavior, not production code to copy directly. Recreate them in the existing Next.js/Tailwind/React environment using its established patterns (globals.css tokens, Tailwind utility classes, lucide-react icons, framer-motion). `Design Routes.dc.html` contains the two final Sacred Marble mocks: **2a** (mobile, interactive) and **3a** (desktop). `Sacred Marble Landing.dc.html` is the landing page (open it directly — it is scroll-interactive). `ios-frame.jsx` / `browser-window.jsx` are just device-frame chrome for presentation — ignore them; `support.js` is the prototype runtime — the design files need it next to them to open in a browser, but it is not part of the design.

## Fidelity
**High-fidelity.** Colors, type, spacing, borders, and animations below are final. Recreate pixel-perfectly.

## Design Tokens (replace the `:root` palette in `src/app/globals.css`)

Surfaces
- Page background: `linear-gradient(180deg, #f7f4ec, #efe9db)` (was stone-900 radial)
- Panel: `#fbf8f1` (flat — no gradient), panel-alt / input: `#f7f2e4`
- Pressed / active wash: `#f3ecd9`
- Completed-item wash: `#fdf8ea`

Lines & borders
- Outer panel border: `#d8cfb9` (1px)
- Inner dividers: `#e7dfcc` (1px)
- Accent/ornament border: `#cbbb92`
- Meander stroke: `#c4ab6a` (1.2px)

Gold (replaces green as the accent)
- Primary gold: `#9a7b2d` (buttons, active states, icons, checks)
- Gleam highlight: `#d3b25e`
- Badge gold: `#b08d3e`
- On-gold text: `#fffbf0` (ivory)

Text
- Primary: `#211d16`
- Secondary: `#7c7159`
- Muted / disabled / placeholder: `#a29677`

Typography (fonts already loaded in `layout.tsx`)
- Display: Cinzel — wordmark, headings, stat values, card titles (uppercase, `letter-spacing: 0.18em` for card titles)
- Body: Inter
- Eyebrow/meta: Geist Mono, uppercase, `letter-spacing: 0.3–0.4em`, 9–11px, gold

Shape — "chiseled stone"
- Panels/cards: **square corners (0 radius)**, 1px `#d8cfb9` border, `box-shadow: 0 1px 0 #fff inset`
- Buttons: 3px radius (not pills)
- Checkboxes: 15px square, 2px radius, `#cbbb92` border
- Arched portrait: `border-radius: 150px 150px 6px 6px` with double inset ring: `inset 0 0 0 5px #f7f4ec, inset 0 0 0 6px #cbbb92`, plus `0 12px 28px -14px rgba(70,58,30,0.5)`
- Chat bubbles: coach `2px 14px 14px 14px`, user `14px 2px 14px 14px`

## Screens / Views

### 1. Mobile dashboard (reference: option 2a, left phone)
Sticky header (54px, `rgba(247,244,236,0.92)` + blur, bottom border `#d8cfb9`): wordmark `FIT`(#211d16)`NEXT`(#9a7b2d) in Cinzel 16px/700 ls 0.1em; right: flame icon + `DAY I OF THE STREAK` (Geist Mono 10px, `#7c7159`). Below the header runs a full-width **meander band** (SVG Greek-key strip, `#c4ab6a`, height 10px, repeating unit `M x 9 V3 H x+16 V7 H x+8 V5` every 32px).

Content column, 18px padding, 16px gap:
1. **Coach shrine** (centered): gold eyebrow with coach discipline (ls 0.4em, 9px) → arched portrait 150×190 (**clickable — see Interactions §6**; small ivory play chip bottom-right when idle) → `Coach Kratos` Cinzel 24px/700 → `Goal: Get stronger · 4 days a week` (12px, `#7c7159`, gold bold goal) → gold divider: two 44px hairlines flanking a 12px gold dot → **`Speak with Coach` CTA**: gold gleam button (same treatment as Begin) with a chat-bubble icon, 12px×24px padding; on tap plays gleam+ring and navigates/focuses the Coach chat.
2. **Stats triptych**: 3 equal cells separated by 1px `#d8cfb9` gaps (grid gap trick: container bg `#d8cfb9`, cells `#fbf8f1`), centered; value Cinzel 19px/700 in **Roman numerals** (`I`, `Strength`, `IV / VII`); label 8px uppercase ls 0.22em gold.
3. **Today's Labor** panel: header row (title Cinzel 12px/700 uppercase ls 0.18em; right `+ CALENDAR` Geist Mono 9px gold text-button) with `#e7dfcc` divider; body row: session name 13px/600 + "Your coach has inscribed the plan." 11px `#7c7159`; right: **Begin** button (see Interactions).
4. **Daily Rites** panel: title row (right side shows Roman-numeral progress, e.g. `II / V`, Geist Mono gold) + a **single-column list of 5 rites**, rows divided by 1px `#e7dfcc`. Each row: 15px square checkbox + label 12px/600 + target sub-line 10px `#7c7159` + a small source tag (`COACH` or `CUSTOM`, 8px uppercase, border `#e7dfcc`, radius 2px). The five rites and demo targets:
   - Calories — `2,450 kcal` (tag COACH; recommended by nutrition coach)
   - Macros — `180g P · 250g C · 70g F` (tag COACH)
   - Steps — `10,000 steps` (tag CUSTOM; per-user)
   - Relax — `15 min · no screens, music, or contact` (tag CUSTOM)
   - Mobility — `10 min · yesterday's muscles` (tag CUSTOM)
   NO sleep rite (sleep is logged at end of day, separate). Done rows: text `#211d16`, bg `#fdf8ea`, laurel-pop gold check. Not done: text `#a29677`, empty box.
4b. **Seal the Day** panel (directly below Daily Rites): centered CTA. Disabled until all 5 rites are done — stone look (`#efe9db` bg, `#a29677` text, hint "N rites remain to seal the day"). When all done: gleaming gold gradient button (same as Begin) with a laurel-crown icon, hint "All rites complete — earn 50 laurels toward the Hall of Honor". On tap: replaces itself with a sealed state — laurel medal stamp (laurelPop), `Day Sealed` Cinzel 15px/700, `+50 laurels · Coach's message is playing above — new video each week` — and **triggers the coach portrait video** (see Interactions §6). Seals once per day; laurels feed the (locked) Hall of Honor leaderboard. Coach videos are swapped on the backend weekly/bi-weekly (or daily at high activity).
5. **Quick actions** 2-col: `Ambrosia` (meal prep) and `Healing` (therapy, 0.45 opacity when disabled) — centered icon (gold, 1.8 stroke) + Cinzel 13px/700 title + 10px `#7c7159` sub.
6. **The Labors** panel: 3×2 grid of workout tiles (Push/Pull/Legs/Conditioning/Core/Mobility), divided by inner 1px lines; each: Cinzel 13px/600 name + Roman numeral 8px gold ls 0.2em.
7. **Movement Guides** panel (below The Labors): 5–10s vertical video shorts showing how each movement is done, **grouped by bodypart**, filled from backend folders (one folder per bodypart; thumbnail + mp4/webm per movement).
   - Header: `Movement Guides` + `5–10s SHORTS` (Geist Mono gold).
   - **Search field**: `#f7f2e4` bg, `#d8cfb9` border, radius 4px, gold magnifier icon, placeholder "Search a movement…". Live-filters by movement name OR bodypart; empty state: "No movement found for “query”".
   - Per bodypart: a section rule row (bodypart label 9px uppercase ls 0.26em gold + hairline `#e7dfcc` + count in Geist Mono) followed by a **horizontally scrolling row of 9:16 thumbnail cards** (88px wide mobile / 96px desktop, radius 6px, border `#cbbb92`, dark bronze gradient placeholder `linear-gradient(180deg,#3a2f1c,#211d16)`), each with a centered ivory play chip, duration badge (Geist Mono 8px on `rgba(30,17,8,0.7)`), and the movement name bottom-left (10px/600 ivory). Tap = play the short inline (loop, muted, tap again to restart).
   - Demo taxonomy: Chest (Bench Press, Incline DB Press, Push-Up), Back (Deadlift, Pull-Up, Barbell Row), Legs (Back Squat, Walking Lunge, Romanian Deadlift), Shoulders (Overhead Press, Lateral Raise), Core (Plank, Hanging Leg Raise).
8. **Hall of Honor** panel (locked): blurred leaderboard rows (rank in Roman numerals gold, name, laurel count in Geist Mono) at `blur(3px)`/0.5 opacity behind a `rgba(247,244,236,0.55)` scrim with a gold padlock chip, `LOCKED` (Cinzel 12px/700), and "Leaderboard & rewards — coming soon". Laurels earned by Seal the Day accrue here.

### 2. Mobile Coach chat (reference: 2a, right phone)
- Header: small arched portrait 38×44 (`border-radius: 38px 38px 3px 3px`) + `Coach Kratos` Cinzel 14px/700 + `THE ORACLE · POWERLIFTING` 9px gold ls 0.24em + volume icon `#7c7159`.
- Tabs: underline style (not pills) — 22px gap row; active: `#211d16` 600 with 2px `#9a7b2d` bottom border; inactive `#a29677`; `Therapy · Soon` at 0.55 opacity, disabled. 10px uppercase ls 0.2em.
- Messages (16px padding, 12px gap): coach bubble `#fbf8f1`, border `#d8cfb9`, radius `2px 14px 14px 14px`, shadow `0 2px 6px -4px rgba(70,58,30,0.35)`; user bubble `#9a7b2d` / `#fffbf0`, radius `14px 2px 14px 14px`. 13px / 1.55.
- Input bar: mic 44px circle (`#fbf8f1`, border `#cbbb92`, gold icon) + field (`#fbf8f1`/`#f7f2e4`, border `#d8cfb9`, radius 4px, placeholder "Speak to the oracle…" `#a29677`) + send 44px **square** (radius 4px, `#9a7b2d`, ivory icon).

### 3. Desktop dashboard (reference: option 3a)
Same components re-flowed, content max-width 1280px, centered, 32px side padding:
- Header 60px + meander band; adds ghost `SIGN OUT` button (1px `#cbbb92` border, radius 3px, uppercase 11px ls 0.12em).
- Grid: `grid-template-columns: 1fr 380px; gap: 24px` — left dashboard column (18px gap), right **sticky chat column** (`position: sticky; top: 94px`, height ≈ viewport − header).
- Coach shrine becomes a **horizontal hero strip**: 72×88 arched portrait left, eyebrow/title (Cinzel 26px "Coach Kratos is ready.")/goal line center, gold divider ornament right.
- Daily Rites (single-column list of 5) and the two quick actions (stacked) share a 2-col row; Seal the Day is a horizontal centered strip below them; The Labors becomes a single 6-across row; Movement Guides sits below The Labors with the search field inline in its header (230px wide); Hall of Honor last with a horizontal 3-across locked leaderboard.
- Chat identical to mobile chat, docked.
- Breakpoint guidance: `lg:` two-column as above; below `lg`, stack to the mobile order (chat accessible as its own view/sheet, as in current app).

### 4. Landing page (reference: `Sacred Marble Landing.dc.html`)
Same token palette/typography as the app. Fixed top bar (58px, `rgba(247,244,236,0.9)` + blur, meander band below; wordmark + `The Coaches` anchor + ghost `Enter` button). Three acts:
1. **Act I — pinned hero**: a 280vh scroll region with a sticky full-viewport stage. Headline "Every legend begins with a single rep." set in Cinzel 800 `clamp(44px, 7vw, 92px)`; words start at 0.14 opacity / translateY(14px) and light up one-by-one as scroll progress advances (last word "rep." turns gold `#9a7b2d`). Gold eyebrow fades in first; divider ornament (two 54px hairlines + gold dot) fades in at the end; "Scroll" hint bottom-center fades out near completion. Implement with a scroll listener or framer-motion `useScroll` mapped over word indices.
2. **Act II — coach carousel** (`#coaches`): a 3D `rotateY` ring (`perspective: 1300px`, cards `translateZ(300px)`, 6 cards at 60° steps, 0.9s `cubic-bezier(0.22,1,0.36,1)` turn) of arched statue cards (160×225, `border-radius: 160px 160px 5px 5px`, double gold inset ring) standing on stacked marble pedestals over an elliptical radial-gradient dais. Non-facing cards: 0.45 opacity + desaturated. Prev/next round buttons at the sides; clicking a card rotates the shortest way to it. Cards carry a dashed `3D MODEL SLOT` tag — portraits are placeholders until 3D models arrive. Below: a **stats tablet** (marble panel) showing the hovered-or-facing coach's name, route, quote, and 4 stat bars (Strength/Power/Endurance/Mobility, value in Roman numerals, gold fill bar, width animates 0.6s). Coach data: Kratos/Powerlifting, Prometheus/Hybrid, Adonis/Bodybuilding, Nike/CrossFit, Atalanta/Calisthenics, Hermes/Running.
3. **Act III — entry** (`#enter`): centered. Eyebrow `Act III` → "The temple is open." Cinzel 800 → one-line pitch → gold gleam CTA **Enter the Temple** (same gleam+ring click animation as Begin) + ghost `I have an account` → divider ornament → `Free trial · No card · Mortals welcome` (Geist Mono 9px).
Sections in Acts II/III reveal on first scroll-into-view (opacity 0→1, translateY 44px→0, 0.7s ease). A `reduceMotion` flag skips the scroll choreography (everything shown lit/revealed).

## Interactions & Behavior (the "Greek" tap animations)
All are subtle, ~0.45–0.7s, `ease`.

1. **Begin button — gold gleam + ring pulse** (on click)
   - Base: `background: linear-gradient(110deg, #9a7b2d 42%, #d3b25e 50%, #9a7b2d 58%); background-size: 220% 100%; background-position: 130% 0;` text ivory, 600, uppercase ls 0.14em, radius 3px, padding 9px 18px (mobile) / 11px 24px (desktop).
   - On click play both, 0.7s ease: `@keyframes gleam { from { background-position: 130% 0 } to { background-position: -30% 0 } }` and `@keyframes ring { from { box-shadow: 0 0 0 0 rgba(154,123,45,0.45) } to { box-shadow: 0 0 0 16px rgba(154,123,45,0) } }`. Retrigger per click (re-mount animation or alternate animation names).
2. **Daily Rites — laurel-pop check** (on toggle): check icon mounts with `@keyframes laurelPop { 0% { transform: scale(0.3) rotate(-12deg); opacity: 0 } 60% { transform: scale(1.25) rotate(3deg); opacity: 1 } 100% { transform: scale(1) rotate(0) } }`, 0.45s ease. Row also transitions its text color/bg (`#fdf8ea` when done). `:active` wash `#f3ecd9`.
3. **Stone tiles (Labors, Ambrosia, calendar) — chisel press** (`:active`): `transform: translateY(1px); box-shadow: inset 0 2px 6px rgba(70,58,30,0.18); background: #f3ecd9;`
4. **Send — ring pulse** (on click): the `ring` keyframe above, 0.6s; plus `:active` translateY(1px).
5. All existing behavior unchanged: `ask()` dispatch, win toggles via `fit.toggleWin`, streaming chat, mic (SpeechRecognition), ICS download.
6. **Coach portrait video — "the oracle awakens"** (on portrait click, and auto-triggered by Seal the Day): the portrait plays the coach's current video (backend-swapped weekly/bi-weekly). In the mock this is a ~2.4s composite: `@keyframes awakenZoom { 0%{transform:scale(1)} 45%{transform:scale(1.07)} 100%{transform:scale(1)} }` on the image, an ivory sheen sweep overlay (`@keyframes sheenSweep { from{background-position:150% 0} to{background-position:-50% 0} }`, gradient `linear-gradient(115deg, transparent 42%, rgba(255,244,214,0.55) 50%, transparent 58%)`, 1.4s, 0.2s delay) and a gold glow ring `@keyframes awakenGlow { 0%{box-shadow:0 0 0 0 rgba(154,123,45,0.4)} 45%{box-shadow:0 0 0 12px rgba(154,123,45,0.08), 0 0 44px 4px rgba(211,178,94,0.5)} 100%{box-shadow:0 0 0 0 rgba(154,123,45,0)} }`. In production, swap the still for a `<video muted playsinline>` inside the same arched mask; keep the glow ring while playing. Idle play chip: 26px ivory circle, gold triangle, bottom-right.
7. **Movement Guide shorts**: tap card → inline looped playback of the 5–10s clip inside the 9:16 card; `:active` translateY(1px). Search filters as you type.

## State Management
Reuse `useFit` (zustand). New state:
- `rites`: 5 booleans (calories, macros, steps, relax, mobility) — calories/macros targets come from the nutrition coach recommendation, the rest are per-user custom targets (editable in settings later).
- `sealedDate` (string, e.g. ISO date): whether today is sealed; sealing awards +50 laurels and increments the user's laurel total (future leaderboard).
- `coachVideoUrl`: current coach video, fetched from backend (rotated weekly/bi-weekly/daily).
- Movement library: fetched from backend folder structure `/guides/<bodypart>/<movement>.{mp4,jpg}`; client groups by bodypart and filters by search query.
- UI-only: animation tick counters for gleam/ring retriggering, `coachPlaying` flag, search query string.

## Assets
- Coach portraits & hero: already in the repo at `public/brand/coach-*.png`, `public/brand/hero.png` (unchanged).
- Meander band, gold divider, checks: inline SVG (samples inside `Design Routes.dc.html`); icons remain lucide-react (`Flame`, `Check`, `Apple`, `HeartPulse`, `Mic`, `Send`, `Volume2`…), recolored gold.
- Fonts: Cinzel / Inter / Geist Mono — already wired in `src/app/layout.tsx`.

## Suggested implementation map
- `src/app/globals.css` — swap the token palette + `.panel`, `.btn-primary`, `.btn-ghost`, `.eyebrow`, add `gleam` / `ring` / `laurelPop` keyframes and a `.chisel-press` active utility; light `html`/`body` background.
- `src/app/dashboard/page.tsx` — restyle `Stat`, `Card`, `Action`, hero strip → shrine/hero-strip variants; Roman numerals; meander band under header.
- `src/components/CoachChat.tsx` — underline tabs, marble bubbles, square send, oracle placeholder copy.
- `src/components/Brand.tsx` — `GreekKey` recolored `#c4ab6a`; wordmark gold.
- `src/app/page.tsx` (landing) — rebuild per §4 using framer-motion (`useScroll` for Act I, `whileInView` for reveals); coach portraits from `public/brand/coach-*.png`.
- Leave `onboarding`/`login` for a follow-up (not covered by this handoff).

## Files
- `Design Routes.dc.html` — the final Sacred Marble mocks: **2a** = mobile (interactive), **3a** = desktop. Open in a browser; tap Begin/rites/tiles to feel the animations.
- `Sacred Marble Landing.dc.html` — landing page, scroll-interactive.
- `standalone/Landing.html`, `standalone/Design Routes.html` — self-contained single-file versions (fonts + images inlined, no other files needed). Use these when importing into a tool that takes one HTML file.
- `support.js` — prototype runtime required by the `.dc.html` files; not part of the design.
- `ios-frame.jsx`, `browser-window.jsx` — presentation device frames only; not part of the design.
- `coach-*.png`, `hero.png` — brand art (same files as `public/brand/` in the repo).
