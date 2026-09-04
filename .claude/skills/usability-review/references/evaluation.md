# Evaluating the interface

Sources: **cs3240 Lecture 9 Qualitative Evaluation** (Shengdong Zhao) and **LN12 Google
Analytics & UI Evaluation Tools**. Verified against the slides.

Evaluation is the third arm of **Design → Prototype → Evaluate**, and it is the step most
often skipped in a solo project. The value of these decks is that they make evaluation cheap
enough to actually do.

## Where evaluation happens, and its trade-off

- **Naturalistic** — observe in a realistic setting, real life. Problems: hard to arrange,
  time-consuming, may not generalise.
- **Usability engineering (lab)** — the danger is that results don't transfer to real use:
  non-typical users, non-typical tasks, different physical environment, different social
  context (*"experimenter vs. boss"*). Partial solution: **use real users, task-centred
  tasks, and an environment similar to the real situation.**

For this CRM the "lab" caveat is concrete: an admin closing the month's fees calmly while you
watch is not the same admin doing it under deadline with a parent waiting on the phone.

## Discount usability evaluation

> **Low-cost methods to gather usability problems. Approximate: capture most large and many
> minor problems.**

That framing is the licence to evaluate at all — you do not need a lab or statistics to find
most of what's wrong.

- **Qualitative** — observe interactions, gather explanations; produces description:
  anecdotes, transcripts, problem areas, critical incidents. *Words.*
- **Quantitative** — count, log, measure user actions: speed, error rate, counts of
  activities. *Numbers.*

**Methods:** inspection · conceptual model extraction · direct observation (think-aloud,
constructive interaction, retrospective think-aloud) · query techniques (interviews,
questionnaires) · continuous evaluation (user feedback, field studies).

## Inspection

The designer tries the system: **does it "feel right"?** Catches major problems early, but is
**not reliable, not valid, and intuitions can be wrong.** The two structured forms are
task-centred walkthroughs and heuristic evaluation.

## Heuristic evaluation (Nielsen, 1994)

**Usability heuristics** are "rules of thumb" describing features of usable systems — usable
both as *design principles* and to *evaluate* a design.

**Pros:** easy and inexpensive; **needs no users**; catches many design flaws.
**Cons:** *"More difficult than it seems — not a simple checklist"*, and it **cannot assess
how well the interface addresses user goals.** It tells you the interface is malformed, not
that it solves the wrong problem.

### Nielsen's revised ten (H2) — the working set

Derived from a factor analysis of 249 usability problems:

| | Heuristic |
|---|---|
| **H2-1** | Visibility of system status |
| **H2-2** | Match between system and the real world |
| **H2-3** | User control and freedom |
| **H2-4** | Consistency and standards |
| **H2-5** | Error prevention |
| **H2-6** | Recognition rather than recall |
| **H2-7** | Flexibility and efficiency of use |
| **H2-8** | Aesthetic and minimalist design |
| **H2-9** | Help users recognise, diagnose, and recover from errors |
| **H2-10** | Help and documentation |

Notes the deck attaches:
- **H2-2** — *speak the users' language*. The ATM example: "X.25 connection discarded due to
  network congestion. Local limits now in effect" vs. **"Maximum withdrawal of $50 at this
  time"** — same fact, one is usable. Straight guidance for i18n strings.
- **H2-3** — *"Exits" for mistaken choices, undo, redo. Don't force down fixed paths.*
  **"Mark exits: users don't like to be trapped!"** Strategies: a Cancel button or Esc for
  every dialog (**and make the cancel button responsive**), plus universal undo.
- **H2-7** — accelerators for experts (gestures, shortcuts); let users tailor frequent actions.
- **H2-9** — the deck's counter-example is an error dialog whose only button is **"Yes"**;
  the good example (Cooper) is structured as **problem → Scope → Action → More**, with
  *Save As…* offered alongside OK. A good error message says what happened, what will happen,
  what is being done, and what the user can do instead.
- **H2-10** — help should be **easy to search, focused on the user's task, list concrete
  steps, and not be too long.**

The older H1 list is largely the same ideas, but keeps two useful phrasings: *simple and
natural dialog* and **clearly marked exits**.

### Running one

Four phases:

1. **Pre-evaluation training**
2. **Evaluation** — individuals evaluate the interface *independently*, then aggregate.
   **Go through the UI twice: overview first, then details.** Each evaluator produces a list
   of problems.
3. **Severity rating**
4. **Debriefing** — discuss outcome, suggest solutions, assess difficulty to fix. Run it as a
   brainstorm: **little criticism until the end of the session.** The development team rates
   how hard each fix is.

**Severity** = a combination of **frequency × impact × persistence** (one-time or repeating),
rated **independently by each judge, after all evaluations are in**:

| | Level |
|---|---|
| 0 | Don't agree this is a usability problem |
| 1 | Cosmetic |
| 2 | Minor |
| 3 | Major — important to fix |
| 4 | **Catastrophe — imperative to fix** |

Report findings in the deck's format — `[heuristic] [severity] [fix difficulty]` followed by
a plain description of the problem and why it confuses users:

> **1. [H2-4 Consistency] [Severity 3] [Fix 0]**
> The interface used the string "Save" on the first screen for saving the user's file, but
> used "Write file" on the second screen. Users may be confused by this different terminology
> for the same function.

