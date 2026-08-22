# Lumi — Product Design System & UI Specification

**Status:** V1 design source of truth
**Product:** Lumi Learning Engine
**Platform:** Responsive web application
**Primary target:** Desktop web
**Theme:** Light mode
**Design character:** Calm, intelligent, friendly, structured, spacious

---

# 1. Purpose

This document defines the visual and interaction system for Lumi.

It specifies:

* brand identity
* color system
* typography
* spacing
* layout
* navigation
* component styling
* interaction states
* responsive behavior
* accessibility
* lesson-content presentation
* assessment presentation
* project presentation
* generation/loading states
* mascot usage
* asset requirements
* screen-level visual rules

It should be used by developers and coding agents as the visual implementation authority.

Product scope and behavior remain governed by the product specifications and UX-flow documents.

## Source-of-truth hierarchy

When documents disagree:

1. Product specs determine **whether a feature exists and how it behaves**.
2. UX flows determine **user journey and interaction behavior**.
3. This document determines **visual presentation and reusable UI patterns**.
4. Generated mockup images provide **visual reference only**.

A screen appearing in concept art does not automatically make it a V1 feature.

---

# 2. Core Design Philosophy

Lumi should feel like a focused learning environment rather than an analytics dashboard or enterprise admin panel.

The interface should communicate:

**Clarity**
The next meaningful action should be obvious.

**Calmness**
Whitespace, restrained color, and low visual noise should reduce cognitive load.

**Progress**
Learners should consistently understand where they are, what they completed, and what comes next.

**Friendliness**
The mascot, soft geometry, subtle color, and concise language prevent the product from feeling mechanical.

**Depth without intimidation**
Complex educational material should look structured and approachable.

---

# 3. Brand Identity

## 3.1 Product name

**Lumi**

Use sentence case.

Correct:

> Lumi

Avoid:

> LUMI
> lumi
> Lumi.ai

unless branding changes later.

---

# 3.2 Brand mark

Primary identity:

* four-point sparkle/star mark
* warm golden/yellow accent
* dark navy wordmark
* rounded geometric appearance

The sparkle represents:

* discovery
* understanding
* insight
* progress

### Primary logo

Horizontal:

`[sparkle] Lumi`

Use this in:

* authentication
* desktop navigation
* marketing
* loading/generation screens

### Icon-only mark

Use the sparkle independently for:

* favicon
* compact navigation
* loaders
* AI actions
* decorative highlights

### Important implementation rule

Do **not** ship a rasterized AI-generated wordmark as the production logo.

Recreate the final logo as SVG so:

* typography remains exact
* the mark remains sharp at every size
* dark/light variants are controllable
* accessibility and layout are predictable

---

# 4. Mascot

Lumi uses a small lavender companion character.

## Personality

The mascot should feel:

* curious
* gentle
* encouraging
* intelligent
* slightly playful

It should never behave like a cartoon character constantly demanding attention.

## Visual characteristics

* rounded blob-like body
* pale lavender body
* deep violet feet/hands
* dark navy/violet eyes
* soft pink/lavender cheeks
* minimal facial features
* soft lighting
* subtle dimensionality

Avoid:

* human clothing
* exaggerated facial animation
* excessive accessories
* realistic fur/textures
* hard outlines
* loud expressions

---

# 5. Mascot Pose Library

The production asset set should contain at least:

### `mascot-neutral`

Standing, relaxed.

Use for:

* onboarding
* empty states
* general product illustration

### `mascot-wave`

One hand raised toward a small golden sparkle.

Use for:

* welcome
* course creation
* dashboard encouragement

### `mascot-study`

Sitting with notebook/book.

Use for:

* lesson-related screens
* loading
* educational empty states

### `mascot-celebrate`

Arms raised with restrained confetti.

Use for:

* lesson completion
* assessment completion
* milestones

### `mascot-help`

Small gesture toward a sparkle or information element.

Use for:

* chat
* hint states
* contextual assistance

### `mascot-thinking`

Subtle contemplative pose.

Use for:

* research
* course generation
* AI processing

## Asset format

