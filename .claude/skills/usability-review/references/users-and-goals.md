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

## Why the admin/teacher split matters

Dimension weight depends on the user, and this CRM has two genuinely different ones.

**Admins** are frequent, repetitive, high-volume users. They become application experts
quickly and stay there. Friction they meet once is friction they meet fifty times. Their
errors touch money and permissions, so the cost of a mistake is high — worth a confirm, and
worth an undo.

**Teachers** use the app in bursts after teaching, days apart. They arrive having forgotten
the specifics of where things are, so memorability matters more than raw speed. Their errors
— a wrong attendance mark, a mistyped score — are cheap to fix, so recovery must be in place
and lightweight, never a modal.

Novice vs expert splits three ways: **domain**, **application**, and **feature** experience.
An admin with a year on this app is still a novice on a feature shipped yesterday, so new
features need onboarding affordances even for expert users.

**Power law of practice** (`Tₙ = T₁·n⁻ᵃ`, a ≈ 0.2–0.6): novices improve rapidly with
repetition, then plateau. What a frequent user lives with is the plateau height, not the
first-run time. Optimising the first run at the cost of the steady state is the wrong trade
for admin flows — and the right one for teacher flows.

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
This is the reason this codebase separates `services/` (Supabase data access), `hooks/`
(auth and permissions state), and `pages/` + `components/` (presentation). Keeping new work
on that seam is what keeps the interface cheap to change.
