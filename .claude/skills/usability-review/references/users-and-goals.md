# Users, dimensions, and goals

## Core definitions (ISO)

- **UI** (9241-110) — all components providing information and controls to accomplish tasks.
- **Usability** (9241-11) — extent to which **specified users** achieve **specified goals**
  with **effectiveness, efficiency, satisfaction** in a **specified context of use**.
- **UX** (9241-210) — a person's **perceptions and responses** from use or anticipated use.

Usability is *designing it right*; UX is *the right design*. Good usability does not
guarantee good UX, though poor usability nearly always ruins it.

Users judge the product by its interface, not its functionality. A correct feature behind a
confusing screen reads as a broken feature.

## Why the teacher/student split matters

Dimension weight depends on the user, and DictationHub has two genuinely different ones.

**Teachers** are frequent, repetitive, high-volume users. They become application experts
quickly and stay there. Friction they meet once is friction they meet fifty times. Their
errors destroy authored content, so the cost of a mistake is high — worth a confirm, and
worth an undo.

**Students** are infrequent and novice on both the domain and the app. They arrive with no
memory of last session's state. Their errors are cheap (a wrong dictation answer is the
*point* of the exercise), so recovery must be instant and lightweight — never a modal.

Novice vs expert splits three ways: **domain**, **application**, and **feature** experience.
A teacher with a year on DictationHub is still a novice on a feature shipped yesterday, so
new features need onboarding affordances even for expert users.

**Power law of practice** (`Tₙ = T₁·n⁻ᵃ`, a ≈ 0.2–0.6): novices improve rapidly with
repetition, then plateau. What a frequent user lives with is the plateau height, not the
first-run time. Optimising the first run at the cost of the steady state is the wrong trade
for teacher flows — and the right one for student flows.

## The five dimensions and their measures

| Dimension | Ask | Measure |
|---|---|---|
| Learnability | Can a first-timer do this untold? | Time to learn |
| Efficiency | How many actions in the frequent case? | Speed on benchmark tasks |
| Memorability | Can someone returning after 2 weeks resume? | Retention after a day/week |
| Errors | How often, how bad, how recoverable? | Error rate and severity |
| Satisfaction | Would they come back? | Subjective rating |

These are measurable, not vibes. If a change claims to improve usability, name the dimension
and say what would move.

## Utility vs Usability — feature triage

Nielsen's tree: system acceptability → practical acceptability → **usefulness** →
**utility + usability**.

- **Utility** = does it do what's needed.
- **Usability** = can they actually use it.

Both are required; either alone is worthless. Before building, ask which is actually
missing. Many feature proposals are a usability problem answered with new code — the
capability already exists, users just can't find or operate it. Fixing the existing screen
is nearly always cheaper and better than adding a parallel one.

## Why UI change is expensive

UI accounts for roughly 60% of lifecycle cost (dialogue management 40%, presentation 20%),
and most of that is *modification* — made painful when UI and application logic interweave.
This is the reason the codebase separates `repositories/` (data), `hooks/` (state and
mutations), and `features/` + `components/` (presentation). Keeping new work on that seam is
what keeps the interface cheap to change.