Production mascot assets:

* transparent background
* PNG or WebP
* source size ≥ 2048 × 2048
* rendered display sizes normally between 64 and 320px

Do not place white-background mascot images directly over UI surfaces.

---

# 6. Color System

Color should remain restrained.

Most of the interface should consist of:

* white
* off-white
* navy
* slate
* lavender

Purple communicates interaction and progress.

Gold communicates delight or insight.

Semantic colors should only communicate state.

---

## 6.1 Primary palette

| Token         |     Value | Purpose                     |
| ------------- | --------: | --------------------------- |
| `primary-50`  | `#F5F3FF` | selected backgrounds        |
| `primary-100` | `#EDE9FE` | decorative surfaces         |
| `primary-200` | `#DDD6FE` | borders/highlights          |
| `primary-300` | `#C4B5FD` | subtle illustration accents |
| `primary-400` | `#8B7CFB` | supporting violet           |
| `primary-500` | `#6366F1` | primary brand               |
| `primary-600` | `#4F46E5` | primary controls            |
| `primary-700` | `#4338CA` | pressed/active              |
| `primary-800` | `#3730A3` | dark accent                 |

Primary interaction color:

**`#4F46E5`**

---

## 6.2 Brand accent

| Token      |     Value |
| ---------- | --------: |
| `gold-400` | `#FBBF24` |
| `gold-500` | `#F59E0B` |

Gold is reserved for:

* sparkle identity
* achievement highlights
* small decorative moments
* mascot interactions

Do not use gold as the primary button color.

---

# 6.3 Neutral palette

| Token       |     Value |
| ----------- | --------: |
| `ink`       | `#0F172A` |
| `slate-700` | `#334155` |
| `slate-600` | `#475569` |
| `slate-500` | `#64748B` |
| `slate-400` | `#94A3B8` |
| `slate-300` | `#CBD5E1` |
| `slate-200` | `#E2E8F0` |
| `slate-100` | `#F1F5F9` |
| `slate-50`  | `#F8FAFC` |
| `white`     | `#FFFFFF` |

Default text:

`#0F172A`

Secondary text:

`#475569`

Muted text:

`#64748B`

Standard border:

`#E2E8F0`

---

# 6.4 Semantic colors

### Success

* primary: `#16A34A`
* background: `#F0FDF4`
* border: `#BBF7D0`

### Warning

* primary: `#D97706`
* background: `#FFFBEB`
* border: `#FDE68A`

### Error

* primary: `#DC2626`
* background: `#FEF2F2`
* border: `#FECACA`

### Information

* primary: `#2563EB`
* background: `#EFF6FF`
* border: `#BFDBFE`

---

# 6.5 Gradient

Gradients are allowed only in a small number of high-emphasis elements.

Primary CTA:

`#4F46E5 → #6366F1`

Direction:

135° or horizontal depending on component.

Use gradients for:

* primary CTA
* limited progress emphasis
* marketing illustration
* mascot/art assets

Do not use gradients for:

* ordinary cards
* page backgrounds
* navigation
* forms
* tables

---

# 7. Typography

## Font

**Inter**

Fallback:

`Inter, ui-sans-serif, system-ui, sans-serif`

Weights:

* 400 Regular
* 500 Medium
* 600 Semi Bold
* 700 Bold

Avoid 800/900 except marketing headlines if necessary.

---

# 7.1 Type Scale

## Display

**40px / 48px / 700**

Marketing hero only.

## Page title

**32px / 40px / 700**

Examples:

* Machine Learning
* Your Learning Progress
* Create New Course

## H1

**28px / 36px / 700**

## H2

**24px / 32px / 600**

## H3

**20px / 28px / 600**

## H4

**18px / 26px / 600**

## Body Large

**16px / 26px / 400**

Important explanatory copy.

## Body

**14px / 22px / 400**

Default application text.

## Small

**13px / 20px / 400**

Metadata.

## Caption

**12px / 16px / 500**

Badges, timestamps, supporting labels.

---

# 7.2 Educational Reading Typography

Lesson content should be more readable than ordinary app chrome.

