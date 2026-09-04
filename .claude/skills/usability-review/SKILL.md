---
name: usability-review
description: Use when designing, reviewing, or changing any screen, flow, dialog, form, error message, empty state, or status colour in this CRM - and when deciding whether a proposed feature is worth building.
---

# Usability Review (Anh Ngữ Ms.Phương CRM)

`CLAUDE.md` covers how the UI **looks**; this covers how it **behaves**.

**Usability = users achieving goals with effectiveness, efficiency, satisfaction in context** (ISO 9241-11). Always ask: *usable for whom, doing what?* See `references/users-and-goals.md` for definitions.

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

1. **No meaning by colour alone.** Add a second channel — icon, underline, weight, or text. See `references/visual-design.md` for contrast and `references/interface-principles.md` for accessibility. Reference implementations: `src/components/mock-test/MockTestScoreTable.jsx` (`ScoreCell` — min/max clamp with a toast explaining *why*, plus a `title` tooltip) and `src/components/reviews/RadarChartPanel.jsx` (replaces the hidden "Thêm Đánh Giá" button with explanatory text instead of just removing it). See `docs/usability-audit-2026-09-04.md` for how these were verified.
2. **Không được mất dữ liệu đang nhập.** Form dài — điểm danh cả lớp, nhập điểm mock test cả
   lớp, phiếu nhận xét — không được mất khi lỡ đóng modal, bấm Esc, hay rớt mạng. App có
   `OfflineBanner` và `utils/retryQueue.js`, nên mất mạng giữa chừng là tình huống có thật,
   không phải giả định.
3. **Action → immediate feedback; wait → progress.** No response = broken.
4. **Every error, empty, and loading state offers a next action** — never a dead end.
5. **Dialog dismissible** (escape, backdrop, cancel). Destructive actions not default; label action not "OK".
6. **Recognition not recall** — show options; no carried state.
7. **Controls signal their type** — buttons, fields obvious. Label needed = design failed.
8. **Consistent errors = interface's fault** — fix design, not copy.
9. **Automation proposes; user disposes.** Auto content editable as fast as accepting.
10. **Four questions answered:** location, navigation, history, actions. Missing → users lost.
11. **Convention over invention.** Justify novelty or use standard patterns.
12. **Ràng buộc chặt ô tiền và ô điểm, nới ô admin nhập nhanh.** Ràng buộc ngăn lỗi, nhưng
    quá nhiều ràng buộc làm người dùng thường xuyên chậm đi — chuyên gia thích gõ hơn click.
    Ô số tiền và ô điểm phải chặn giá trị không hợp lệ ngay khi gõ; ô tìm kiếm và ô lọc của
    admin thì đừng bắt click qua nhiều bước.
13. **Every visual difference is read as meaning.** Unexplained variation in font, colour, weight, spacing → users assign false significance. Vary on purpose only.
14. **Mọi con số tổng phải truy ngược được về dòng chi tiết.** Admin không tin một con số tiền
    không giải thích được. Mỗi tổng ở `FeesPage`, `PayrollTab` và các card `ReportsPage` phải
    mở ra được danh sách dòng đã cộng thành nó.

## Review checklist

- [ ] User & dimension (efficiency vs memorability) clear
- [ ] First-timer succeeds without instructions
- [ ] Hard rules 1–14 hold
- [ ] Grouping: whitespace, proximity before borders
- [ ] Nielsen's ten heuristics: [heuristic] [severity] [fix difficulty]
- [ ] Actions ranked by frequency; frequent in prime position
- [ ] Invalid actions disabled (not rejected post-submit)
- [ ] ~7 choices max without grouping
- [ ] Destructive vs safe actions separated
- [ ] Forms: one column, labels consistent, required marked, pre-validated
- [ ] Interactive rows: signifiers (chevron, drag, checkbox, hover)
- [ ] Scannable text: keywords, lists, one idea per block, links front-loaded
- [ ] Labels use user's words (EN & VI)
- [ ] Apple's four: good, bad, missing, superfluous
- [ ] (`CLAUDE.md`) navy tokens, `@/components/ui`, lucide icons, `clsx`, Skeleton/Empty, toast after actions, responsive at 1280/768/375px

## Depth

Go deeper:

| File | Covers |
|---|---|
| `references/users-and-goals.md` | ISO 9241-11, five dimensions |
| `references/interface-principles.md` | Visibility, affordances vs signifiers |
| `references/cognition-and-errors.md` | Memory, chunking, recognition vs recall |
| `references/efficiency.md` | Fitts's law, defaults, shortcuts |
| `references/design-process.md` | Prototyping, user-centred design |
| `references/task-analysis.md` | Hierarchical analysis, personas |
| `references/web-and-mobile-patterns.md` | Navigation, information architecture |
| `references/visual-design.md` | Affordance, contrast, Gestalt |
| `references/interaction-styles.md` | Menus, direct manipulation |
| `references/evaluation.md` | Heuristics, severity, testing |

## Trạng thái hiện tại

Đợt heuristic evaluation gần nhất: `docs/usability-audit-2026-09-04.md` — toàn bộ màn hình và
sáu luồng nghiệp vụ, hai vai. Đọc nó trước khi sửa bất kỳ màn hình nào có tên trong đó.

## Source

Based on HCMUS User Interface Design course. Move explanatory content to `references/` files grouped by topic, not lecture number. This file holds only absolutes and the checklist.
