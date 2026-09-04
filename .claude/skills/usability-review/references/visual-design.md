# Visual design: affordances, constraints, and graphic design

Sources: **LN08 Graphic Design Part 1** (affordance, signifiers, constraints) and
**LN09 Graphic Design Part 2** (design philosophies and guidelines). Verified against the
slides.

> **Graphic design** = visual communication and presentation. In UI it is the **look and feel**
> — the part users meet first. It should be eye-catching, convey mood, **facilitate finishing
> the task at hand**, and **suggest trust**.
>
> But: **aesthetic appeal does not automatically confer usability.**

## Affordance (LN08)

> "Perceived **and** actual properties of a thing that determine how the thing could be used"
> — Don Norman

Two kinds:
- **Perceived affordance** — the design *invites* people to take an action.
- **Actual affordance** — what the thing can genuinely do.

**Problems occur when the two differ**, or when people's perceptions aren't what the designer
expected. The deck's 2×2:

| | **Affords: No** | **Affords: Yes** |
|---|---|---|
| **Perceived: Yes** | **False affordance** — a paper chair: looks sittable, collapses | **Perceptible affordance** — a real chair. *The goal.* |
| **Perceived: No** | **Correct rejection** — a plain rectangle | **Hidden affordance** — a pen that is secretly a camera |

Applied here: a `div` styled like a label but actually clickable is a **hidden affordance**;
a bordered box that looks like a button but isn't is a **false affordance**. Both are bugs.

**Affordance depends on** experience, knowledge, and **culture of users** — and also on
**context, layout, and where objects are placed**. The same control in a different place
affords something different.

The door-handle rules the deck gives, which map cleanly onto UI controls:
- vertical bar → pull
- horizontal bar or flat plate → push
- knob → grab and twist
- handle *location* → which side the door opens

### Affordance in HCI specifically

Norman's own qualification, and the most important slide in LN08:

> In HCI, interfaces are **virtual** and do not have affordances like physical objects. It
> does not make sense to talk about interfaces in terms of *real* affordances. **Interfaces
> are better conceptualised as *perceived* affordances.**

Which means: on screen, the designer has **complete control over perceived affordance**, and
therefore complete responsibility for it. Nothing is "obviously" a button; it is a button only
because you drew it as one. GUI affordances are built from **familiar idioms and metaphors** —
the trash can, the calendar page, "slide to unlock".

Norman's cognitive considerations (from *The Psychology of Everyday Things*), which is the
checklist LN08 ends on: **perceived affordances, constraints, feedback, mapping, mental
models, conceptual models.**

## Signifiers (LN08)

- An **affordance** is a quality that allows an action.
- A **signifier** is **a thing that communicates the affordance**.

A signifier can be a label, instruction, shape, colour, layout, **sound, video, animation, or
mouse cursor shape**. That list matters: cursor changes and hover states *are* signifiers, and
they are the cheapest fix for an ambiguous control.

## Visible constraints (LN08)

Limitations on possible actions, perceived from an object's appearance.

> **The more constraints, the less opportunity for error** — particularly important for
> managing user input.

**Benefits:** restrict users to valid actions · prevent selecting incorrect options ·
eliminate the need for perfect knowledge · **recognition over recall**.

**The trade-off the deck insists on:**

> But too much constraint → **less flexible and less efficient**. Expert users prefer typing
> to clicking to select choices.

The illustration is a Windows IP-address field split into four boxes: safe, but you must click
into each octet. Directly relevant to teacher-facing forms — constrain student inputs, but
don't box in a teacher who wants to type fast.

**Three types (Norman, 1999):**

- **Physical** — the shape restricts movement (how many ways can you insert a CD?).
- **Logical** — exploits common-sense reasoning about how the world works; the relationship
  between a device's physical layout and how it works.
- **Cultural** — learned idioms. *red = danger, green = go* — **but these differ by place.**
  The deck states outright: **"Red is not at all danger (preferable) in many countries."**
  Light switches: down is off in America, down is **on** in Britain.

**This is a direct warning here.** The app is entirely in Vietnamese, and red carries
positive connotations (luck, celebration) in Vietnamese culture rather than danger. It
reinforces hard rule 1 from a second direction: red/green is not only inaccessible to
colour-blind users, it is **culturally ambiguous**. Never let it carry meaning alone.

## Graphic design philosophies (LN09)

UI design must balance the meaning of its visual elements so they **conform to the mental
model of operation**. Stated preferences:

- simple and natural user's "language"
- economy of visual elements
- clean, well organised
- **less is more**

## The six guidelines (LN09)