Lesson paragraph:

**17px / 29px**

Maximum reading width:

**720–760px**

Avoid full-width prose.

Code:

* 14–15px
* monospace
* 1.6 line height

Long lessons must use meaningful section headings.

---

# 8. Spacing System

Base grid:

**8px**

Allowed primary spacing values:

* 4
* 8
* 12
* 16
* 24
* 32
* 40
* 48
* 64
* 80
* 96

Prefer multiples of 8.

4px and 12px are allowed for compact internal alignment.

---

# 9. Border Radius

| Token         | Radius |
| ------------- | -----: |
| `radius-xs`   |    6px |
| `radius-sm`   |    8px |
| `radius-md`   |   12px |
| `radius-lg`   |   16px |
| `radius-xl`   |   20px |
| `radius-2xl`  |   24px |
| `radius-full` | 9999px |

Default cards:

**16px**

Buttons:

**10–12px**

Inputs:

**10–12px**

Pills:

full radius.

Do not make every component pill-shaped.

---

# 10. Borders and Elevation

The product should rely on borders and spacing more than shadows.

## Default card

```text
background: white
border: 1px solid #E2E8F0
shadow: none or extremely subtle
```

## Elevated card

```text
0 4px 16px rgba(15, 23, 42, 0.06)
```

## Floating panel/modal

```text
0 16px 40px rgba(15, 23, 42, 0.10)
```

Heavy shadows are prohibited.

---

# 11. Application Background

Main application background:

`#FCFCFE` or white.

Sidebar:

`#FFFFFF`

Cards:

`#FFFFFF`

Subtle selected surfaces:

`#F5F3FF`

Avoid gray dashboard backgrounds filled with independent cards.

---

# 12. Desktop Application Shell

Canonical desktop application layout:

```text
┌──────────────┬────────────────────────────────────┐
│              │                                    │
│   Sidebar    │             Main Content           │
│              │                                    │
│   232px      │                                    │
│              │                                    │
└──────────────┴────────────────────────────────────┘
```

Sidebar width:

**232px**

Main page padding:

**32px**

Large screens:

maximum useful content width around **1280px**.

The sidebar remains visually quiet.

---

# 13. Sidebar

## Logo area

Top padding:

24–32px.

Logo height:

28–32px.

## Navigation item

Height:

44px

Radius:

10–12px

Horizontal padding:

12–16px

Gap between icon and label:

12px

Icon:

20px

### Default

* transparent background
* slate text

### Hover

* `#F8FAFC`

### Active

* `#F5F3FF`
* primary icon/text

Avoid heavy left borders.

---

# 14. V1 Navigation Scope

Navigation must follow actual product scope.

Concept images include additional items for visual exploration. They must not automatically be implemented.

Do **not** add these solely because they appear in mockups:

* email/password login
* marketplace-style global course discovery
* calendar
* arbitrary new-project creation
* generic account/profile suite
* billing
* achievements
* social features

The existing product specifications remain authoritative.

---

# 15. Iconography

Use a consistent outline icon library.

Recommended:

**Lucide**

Default:

* 20px
* 1.75–2px stroke
* rounded line endings

Common icons:

* Home
* BookOpen
* Folder
* ChartNoAxesCombined
* Bookmark
* Notebook
* Settings
* CircleHelp
* Search
* Sparkles
* Clock
* Check
* Lock
* ChevronRight
* ArrowLeft
* MessageCircle

Avoid mixing filled icons and outline icons without a semantic reason.

---

# 16. Buttons

## Primary

Height:

44px

Padding:

16–20px horizontal

Radius:

10px

Background:

primary gradient or `primary-600`

Text:

white, 14px/600

### Hover

Slightly darker.

### Active

`primary-700`

### Focus

2px primary focus ring with 2px offset.

### Disabled

* reduced contrast
* no shadow
* pointer disabled

---

# 16.1 Secondary

White background.

Border:

`#CBD5E1`

Text:

`#334155`

Hover:

`#F8FAFC`

---

# 16.2 Ghost

No border.

Transparent background.

