# Web and mobile patterns

A **UI design pattern** is a description of a recurring UI problem and its known solution.
Using them buys **external consistency**, better learnability and memorability, less design
and test time, and lower risk — you inherit a solution that already works elsewhere.

> **Jakob's Law: "Users spend most of their time on *other* sites."**
> So their expectations are formed elsewhere. Nielsen's tenth good deed is literally
> *"do the same as everybody else."* Novel navigation is a cost paid by every user, and
> the burden of proof is on the novelty.

## The web is not the desktop

The deck's central contrast, and it sets the stakes for everything below:

| Desktop app | Web app |
|---|---|
| Users are loyal | **You cannot control the user — they leave** |
| You control every pixel | You give up control to the client |
| You know the target system | It could render anywhere |
| You control where they go and when | They navigate; they may stay moments |

**People leave** if it's difficult, unclear, hard to read, unattractive, boring, unfamiliar,
or if they get lost or frustrated. That's the whole list, and most items are usability, not
features.

## Four navigation questions

Every screen must answer all four:

1. **Where am I?** — title, breadcrumb, highlighted nav item
2. **Where can I go?** — visible links and actions
3. **Where have I been?** — visited state, breadcrumb trail, progress
4. **What can I do now?** — the actions available here

DictationHub has `Breadcrumb.jsx` and `AppShell.jsx` for 1 and 3. When adding a route, check
it appears in the breadcrumb and that the nav shows the active section — an orphan page that
answers none of the four is how people get lost and leave.

Related: **hypertext's cost.** Non-linear structure lets users take their own path, but the
price is fragmented information and "where am I?" disorientation. Structure and search are
what buy it back.

## Information architecture

**Information architecture** = organising content into categories *and* building an interface
that supports those categories. The **information taxonomy** is its core: content grouped
logically so people can navigate and locate.

> **Even the best search cannot rescue a bad taxonomy.**

For DictationHub the taxonomy is the product: Test → Part → Lesson → Segment. When adding a
content type, place it in that hierarchy deliberately rather than bolting on a new top-level
concept — a taxonomy that stops matching how teachers think is the expensive kind of debt.

## Writing for the screen

**People do not read web pages — they scan them**, picking out words and sentences. Design
for scanning:

- highlight keywords
- bulleted lists over paragraphs
- **one idea per paragraph**
- straightforward, simple headlines and page titles — clever beats nothing, clear beats clever
- begin link and nav names with the **most important keyword** (front-load: "Assign lesson",
  not "Go to the page to assign a lesson")
- **link titles / informative labels** so users can decide *before* they click

## Nielsen's top mistakes still worth checking

Of the classic ten, the ones that still bite a modern SPA:

- **Bad search** — a search that fails on the obvious query is worse than none
- **Non-scannable text** — walls of prose
- **Fixed font size** — never prevent the browser from scaling text
- **Violating design conventions** — see Jakob's Law
- **Opening new browser windows** — don't hijack navigation
- **Not answering users' questions** — the page exists to answer something; make sure it does
- **Not changing visited-link colour** — destroys "where have I been?"

And from the guidelines: *avoid animation unless it has a purpose*, **never animate forever**,
limit the number of colours, keep a light background with high-contrast text, reduce scrolling
on the landing page, and always provide a Home link.

## Latency is a UI problem

Bandwidth, latency, jitter, and reliability are design constraints, not just infra ones.
Design responses:

- **Give feedback for every wait** — a progress indicator, not a frozen screen.
- **Break a large operation into small pieces** so progress is visible and partial results
  arrive early.
- **Choose media format and quality deliberately** — this is an audio-heavy app; audio
  loading is the most latency-exposed thing in it.
- Prefer skeletons that match final layout (already a `CLAUDE.md` rule) so there's no shift.

## Navigation patterns

| Pattern | Use when | Watch out for |
|---|---|---|
| **Breadcrumbs** | Deep hierarchy — where you've been, where you are, how to go back | Must reflect the real taxonomy |
| **Pagination** | Long result sets | Let users change items per page: too many = slow load, too few = slow searching |
| **Accordion** | Sections where you want one open *while still seeing the others* | Good fit for lesson/segment trees |
| **Carousel** | Many visual items, limited space | Don't auto-play forever; always pause and manual controls |
| **Fat footer** | Secondary shortcuts to frequent pages | Keep it identical on every page |
| **Tab menu** | Grouping a similar set of functions | Highlight the active tab; **icons *with* titles**, never icons alone; short titles |
| **List menu** | Long titles, subtitles, hints | **Indicate touchable items** — the chevron is the affordance |

## Forms

The deck's form guidelines, all of which apply to teacher content authoring and auth screens:

- **One column, left-aligned.** Multi-column forms break the eye's path.
- **Labels above or to the left, consistently** across the whole product.
- **Group related fields** — the ~7-item rule again.
- **Mark required fields**, and keep required fields *few*.
- **Good defaults** — the most common answer pre-filled.
- **Validate and give feedback as you go, before submit**, not only after. Validate required,
  range, length, uniqueness, confirmation, inclusion/exclusion.
- **Instant feedback on availability-style checks** (username, unique title) while typing.
- Input prompts inside the box save space — but placeholder text is *not* a label; it
  disappears exactly when the user needs it.

**In-place editor** — click a value to edit it, as Trello does with card titles. Cheap and
fast for the teacher flows, but it **must carry a signifier**: hover highlight, a pencil, a
visible affordance. An editable field that looks like static text is invisible.

**Signifiers on list items** — if a row is draggable, show a drag handle; if it's checkable,
show the checkbox; if it navigates, show the chevron. Applies directly to segment reordering
and lesson lists.

## Search

- **One prominent search field**; advanced search is secondary.
- **Show results on the same page as the criteria**, and **show the criteria with the
  results** so users can see what they asked for.
- Offer a **clear/reset** control.
- Show a **progress indicator** while searching.
- **Auto-suggest** as they type; show **recents** before they type.
- If possible, **label the submit with the result count** ("Show 544 matches") — it turns a
  blind commit into an informed one.

## Wizards / multi-step flows

For `CreateAssignmentPage` and any future multi-step teacher flow:

- **Minimise the number of steps.**
- **More than 5 steps → group them, and drop the numbers.**
- **Show the current step clearly** and label every step.
- **Let users go back and modify earlier input** without losing later input.
- Provide **Finish**, not just Next (see `design-process.md` — complete sequences).

Wizards suit **infrequent, unfamiliar** processes. Don't wizard-ify a task a teacher does
daily — that's friction repeated fifty times.

## Mobile

DictationHub is a responsive web app, not a native one, so most native-shell patterns
(springboard, gallery, metaphor navigation) don't apply. What does:

- **Constraints are real**: small screen, low resolution, **error-prone and slow text entry**,
  glare, noisy environments, interruption, and a slower connection than you develop on.
- **Bottom-of-screen controls are easier to reach** than top ones on a phone; screen edges are
  cheap targets (Fitts). Playback controls in the dictation flow benefit.
- **Text entry is the expensive operation.** Every field a student must type on a phone is a
  cost — which is the whole task in dictation, so keep *everything else* tap-only.
- **Context matters**: students practise with headphones, possibly in public, possibly
  interrupted. State must survive a backgrounded tab, and progress must never be silently lost.
- **Notifications and "invitations"** (coach marks, first-run hints, empty-state prompts) are
  how a new feature gets discovered — remember that even an expert teacher is a novice on a
  feature shipped yesterday.
