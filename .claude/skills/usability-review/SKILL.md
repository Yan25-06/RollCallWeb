---
name: usability-review
description: Use when designing, reviewing, or changing any screen, flow, dialog, form, error message, empty state, or status colour in this CRM - and when deciding whether a proposed feature is worth building.
---

# Usability Review (Anh Ngữ Ms.Phương CRM)

`CLAUDE.md` covers how the UI **looks**; this covers how it **behaves**.

**Usability = specified users achieving specified goals with effectiveness, efficiency and
satisfaction, in a specified context of use** (ISO 9241-11) — never absolute, so always ask
*usable for whom, doing what?* Design is judged by use, not by how it looks.

## First, name the user

| | **Admin** (`AdminPanelPage`, `FeesPage`, `ReportsPage`, `PayrollTab`) | **Giáo viên** (`AttendanceTab`, `HomeworkTab`, `ReviewsPage`, `MockTestTab`) |
|---|---|---|
| Usage | Dày, hàng ngày, khối lượng lớn | Theo đợt, sau giờ dạy, cách quãng nhiều ngày |
| Device | Desktop | Desktop |
| Optimise for | **Efficiency** — ít click, bulk action, default tốt, phím tắt | **Memorability** — nghỉ một tuần quay lại vẫn làm được ngay, không cần đọc lại hướng dẫn |
| Error cost | Cao (sai tiền, sai phân quyền) → confirm + hoàn tác | Trung bình (sai điểm, sai điểm danh) → sửa tại chỗ, không modal |

Trước khi thêm một click vào luồng của admin, kiểm tra xem đó có phải là ma sát lặp lại
năm mươi lần không.
Trước khi bỏ một nhãn hay gợi ý khỏi luồng của giáo viên, kiểm tra xem người quay lại sau
hai tuần còn đi tiếp được không.

**Không có người dùng mobile-primary, không có phụ huynh hay học viên đăng nhập.** Mobile chỉ
cần "không vỡ" ở 768px và 375px, không phải mục tiêu tối ưu.

## Hard rules

1. **No meaning by colour alone.** 7–8% of men can't distinguish red from green. Correct vs.
   incorrect needs a second channel — icon, underline, weight, or text. Motion is **not** a
   valid second channel: readers with reduced motion enabled lose it entirely. Reference
   implementations: *chưa xác định — điền sau khi audit (Task 7) tìm được component
   đạt chuẩn trong repo này.*
2. **Không được mất dữ liệu đang nhập.** Form dài — điểm danh cả lớp, nhập điểm mock test cả
   lớp, phiếu nhận xét — không được mất khi lỡ đóng modal, bấm Esc, hay rớt mạng. App có
   `OfflineBanner` và `utils/retryQueue.js`, nên mất mạng giữa chừng là tình huống có thật,
   không phải giả định.
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
12. **Ràng buộc chặt ô tiền và ô điểm, nới ô admin nhập nhanh.** Ràng buộc ngăn lỗi, nhưng
    quá nhiều ràng buộc làm người dùng thường xuyên chậm đi — chuyên gia thích gõ hơn click.
    Ô số tiền và ô điểm phải chặn giá trị không hợp lệ ngay khi gõ; ô tìm kiếm và ô lọc của
    admin thì đừng bắt click qua nhiều bước.
13. **Every visual difference is read as meaning.** An unexplained variation in font, colour,
    weight, or spacing will be assigned significance by users. Vary only on purpose.
14. **Mọi con số tổng phải truy ngược được về dòng chi tiết.** Admin không tin một con số tiền
    không giải thích được. Mỗi tổng ở `FeesPage`, `PayrollTab` và các card `ReportsPage` phải
    mở ra được danh sách dòng đã cộng thành nó.

## Review checklist

- [ ] Named the user and optimised the dimension that matters for them
- [ ] A first-time user can proceed without instructions
- [ ] Hard rules 1–14 above all hold
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
- [ ] (`CLAUDE.md`) navy tokens không hard-code hex, dùng component từ `@/components/ui`,
      icon lucide, `clsx` không template literal, `Skeleton` khi loading, `Empty` khi rỗng,
      toast sau mọi action, kiểm tra 1280/768/375px

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