Use for low-emphasis actions.

---

# 16.3 Destructive

Use semantic red.

Never use destructive styling for ordinary cancellation/navigation.

---

# 17. Inputs

Default height:

**44–48px**

Radius:

10px

Border:

`#CBD5E1`

Background:

white

Text:

`#0F172A`

Placeholder:

`#94A3B8`

## Focus

Border:

`#6366F1`

Ring:

2px `rgba(99,102,241,0.15)`

## Error

Border:

`#EF4444`

Error text immediately below.

## Textarea

Minimum 96px high.

Resize vertically where appropriate.

---

# 18. Cards

Cards should represent meaningful grouped information.

Avoid turning every line of information into a separate card.

## Standard card

* white
* 1px border
* 16px radius
* 20–24px internal padding

## Interactive card

Add:

* hover border shift
* subtle background change
* cursor pointer

Do not translate cards upward on hover.

---

# 19. Status Badges

Badges should use subtle tinted backgrounds.

Examples:

### Ready / Complete

Green.

### In Progress

Lavender / primary.

### Pending

Neutral gray.

### Generating

Primary tint + optional small spinner.

### Failed

Red.

### Locked

Neutral.

Never communicate status using color alone.

Always include text or icon.

---

# 20. Progress Indicators

## Linear

Height:

6px

Background:

`#EDE9FE` or `#F1F5F9`

Fill:

`#4F46E5`

Radius:

full.

## Circular

Use only for major aggregate progress.

Avoid multiple circular charts on one screen.

---

# 21. Tabs

Tabs should be text-first.

Examples:

* Overview
* Lessons
* Projects
* Assessments
* Notes

Active:

* primary text
* 2px underline

Inactive:

slate text.

Avoid pill tabs for primary page navigation.

---

# 22. Page Header Pattern

Typical screen:

```text
Page title
Short supporting description

[primary content]
```

If actions exist:

```text
Page title                         Primary Action
Supporting text
```

Keep headers simple.

---

# 23. Dashboard / Home

The home screen is primarily a **resume surface**.

Priority order:

1. Continue current learning
2. active course status
3. recent progress
4. other owned courses

Do not turn Home into an analytics product.

Recommended desktop arrangement:

```text
Welcome heading

[ Continue Learning                    ]

[ Recently active / owned courses      ]
```

Small statistics may appear if useful, but the resume action remains dominant.

---

# 24. Authentication

V1 authentication is **Google OAuth only**.

The production V1 authentication screen should therefore contain:

* Lumi branding
* short product proposition
* mascot illustration
* Continue with Google button

Do not implement the email/password fields shown in exploratory mockups unless product scope changes.

---

# 25. Create Course Screen

Route:

`/courses/new`

This screen should remain extremely focused.

## Header

**Create a new course**

Supporting text:

> Tell Lumi what you want to learn.

## Required controls

* topic input
* goal/depth preference
* Create / Generate Learning Path CTA

Only expose controls supported by the product spec.

Do not add speculative settings merely to make the page visually richer.

---

# 26. Course Generation Screen

Generation should feel active and informative rather than blocked.

Possible stages:

1. Understanding topic
2. Researching sources
3. Structuring curriculum
4. Generating lessons
5. Preparing assessments/projects

Use a vertical or horizontal progress timeline.

Ready lessons should become available immediately when product behavior allows.

## Visual rules

* do not show raw worker/job terminology
* do not expose queue internals
* use educational language
* indicate partial availability clearly
* failed items show retry affordance
* usable content remains usable

Mascot thinking/study pose may appear here.

---

# 27. Course Overview / Roadmap

The course header includes:

* title
* short description
* level
* expected duration if known
* overall progress
* primary Continue action

Below:

* Overview
* Lessons
* Projects
* Assessments
* Notes

The roadmap should clearly communicate sequencing.

Example:

```text
1  Foundations          Complete
2  Core Concepts        In Progress
3  Advanced Topics      Not Started
4  Real World           Locked
```

Avoid excessive statistics.

---

# 28. Lesson List

Group lessons under modules.

Expanded module:

