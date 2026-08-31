---
name: Nordic Slate
design_direction: Nordic Minimalist / Blocky Technical

colors:
  background: "#F1F5F9"
  surface: "#F8FAFC"
  surface-strong: "#FFFFFF"
  surface-muted: "#E2E8F0"

  text: "#1E293B"
  text-muted: "#475569"
  text-subtle: "#64748B"

  border: "#CBD5E1"
  divider: "#E2E8F0"
  border-strong: "#1E293B"

  primary: "#6366F1"
  primary-hover: "#4F46E5"
  on-primary: "#FFFFFF"

  disabled: "#94A3B8"

  success: "#15803D"
  warning: "#B45309"
  error: "#B91C1C"

typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.02em

  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.01em

  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.2

  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0

  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5

  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0.1em

radius:
  default: 0px

spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px

layout:
  desktop-columns: 12
  mobile-columns: 4
  max-content-width: 1280px
---

# Lumi Design System

## Brand & Style

This design system uses a **Nordic Minimalist** aesthetic with a disciplined cool-toned palette, strict geometric precision, and high information density.

The visual language combines minimalism with a technical, architectural feel. It is calm, focused, structured, and intentionally non-organic.

The interface must use a strict **0px border radius** across all standard UI elements.

The intended impression is:

- calm
- precise
- intellectually serious
- technically refined
- stable
- readable
- structured

Avoid decorative softness, excessive visual effects, and generic rounded SaaS styling.

---

## Colors

The palette is based on cool slate surfaces, deep navy text, and restrained indigo accents.

### Primary

`#6366F1`

Use for:

- primary actions
- active navigation
- selected states
- progress
- focus
- critical highlights

Use sparingly.

### Text

Primary:

`#1E293B`

Muted:

`#475569`

Subtle:

`#64748B`

### Surfaces

Base canvas:

`#F1F5F9`

Primary panel/card surface:

`#F8FAFC`

Strong surface:

`#FFFFFF`

Muted surface:

`#E2E8F0`

### Borders

Default:

`#CBD5E1`

Dividers:

`#E2E8F0`

Strong/modal outline:

`#1E293B`

### Disabled

`#94A3B8`

Do not introduce additional decorative accent colors unless they communicate semantic state.

---

## Typography

Typography uses three deliberate roles.

### Headlines

Use **Hanken Grotesk**.

Purpose:

- page titles
- course titles
- major section headings
- strong visual hierarchy

Use tight tracking and semibold/bold weights.

### Body

Use **Inter**.

Purpose:

- lesson content
- descriptions
- navigation text
- forms
- long-form reading

### Metadata & Labels

Use **JetBrains Mono** in uppercase.

Purpose:

- status labels
- compact metadata
- technical IDs
- progress labels
- category labels
- timestamps
- small technical indicators

Examples:

```text
IN PROGRESS
MODULE 04
COMPLETION
SOURCE 03
12 MIN
```

JetBrains Mono should reinforce the technical character without turning the product into a terminal interface.

---

## Layout & Spacing

Use a **Fixed Grid** on desktop and a **Fluid Grid** on mobile.

### Desktop

- 12-column grid
- maximum content width: `1280px`
- 16px gutters
- 32px outer margins where space allows

### Mobile

- 4-column fluid grid
- 16px side margins

### Baseline

Use a strict 4px spacing baseline.

Preferred spacing:

- 4px
- 8px
- 16px
- 24px
- 48px

All major edges and content blocks should align to the grid.

Container padding should primarily use:

- `16px`
- `24px`

---

## Elevation & Depth

Do not use traditional drop shadows for standard UI.

Depth is created through:

- tonal surface differences
- 1px borders
- stronger active outlines

### Base Layer

`#F1F5F9`

### Surface Layer

`#F8FAFC`

### Containers

Use:

```css
border: 1px solid #CBD5E1;
border-radius: 0;
box-shadow: none;
```

### Active / Selected

Use:

```css
border: 2px solid #6366F1;
```

or a 4px indigo left border for navigation/list selection.

### Modals

Use:

```css
border: 1px solid #1E293B;
border-radius: 0;
```

Backdrop:

```css
background: rgba(30, 41, 59, 0.20);
```

No rounded modal corners.

---

## Shapes

The shape language is strictly **Sharp**.

### Radius

`0px`

Apply this to:

- buttons
- inputs
- cards
- checkboxes
- navigation items
- modals
- dropdowns
- popovers
- chips
- tags
- progress containers
- lesson containers

No decorative rounded corners are permitted.

