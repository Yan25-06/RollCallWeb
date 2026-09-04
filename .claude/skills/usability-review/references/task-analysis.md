# Task analysis

**Task analysis = studying what users *do*, not what they say they want.** It is the input
to design: before laying out a screen, know the task it serves, how often it runs, and where
it currently goes wrong.

> Design the task first, then the screen. A screen designed without its task becomes a
> container for features rather than a place to get something done.

## Task vs. system

A **task** is what the user is trying to accomplish, expressed in their language and
independent of the technology: *"assign a listening lesson to my class this week."* A
**function** is what the system offers. Task analysis keeps the two from being confused —
`createAssignment()` is a function; the task includes choosing the lesson, picking students,
setting a deadline, and knowing it worked.

## Hierarchical Task Analysis (HTA)

Decompose a goal into subtasks, then into operations, and attach a **plan** describing the
order and conditions.

```
0. Assign a lesson to a class
   1. Choose the lesson
      1.1 Browse the library
      1.2 Search by title/part
   2. Choose the students
      2.1 Select whole class
      2.2 Select individuals
   3. Set the deadline
   4. Confirm and notify

Plan 0: do 1 → 2 → 3 → 4.
Plan 1: do 1.1 OR 1.2.
Plan 2: do 2.1 OR 2.2.
```

The **plan** matters as much as the hierarchy — it captures sequence, choice, and repetition.
A design that fits the hierarchy but violates the plan (forcing 3 before 1) will feel wrong
even though every function is present.

**Stopping rule (P × C):** stop decomposing when the *probability* of an error times the
*cost* of that error is acceptably low. Decompose further only where mistakes are likely and
expensive — for DictationHub, that's destructive teacher operations and anything touching
already-submitted student work, not routine browsing.

## Where the data comes from

- **Observation** — watch someone do the task; the gap between what they do and what they say
  they do is the whole point.
- **Interviews** — good for goals and frustrations, unreliable for step-by-step detail.
- **Contextual inquiry** — observe *and* ask, in the real environment.
- **Documentation and existing artefacts** — the spreadsheet a teacher currently uses to
  track assignments tells you the real data model.
- **Analytics** — what features are actually used, where people drop out.

## Personas and scenarios

A **persona** is a concrete fictional user built from real data — name, goals, context,
skill level — used to stop "the user" meaning "me". A **scenario** is a short narrative of
that persona completing a task, with no interface details:

> *Linh teaches two IELTS evening classes. On Sunday she wants to set this week's listening
> homework for both, reusing a lesson she wrote last term. She has twenty minutes before her
> next class and is working on a laptop.*

Scenarios are useful precisely because they contain no UI — they let you evaluate two
different designs against the same task. Write the scenario before the screen.

**Essential use case** — the same idea stripped to a two-column table of user intention vs.
system responsibility, again with no interface commitments:

| User intention | System responsibility |
|---|---|
| identify the lesson | offer ways to find it |
| choose recipients | show who is available |
| commit | confirm, and show it worked |

## GOMS and keystroke-level estimation

**GOMS** = Goals, Operators, Methods, Selection rules — a model for predicting how an expert
performs a task without building anything.

The practical form is **KLM (Keystroke-Level Model)**: add up rough per-operator times to
compare two designs.

| Operator | Approx. |
|---|---|
| K — keystroke | ~0.2 s |
| P — point with mouse | ~1.1 s |
| H — home hands between keyboard and mouse | ~0.4 s |
| M — mental preparation | ~1.35 s |

Two lessons that survive the crude numbers:

- **`H` is expensive.** Forcing a hand between keyboard and mouse repeatedly costs more than
  people expect — a strong argument for keyboard paths through the dictation flow and
  through repetitive teacher authoring.
- **`M` dominates.** Thinking costs more than clicking. A design with fewer clicks but more
  decisions can be *slower*. Reducing decisions beats reducing clicks.

Use KLM only to compare alternatives for **frequent, expert, repetitive** tasks. It says
nothing about learnability, and nothing useful about a student's first session.

## Applying it here

- Rank every screen's actions by task frequency before laying it out (see
  `design-process.md`).
- For teacher authoring, the tasks are repetitive and expert — model them, count the
  decisions, and cut the `M` steps.
- For student practice, the task is *the exercise itself*; the interface should disappear.
  Any interaction that isn't listening, typing, or checking is overhead.