```text
Foundations

1  What is Machine Learning?       20 min    Done
2  Data in Machine Learning        25 min    Done
3  Train / Validation / Test       18 min    Done
4  Bias & Variance                 22 min    Done
5  Model Evaluation                26 min    In Progress
6  Overfitting                     24 min    Locked
```

Current lesson should have a subtle lavender background.

Completed lessons use restrained green indicators.

Locked items remain readable.

---

# 29. Lesson Reading Layout

Desktop lesson view may use:

```text
┌────────────┬─────────────────────────────┬───────────┐
│ Lesson TOC │       Lesson Content        │ Support   │
│  180–220px │         680–760px           │ 260–300px │
└────────────┴─────────────────────────────┴───────────┘
```

The main reading column remains dominant.

Supporting rail may contain:

* notes
* bookmarks
* key takeaway
* citations
* lesson chat entry point

The support rail must never visually overpower lesson content.

---

# 30. Lesson Content Blocks

Supported visual block types:

## Heading

Strong spacing before.

## Paragraph

17px comfortable reading size.

## Bulleted / numbered list

Normal prose spacing.

## Code

Neutral dark or lightly tinted code surface.

Do not use excessive syntax decoration.

## Callout

Use subtle background with semantic icon.

Types:

* note
* important
* warning
* example

## Diagram

Centered with comfortable margin.

## Mermaid

Rendered into the design system rather than displayed as raw syntax.

## Image

Maximum width of reading column.

Include caption/source where relevant.

---

# 31. Lesson Navigation

Bottom of lesson:

```text
← Previous                Lesson Progress          Next →
```

On narrow screens:

stack logically.

Do not require returning to the roadmap after every section.

---

# 32. Assessment

One question per screen.

Structure:

```text
Assessment title

Question 4 of 10      progress       timer if required

Question

[ Answer A ]
[ Answer B ]
[ Answer C ]
[ Answer D ]

Previous                               Next
```

A compact navigator may appear on desktop.

Avoid visually resembling standardized-test software.

---

# 33. Assessment Feedback

MCQ may display immediate correctness feedback where specified.

Correct:

* green border/tint
* check icon
* concise explanation

Incorrect:

* red tint
* explanation
* correct concept reference if appropriate

No exaggerated celebratory animation after every answer.

---

# 34. Assessment Completion

Completion state should show:

* score
* concepts understood
* weak concepts
* recommended next action

Mascot celebration may appear.

Primary action:

**Continue Learning**

Secondary:

review answers / return to course.

---

# 35. Guided Project

Project UI remains educational.

It is not an IDE.

Desktop layout should prioritize:

* active milestone
* problem/context
* requirements
* relevant resources
* progressive hints
* completion action

No:

* embedded terminal
* code editor
* repository browser
* upload pane

unless later product scope explicitly adds them.

---

# 36. Project Progress

Display project milestones sequentially.

Example:

```text
✓ Collect and prepare data
✓ Build baseline model
✓ Evaluate performance
○ Explain results
○ Final reflection
```

Only the current step should receive strong emphasis.

---

# 37. Course Chat

Course chat uses the same visual language as lesson content.

Messages should have low visual chrome.

User:

subtle primary-tinted bubble.

Lumi:

white or neutral surface.

Citations:

small chips below response.

Chat should feel like an educational assistant, not a social messenger.

---

# 38. Lesson Chat Panel

Lesson chat may open as:

* desktop side panel
* tablet drawer
* mobile full-screen sheet

Context should be obvious:

> Ask about this lesson

Do not permanently shrink the lesson reading column unless sufficient width exists.

---

# 39. Notes and Bookmarks

Notes remain contextual to learning.

Lesson bookmark:

simple icon action.

Notes:

* editable text
* auto-save or explicit save depending implementation
* rehydrate on lesson reopen

Avoid creating a complex note-taking product in V1.

---

# 40. Empty States

Empty states require:

1. concise explanation
2. one useful next action
3. optional mascot

Example:

> No courses yet
> Create your first course and Lumi will research and structure a learning path for you.

CTA:

