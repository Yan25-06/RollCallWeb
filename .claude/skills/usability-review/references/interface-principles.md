# Interface principles

Four levers for good usability: **Visibility, Accessibility, Consistency, Affordances.**

## Visibility

Operations must be visible. Anything reachable only by right-click, drag-drop, hover, or a
memorised gesture is effectively invisible to a student — discoverable only by accident.

**Visibility trades against simplicity**: more visible controls means a busier screen. The
resolution is grouping and progressive disclosure, never hiding the control entirely.

## Accessibility

Four impairment classes: **visual, auditory, cognitive, mobility**.

- **7–8% of men cannot distinguish red from green** (0.4% of women). Never encode meaning by
  colour alone; pair it with an icon, underline, weight, shape, or text.
- Meaning must never ride on colour alone — attendance status, fee status and payroll state
  all currently lean on colour, so each needs a second channel.
- Icon-only controls need `aria-label`. This is an accessibility requirement, not a style one.
- Accessible design usually helps everyone (the curb-cut effect): captions help noisy rooms,
  big targets help tired hands.

## Consistency

**Similar things should work similarly. Different things should look different.**

Three kinds:
- **Internal** — within this CRM.
- **External** — matches conventions from other apps users already know.
- **Metaphorical** — matches the real-world object being referenced.

**Speak the user's language**: common words, no jargon, no internal/DB terms leaking into
labels — but not verbose either. Toàn bộ giao diện là tiếng Việt; không để thuật ngữ tiếng
Anh hay tên cột database rò ra nhãn.

Consistency is *why* the component classes in `index.css` exist. Hand-spelling utilities
instead of reusing `btn-primary` / `card` / `input` is a consistency defect, not merely a
style preference — it produces controls that look subtly different for no reason.

Follow platform and framework conventions rather than inventing. Learn from existing apps.

## Affordances and signifiers

An **affordance** is a property of a thing that shows how it is operated (a handle affords
pulling). A **signifier** is a label added to explain it ("PUSH").

> **Needing a signifier means the affordance failed.**

The canonical failure is a glass door with identical handles on both sides, requiring
PUSH/PULL signs.

In UI:
- Flat design erodes affordances. If a bordered box could be a button *or* a text field, the
  design is broken. Buttons must read as pressable and differ visibly from inputs.
- **Natural mapping** — the arrangement of controls should mirror the arrangement of what
  they control. In the weekly schedule grid, a session's position on screen must match its
  day and time — a card in Wednesday's column at 18:00 is the only correct place for that
  session.
- **Feedback** — every action needs an immediate perceivable effect (visual, audio, or
  haptic). A click with no response reads as a broken app, and the user clicks again.

## Shneiderman's Eight Golden Rules

1. Strive for consistency
2. Cater to universal usability (novice *and* expert on the same screen)
3. Offer informative feedback
4. Design dialogs to yield closure (a clear "done" state)
5. Prevent errors, enable rapid recovery
6. Permit easy reversal of actions
7. Support user control (the user drives, not the system)
8. Reduce memory load

## Mental models and metaphors

A **mental model** is the user's internal picture of how the system works, which they use to
predict what will happen next and to cope with unfamiliar situations. **A design must not
conflict with it.** The classic failure is a fridge dial that looks like a temperature
setting but actually controls a proportion between two compartments — every adjustment
produces a baffling result.

A **conceptual model** is what the designer intends the user to form. Describe it as: core
activities, objects, and interface metaphors.

**Metaphors** (folder, trash, library, deck, card) import knowledge the user already has, so
they are highly learnable and connect to an existing model instantly. Their problems:

- hard to design well
- potentially deceptive when the metaphor's real-world rules don't hold in software
- often applied inconsistently across a product
- **culturally dependent** — which matters directly for a bilingual EN/VI product

Test that a metaphor survives translation before committing to it.
