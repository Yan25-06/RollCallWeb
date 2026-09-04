# Efficiency

Mostly teacher-facing: these techniques pay off on tasks repeated many times, and are
usually *not* worth adding friction to a student's first-run experience to achieve.

## Fitts's law

Time to move to a target of size `S` at distance `D`:

```
T = a + b · log(D/S + 1)
```

`log(D/S + 1)` is the **index of difficulty**. Time falls as targets get bigger and rises as
they get further away — logarithmically, so the wins come from big moves in size or distance,
not small tweaks.

Practical consequences:

- Make **frequently-used targets big**. This is why `min-h-11` exists on the `btn-*` classes.
- **Group targets used together**, so travel between them is short.
- **Screen edges and corners are effectively infinite in size** — the pointer stops there —
  so they are the cheapest places to hit. Sticky headers, sidebars, and bottom bars exploit this.
- **Avoid long linear menus and deep nested dropdowns.** Every nesting level multiplies travel
  and adds a chance of sliding off the path and losing the whole menu. This is the failure the
  deck illustrates with cascading `Nav Link → Sub Nav Link → Sub Sub Nav Link` menus, and part
  of why the Office ribbon replaced deep menus.

## Techniques, in rough order of value here

- **Good defaults** — pre-select the most common choice so the frequent case is zero decisions.
- **Aggregate repeated work** into one bulk action rather than N single ones.
- **Keyboard shortcuts and accelerators** for repeated actions. Nothing in this app has
  keyboard shortcuts yet; attendance marking and score entry are where they would pay off
  most.
- **History / recents** — recently edited lessons, recent assignments, last-used settings.
- **Autocomplete** on any field whose values already exist in the database.
- **Auto-suggestion** — offer likely completions before the user finishes thinking.
- **Predefined groups of styles/presets** — one click instead of configuring from scratch.
- **Anticipation** — surface the operation the user will most likely want next, where they
  will next be looking.
- **Minimise eye movement** — keep related information near where the user is already looking,
  rather than making them scan across the screen to confirm an action worked.

## The tension to watch

Every efficiency technique above adds visible surface, and visibility trades against
simplicity. The resolution is that these belong on **teacher** screens, where the user is
frequent and expert, and should be added sparingly to **student** screens, where an extra
control is one more thing a first-timer has to rule out.

Shneiderman's rule 2 — *cater to universal usability* — is the reconciliation: put the
shortcut alongside the obvious path, not instead of it. The novice clicks the button; the
expert uses the key; neither blocks the other.