That is a good template for logging UI issues in this CRM — and note the second axis: **fix
difficulty is rated separately from severity**, which is what lets you pick off severity-3
problems that cost nothing (`Fix 0`).

### How many evaluators

- **One evaluator finds only ~35% of problems.**
- **Five evaluators find ~75%.**
- More than that costs more while finding progressively less; the benefit/cost curve **peaks
  around 3–5**.

For a solo project the honest reading is that your own inspection catches roughly a third.
Getting two or three other people to run the same heuristic pass is the single cheapest
quality improvement available.

Heuristic evaluation and user testing **find different problems, so alternate between them.**
The deck's own example: inconsistent typography across screens violates H2-4 and slows users
down, but **"probably wouldn't be found by user testing."**

## Conceptual model extraction

Show the user **static images** of the prototype or screens and ask them to explain **what
each element does** and **how they would perform a task**. Captures the **initial** conceptual
model (first time) and the **formative** one (later).

**Good for** eliciting people's understanding before and after use. **Poor for** examining
exploration and learning. Cheap, needs no working build — a screenshot is enough.

## Direct observation

Evaluator watches users interacting, **in lab** (pre-determined tasks) or **in field** (normal
duties). Excellent at identifying gross design/interface problems; validity depends on how
controlled or contrived the situation is.

| Method | How | Watch out for |
|---|---|---|
| **Simple observation** | User does the task, evaluator just watches | **No insight into the user's decision process or attitude** |
| **Think-aloud** | User speaks their thoughts while working. *Most widely used method in industry* | **Unnatural and uncomfortable; hard to talk while concentrating; may alter how they do the task** |
| **Constructive interaction** | **Two people work on the task together**, monitor their normal conversation | Needs a pair |
| **Retrospective think-aloud (RTA)** | User completes the task silently, verbalises afterwards while the recording is reviewed | Higher-level verbalisation, more relaxed, **fabrication is not a problem** |

**Constructive interaction** has a variant worth knowing — **co-discovery learning**: pair a
semi-knowledgeable "coach" with a novice, and **only the novice touches the interface**; the
novice asks, the coach answers. It gives insight into two user groups at once, and the
conversation is natural in a way think-aloud is not.

**Think-aloud fits this CRM well** — both user groups work at a desk, and no task depends on
listening, so talking through it costs nothing. Use it for both roles; reserve retrospective
think-aloud for anything done under time pressure, such as closing the month's fees.

## Running a user test

**Preparing:** decide whether the objective is narrow or broad · design the tasks · decide on
video/audio · choose the setting · recruit **representative** users.

**Roles:** greeter · **facilitator** (helps users think aloud) · **observers** (record
critical incidents).

**Session shape:** greet → explain the test → collect demographics → **get signed consent** →
demo the system → run the test (~½ hour) → post-interview and questionnaire → debrief.

**Critical incidents** are the unit of observation: *unusual or interesting events during the
study.* Most are usability problems, but they also include moments when the user **got stuck**,
**suddenly understood something**, or **said "that's cool."** Positive incidents count.

## Analytics (LN12)

Analytics answers the questions observation can't scale to: **who visits, how many, where do
they go, how long do they stay, where are they from.**

Purpose, per the deck: understand users · **evaluate UI/UX** · **improve UI/UX** · validate
and improve business goals · increase conversion.

**Setup** is two calls — `create` and `send` — used for **page views** and **events** (*any
event the site needs to record: click a link, click a button, play a video*).

**Key metrics:** bounce rate · users · sessions · session duration · new vs. returning
visitors · pageviews · conversion rate.
**Dimensions:** audience (demographics, interests, geography, behaviour, **technology**,
**mobile**) · acquisition (channels, source/medium, referrals) · behaviour (**content
visited, landing pages, site speed, events**).

Two of these matter disproportionately here: **technology/mobile** tells you the real device
and browser mix your students use (the deck's own sample is dominated by Vietnamese traffic
on Chrome, Safari and **Cốc Cốc** — a browser worth testing against), and **site speed** is
the latency measure for an audio-heavy app.

**Other tools named:** Optimizely (A/B testing) · Inspectlet (screen capture, heatmaps) ·
Crazy Egg (heatmaps, points of interest) · **Mixpanel** (individual actions per user, to
process usage patterns) · feng-gui.com. Plus **eye-tracking** and **click heatmaps** — the
Guardian eye-track shows attention concentrated top-left and falling off sharply, which is
the empirical form of the attention rule in `cognition-and-errors.md`.

Analytics tells you **what** happened and never **why** — pair a funnel drop-off with an
observation session or an RTA before concluding anything.

## Applying this here

The realistic evaluation programme for a solo project:

1. **Heuristic pass** against the H2 ten, twice through (overview then detail), logging each
   problem as `[heuristic] [severity] [fix difficulty]`. Free, and catches ~35%.
2. **Recruit 2–4 more people** for the same pass when a release matters — that is where the
   35% → 75% jump lives.
3. **Conceptual model extraction** on screenshots before building a new screen.
4. **Think-aloud** with one admin on the fees flow and one teacher on the review flow.
5. Analytics is not installed and is out of scope; skip it until there is a reason.
6. Record **critical incidents**, including the positive ones.

## Not yet captured

The **cs3240 Lecture 10 Quantitative Evaluation** deck (86pp) — controlled experiments,
variables and confounds, within- vs. between-subjects design, and statistical testing — has
not been verified against its slides at the same standard as the material above. Read it in
small page ranges before relying on specifics from it.
