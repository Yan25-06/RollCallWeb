# Cognition, errors, and dialogs

## Human information processing

Senses → short-term sensory store → perceptual processor → cognitive processor → motor
processor → muscles, with working memory and long-term memory feeding the cognitive stage,
**attention** gating all of it, and a feedback loop back to the senses. Every stage is a
place a design can overload someone.

## The memory budget

**Working (short-term) memory holds ~7 chunks for ~10 seconds.** Repetition sustains it;
distraction wipes it. Long-term memory is effectively unlimited, and learning is the
transfer from one to the other.

A **chunk** is a unit of perception, and how much fits in one depends on presentation and on
what the user already knows:

```
H A PPY V A L E  T I N E      hard
HAPPY VALENTINE               easy
0888247247  →  0888.247.247   easy
```

Design consequences:

- Chunk information rather than presenting it raw. Group form fields, segment long lists,
  break long flows into labelled steps.
- Don't put 30 controls on one screen (the Word Options dialog with 9 tabs is the canonical
  failure). If a form is growing: group, split, or progressively disclose.
- **Never require the user to remember something a previous screen showed.** Carry it
  forward and display it — lesson title, part number, assignment name.

## Recognition beats recall

- **Recognition** — remembering with a visible cue present. You recognise a friend's face.
- **Recall** — producing from nothing. You may not recall their name.

Recognition is far easier, and this is the single most reusable cognitive rule in UI:

- Show options rather than demanding typed input — pick from a list, not "enter the lesson ID".
- Long lists get search/filter/sort rather than expecting recall.
- Icon-only navigation is recall; icon **and** label is recognition. Label persistent nav.
- Visual/direct manipulation is more learnable than command-style interaction, because
  clicking a visible thing is recognition while typing a command is recall.

## Attention

Three modes: **selected** (one thing at a time, at the cost of everything else), **focused**
(deep on one task), **divided** (multiple tasks, badly).

Users genuinely do not see what they aren't attending to. So the important element must win
on contrast, size, or position — and if everything is emphasised, nothing is. Dense,
uniformly-weighted screens (the old VnExpress homepage) defeat attention entirely.

## Errors

- **Consistent user errors are the interface's fault, not the user's.** If testers keep doing
  the same "wrong" thing, change the interface; don't add a warning.
- **Mistakes cascade** — once someone errs they become likelier to err again. Every error
  state must offer a way *forward*, not merely a red message.
- **Never leave a dead end.** `ErrorState.jsx`, `ErrorBoundary.jsx`, form validation, and
  failed mutations all need an action: retry, go back, or a clear fix.
- **Prevent over correct** — disable an invalid submit, constrain the input, default to the
  safe option. The motor system is a common error source: wrong button, mis-hit target,
  double vs single click.
- **Move destructive actions out of the way.** Gmail deliberately removed the Discard button
  from beside Send and put it behind an icon, because adjacency caused catastrophic
  misclicks. Apply this anywhere Delete sits next to Save in teacher content flows.
- **Don't leak information in errors.** "Account does not exist" on a login form is both a
  usability answer and a security leak — say the credentials are invalid.

## Dialogs

A confirmation with only an affirmative button is a design failure. The Hall-of-Shame case is
a "Do you want to switch to Tiếng Việt?" dialog whose only button is **OK** — there is no way
to say no.

For `ConfirmDialog.jsx` and every modal:

- always a cancel/dismiss path, escape key, and backdrop click
- the destructive action is never the default focus
- the button label states the action ("Delete lesson"), never "OK"
- the dialog yields closure — after confirming, the user can see that it worked
