# Unbound — Build Spec (React + TypeScript + Tailwind CSS)

You are building **Unbound**, a web product that gives students, expats and international hires "one case for their whole immigration journey". There are two surfaces:

1. **Marketing landing page** (`/`) — 5 full-width sections, dark-green / dusty-rose palette.
2. **Signed-in app** (`/app/*`) — sidebar + top bar shell with 6 screens: Assistant (chat), My journey, Finances, Visa costs & payments, To-do list, My profile. Plus a notifications popover.

Everything below was measured from the source designs. **All pixel values are for a 1440px-wide desktop frame** (the reference PNGs in `reference/` are exported at exactly 1440px wide, so a pixel in a screenshot = 1 CSS px). Build pixel-close at 1440, then make it responsive (section 9).

The prototype is **front-end only**: no backend. All data comes from a typed mock module (section 7). Interactions must work against local state.

---

## 0. Kit contents

```
UNBOUND_BUILD_SPEC.md          ← this file
assets/
  hero-night-wing.jpg          ← landing §1 background photo (night sky, plane wing)
  features-night-wing.jpg      ← landing §4 background photo
  logo-mark.svg                ← brand mark (4-point star + compass needle). Uses currentColor for the star.
  logo-mark.png                ← original raster of the mark (rose star, red needle)
  star.svg                     ← plain 4-point star (decorative shapes, sparkle bullets, avatar tile)
reference/
  landing/1-hero.png … 5-cta-footer.png
  app/01 … 09 *.png            ← 04-journey-DRAFT-ignore.png is an abandoned draft; build 05 instead
```

> Note: the landing reference PNGs were rasterised without the brand fonts installed, so letterforms look generic there. Trust this spec for typography (Unbounded + Onest), and the PNGs for layout/colour.

---

## 1. Tech stack & setup