**Metaphor · Simplicity and Clarity · Consistency · Organisation/Alignment/Proximity/Grid ·
Legibility and Readability · Colour/Contrast**

### Simplicity

> "Keep it simple, stupid." · "Less is more." · **"When in doubt, leave it out."**
>
> **Every element in an interface should have a reason for being there — and make that reason
> clear too.**

Three techniques:

- **Reduction** — decide what essentially needs conveying; examine every element for whether
  it serves an essential purpose; remove the inessential.
- **Regularity** — use a regular pattern; prefer elements the platform already provides,
  since users know them. **Limit inessential variation**: same font, colour, line width,
  dimensions, orientation. *"Irregularities in your design will be magnified in the user's
  eyes and assigned meaning and significance."* — the strongest argument in the course for
  `CLAUDE.md`'s component-class rule. A one-off button style is read as *meaning something*.
- **Combine elements** — let one element play multiple roles. The scrollbar is the example:
  it simultaneously shows position in the document, document size, and offers six controls.

**Economy of visual elements:** minimise the number of controls, include only the necessary,
size and lay them out appropriately, minimise clutter **so information is not hidden**. And
*"Tabs are an excellent means for factoring related items — but can be overdone."*

### White space

- leads the eye
- provides symmetry and balance
- **allows the eye to rest between elements of activity**
- promotes simplicity, elegance, refinement — use margins to draw the eye around the design,
  and **don't crowd controls together**

Note one guideline that **conflicts with modern practice**: LN09 says put labels *to the left*
of controls, not above. `CLAUDE.md` and current responsive practice put labels above, which is
correct for mobile — the deck predates mobile-first layout. Flagging the disagreement rather
than importing it.

### Consistency

**Similar things should work similarly. Different things should look different.** Types:
**internal** (same conventions within the system), **external** (platform and interface style
conventions), **metaphorical** (a print icon is a metaphor for a printer).

### Organisation

Grid system · grouping · order · alignment · arrangement.

**Grid** is called "an essential tool" — a uniform grid (equal-width columns) achieves both
alignment and balance, aligns related components, and gives consistency of location, format,
and element repetition.

**Bad alignment** produces "no flow, causing the eyes to zig-zag around the screen as the user
attempts to locate a field of interest." The deck's Hall-of-Shame example fails four ways at
once — bad alignment, poor contrast (can't distinguish labels from editable fields), **poor
repetition (buttons do not look like buttons)**, and poor explicit structure.

**Balance and symmetry:** choose an axis (usually vertical) and distribute elements equally
around it, equalising both mass and extent.

### Gestalt principles of grouping

From the 1920s Gestalt psychologists — how early visual processing groups elements into larger
wholes. These are the *mechanism* behind grouping rules elsewhere in this skill:

| Principle | Effect |
|---|---|
| **Proximity** | Elements closer together are grouped. Four columns of circles because they're closer vertically. |
| **Similarity** | Elements with similar attributes are grouped. Four rows, because alike horizontally. |
| **Continuity** | The eye expects a contour to continue — two crossing lines, not four lines meeting. |
| **Closure** | The eye perceives complete figures even when lines are missing (the illusory triangle; the IBM logo). |
| **Area** | Where two elements overlap, the smaller reads as figure in front of the larger ground. |
| **Symmetry** | The eye prefers the explanation with greater symmetry. |

Practical consequence: **spacing groups things more strongly than borders do.** If two
controls sit close together, users will read them as related whatever your labels say — so fix
grouping with whitespace before adding boxes.

### Legibility and readability

Characters, symbols and graphical elements must be **easily noticeable and distinguishable**.
The failures shown: script fonts on saturated backgrounds, ALL-CAPS body text, and rotated
text ("don't try too hard to harm your neck").

### Imagery

- Signs/icons/symbols sit on a spectrum from concrete to abstract; pick the right point.
- **"Meaningful icon design is hard! Except for the most familiar, always label them."**
  This is the deck's own support for icon+label over icon-only.
- Consistent, relevant image use. **Avoid 'eye candy' unless it supports a message.**
- **Motion attracts attention** — useful if important, otherwise distracting.

### Colour and contrast

**Contrast encodes information along visual dimensions** — and the deck lists seven, only one
of which is hue:

> **value · hue · texture · shape · position · orientation · size**

This is the constructive other half of hard rule 1. When you need to distinguish correct from
incorrect, you have six channels besides colour available. Weight (value), an icon (shape),
underline (texture), and indentation (position) all work, and all survive colour-blindness,
greyscale printing, and cultural difference.