**Create course**

---

# 41. Loading States

Prefer skeletons for ordinary data loading.

Use Lumi mascot only for meaningful longer processes such as:

* researching
* curriculum generation
* lesson generation

Avoid mascot animations on every page transition.

---

# 42. Errors

Error states should answer:

1. What failed?
2. What remains available?
3. What can the user do?

Example:

> This lesson couldn't be generated.

> Other ready lessons are still available.

`Retry lesson`

Avoid:

> Something went wrong.

when a more specific explanation is known.

---

# 43. Toasts

Use toast notifications only for lightweight confirmation.

Examples:

* Note saved
* Bookmark added
* Retry started

Do not use toasts for major failure states requiring action.

---

# 44. Modal Usage

Use modals sparingly.

Acceptable:

* destructive confirmation
* compact success state
* small focused action

Major workflows should have dedicated screens.

---

# 45. Responsive System

## Desktop

`≥ 1200px`

* full sidebar
* multi-column lesson layouts
* side panels available

## Tablet

`768–1199px`

* reduced sidebar or navigation drawer
* 24px page padding
* secondary rails become drawers/panels

## Mobile

`< 768px`

* single column
* 16px page padding
* no persistent desktop sidebar
* bottom nav or drawer
* cards stack
* tables become lists
* support panels become full-screen sheets

---

# 46. Mobile Touch Rules

Minimum interactive target:

**44 × 44px**

Spacing between adjacent important targets:

at least 8px.

Avoid tiny icon-only actions.

---

# 47. Motion

Motion should explain state.

Standard durations:

* hover: 120–150ms
* small transition: 180ms
* panel/dialog: 200–250ms
* progress transition: 250–400ms

Easing:

`ease-out`

Avoid:

* bouncing
* constant floating
* parallax
* dramatic page transitions

Respect:

`prefers-reduced-motion`.

---

# 48. Accessibility

Target:

**WCAG 2.1 AA minimum**

Requirements:

* keyboard accessible controls
* visible focus states
* semantic headings
* associated input labels
* error descriptions connected to fields
* meaningful alt text
* status never communicated only by color
* contrast ≥ 4.5:1 for ordinary text
* contrast ≥ 3:1 for large text/UI where applicable
* charts include labels/legends
* interactive targets ≥ 44px where practical
* content remains usable at 200% zoom
* reduced-motion support

---

# 49. Focus Style

Canonical focus:

```text
2px #6366F1 ring
2px white/background offset
```

Do not remove browser focus without replacing it.

---

# 50. Data Visualization

Charts should be rare.

The product teaches; it does not need analytics visualization everywhere.

When charts are used:

* primary violet
* one or two supporting colors
* no rainbow palettes
* visible axis labels
* direct labels when possible
* no decorative 3D charts

---

# 51. Illustration Style

Lumi illustrations use:

* soft 3D forms
* pale lavender
* white backgrounds
* gentle shadows
* sparse plants/books/sparkles
* rounded geometry

Illustrations should support whitespace rather than fill it.

---

# 52. Asset Production Requirements

## Logo

Create:

* `logo-horizontal.svg`
* `logo-horizontal-dark.svg`
* `logo-mark.svg`
* `favicon.svg`

## Mascot

Create transparent:

* `mascot-neutral.webp`
* `mascot-wave.webp`
* `mascot-study.webp`
* `mascot-thinking.webp`
* `mascot-celebrate.webp`
* `mascot-help.webp`

Recommended:

2048px master assets.

## App icon

Create:

* 1024 × 1024 master
* favicon variants
* PWA icons if required

## UI icons

Use vector library icons.

Do not generate separate raster icons for ordinary navigation.

---

# 53. Do Not Ship Directly From Generated Mockups

Generated images are design references.

They may contain:

* inaccurate text
* inconsistent icons
* speculative features
* inconsistent spacing
* slightly different logo variants
* impossible UI details

Developers should reconstruct screens using this design system rather than slicing screenshots into the product.

---

# 54. Canonical Visual Language

A Lumi screen should usually contain:

