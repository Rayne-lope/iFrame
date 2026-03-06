# iFrame UI/UX Style Guide

## 1) Design Direction

- Product vibe: cinematic, premium, immersive streaming interface
- Visual character: dark glass surfaces with warm gold highlights
- Tone: bold, high-contrast, content-first, minimal clutter

## 2) Design Tokens

### Color System

| Token | Value | Usage |
| --- | --- | --- |
| `--bg` | `rgb(10, 10, 10)` | Main app background |
| `--bg2` | `rgb(14, 14, 14)` | Secondary dark surface |
| `--foreground` | `rgb(235, 235, 235)` | Primary text |
| `--primary` | `rgb(243, 188, 22)` | Accent and CTA |
| `--primary-dim` | `rgba(243, 188, 22, 0.18)` | Soft accent backgrounds |
| `--primary-glow` | `rgba(243, 188, 22, 0.08)` | Ambient glow support |
| `--muted` | `rgb(153, 153, 153)` | Secondary text |
| `--border` | `rgba(255, 255, 255, 0.07)` | Base borders |
| `--border-strong` | `rgba(255, 255, 255, 0.13)` | Hover/active borders |
| `--glass` | `rgba(255, 255, 255, 0.04)` | Frosted UI surface |
| `--glass-hover` | `rgba(255, 255, 255, 0.07)` | Hover state on glass |
| `--glass-card` | `rgba(20, 20, 20, 0.6)` | Card background |

### Typography

- Display font: `Bricolage Grotesque`
- Body font: `Plus Jakarta Sans`

Usage intent:

- Display font for logo, hero title, section titles
- Body font for metadata, descriptions, controls, and utility text

### Effects

- Blur strong: `blur(24px) saturate(180%)`
- Blur small: `blur(12px) saturate(160%)`
- Standard transitions: `0.2s` to `0.3s`
- Movement curve: `cubic-bezier(0.22, 1, 0.36, 1)`

## 3) Layout Rules

- Main horizontal gutter: `2.5rem` desktop, tighter on tablet/mobile
- Navbar: fixed top, `60px` height (`56px` on very small screens)
- Section spacing: `32px` top, `40px` bottom
- Divider: 1px gradient line centered in content width

## 4) Component Guidelines

### Navbar

- Structure: logo (left), segmented tabs (center), utility actions (right)
- Surface: translucent dark glass with border and backdrop blur
- Behavior: background opacity increases after scroll threshold (`> 60px`)
- Search: pill input expands on focus

### Hero

- Full viewport presentation (`100svh`) with cinematic backdrop
- Two overlays: vertical vignette and left-to-right contrast gradient
- Hero content aligned bottom-left with max width for readability
- Right-side vertical thumbnail rail for featured browsing

### Genre Chips

- Horizontal scroll list, hidden scrollbar
- Inactive chips use glass styling
- Active chip uses solid `--primary` with dark text

### Content Cards

#### Continue Watching Card

- Format: landscape (`16:9`) with progress bar
- Hover: image darken, slight zoom, floating play action

#### Poster Card

- Format: portrait (`2:3`)
- Includes score badge and optional rank badge
- Hover: lift, border glow, metadata overlay with quick actions

#### Featured Grid Card

- Format: landscape and grid based
- Hover: reveal center play button and deepen image contrast

### Footer

- Minimal, separated by top border
- Left: brand mark
- Right: legal/credit text

## 5) Motion and Interaction

- Background slow zoom animation in hero
- Content entrance rise animation on hero copy
- Pulse animation on trending indicator dot
- Hover feedback should be immediate and subtle (scale, opacity, glow)
- Respect reduced-motion preferences by disabling non-essential animation

## 6) Responsive Behavior

- Hide center nav tabs on smaller widths
- Hide hero thumbnail rail on tablet/mobile
- Featured grid: 4 columns desktop, 2 columns tablet, 1 column mobile
- Footer stacks vertically on narrow viewports
- Keep cards horizontally scrollable for dense media rows

## 7) Accessibility Baseline

- Ensure text contrast remains legible on image overlays
- Interactive controls need visible hover/focus states
- Use meaningful `alt` text for media posters/backdrops
- Provide reduced motion support (`prefers-reduced-motion`)
- Keep tap targets at practical mobile sizes (about 32px+)

## 8) Content and Language Style

- Primary language can mix Indonesian and English labels
- Short CTA labels are preferred (`Tonton Sekarang`, `Info Lebih Lanjut`)
- Metadata should stay compact (`year`, `genre`, `rating`, `duration`)

## 9) Implementation Notes

- Keep all Home-page styling scoped to the Home container class
- Reuse token variables for consistency across sections
- Preserve visual hierarchy: Hero -> Genre chips -> Rows -> Footer
- Do not replace gold accent with unrelated brand colors
