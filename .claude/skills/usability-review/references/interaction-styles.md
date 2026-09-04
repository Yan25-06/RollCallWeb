# Interaction styles

Source: **LN10 Interaction Styles**. Verified against the slides.

"Dialog type = interaction style." The deck covers seven, then compares them against user
profile and task characteristics. The value here is **choosing deliberately** rather than
defaulting, and knowing that this CRM already mixes several.

## The seven styles

| Style | One line |
|---|---|
| **Menu selection** | Discriminator of options; recognition over recall |
| **Form fill-in** | Integrator of data values; higher skill, more flexible |
| **Question & answer** | Series of values, easy for untrained users |
| **Function keys** | Hardware, software, or on-screen labels |
| **Command language** | Naming and syntax issues |
| **Natural language** | Most general purpose for untrained users |
| **Direct manipulation** | Physical properties reflected in objects |

Plus query language (a specialised command language) and VR/multimedia. **Real systems
combine them** — and this CRM does: menus for navigation, form fill-in for data entry, direct
manipulation in the weekly schedule grid, and table editing for scores and attendance.

## Menus

**Advantages:** self-explanatory (reduces need for manuals, little/no training, makes
semantics *and* syntax explicit) · requires little memory (recognition vs. recall) · few
keystrokes so less input error · easy error handling (only limited valid inputs at any
point) · enhancements are visible.

**Disadvantages:** **inefficient for experts and high-frequency users** · inflexible
(system-controlled, forced choice) · takes up screen "real estate".

**Design guidelines** — the most directly usable list in the deck:

- Create **logical, distinctive categories with clear meanings**. The deck contrasts vague
  category names ("General Information", "Special Functions") with task-shaped ones
  ("View Requirements", "Search Course Offerings"). Name menu items after *tasks*.
- Items should be **brief, consistent in grammatical style and placement**, and matched with
  their menu titles.
- **Minimise menu hierarchy depth at the expense of breadth** — going deep means slow
  response time. **Prefer broad and shallow menus to narrow and deep ones.**
- **Use items as titles for sub-trees** — the item you clicked becomes the next screen's title,
  so users can see where they are.
- Order items by **functional group, frequency of use, order of use, and/or alphabetically**
  — pick one deliberately; the deck shows the same e-mail menu ordered four ways.
- **Use brief items, begin with the keyword** (same front-loading rule as link text).
- Consistent grammar, layout, terminology; establish conventions and apply them on **all**
  menu screens.
- **Allow type-ahead, jump-ahead, or other shortcuts** — the escape hatch for experts.
- Consider online help, optimal response time and display rate, and screen size.

## Form fill-in

**Advantages:** self-explanatory · requires little memory (recognition vs. recall) ·
efficient use of screen real-estate · **accommodates parameters with many possible values** ·
provides context.

**Disadvantages:** assumes knowledge of valid inputs · assumes typing skill and knowledge of
special keys (TAB, RETURN, BACKSPACE) · **creates opportunities for user error**.

**Best for:** moderate-to-high typing skill, moderate-to-high task experience, low-to-moderate
application experience. In other words — teachers, not students.

**Guidelines:**
- Meaningful title · comprehensible instructions
- **Logical grouping and sequencing of fields**
- **Familiar field labels** · consistent terminology and abbreviations
- **Visible space and boundaries for data-entry fields** (this is the affordance rule again)
- Convenient cursor movement
- **Error correction for individual characters *and* entire fields**
- **Error prevention where possible**; error messages for unacceptable values
- **Marking of optional fields**; explanatory messages for fields

## Direct manipulation

> Visual representation of the "world of actions" — objects and actions are shown, tapping
> analogical reasoning. **Rapid, incremental, and reversible actions.** Replace typing with
> pointing/selecting. **Immediate visibility of results.**

**Advantages:** easy to learn and remember · direct, intuitive, WYSIWYG · flexible, easily
reversible · provides context and instant visual feedback · exploits visual and spatial cues ·
low typing requirements · less opportunity for error.