* white/off-white background
* dark navy text
* thin gray border
* 12–16px radius
* substantial whitespace
* one primary purple action
* subtle lavender selected state
* occasional gold sparkle
* limited semantic green/red
* minimal shadow

If a screen contains five competing colors, numerous gradients, many elevated cards, and several equally prominent CTAs, it has drifted from the system.

---

# 55. Density Rules

Avoid:

* dashboards with 15+ independent cards
* unnecessary statistics
* multiple primary actions
* excessive badges
* tiny metadata everywhere
* decorative panels
* widgets with no learner action

Prefer:

* one dominant task
* one strong section
* 2–4 supporting groups
* progressive disclosure

---

# 56. Copy Style

UI copy should be:

* short
* concrete
* calm
* human
* educational

Preferred:

> Researching reliable sources…

Avoid:

> Lumi's advanced AI engine is intelligently analyzing the internet to curate the best possible resources!

Preferred:

> This lesson is ready.

Avoid:

> Amazing! Lumi has successfully generated your incredible personalized lesson!

---

# 57. Primary Screen Inventory

The design system must support these canonical product surfaces:

1. Google authentication
2. Home / My Courses
3. Create Course
4. Course generation
5. Course roadmap / overview
6. Lesson list
7. Lesson content
8. Lesson support/chat panel
9. Assessment
10. Assessment result
11. Guided project
12. Course chat
13. Notes/bookmarks states
14. Failure/retry states
15. Resume states

Additional screens should be introduced only when supported by product scope.

---

# 58. Desktop Reference Dimensions

Mockups should primarily be designed and reviewed at:

**1440 × 960**

or

**1440 × 1024**

Implementation must remain fluid rather than fixed to those dimensions.

---

# 59. Component Reuse Rule

Before implementing a new UI primitive, check whether an existing component can express it.

Canonical reusable families:

* `AppShell`
* `Sidebar`
* `PageHeader`
* `Button`
* `IconButton`
* `Input`
* `Textarea`
* `Select`
* `Card`
* `StatusBadge`
* `ProgressBar`
* `Tabs`
* `CourseCard`
* `ModuleRow`
* `LessonRow`
* `LessonBlock`
* `Callout`
* `AssessmentOption`
* `ProjectMilestone`
* `ChatMessage`
* `CitationChip`
* `NotePanel`
* `EmptyState`
* `ErrorState`
* `GenerationTimeline`
* `MascotIllustration`

Agents should not invent page-specific copies of these components.

---

# 60. Final Visual Acceptance Checklist

Before declaring a screen complete:

* [ ] One dominant task is visually obvious.
* [ ] Typography uses the defined scale.
* [ ] Inter is used consistently.
* [ ] Spacing follows the 8px grid.
* [ ] Standard cards use 16px radius.
* [ ] Borders are subtle.
* [ ] Shadows are restrained.
* [ ] Primary action uses Lumi purple.
* [ ] Gold is used only as an accent.
* [ ] Semantic colors communicate actual status.
* [ ] No unsupported feature was introduced from concept art.
* [ ] The screen works with keyboard navigation.
* [ ] Focus states are visible.
* [ ] Text contrast meets AA.
* [ ] Mobile layout remains usable.
* [ ] Long text has comfortable line length.
* [ ] Async states are represented.
* [ ] Error/retry states exist where required.
* [ ] Reusable components are used instead of page-specific duplicates.
* [ ] Mascot use is restrained.
* [ ] The final interface still feels calm and focused.

---

# 61. Design Summary

Lumi's visual identity is built from a small number of recognizable elements:

**Dark navy typography** gives the product seriousness and readability.

**Purple interaction states** provide continuity and clear hierarchy.

**Lavender surfaces** soften the experience without overwhelming it.

**Golden sparkles** represent insight and discovery.

**The Lumi mascot** adds personality at meaningful moments.

**Large amounts of whitespace** keep complex educational material understandable.

**Sequential interaction patterns** keep learners focused on what to do next.

The finished product should feel sophisticated enough for serious technical learning while remaining approachable enough for someone encountering a difficult subject for the first time.