- **Vite + React 18/19 + TypeScript (strict)**
- **Tailwind CSS v4** (`@tailwindcss/vite`), tokens declared with `@theme` in `src/index.css`
- **react-router** (v7, data or declarative mode — either is fine)
- **lucide-react** for icons (the design's icons are Lucide-style, 2px stroke, round caps)
- **country-flag-icons** (or `flag-icons`) for flag SVGs — rectangular 3:2 flags, no rounding
- **clsx** + **tailwind-merge** → a `cn()` helper
- Fonts from Google Fonts: **Unbounded** (600, 700) and **Onest** (400, 500, 600, 700)

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700&family=Unbounded:wght@600;700&display=swap" rel="stylesheet" />
```

No UI kit (no shadcn/MUI). Build small primitives yourself (section 4).

---

## 2. Design tokens

### 2.1 Colours

| Token | Hex | Used for |
|---|---|---|
| `ink-950` | `#03100A` | Darkest bg: landing hero, features, footer |
| `ink-900` | `#072011` | **Primary dark green**: app sidebar, dark cards, primary dark buttons, headings text on light |
| `ink-800` | `#0B2416` | Text on light cards (country names) |
| `ink-700` | `#123A22` | Footer divider line |
| `ink-600` | `#2F5640` | Borders/fills on dark (footer inputs, social circles) |
| `sage-200` | `#C9D3BF` | Muted text on dark |
| `sage-100` | `#D3DCC8` | Body text on dark feature cards |
| `sage-50` | `#E2E6D8` / `#EEF0E6` | Hero trust-row text / hero subtitle |
| `rose-300` | `#D8A9A9` | **Dusty rose**: landing §2 bg, eyebrows on dark, inactive nav text, outlined-button borders, future stepper nodes, toggle-off track |
| `rose-200` | `#EAD9D9` | Hairline borders of cards/inputs in app |
| `rose-100` | `#F3E3E3` | Active nav bg, date tiles, neutral pills, progress tracks |
| `rose-50` | `#F9F1F1` | **App page background**, inner panels, composer input, landing light cards |
| `red-600` | `#B84747` | **Accent red**: primary CTA buttons, badges, eyebrows on light, current step, "short" states |
| `red-700` | `#8C2B2B` | Accent text on rose bg (landing §2) |
| `red-100` | `#F7E3E3` | "Missing"/"Short"/"Soon" pill bg |
| `brown-700` | `#5A2E2E` | Body text on rose/light-rose surfaces (landing) |
| `muted` | `#5E5050` | Secondary text in the app (subtitles, meta, placeholders) |
| `green-700` | `#24683F` | Success text, "covered" bar |
| `green-100` | `#E1F0E6` | Success pill / icon-tile bg |
| `amber-700` | `#8A5300` | Warning text ("Needs update", "To pay", "Upcoming") |
| `amber-100` | `#FDF0D9` | Warning pill / icon-tile bg |
| `white` | `#FFFFFF` | App cards |

```css
/* src/index.css */
@import "tailwindcss";

@theme {
  --font-display: "Unbounded", ui-sans-serif, system-ui, sans-serif;
  --font-sans: "Onest", ui-sans-serif, system-ui, sans-serif;

  --color-ink-950: #03100A;
  --color-ink-900: #072011;
  --color-ink-800: #0B2416;
  --color-ink-700: #123A22;
  --color-ink-600: #2F5640;
  --color-sage-200: #C9D3BF;
  --color-sage-100: #D3DCC8;
  --color-sage-50: #EEF0E6;
  --color-rose-300: #D8A9A9;
  --color-rose-200: #EAD9D9;
  --color-rose-100: #F3E3E3;
  --color-rose-50: #F9F1F1;
  --color-red-600: #B84747;
  --color-red-700: #8C2B2B;
  --color-red-100: #F7E3E3;
  --color-brown-700: #5A2E2E;
  --color-muted: #5E5050;
  --color-green-700: #24683F;
  --color-green-100: #E1F0E6;
  --color-amber-700: #8A5300;
  --color-amber-100: #FDF0D9;

  --radius-card: 24px;
  --radius-panel: 14px;
}

body { @apply bg-rose-50 font-sans text-ink-900 antialiased; }
```

(Overriding `red-*`, `green-*`, `amber-*` replaces Tailwind's defaults for those shades only — intentional; don't use the stock ones.)

### 2.2 Typography

Two families:

- **Unbounded** (`font-display`, bold) — wordmark, all landing headings, landing card titles and step numbers.
- **Onest** (`font-sans`) — everything else, including **all app headings** (bold 700).

**Landing scale** (px at 1440):

| Role | Family / weight | Size / line-height | Notes |
|---|---|---|---|
| Hero H1 | Unbounded 700 | 80 / 1.2 | 2 lines, second line in `rose-300` |
| Section H2 | Unbounded 700 | 40–48 / 1.15 | §2 44, §3 48, §4 40, §5 38 |
| Card title | Unbounded 700 | 21 (big card 24) | |
| Wordmark | Unbounded 700 | 30 | lowercase "unbound" |
| Eyebrow | Onest 700 | 18, uppercase, `tracking-[0.22em]` | |
| Lead paragraph | Onest 400 | 21–24 / 1.4 | |
| Card body | Onest 400 | 17–18 / 1.45 | |
| Button | Onest 700 | 20–22 | |
| Nav links | Onest 700 | 19 | |
| Small/legal | Onest 400 | 16 | |

**App scale** (px at 1440):

| Role | Weight | Size / lh | Colour |
|---|---|---|---|
| Page H1 | 700 | 36 / 1.15 | `ink-900` |
| Eyebrow above H1 | 700 | 14, uppercase, `tracking-[0.25em]` | `red-600` |
| Page subtitle | 400 | 17 | `muted` |
| Greeting heading (Assistant) | 700 | 30 | `ink-900` |
| Card title | 700 | 20 | `ink-900` |
| List item title | 700 | 17 | `ink-900` |
| Body / input text | 400 | 17 | `ink-900` / placeholder `muted` |
| Meta / secondary | 400 | 14–15 | `muted` |
| Pill / badge | 700 | 13–15 | per tone |
| Table column labels | 700 | 13, uppercase, `tracking-[0.2em]` | `muted` |
| Nav item | 400 (active 700) | 18 | |

Use `tabular-nums` on every money amount, date number and counter.

### 2.3 Radii, borders, shadows, spacing

- App cards: `rounded-3xl` (24px), `bg-white`, `border-2 border-rose-200`. **No shadows** anywhere except the notifications popover (`shadow-[0_12px_40px_rgba(7,32,17,0.12)]`).
- Inputs, search, chips, task rows: radius 14px (`rounded-[14px]`), `border-2 border-rose-200`.
- Pills/buttons: `rounded-full`.
- Date tiles / icon tiles: 8–10px radius.
- Landing cards: 24px; quiz card 32px; CTA band 34px; country tiles 16px; icon tiles 14px.
- App spacing rhythm: 36px page side padding, 24–28px card padding, 26–28px gap between cards, 20px between stat cards.
- Landing: 72px left/right gutter, max content width 1296px (`max-w-[1296px] mx-auto px-[72px]` at 1440).

### 2.4 Icons (lucide-react names)

| Where | Icon |
|---|---|
| Nav: Assistant / My journey / Finances / To-do | `MessageSquareText` / `Route` / `Banknote` / `ListChecks` |
| Search, bell, send, help | `Search`, `Bell`, `ArrowRight`, `CircleHelp` |
| Log in | `User` |
| Check marks | `Check` |
| Suggestion chips / sparkle | `Sparkle` (outline) or `star.svg` |
| Notification tiles | `Clock`, `Banknote`, `File`, `Send` |
| Task delete | `Trash2` |
| Landing §2 cards | `Pencil`, `Map`, `FileCheck`, `Sparkle` |
| Landing §4 trust row | `Lock`, `Check`, `User`, `Globe` |
| Footer app badges | `Smartphone` |
| Menu (collapsed sidebar) | `Menu` |

Stroke width 2, sizes stated per component.

---

## 3. File structure

```
src/
  main.tsx, App.tsx, index.css
  routes.tsx
  lib/cn.ts, lib/format.ts            // money(€), dates ("23 Oct", "in 7 days")
  data/mock.ts, data/types.ts
  components/ui/
    Button.tsx  Pill.tsx  Card.tsx  Checkbox.tsx  Toggle.tsx  ProgressBar.tsx
    SegmentedFilter.tsx  Flag.tsx  Avatar.tsx  LogoMark.tsx  Eyebrow.tsx  PageHeader.tsx
  components/landing/
    SiteHeader.tsx  Hero.tsx  WhyUnbound.tsx  TryItQuiz.tsx  Features.tsx  CtaFooter.tsx
  components/app/
    AppShell.tsx  Sidebar.tsx  TopBar.tsx  NotificationsPopover.tsx
  pages/
    Landing.tsx
    app/Assistant.tsx  Journey.tsx  Finances.tsx  VisaCosts.tsx  Todo.tsx  Profile.tsx
```

Routes:

| Path | Page |
|---|---|
| `/` | Landing |
| `/app` | redirect → `/app/assistant` |
| `/app/assistant` | Assistant |
| `/app/journey` | My journey |
| `/app/finances` | Finances overview |
| `/app/finances/costs` | Visa costs and payments |
| `/app/todo` | To-do list |
| `/app/profile` | My profile |

"Log in", "Sign up", "Create free account" on the landing page all navigate to `/app/assistant` (prototype).

---

## 4. Shared primitives

**Button** — `variant`: `primary` (bg `red-600`, white), `dark` (bg `ink-900`, white), `outline` (transparent/white bg, `border-2 border-rose-300`, `ink-900` text), `outlineLight` (transparent, `border-2 border-white`, white text — on dark bg), `white` (bg white, `ink-900` text). `size`: `sm` h-8 px-5 text-[15px]; `md` h-[38px] px-7 text-base; `lg` h-[55px]/`xl` h-[63px] px-8 text-[22px]. Always `rounded-full font-bold`, focus ring `focus-visible:outline-2 outline-offset-2 outline-red-600`. Hover: primary → `#A33E3E`, dark → `ink-800`, outline → `bg-rose-50`.

**Pill** (status) — `tone`: `neutral` (`rose-100` / `ink-900`), `danger` (`red-100` / `red-600`), `warning` (`amber-100` / `amber-700`), `success` (`green-100` / `green-700`), `badge` (`red-600` / white, uppercase). `h-7 px-4 rounded-full text-sm font-bold inline-flex items-center justify-center`. Status pills in tables have a fixed width (112px) so columns align.

**Card** — `rounded-3xl bg-white border-2 border-rose-200 p-6` (24px; some cards use 28px — see per screen). `variant="dark"`: `bg-ink-900 border-0 text-white`.

**Checkbox** — 24px (task list: 28px) square, radius 5–6px. Unchecked: white, `border-2 border-rose-300`. Checked: bg `ink-900`, white `Check` 16px. Real `<input type="checkbox">` visually hidden + styled span.

**Toggle** — 62×34 track, `rounded-full`. On: track `ink-900`, 26px white knob right. Off: track `rose-300`, knob left. `role="switch"`, `aria-checked`. 150ms transition.

**ProgressBar** — track `rose-100` rounded-full; fill colour prop (`ink-900` | `green-700` | `red-600`); height prop (8/10/12).

**SegmentedFilter** — row of pills, gap 10px, `h-9 px-6 rounded-full font-bold text-[15px]`. Active: `bg-ink-900 text-white`. Inactive: `bg-white border-2 border-rose-200 text-ink-900`. `role="tablist"`.

**Eyebrow** — `text-sm font-bold uppercase tracking-[0.25em] text-red-600`.

**PageHeader** — `{ eyebrow?, title, subtitle?, right? }`: eyebrow, then H1 (36px bold, mt-3), subtitle (17px muted, mt-3); `right` slot vertically aligned with the H1.

**Avatar** — circle `bg-red-600 text-white font-bold`, initials. Sizes 50 (sidebar), 82 (profile).

**LogoMark** — inline `logo-mark.svg`; star colour `rose-300`, needle `red-600`, centre dot `ink-900`. Wordmark next to it: Unbounded 700 lowercase.

---

## 5. Landing page (`/`)

The landing page is one long scroll of 5 sections. Each section was designed as a 1440×810 frame; use `min-h-[810px]` (or `min-h-svh` capped) per section and the vertical positions below as guidance (y measured from section top).

### 5.0 Site header (shared, fixed)

- `fixed inset-x-0 top-0 z-50`, content row at y=37, height 52, `px-[72px]`.
- **Left:** LogoMark 52px + wordmark (Unbounded 30, 12px gap).
- **Right** (gap ~20px, items centred): "For employers" (Onest 700, 19px) · language pill (104×49, rounded-full, UK flag 30×20 + "EN" bold 19) · help circle (49px, `CircleHelp` 29px) · "Log in" (`User` icon 27px + bold 19) · **Sign up** primary pill 144×52, bold 20.
- **Theme switches per section** (use `IntersectionObserver` on sections with `data-header-theme`):
  - `dark` (§1, §3, §4, §5): text white; lang pill & help circle `bg-[#03100A]/40 border border-white/45`.
  - `light` (§2 rose section): text `ink-900`; lang pill & help circle `bg-white/60 border border-ink-900/45`.
- Once scrolled past 24px, add `backdrop-blur-md` and a background of `ink-950/70` (dark) or `rose-300/80` (light) so text stays legible over content. The design itself shows the header transparent at the top of each frame.

### 5.1 Hero — "Move abroad. Stay unbound."

- bg `ink-950`; `hero-night-wing.jpg` `object-cover` full-bleed. Overlay: `bg-gradient-to-r from-ink-950/95 via-ink-950/60 to-transparent` + `bg-gradient-to-t from-ink-950 via-transparent` on the bottom 40%.
- Content left-aligned at x=72:
  - y≈288 Eyebrow "FOR STUDENTS, EXPATS AND INTERNATIONAL HIRES" — 18px bold, `tracking-[0.22em]`, `rose-300`.
  - y≈331 H1, Unbounded 80/1.2: line 1 "Move abroad." white; line 2 "Stay unbound." `rose-300`.
  - y≈536 Lead (max-w 750, 24px, `#EEF0E6`): "One case for your whole immigration journey, from the first application to your next chapter. We tell you exactly what to do next."
  - y≈631 Buttons, gap 18: **Check my options →** (primary, 266×63, bold 22) → smooth-scroll to §3; **How it works** (outlineLight, 209×63) → smooth-scroll to §2.
- y=720: 1px line `white/25` across content width.
- y≈739 Trust row (items at x 72, 274, 629): red `Check` 22px + text 18px `#E2E6D8`: "Free to start" · "Documents encrypted end to end" · "Visa fees and proof of funds with Wise".

### 5.2 Why Unbound — rose section

- bg `rose-300`. Decorative: `star.svg` 720px, colour `ink-900`, opacity 15%, absolutely positioned at right:-173px top:-58px, `pointer-events-none`, clipped by `overflow-hidden`.
- y≈137 Eyebrow "WHY UNBOUND" — colour `red-700`.
- y≈176 H2 (Unbounded 44, max-w 1037): "Immigration is scattered across a dozen websites. " (`ink-900`) + "We turn it into one case." (`red-700`).
- y≈317 Paragraph (21px, `brown-700`, max-w 922): "Today you are the project manager of your own move: embassy pages, university emails, deadlines and the same documents uploaded again and again. Unbound remembers your case, knows what is done and what is missing, and tells you the next step."
- y=432 **4 step cards**, grid 4 cols, gap 25, each 305×248, `bg-rose-50 rounded-3xl p-[26px]`:
  - Top row: number (Unbounded 700, 20, `red-600`) left; icon tile right — 58px, `bg-ink-900 rounded-[14px]`, icon 35px `rose-300`.
  - Title (Unbounded 700, 21, `ink-900`, mt≈34) then body (18px, `brown-700`, mt-2).
  - Content:
    1. `01` · Pencil · **Tell us your situation** — "Passport, destination and purpose. Only the questions that matter, in about two minutes."
    2. `02` · Map · **Get your pathway** — "The right permit, a personal checklist, fees and every deadline on one timeline."
    3. `03` · FileCheck · **Prepare and check** — "Upload once. AI checks names, dates and formats before you submit anything."
    4. `04` · Sparkle · **Stay on track** — "Reminders before renewals, help when you change status, and a plan for what comes next."
- y≈717 bottom row, `justify-between`:
  - Journey breadcrumb, Unbounded 400/500 20px `ink-900`: "Apply · Arrive · **Stay** · Transition · Next chapter" with "Stay" in `red-700` (spaces around the dots).
  - **Try it now** dark pill 187×60, bold 22 → scroll to §3.

### 5.3 Try it — country quiz

- bg `ink-900`. Two columns: left 504px, right card 727px at x=641.
- **Left:** Eyebrow "TRY IT IN 30 SECONDS" (`rose-300`) at y≈180; H2 Unbounded 48 white "Where does your next chapter begin?"; paragraph 21px `sage-200` at y≈418: "Pick a country and a reason. We show the likely pathway, how long it takes and what you will need. Save it to get your full checklist."; disclaimer pinned bottom (y≈655) 16px `sage-200`: "Sample guidance for this prototype. Final requirements depend on your situation and current rules."
- **Quiz card** (y=151, 727×605, `bg-rose-50 rounded-[32px] p-9`):
  - Progress: segmented bar — segments 7px high, rounded-full, gap 10, completed/current `red-600`, rest `rose-300`. **Use 3 segments** (the design shows 6, which contradicts "STEP 1 OF 3" — see section 10).
  - "STEP 1 OF 3" (16px bold, `tracking-[0.15em]`, `brown-700`), then question Unbounded 28 `ink-900`: "Where do you want to go?"
  - **Country grid** 4×2, gap 17, tiles 151×137, `rounded-2xl p-4`, `bg-white border-[1.6px] border-rose-300`. Flag 43×29 top-left, then name (bold 20, `ink-800`) and cities (15px, `brown-700`, truncate with ellipsis).
    - Selected tile: `bg-ink-900 border-ink-900`, name white, cities `sage-200`. Hover: `border-red-600`.
    - Tiles are radio buttons (`role="radiogroup"`, arrow-key navigation).
    - Data: Germany "Berlin, Munich…", Hungary "Budapest, Szeged…", Netherlands "Amsterdam, Delft…", Austria "Vienna, Graz…", Poland "Warsaw, Kraków…", Spain "Madrid, Barcelona…", France "Paris, Lyon…", Italy "Milan, Bologna…". Germany is selected by default in the design.
  - Footer `justify-between`: "← Back" (bold 20, `ink-900`; at 40% opacity and disabled on step 1); **Continue** primary 187×60 (disabled until a choice exists).
  - **Steps 2 & 3 and result are not designed — extrapolate in the same style:**
    - Step 2 "What brings you there?" — 2×3 tiles with icon + label: Study, Work, Job-seeking, Family, Research, Start a business.
    - Step 3 "Which passport do you hold?" — searchable select (style like the app's select, section 6.6) with a few common nationalities.
    - Result view (replaces the grid): pathway name (Unbounded 24), 3 facts in a row (Typical processing time, Main documents count, Official fee), a short document list using the success/warning pill styles, and CTAs **Save and get my checklist** (primary → `/app/assistant`) + **Start over** (text button). Use a small hard-coded lookup (country × reason) in mock data; fall back to a generic result.

### 5.4 Features — "Built for the whole journey, not just the visa."

- bg `ink-950` + `features-night-wing.jpg` cover + overlay `bg-ink-950/75`.
- y≈137 Eyebrow "NEW ON UNBOUND" (colour `#E89A9A`); H2 Unbounded 40 white.
- y=288 Grid: big card (418×353) left + 2×2 small cards (413×163, gaps 26/27) right.
  - **Big card "AI document check"** — `bg-rose-300 rounded-[26px] p-[29px]`. "NEW" badge (red-600 bg, white bold 14, 72×32 rounded-full). Title Unbounded 24 `ink-900`. Body 17px `brown-700`: "Checks names, dates, issue window and format against your case before the office does." Inner white panel (`rounded-[14px] p-4`, 3 rows, ~39px pitch): label (Unbounded 700 16px) left + pill right (151×29):
    - Passport → success "Valid to 2031"
    - Bank statement → success "Meets minimum"
    - Insurance → danger "Ends too early"
  - **Small cards** — `bg-ink-900/70 border border-rose-300/25 rounded-3xl p-[25px] backdrop-blur-sm`. Badge then title (Unbounded 21 white) then body (17px `sage-100`).
    - NEW · **Pay fees with Wise** — "Visa and permit fees in local currency, proof of funds attached with consent."
    - NEW · **Travel map** — "Where your passport and permit let you go, even mid-renewal."
    - COMING SOON · **Family cases** — "Partner and children on one plan with linked deadlines."
    - COMING SOON · **Unbound for employers** — "HR sees each hire's permit status and next compliance actions."
    - Badge "NEW": red-600 fill, white. Badge "COMING SOON": transparent, `border border-rose-300`, `rose-300` text, 137×29.
- y=665 divider `rose-300/25`.
- y≈687 trust row, 4 equal columns (x 72/396/720/1044): icon 32px `rose-300` + (title bold 18 white / sub 16 `sage-100`):
  - Lock — Encrypted documents / Only you and offices you approve
  - Check — You approve every step / Nothing submitted without you
  - User — Advisers on call / Licensed help for complex cases
  - Globe — Data stored in the EU / GDPR compliant

### 5.5 CTA band + footer

- bg `ink-950`.
- **CTA band** y=137, full content width × 216, `bg-red-600 rounded-[34px] px-[58px]`, `overflow-hidden relative`:
  - Left (max-w 720): H2 Unbounded 38 white "Your next chapter starts with one case."; sub 20px `#FBE7E7` "Create a free account, answer a few questions and get your personal plan today."
  - Right, vertically centred, gap 21: **Create free account** (white variant, 238×63, bold 22) and **Check my options** (outlineLight, 202×63, bold 20).
  - Decorative white `star.svg` 216px, opacity 16%, flush to the right edge, vertically centred.
- **Footer** from y≈403:
  - Col 1 (w 374): LogoMark 46 + wordmark Unbounded 26; tagline 18 `sage-200` "One persistent case for your immigration journey: apply, arrive, stay, transition."; newsletter row: input 252×52 (`bg-ink-900 border border-ink-600 rounded-full px-5`, placeholder "Rule changes, monthly" 17 `sage-200`) + **Subscribe** primary 122×52 bold 17 (on submit, show inline "Thanks — you're subscribed." and clear); app badges (180×55, `bg-ink-950 border border-ink-600 rounded-xl`, `Smartphone` 32 white + "Coming soon" 13 `sage-200` / name bold 17 white): "iPhone app", "Android app".
  - 4 link columns at x 540/752/963/1175 (each 202 wide): heading 16 bold uppercase `tracking-[0.15em]` `rose-300`; links 18 `sage-200`, ~33px line pitch, hover white.
    - PRODUCT: How it works, Check my options, Travel map, Pricing, For employers
    - RESOURCES: Help centre, Country guides, Deadline calculator, Blog
    - COMPANY: About us, Careers, Partners, Contact
    - LEGAL: Privacy, Terms, Cookies, Accessibility
  - y=706 divider 1px `ink-700`. Bottom row: "© 2026 Unbound · Budapest" (16 `sage-200`); legal note (16 `sage-200`, max-w 720): "Unbound is not a law firm. Information is guidance only; for legal advice, book a licensed adviser."; social circles 43px `bg-ink-600`, white bold 16 text "in", "ig", "tt" (with `aria-label`s LinkedIn/Instagram/TikTok).

---

## 6. App (`/app/*`)

### 6.1 App shell

```
┌──────────┬───────────────────────────────────────────────────────────┐
│ Sidebar  │ TopBar (92px, border-b border-rose-200)                     │
│ 296px    ├───────────────────────────────────────────────────────────┤
│ ink-900  │ <main> px-9 (36px) pt-[25px] pb-8, bg-rose-50               │
│          │   page content (max width = 1440-296-72 = 1072px)          │
└──────────┴───────────────────────────────────────────────────────────┘
```

- `h-svh` grid: `grid-cols-[296px_1fr]`; sidebar `sticky top-0 h-svh`; main scrolls.
- **Sidebar (expanded, 296px, `bg-ink-900`)**
  - Logo row at top (y≈24–80): LogoMark 52px at x≈20 + wordmark "unbound" (Unbounded 700, 28px, white), gap 14.
  - Nav starts at y=112, items 254×52 inset 20px, 8px gap, `rounded-xl px-5 gap-4`, icon 22px + label 18px:
    - Inactive: transparent, text & icon `rose-300`; hover `bg-white/5`.
    - **Active (follow the current route, `NavLink`)**: `bg-rose-100`, text & icon `ink-900`, label bold.
    - Items: Assistant · My journey · Finances (active for `/app/finances` and `/app/finances/costs`) · To-do list with count badge at right (24px circle `bg-red-600`, white bold 13; value = number of open tasks).
  - Profile block pinned bottom (`mt-auto`, mx-5 mb-5, `rounded-xl p-3`): Avatar 50 "AN" + name (bold 17, white) / "My profile" (14, white). Links to `/app/profile`. Active state (on profile page): `bg-rose-100`, texts `ink-900`.
- **Sidebar (collapsed, 80px)** — see `01-assistant-sidebar-collapsed.png`: only LogoMark (top), a `Menu` button (3 rose lines, 40px) that expands it, and the red to-do count circle (42px). When collapsed, the wordmark "unbound" (`ink-900`, 28px Unbounded) appears at the start of the top bar. Toggle via the menu button; persist the choice in `localStorage` (try/catch). Default: expanded ≥1280px, collapsed 1024–1279px, off-canvas drawer <1024px (section 9).
- **TopBar** (h 92, `border-b border-rose-200`, items vertically centred, `px-9`):
  - Search field: 518×49, `bg-white border-2 border-rose-200 rounded-[14px]`, `Search` icon 22px at left (pl-4), placeholder "Search tasks, documents, countries…" 17px `muted`. Filtering behaviour: on typing, show a dropdown (same card style as the popover) listing matching tasks, documents and countries from mock data, grouped with small uppercase group labels; Enter/click navigates to the relevant page. `⌘K`/`Ctrl K` focuses it.
  - Right (gap 20): language button 89×49 (`bg-white border-2 border-rose-200 rounded-[14px]`, UK flag 28×20 + "EN" bold 17); bell button 60×49 same style with `Bell` 26px and a red count badge (24px circle, white bold 13) overlapping its top-right corner (−10px/−10px). When the popover is open, the bell button border becomes `border-ink-900`.

### 6.2 Notifications popover

Reference: `03-assistant-chat-notifications.png`.

- Anchored under the bell, right-aligned to the bell's right edge + ~36px, top 84px from viewport top; width 490; `rounded-3xl bg-white border-2 border-rose-200` + shadow; `z-40`.
- Header (px-7 py-6, `border-b border-rose-200`): "Notifications" bold 22 · "Mark all read" bold 15 underlined (sets all read; badge disappears).
- Filter: SegmentedFilter "All" / "Unread (n)".
- Items (px-7, ~86px pitch): icon tile 56px `rounded-[10px]` (tone-coloured bg + icon 26px in tone text colour) · unread dot (10px `red-600`) before the title · title bold 17 · description 15 `muted` · time right-aligned 14 `muted`. Clicking an item marks it read and navigates to its target.
  1. danger tone (`rose-100` bg, red icon) `Clock` — **Certificate due in 7 days** — "Request it by Fri 23 Oct." — 9:00 — unread → `/app/todo`
  2. success tone `Banknote` — **Bank statement checked** — "Your Wise balance meets the minimum." — 2h ago — unread → `/app/finances`
  3. neutral tone (`rose-100` bg, `ink-900` icon) `File` — **Insurance ends too early** — "Policy ends 30 Nov, before the new permit." — Yesterday — unread → `/app/journey`
  4. warning tone `Send` — **Planning a December trip?** — "After 31 Jan bring your renewal receipt." — Tue — read → `/app/assistant`
- Footer (`border-t`, px-7 py-5): "Notification settings" (→ `/app/profile#notifications`) and "See all" — both bold 17 underlined.
- Close on outside click, `Esc`, and route change. Focus trap not required, but focus the first item on open and return focus to the bell on close. `aria-expanded` on the bell.

### 6.3 Assistant (`/app/assistant`)

References: `02-assistant-home.png` (empty), `03-…png` (conversation).

Layout: `grid grid-cols-[1fr_317px] gap-7`, both columns stretch to the bottom of the viewport (main card height = viewport − top bar − 25 − 32).

**Main chat card** (white card, flex column, `p-0`, overflow hidden):
- Header (px-7 py-6, `border-b border-rose-200`, flex justify-between): assistant avatar tile 54px `bg-ink-900 rounded-[10px]` with a 30px `rose-300` star · title "Unbound assistant" bold 20 / sub "Knows your case, documents and deadlines" 16 `muted` · right: neutral pill "Study permit · 107 days" (bold 15, h-8, px-5).
- **Empty state** (scroll area, px-[58px] pt-14):
  - Eyebrow "FRIDAY 16 OCTOBER 2026" (format today's mock date; red, 14px, tracking 0.25em)
  - H "Hi Aigerim, what can I help you with?" bold 30, mt-4
  - Paragraph 17 `muted` mt-[70px]: "Ask about your renewal, travel, money or what happens after graduation. I already know your case."
  - Suggestion chips: `grid grid-cols-2 gap-[14px] mt-8`, each min-h 82, `rounded-[14px] border-2 border-rose-200 bg-white px-5 py-4 flex gap-3 text-left`, red outline sparkle 20px + text 17. Hover `bg-rose-50`. Click = send that text as a user message.
    - "What do I still need for my permit renewal?"
    - "Can I travel to Turkey over Christmas?"
    - "Which country fits my budget after graduation?"
    - "How much money do I need for a German job-seeker visa?"
- **Conversation state** (replaces the empty state once a message exists; scroll area px-7 py-6, flex column gap 24, auto-scroll to bottom):
  - User message: right-aligned, max-w 75%, `bg-ink-900 text-white rounded-2xl px-7 py-4 text-[17px]`.
  - Assistant message: left-aligned, max-w 85%, `bg-rose-50 border-2 border-rose-200 rounded-[18px] px-7 py-5 text-[17px] leading-snug`; supports a bold lead line, bullet list (`list-disc pl-6`), and paragraphs. Render from a tiny structured type (not raw HTML).
  - Pending reply: pill `bg-rose-50 border-2 border-rose-200 rounded-full px-6 py-1.5 italic text-muted` "Thinking…" (animate the ellipsis), shown ~1.2s before the reply appears.
  - Canned replies: map known questions to answers in mock data; unknown questions get a generic answer. The renewal answer must be exactly:
    > **You still need 3 items:**
    > • Student status certificate — missing • Health insurance — needs update • Fee payment receipt — to pay
    > Next step: request the certificate by Fri 23 Oct. Submit on Enter Hungary by 13 Nov, then biometrics on 26 Nov.
- **Composer** (`border-t border-rose-200`, px-7 py-5): input h-[58px] `bg-rose-50 border-2 border-rose-200 rounded-[14px] px-6 text-[17px]` placeholder "Ask anything about your move…" + send button 58×58 `bg-red-600 rounded-[14px]` with white `ArrowRight` 28px (`aria-label="Send"`, disabled while empty or thinking). Enter sends. In conversation state show "Guidance only, not legal advice." (13px `muted`, mt-2) under the input.

**Right column** (flex column gap 7):
- **Next step card** (dark card, `rounded-3xl p-[26px]`): badge pill "NEXT STEP" (`bg-red-600`, white, bold 13 uppercase, h-7 px-4) · title bold 20 white mt-4 "Request your student status certificate" · text 16 `rose-300` mt-6 "Must be issued within 30 days of your submission. Due Fri 23 Oct." · primary button "Start request" (h-[37px] px-8 bold 16) mt-6 → sends "How do I request my certificate?" in the Assistant.
- **Coming up card** (white card, p-[26px], flex-1): header "Coming up" bold 20 + "All tasks" bold 15 underlined link → `/app/todo`. Then 4 rows (gap 16): date tile 62×65 `bg-rose-100 rounded-lg`, day bold 20 / month bold 12 uppercase, centred · title bold 17 / meta 15 `muted`. Data = the next 4 open tasks sorted by date:
  - 23 OCT Request certificate — Documents · in 7 days
  - 6 NOV Extend health insurance — Documents · in 21 days
  - 13 NOV Submit on Enter Hungary — Journey · in 28 days
  - 26 NOV Biometrics, 10:30 — Appointment · in 41 days

### 6.4 My journey (`/app/journey`)

Reference: `05-my-journey.png` (ignore 04).

- PageHeader: eyebrow "STAGE 3 OF 4", title "My journey", subtitle "From your first application to your next chapter.", right: neutral pill "Hungary · since Sep 2025" (bold 15, h-[34px] px-6).
- **Stage stepper card** (full width, mt-6, p-7):
  - 4 nodes evenly spaced (node centres at 1/8, 3/8, 5/8, 7/8 of the inner width), circles 64px, connected by 2px lines between circles:
    - Done (Apply, Arrive): `bg-ink-900`, white `Check` 26px; connector after a done node = `ink-900`.
    - Current (Stay): `bg-red-600`, white number "3" bold 22; label `red-600`.
    - Future (Transition): white, `border-[3px] border-rose-300`, number "4" bold 22 `ink-900`; connector into it = `rose-300`.
  - Labels centred under nodes (mt-3): bold 18 + sub 15 `muted`: Apply / Mar–Jul 2025 · Arrive / Sep 2025 · Stay / Now · 22% · Transition / From Jun 2028.
  - Info strip (mt-8, `bg-rose-50 rounded-xl px-5 py-4 text-[17px]`): "**Stay.** Renewing your residence permit for study purposes. Current card valid until 31 January 2027."
  - Nodes are buttons; clicking one swaps the info strip text (write a one-line description for each stage). Use `<ol>` with `aria-current="step"` on Stay.
- Bottom row `grid grid-cols-[396px_1fr] gap-[26px] mt-6`:
  - **Renewal steps** card (p-7): title bold 20; ordered list (mt-5, gap 8 → 36px pitch), each row 28px circle + text 17:
    - Done: `bg-ink-900` white check — "Case confirmed"
    - Current: `bg-red-600` white "2" — "Collect documents · 4 of 8" (text `red-600` bold)
    - Pending: `bg-rose-100`, number `muted` bold 14 — "AI document check", "Submit on Enter Hungary · 13 Nov", "Biometrics · 26 Nov", "Decision · ~21 days"
  - **Documents** card (p-7): header "Documents" bold 20 + "4 of 8 ready" 17 `muted`; ProgressBar h-[10px] fill `ink-900` at 50% (mt-4); list of rows (py-3, `divide-y divide-rose-200`): title bold 17 / sub 14 `muted` · status pill (w-28) · action (outline sm button, w-[118px]) — action column empty for ready docs (pill shifts right to align with the action column's right edge).
    - Student status certificate — "Issued within 30 days of submitting" — danger **Missing** — **Request**
    - Health insurance certificate — "Current policy ends 30 Nov" — warning **Needs update** — **Upload**
    - Fee payment receipt — "HUF 18,000 · pay when you submit" — warning **To pay** — **Pay with Wise**
    - Passport — "Valid until 12 Mar 2031" — success **Ready**
    - The case has **8** documents; the card shows the not-ready ones first then ready ones, max 4 visible, plus a "Show all 8" text button at the bottom that expands the list. Invent the 4 other ready docs (e.g. "Enrolment letter", "Proof of accommodation", "Bank statement", "Passport photo").
    - **Upload**: opens a hidden file input; on pick, pill → success "Ready", progress recalculates. **Request**: navigates to Assistant with the certificate question. **Pay with Wise**: show a small confirmation dialog (amount HUF 18,000 ≈ €47) and on confirm set to Ready and mark the matching payment Paid.

### 6.5 Finances (`/app/finances`)

Reference: `06-finances.png`.

- PageHeader: eyebrow "CONNECTED TO WISE", title "Finances", subtitle "Where your money goes furthest, and what each visa asks you to prove." Add (not in design, keep subtle) a right-side link "Visa costs and payments →" (bold 15 underlined) to `/app/finances/costs`.
- **Stat cards** `grid grid-cols-4 gap-5 mt-6`, each h-[118px] `rounded-[20px] p-[22px]`: label (13 bold uppercase `tracking-[0.2em]`), value (bold 28, mt-3), sub (16, mt-1).
  1. Dark (`bg-ink-900`): label/sub `rose-300`, value white — AVAILABLE IN WISE · **€6,240** · EUR + HUF balances
  2. White card — UPCOMING PAYMENTS · **€667** · Next: fee on 13 Nov (label `muted`, value `ink-900`, sub `muted`)
  3. MONTHLY BUDGET · **€1,100** · Set below — make the value editable inline (click → number input; Enter saves) and drive the "Best country" list from it.
  4. BEST FIT RIGHT NOW · **Hungary** · Job-seeking permit (computed: cheapest fitting option)
- Two cards `grid grid-cols-[605px_1fr] gap-[26px] mt-6`:
  - **Best country for my budget** (p-7): title bold 20; sub 16 `muted` "Monthly budget €1,100 · Savings €6,240 · Stay after graduation". Rows (mt-6, gap 6px), each h-[53px] `bg-rose-50 rounded-xl px-4 grid grid-cols-[24px_42px_1fr_192px_150px] items-center gap-3`:
    - rank bold 20 · flag 42×28 · name bold 17 / permit 14 `muted` · "Living €780/mo" 13 above a ProgressBar h-2 w-full (fill = living/budget, capped at 100%; `ink-900` if fits, `red-600` if short) · pill: success **Fits** or danger **Short €150/mo**, full column width, h-9.
    - First (best) row: `bg-rose-100 ring-2 ring-ink-900`.
    - Data: 1 Hungary — Job-seeking permit (9 months) — €780; 2 Poland — Residence to look for work — €860; 3 Czechia — Job-seeker residence — €950; 4 Spain — Job-search residence (12 mo) — €1080; 5 Germany — Opportunity Card — €1250 (short €150/mo).
  - **Proof-of-funds checker** (p-7): title bold 20; sub 16 `muted` "Your Wise balance vs what each visa asks". 4 entries (gap 24): row with flag 40×27 + label bold 17 ("Hungary · study renewal") and pill right (w-40 h-10: success **Covered** or danger **Short €6,960**); below, a ProgressBar h-3 (fill = balance/required; `green-700` if covered else `red-600`). Footnote 13 `muted` at bottom: "Sample figures. Check current amounts with the official source."
    - Required amounts (balance €6,240): Hungary study renewal €4,800 (covered) · Germany Opportunity Card €13,200 (short €6,960) · Netherlands orientation year €16,200 (short €9,960) · Spain job-search residence €7,200 (short €960). Compute "short" values; don't hard-code the strings.

### 6.6 Visa costs and payments (`/app/finances/costs`)

Reference: `07-visa-costs-payments.png`.

- PageHeader: eyebrow "FINANCES", title "Visa costs and payments", subtitle "Estimate the full cost of a visa and track every payment."
- `grid grid-cols-[619px_1fr] gap-[26px] mt-6`.
- **Visa cost calculator** card (p-7):
  - Title bold 20. Select (mt-5): h-[47px] `border-2 border-rose-200 rounded-xl px-5`, flag 30×20 + "Germany · Opportunity Card" 17 + `▾` caret at right. Implement as an accessible listbox (or a styled native `<select>` with the flag rendered beside it). Options: Germany · Opportunity Card, Hungary · Study permit renewal, Netherlands · Orientation year, Spain · Job-search residence, Poland · Work-search residence.
  - Line items (mt-4, 43px pitch), `grid grid-cols-[24px_1fr_86px_120px] items-center gap-x-6`: Checkbox · label 17 · optional quantity input (62×32, `border-2 border-rose-200 rounded-md text-center`, number, min 0/1) · amount bold 17 right-aligned. Unchecked items show €0.
  - Line items & unit prices for Germany (put per-visa prices in mock data):

    | Item | Default checked | Qty | Unit € | Official fee? |
    |---|---|---|---|---|
    | Application fee | ✓ | — | 75 | yes |
    | Certified translations | ✓ | 3 | 25 | no |
    | Apostilles | ☐ | 2 | 20 | yes |
    | Health insurance (months) | ✓ | 12 | 45 | no |
    | Courier for originals | ☐ | — | 35 | no |
    | Travel to appointment | ✓ | — | 40 | no |

    → Total **€730**, official **€75**, everything else **€655** (must match the design with those defaults).
  - Total panel (mt-6, `bg-ink-900 rounded-[20px] p-6 flex justify-between items-center`): "Estimated total" 16 `rose-300` · value bold 44 white "€730" · "Official fees €75 · everything else €655" 14 `rose-300`; right: primary button "Pay fee with Wise" (h-[43px] px-8 bold 18) → confirmation dialog, then adds an Upcoming→Paid row to the payments history.
- **Payments history** card (p-7):
  - Header row: "Payments history" bold 20 + SegmentedFilter (All / Upcoming / Paid, small: h-8 px-4 text-sm).
  - Table (`<table>`, mt-6): header cells DATE / WHAT / AMOUNT (13 bold uppercase tracking 0.2em `muted`), `border-b border-rose-200`. Rows py-4 with `border-b border-rose-200`: date 16 `muted` · what: title bold 17 + status 14 bold (Upcoming `amber-700`, Paid `green-700`) · amount bold 17 right-aligned.
    - 13 Nov 2026 · Permit renewal fee · Upcoming · €47
    - 6 Nov 2026 · Health insurance · Upcoming · €620
    - 1 Sep 2026 · Rent, September · Paid · €520
    - 15 Jul 2026 · Translations (3) · Paid · €75
    - 2 Jul 2025 · Study visa fee · Paid · €110
    - 20 Jun 2025 · Tuition deposit · Paid · €1,500
  - "Upcoming payments" stat on Finances = sum of Upcoming rows (€667) — derive it.

### 6.7 To-do list (`/app/todo`)

Reference: `08-todo.png`.

- PageHeader: eyebrow "{open} OPEN · {done} DONE" (derived), title "To-do list", subtitle "Tasks from your case appear here automatically. Add your own too."
- `grid grid-cols-[749px_1fr] gap-7 mt-6`.
- **Left column:**
  - Add form: input h-[55px] flex-1 (`bg-white border-2 border-rose-200 rounded-[14px] px-7 text-[17px]`, placeholder "Add a task, e.g. Book translator") + dark button "Add task" (h-[55px] px-11 bold 18), gap 5. New tasks: category "Personal", no date (meta shows just "Personal"), added to "LATER". Empty input → button disabled.
  - Filter (mt-4): SegmentedFilter Open / Done / All (default Open).
  - Groups: labels "THIS WEEK" / "LATER" (+ "DONE" when showing done items) — 13 bold uppercase `tracking-[0.25em]` `muted`, mt-6 mb-3. "This week" = due within 7 days of mock today (16 Oct 2026).
  - Task row (h-[61px], `bg-white border-2 border-rose-200 rounded-[14px] px-6 flex items-center gap-5`, rows gap 3): Checkbox 28px · title bold 17 / meta 15 `muted` ("Documents · 23 Oct · in 7 days") · optional danger pill **Soon** (w-[70px], when due ≤7 days) · delete icon button (`Trash2` 22, `muted`, hover `red-600`, `aria-label="Delete task"`).
  - Checking a task: title gets `line-through text-muted`, then (after 400ms) it leaves the Open filter. Sidebar badge, header eyebrow, progress and Assistant "Coming up" all update (shared store).
  - Data (open): Request student status certificate — Documents · 23 Oct; Extend health insurance to Jan 2028 — Documents · 6 Nov; Pay HUF 18,000 renewal fee with Wise — Finances · 13 Nov; Submit renewal on Enter Hungary — Journey · 13 Nov; Biometrics appointment, 10:30 — Appointment · 26 Nov. Done: "Confirm case details" — Journey · 1 Oct.
- **Right card** (p-7, self-start): "Progress" bold 20 · ProgressBar h-3 fill `ink-900` (done/total) mt-6 · "1 of 6 tasks done" 15 `muted` mt-3 · "Ask for help" bold 20 mt-14 · text 16 `muted` "Not sure how to do a task? The assistant can walk you through it." · outline button (border-[2.5px] border-rose-300, h-[58px], bold 16, full width) "How do I request my certificate?" mt-10 → Assistant with that question sent.

### 6.8 My profile (`/app/profile`)

Reference: `09-profile.png`.

- PageHeader: eyebrow "ACCOUNT", title "My profile", right: outline button "Edit details" (174×45, border-[2.5px] border-rose-300, bold 16). Edit mode turns the definition values into inputs and the button into "Save" (dark) + "Cancel".
- `grid grid-cols-2 gap-[26px] mt-12` (each column 523px), each column a vertical stack gap-[26px].
- **Left:**
  - Identity card (p-7): Avatar 82 "AN" (bold 26) + name bold 24 "Aigerim Nurlanovna" / "Member since July 2025" 16 `muted`. Definition list (`<dl>`, mt-8, grid `grid-cols-[144px_1fr]`, row gap 16): label 16 `muted` / value bold 16:
    - Citizenship — 🇰🇿 flag 26×17 + "Kazakhstan"
    - Passport — "•••• 4417 · valid to 12 Mar 2031"
    - Address — "Budapest VIII, Hungary"
    - Status — "Residence permit · study, to 31 Jan 2027"
    - Studies — "BSc Business Informatics, to Jun 2029"
  - Privacy card (p-7): title "Privacy and data" bold 20; text 16 `muted` "Documents are encrypted and stored in the EU. Download or delete everything at any time."; buttons row (mt-8, gap 4, h-[38px], bold 15): outline "Download my data" (downloads mock JSON via Blob), outline "Log out" (→ `/`), primary "Delete account" (opens a confirm dialog that requires typing DELETE; on confirm → `/`).
- **Right:**
  - Connected accounts card (p-7): title bold 20; rows (mt-6, gap 5): title bold 17 / desc 14 `muted` + Toggle:
    - Wise — "Fees, proof of funds and payment history" — on
    - Calendar — "Deadlines and appointments added automatically" — on
  - Notifications card (`id="notifications"`, p-7): title bold 20; rows:
    - Push notifications — (no desc) — on
    - Email — "Weekly summary and urgent deadlines" — on
    - SMS for urgent deadlines — "Permit expiry and appointment day only" — off
- Sidebar profile block shows its active state on this route.

---

## 7. Data model & state

Put types in `src/data/types.ts` and seed data in `src/data/mock.ts`. Use **one React context + `useReducer`** (or Zustand if you prefer) for: tasks, documents, payments, notifications, budget, chat messages, settings toggles, sidebar collapsed. Mock "today" = **2026-10-16** (exported constant `TODAY`) — all "in N days" strings are derived from it, never hard-coded.

```ts
export type Tone = "neutral" | "danger" | "warning" | "success";

export interface Task {
  id: string;
  title: string;            // full title (To-do)
  shortTitle?: string;      // used in "Coming up" (e.g. "Request certificate")
  category: "Documents" | "Journey" | "Finances" | "Appointment" | "Personal";
  due?: string;             // ISO date
  done: boolean;
}

export type DocStatus = "missing" | "needs_update" | "to_pay" | "ready";
export interface CaseDocument {
  id: string; title: string; note: string; status: DocStatus;
  action?: "request" | "upload" | "pay";
}

export interface Payment {
  id: string; date: string; title: string; amountEur: number;
  status: "upcoming" | "paid";
}

export interface AppNotification {
  id: string; title: string; body: string; time: string;
  tone: Tone; icon: "clock" | "banknote" | "file" | "send";
  read: boolean; href: string;
}

export interface CountryOption {
  code: string;             // ISO-3166 alpha-2, drives <Flag/>
  name: string; permit: string; livingPerMonthEur: number;
}

export interface FundsCheck { code: string; label: string; requiredEur: number; }

export interface CostItem {
  id: string; label: string; unitEur: number;
  qty?: number;             // undefined = no quantity input
  checked: boolean; official: boolean;
}

export interface JourneyStage {
  id: "apply" | "arrive" | "stay" | "transition";
  label: string; sub: string; status: "done" | "current" | "future"; description: string;
}

export type ChatBlock =
  | { type: "lead"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "text"; text: string };
export interface ChatMessage { id: string; role: "user" | "assistant"; blocks: ChatBlock[]; }

export interface User {
  firstName: "Aigerim"; fullName: string; initials: string; memberSince: string;
  citizenship: { code: "KZ"; name: string }; passport: string; address: string;
  status: string; studies: string;
  permit: { label: string; daysLeft: number }; // "Study permit · 107 days"
}
```

Formatting helpers (`lib/format.ts`): `eur(n)` → "€6,240" (`Intl.NumberFormat('en-IE', {style:'currency', currency:'EUR', maximumFractionDigits:0})`), `dayMonth(iso)` → "23 Oct", `inDays(iso)` → "in 7 days", `longDate(iso)` → "FRIDAY 16 OCTOBER 2026" (uppercase in CSS, not in data).

---

## 8. Motion & interaction details

- Transitions: `transition-colors duration-150` on interactive elements; popover/dropdowns fade + 4px translate-y in 150ms; sidebar width animates 200ms.
- Respect `prefers-reduced-motion` (disable translate/scroll smoothing).
- Landing: smooth scroll for in-page CTAs; subtle fade-up on section content when it enters the viewport (once).
- Chat: auto-scroll to newest; "Thinking…" dots animate.
- Hover states: cards that are clickable (suggestion chips, country tiles, notification items, task rows) get `bg-rose-50` or a border colour shift — never shadows.

---

## 9. Responsive behaviour (not in the designs — implement sensibly)

The source is desktop-only at 1440. Treat 1440 as the "lg design" and adapt:

- **≥1440**: as specified; centre the app content with `max-w-[1072px]` if the window is wider; landing content `max-w-[1296px] mx-auto`.
- **1280–1439**: same layouts; fixed column widths become fractions (e.g. Assistant `grid-cols-[1fr_317px]` stays; Finances `grid-cols-[1.37fr_1fr]`; Visa costs `grid-cols-[1.45fr_1fr]`; To-do `grid-cols-[1fr_295px]`).
- **1024–1279**: app sidebar collapsed (80px rail, from the design). Stat cards 2×2. Two-column card rows stack where width < ~560 per column.
- **<1024**: sidebar becomes an off-canvas drawer opened from a `Menu` button in the top bar; search shrinks to an icon button that expands; all grids single column; Assistant right column moves below the chat card. Landing: header collapses to logo + Sign up + menu button (drawer with the other links); H1 `clamp(44px, 7vw, 80px)`; step cards 2×2 then 1 column; quiz card full width under the left text; country grid 2 columns; features grid single column; footer columns 2×2.
- Minimum supported width 360px, no horizontal page scroll.

---

## 10. Inconsistencies in the source designs — decisions

1. **Sidebar active state** is stuck on "Assistant" in every screen. → Active item follows the route.
2. **`04-journey-DRAFT-ignore.png`** ("My journeys" with an empty card and a "History" panel) is an earlier draft. → Build `05` ("My journey", stepper, "Documents").
3. **Quiz progress**: 6 segments but "STEP 1 OF 3". → 3 segments.
4. **Documents "4 of 8 ready"** but only 4 rows shown. → 8 docs in data, 4 visible + "Show all 8".
5. **Fonts**: the app PDF was exported with a fallback font (Arimo). → Use Onest everywhere in the app, Unbounded for the wordmark.
6. **Hero "How it works" button** is filled white in the source file but renders as an outline. → Outline (transparent, 2px white border, white text).
7. **Finances ↔ Visa costs** have no visible link between them. → Small "Visa costs and payments →" link on Finances; sidebar "Finances" stays active on both.
8. **Notification #3** uses a neutral grey tile, while its sibling in the landing page ("Ends too early") is red. → Keep it neutral as drawn.

---

## 11. Acceptance checklist

- [ ] `npm run build` and `tsc --noEmit` pass with `strict: true`; no `any`.
- [ ] At a 1440×900 viewport each screen overlays its reference PNG within a few px (positions, sizes, colours, copy). Copy is character-exact, including "·", "…", "—" and "–".
- [ ] All colours come from the theme tokens; no stock Tailwind palette colours in use.
- [ ] Unbounded and Onest load; there is no fallback-font flash on the headings (`display=swap` + preconnect).
- [ ] Derived numbers stay consistent everywhere: open-task count (sidebar badge, To-do eyebrow, progress), upcoming payments €667, calculator total €730 / €75 / €655, proof-of-funds shortfalls, "in N days".
- [ ] Interactions work: chat send + suggestions + canned replies; notifications popover (filter, mark read, mark all read, navigation, Esc/outside close); task add/complete/delete/filter; document upload/request/pay; budget edit re-ranks countries; calculator checkboxes, quantities and visa switcher; payments filter; toggles; profile edit; quiz steps 1→3→result; landing header theme switching; sidebar collapse.
- [ ] Keyboard: every control is reachable and has a visible focus ring; radiogroup arrow keys in the quiz; `Esc` closes overlays; icon-only buttons have `aria-label`s.
- [ ] Text contrast is at least 4.5:1 for body text (check `rose-300` on `ink-900` and `muted` on `rose-50`; both pass).
- [ ] Responsive down to 360px with no horizontal scroll.