**Disadvantages:** **inefficient for high-frequency expert users** · hard to design
recognisable icons for many objects and actions · **icons may take more screen real estate
than words**.

**Guidelines:**
- **Provide an alternative interface for high-frequency and expert users.**
- Choose a consistent icon scheme: depict "before and after", depict the tool, or depict the
  action — pick one scheme and hold it.
- **Accompany icons with names.**
- Provide **visual feedback for position selection and movement**, and physical feedback for
  modes.

This is the style the weekly schedule grid and the attendance toggles live in, and "rapid,
incremental, **reversible**" plus "immediate visibility of results" is the standard those
screens are held to.

## Function keys / shortcuts

Soft function keys are: self-explanatory, easy, flexible, require little memory, need little
or no screen real estate, and have limited typing requirement.

**Concerns:** limited number available · application-specific · **inconsistency among
applications** (the deck's example: Ctrl+F means Find in most Windows apps but Forward in
Outlook — a real external-consistency violation).

**Guidelines:** **grey out non-applicable functions** · use key combinations whose keys are
easy to reach · **consistent grammar** in the modifier scheme (e.g. Ctrl for one class of
action, Alt for another).

## Question & answer

Combines features of menus and fill-in forms; the user is posed a **single question** at a
time. Examples: **wizard dialogs** and prompts for missing parameters. **Appropriate for
lowly-motivated, less-experienced users**; requires little training.

That last point is the sharpest one for this CRM: a wizard signals *"we expect you to be
inexperienced and unmotivated."* Right for a student's first-run setup; wrong for a teacher's
daily authoring.

## Command language

**Advantages:** flexibility · supports user initiative · appeals to "power users" ·
potentially rapid for complex tasks · supports macro capability.
**Disadvantages:** requires training and memorisation · difficult to retain · **poor error
handling**.

Guidelines: meaningful, specific, distinctive names · consistent abbreviation rules (prefer
truncation to one letter) · macros for frequent users · **limit the number of commands and
the number of ways to accomplish a task**.

## Natural language

Best for users **knowledgeable about the task domain**, with moderate computer skills, and
**with limited access to other interaction styles** — voice while driving, or people who
cannot type. That framing is a useful check on any future voice or chat feature: it is an
*accessibility and hands-busy* answer first, not a default.

## The selection tables

The deck's payoff is a matrix of user profile and task characteristics against style. The
rows that matter here:

| | Menu | Fill-in forms | Q&A | Command | Direct manip. |
|---|---|---|---|---|---|
| **Typing skill** | Low | Mod–High | Mod–High | Mod–High | **Low** |
| **System experience** | Low | Low–Mod | Low–Mod | High | **Low** |
| **Application experience** | Low | Low–Mod | Moderate | High | **Low** |
| **Frequency of use** | **Low** | **Mod–High** | Low | **High** | Low |
| **Training** | Little/none | Little/none | Little/none | **Formal** | Little/none |
| **Turnover rate** | High | Low–Mod | High | Low | High |
| **Task structure** | High | High | High | Low | Low |

Read across for this CRM:

- **Teachers** — low-to-moderate typing skill relative to the task, moderate system and
  application experience, low frequency (bursts after teaching), no formal training, moderate
  turnover. That is closer to the **menu + form fill-in** column. Any teacher-facing screen
  that drifts toward command-style is in the wrong column.
- **Admins** — moderate-to-high typing, high task experience, high frequency, low turnover.
  That is **form fill-in**, with command-language-like accelerators layered on top. Which is
  the same conclusion the efficiency reference reaches from Fitts's law, arrived at
  independently.

The deck also notes user *psychology*: command language is the only style associated with a
**positive attitude and high motivation** — it suits users who *want* to invest. Menus, Q&A,
function keys, direct manipulation and natural language all assume low motivation. Assume low
motivation for teachers arriving days apart; that is the correct assumption here.