Circular shapes are allowed only when the component is inherently circular, such as:

- avatar
- progress ring
- status dot
- radio control

Icons should favor geometric construction and sharp terminals where practical.

---

## Components

### Buttons

Primary:

```text
Background: #6366F1
Text: #FFFFFF
Border: none
Radius: 0px
```

Secondary:

```text
Background: transparent
Text: #1E293B
Border: 1px solid #1E293B
Radius: 0px
```

Buttons should be compact and rectangular.

Avoid oversized CTA styling.

---

### Inputs

Default:

```text
Background: #FFFFFF or #F8FAFC
Border: 1px solid #CBD5E1
Radius: 0px
```

Focus:

```text
Border: 2px solid #6366F1
```

Labels may use JetBrains Mono where the technical treatment is appropriate.

---

### Cards

```text
Background: #F8FAFC
Border: 1px solid #CBD5E1
Radius: 0px
Shadow: none
```

Cards should group meaningful content.

Do not place every small element inside its own card.

---

### Chips / Tags

```text
Background: transparent or muted slate
Border: 1px solid #CBD5E1
Radius: 0px
Font: JetBrains Mono
```

Use compact uppercase labels.

---

### Lists

Separate rows with:

```text
1px solid #E2E8F0
```

Active list items use:

```text
border-left: 4px solid #6366F1;
```

Avoid pill-shaped active states.

---

### Checkboxes

```text
Radius: 0px
Border: 1px solid #CBD5E1
```

Checked state:

```text
Background: #6366F1
```

---

## Navigation

Use a persistent left sidebar on desktop.

Navigation should be compact and aligned to the grid.

Recommended hierarchy:

```text
Lumi
Technical Learning

Home
My Courses
Projects

Settings
Profile
```

Active navigation uses:

- subtle slate surface shift
- 4px indigo left border
- indigo icon/text where appropriate

Do not use rounded navigation pills.

---

## Course Overview

Course overview screens should emphasize:

- current course
- completion
- active modules
- project progress
- next action

Use hard-edged panels and large Hanken Grotesk course titles.

Use JetBrains Mono for:

- status
- completion labels
- technical metadata

Progress should be visually simple and linear.

Avoid unnecessary analytics or decorative charts.

---

## Lesson Pages

Lesson pages prioritize reading.

The main lesson column should remain narrow enough for comfortable long-form technical content.

Use:

- Hanken Grotesk for headings
- Inter for lesson text
- JetBrains Mono for code metadata, labels, and technical identifiers

Contextual source or AI panels may sit beside the lesson on large screens.

They must remain visually secondary to the learning content.

---

## Projects

Projects should use the same blocky design language.

Milestones should appear as structured rows or vertical progression items.

Do not introduce IDE-style chrome unless the product explicitly requires an embedded coding environment.

---

## Practice

Practice screens should be compact and focused.

Prioritize:

- question
- answer input
- explanation
- related concept
- progress

Use sharp containers and simple state changes.

---

## Interaction States

Every interactive component must define:

- default
- hover
- focus
- active
- selected
- disabled
- loading
- error

### Hover

Use subtle slate surface changes.

Do not add shadows.

### Focus

Use a 2px indigo border or visible focus outline.

### Selected

Use indigo borders, left rails, or text emphasis.

### Disabled

Use `#94A3B8` and remove active hover treatment.

---

## Motion

Keep motion minimal.

Use:

- subtle opacity transitions
- compact drawer transitions
- progress updates
- modal appearance/disappearance

Typical duration:

`120–180ms`

Avoid decorative movement.

---

## Design Rules

### Always

- use 0px radius
- use grid alignment
- use 1px borders
- use indigo sparingly
- use Hanken Grotesk for hierarchy
- use Inter for reading
- use JetBrains Mono for metadata
- preserve high information density
- keep surfaces flat
- prioritize clarity

### Avoid

- rounded cards
- rounded buttons
- rounded inputs
- gradients
- glassmorphism
- heavy shadows
- soft SaaS styling
- giant empty cards
- excessive whitespace
- neon AI aesthetics
- fake terminal language
- fake infrastructure terminology
- decorative dashboard metrics
- inconsistent page-specific styles

---

## Visual Target

Lumi should feel like:

**Nordic technical minimalism + hard-edged information architecture + restrained terminal-derived typography**

The product should look engineered rather than decorated.

Its identity should come from:

- sharp geometry
- slate surfaces
- indigo interaction states
- strong typography
- monospace metadata
- strict grid alignment
- dense, readable information structure
