---
name: usability-review
description: Use when designing, reviewing, or changing any DictationHub screen, flow, dialog, form, error message, empty state, or feedback colour - and when deciding whether a proposed feature is worth building.
---

# Usability Review (DictationHub)

`CLAUDE.md` covers how the UI **looks**; this covers how it **behaves**.

**Usability = specified users achieving specified goals with effectiveness, efficiency and
satisfaction, in a specified context of use** (ISO 9241-11) — never absolute, so always ask
*usable for whom, doing what?* Design is judged by use, not by how it looks.

## First, name the user

| | **Teacher** (`/teacher/*`, `features/teacher-content`, `features/content-create`) | **Student** (`LibraryPage`, `PracticePage`, `PartPracticePage`, `student/*`) |
|---|---|---|
| Usage | Frequent, repetitive, high-volume | Infrequent, short sessions |
| Optimise for | **Efficiency** — fewest clicks, shortcuts, bulk actions, defaults | **Learnability + Memorability** — obvious affordances, visible next step |
| Error cost | High (destroys content) → confirm + undo | Low (a wrong answer) → instant cheap recovery, never a modal |

Before adding a click to a teacher flow, check it isn't friction repeated fifty times.
Before removing a label or hint from a student flow, check a first-timer can still proceed.
Don't forget the middle case: a **returning student** knows the app but has forgotten the
specifics, and needs memorability above all.

## Hard rules

1. **No meaning by colour alone.** 7–8% of men can't distinguish red from green. Correct vs.
   incorrect needs a second channel — icon, underline, weight, or text. Motion is **not** a
   valid second channel: readers with reduced motion enabled lose it entirely. Reference
   implementations: `GapSentence.jsx` (icon + weight), `AnswerHistory.jsx` and
   `ResultView.jsx` (underline + weight).
2. **No meaning by audio alone.** Keep visible state for everything the sound conveys.
3. **Every action gets immediate visible feedback**; every wait gets a progress indicator.
   No response reads as broken, and the user clicks again.
4. **Every error, empty, and loading state offers a next action.** Never a dead end.
5. **Every dialog can be dismissed** — escape, backdrop, cancel. Destructive actions are
   never default-focused, and labels state the action ("Delete lesson"), never "OK".
6. **Recognition, not recall.** Show options to pick from; never make users remember a value
   or carry state from a previous screen in their head.
7. **Controls must look like what they are** — buttons pressable, rows tappable, editable
   fields editable. Needing a label to explain a control means its design already failed.
8. **Consistent user errors are the interface's fault.** Change the interface, not the copy.
9. **Automation proposes, the user disposes.** Anything auto-generated (transcription,
   suggestions, defaults) must be editable, and correcting it as fast as accepting it.
10. **Every screen answers four questions:** where am I, where can I go, where have I been,
    what can I do now. A page absent from breadcrumb and nav is how users get lost.
11. **Convention over invention** (Jakob's Law — users spend most of their time on other
    sites). Novel navigation is a cost paid by every user; justify it or drop it.
12. **Constrain student input, not teacher input.** Constraints prevent errors, but too many
    make a frequent user slow — experts prefer typing to clicking.
13. **Every visual difference is read as meaning.** An unexplained variation in font, colour,
    weight, or spacing will be assigned significance by users. Vary only on purpose.

## Review checklist

- [ ] Named the user and optimised the dimension that matters for them
- [ ] A first-time user can proceed without instructions
- [ ] Hard rules 1–13 above all hold
- [ ] Grouping done with **whitespace and proximity** before borders (Gestalt)
- [ ] Ran the screen against Nielsen's ten (`references/evaluation.md`) — twice, overview
      then detail — logging each issue as `[heuristic] [severity 0-4] [fix difficulty]`
- [ ] Ranked this screen's actions by frequency; the frequent ones got the prime position
- [ ] Invalid actions are disabled, not merely rejected after the fact
- [ ] No screen exceeds ~7 top-level choices without grouping
- [ ] Destructive actions aren't adjacent to safe ones
- [ ] Forms: one column, labels consistent, required marked and few, validated before submit
- [ ] Interactive rows carry their signifier (chevron, drag handle, checkbox, hover state)
- [ ] Text is scannable — keywords, lists, one idea per block; links front-load the keyword
- [ ] Labels use the user's words, in both EN and VI
- [ ] Asked Apple's four: what's good, what's bad, **what's missing, what's superfluous?**
- [ ] (`CLAUDE.md`) theme tokens, component classes, lucide icons, skeletons, 375/768/1280px

## Depth

Read the relevant file when the checklist isn't enough:

| File | Covers |
|---|---|
| `references/users-and-goals.md` | ISO definitions, usability vs UX, the five dimensions and their measures, utility-vs-usability feature triage |
| `references/interface-principles.md` | Visibility, accessibility, consistency, affordances vs signifiers, Shneiderman's Eight Golden Rules, mental models, metaphors |
| `references/cognition-and-errors.md` | Memory limits, chunking, recognition vs recall, attention, error handling, dialog design |
| `references/efficiency.md` | Fitts's law, defaults, shortcuts, autocomplete, anticipation — and when *not* to apply them |
| `references/design-process.md` | Design vs art, prototyping (fidelity, paper, Wizard of Oz), user-centred design and its traps, skill levels, task frequency |
| `references/task-analysis.md` | Hierarchical task analysis, personas and scenarios, essential use cases, GOMS/KLM |
| `references/web-and-mobile-patterns.md` | Jakob's Law, the four navigation questions, information architecture, scannable text, latency, navigation/form/search/wizard patterns, mobile constraints |
| `references/visual-design.md` | Affordance vs signifier (the 2×2), visible constraints, cultural colour, Gestalt grouping, grid/alignment/white space, the seven contrast channels |
| `references/interaction-styles.md` | Menus, form fill-in, direct manipulation, command language, function keys, Q&A; and the tables matching each to user and task |
| `references/evaluation.md` | Nielsen's ten heuristics, severity ratings, how many evaluators, think-aloud vs RTA vs co-discovery, user-test procedure, analytics |

## Source

`.superpowers/ThietKeGiaoDien/` — HCMUS User Interface Design course.

Verified against the slides: **LN08, LN09, LN10, LN12, Qualitative Evaluation**.
Remaining: **Quantitative Evaluation** · **Human-AI Interaction Design**.

⚠️ **LN01–LN07 are unverified.** Those decks' images never reached the reading session
(large page ranges silently returned no content), so that material is standard HCI theory
rather than a reading of these specific slides. It is probably right in substance, but
deck-specific examples attributed to them may be wrong. Re-read those PDFs in **4–6 page
chunks** — larger ranges drop the images — and correct the affected references.

**When adding a deck:** put detail in a `references/` file grouped by *topic*, not lecture
number — nobody thinks "I need LN04 knowledge", they think "I'm designing a form". This file
holds only absolutes and the checklist; everything explanatory goes to a reference. If it
passes ~800 words, something in it belongs in a reference file instead.
