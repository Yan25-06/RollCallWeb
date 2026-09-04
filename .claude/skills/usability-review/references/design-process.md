# Design process

## Design is not art

> Design is the process of creating or shaping tools or artifacts **for direct human use**.

Four properties: it's a *process* (relies on method, not inspiration), it's *creative*, its
outputs are *things*, and it is *human-centred*.

The deck's example is a hand-made mug: beautiful as an object, and shaped so that drinking
from it pours tea down your chin. **Art is judged by how it looks; design is judged by how
it is used.** A screen that looks polished but costs an admin an extra click fifty times a
week is a failed design, however good the screenshot.

Design also means choosing **which outcome should result among infinite possibilities** —
so the job is to generate alternatives and pick, not to implement the first idea that works.

## Iterate, and make early iterations cheap

The basic loop is **Design → Implement → Evaluate → Design → …**, each cycle producing a
release whose feedback feeds the next.

The spiral refinement adds the part that matters:

- **Early cycles use cheap prototypes** — paper, sketches, quick mockups. The point is to be
  wrong cheaply.
- **Parallel prototyping** — build several alternatives at low fidelity rather than polishing
  one. Comparing options finds problems that refining a single option never surfaces.
- **Only mature later cycles reach real users.**

The cost of an iteration should rise with your confidence, not fall with your patience. In
practice here: sketch or mock a screen before building it, and try two layouts before
committing — this is far cheaper than discovering the problem after the React component,
its tests, and its i18n keys all exist.

**Why waterfall fails for UI specifically:** users aren't involved until acceptance testing,
and UI problems discovered then force changes to requirements *and* design, wasting
everything built on top. UI requirements are almost never stable enough to justify it.

## Prototyping

A prototype exists to **answer a question cheaply**. Decide the question first, then build
the least thing that answers it.

**Fidelity is not one dial — it has four:**

| Dimension | Low | High |
|---|---|---|
| **Breadth** | one screen | every screen |
| **Depth** | one path works | all paths work |
| **Look** | boxes and greeked text | real visual design |
| **Interaction** | a human moves the paper | real code responds |

Deliberately mixing them is the skill. A **horizontal** prototype covers many features
shallowly (good for testing navigation and information architecture); a **vertical**
prototype implements one feature completely (good for testing whether a hard interaction
works at all). For the weekly schedule grid, vertical; for the fees table, horizontal.

**Low-fidelity (paper) prototyping** — sketches, index cards, sticky notes, with a person
playing "the computer" by swapping pages in response to taps.

- Fast, disposable, and requires no tools.
- The decisive advantage: **testers criticise a sketch honestly.** A polished mockup makes
  people comment on colours and hold back structural objections, because it looks finished
  and expensive to change.
- The limits: it can't show timing, animation, latency, or real audio — all of which matter
  here — and it needs a facilitator.

**Computer prototypes:**
- **Storyboard** — a fixed sequence of screens showing an interaction, no real logic.
- **Form builder / mockup tool** — clickable, real-looking, no backend.
- **Wizard of Oz** — the user believes the system is doing something a human is actually
  doing behind the scenes. The classic use here would be testing an auto-generated payroll or
  fee summary by computing it by hand first, before building the calculation.

**The prototyping trap:** a high-fidelity prototype invites the question "can we just ship
this?" Prototype code is not product code — it has no error handling, no edge cases, and no
tests. Decide upfront whether you are building to *learn* (throw it away) or building to
*keep*, and say which.

## User-Centred Design (a.k.a. Participatory Design)

Iterative/spiral design plus two analyses and constant user involvement:

- **User analysis** — who uses the system.
- **Task analysis** — what they need to do.
- Users act as evaluators and consultants, occasionally co-designers.
- Evaluation is continuous, not a phase at the end.

**Advantages:** accurate information, useful suggestions, a forum to argue design decisions,
and users invested in the result.

**The trap, stated plainly by the deck:**

- Users are **not** UI designers.
- Designers **overly obey users' preferences**.
- Users have strong egos and preferences.

This is the same tension as LN01's "the user is always right, but the user is not always
right." Users are authoritative about their *problems* and unreliable about their *solutions*.
Treat a feature request as evidence of an unmet need, then design the solution yourself.

## The stage loop

**Investigate → Ideate → Prototype → Evaluate → Produce**, with evaluation looping back into
ideate and prototype rather than running once.

| Stage | Goal |
|---|---|
| Investigate | Learn about stakeholders, discover goals and needs. How is it done now? What's wanted? What's been tried? |
| Ideate | Generate lots of ideas; grasp the issues and possible solutions |
| Prototype | Produce something tangible; identify challenges; uncover subtleties |
| Evaluate | Discover problems, assess progress, determine next steps |
| Produce | Build the final thing; support and maintain it |

Apple's version is the same four circles with a scribble running back and forth through them
before anything reaches *produce* — the looping is the process, not a sign it's going badly.

**Apple's four evaluation questions** — a reusable script for reviewing any design, your own
or someone else's:

1. What do you **like** about it?
2. What do you **not like** about it?
3. What is **missing**?
4. What is **superfluous**?

Question 4 is the one people skip, and it's the one that keeps screens under the ~7-item
memory limit.

## Design principles from this deck

**Determine users' skill levels** — a three-tier refinement of the teacher/student split:

| Level | In this CRM |
|---|---|
| Novice / first-time | A teacher's first time writing a review; an admin's first payroll month |
| **Knowledgeable intermittent** | A returning student after a week — knows the app, has forgotten the specifics. **Needs memorability most.** |
| Expert / frequent | A teacher authoring daily |

The middle tier is easy to forget and describes most returning students.

**Identify tasks by frequency** — frequent / less frequent / infrequent. Frequency decides
placement: frequent actions get prime position, big targets, and shortcuts; infrequent ones
can live one level deeper. Ranking tasks this way *before* laying out a screen prevents the
common failure of giving every action equal weight.

**Choose an interaction style** deliberately — direct manipulation, menu selection, form
fill-in, command language, or natural language. Direct manipulation is the most learnable,
which is why it suits student-facing surfaces.

**Error prevention techniques:**
- Constructive, informative error messages
- Organise screens and menus *functionally*
- Always show the state of the interface
- **Correct actions** — grey out or disable what isn't currently valid, rather than allowing
  it and then complaining
- **Complete sequences** — a multi-step flow needs both *Next* and *Finish*, so a user who is
  already done isn't marched through remaining steps

**Increase automation while preserving human control.** Auto-suggestion and auto-completion
are good, *and the user must always be able to change the result.* This applies directly to
the auto-transcription of segments in `features/teacher-content` — automation proposes, the
teacher disposes, and the correction path must be as fast as accepting.
