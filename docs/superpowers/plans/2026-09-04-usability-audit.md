# Chuẩn hóa skill usability-review + Audit UI/UX — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuẩn hóa skill `.claude/skills/usability-review/` từ dự án DictationHub sang CRM này, rồi dùng nó chạy heuristic evaluation hai vòng trên app thật và xuất báo cáo xếp hạng ưu tiên.

**Architecture:** Ba giai đoạn tuần tự. (1) Sửa tài liệu skill tại chỗ — thuần văn bản, không đụng code sản phẩm. (2) Dựng môi trường quan sát tạm trong scratchpad: Vite dev server + Playwright điều khiển Chromium, đăng nhập hai vai, chụp màn hình; không một file nào của giai đoạn này được nằm trong repo. (3) Quan sát, ghi nhận, chấm điểm, xuất báo cáo Markdown vào `docs/`.

**Tech Stack:** Markdown · Vite dev server (`npm run dev`) · Playwright (cài trong scratchpad, không phải trong repo) · Supabase (dữ liệu thật, chỉ đọc).

## Global Constraints

- **Không thêm bất kỳ dependency nào vào `package.json` của repo.** Playwright cài trong thư mục scratchpad riêng.
- **Read-only tuyệt đối trên dữ liệu Supabase thật.** Không bấm nút Lưu, Tạo, Xóa, Ghi danh, Thanh toán, Chấm công. Được phép mở modal và điền form để quan sát, nhưng phải đóng bằng Hủy hoặc Esc.
- **Thông tin đăng nhập không bao giờ vào repo.** Truyền qua biến môi trường tại thời điểm chạy. Không ghi vào file trong repo, không commit, không đưa vào báo cáo.
- **Ngôn ngữ:** skill giữ nguyên tiếng Anh như bản gốc; báo cáo audit viết tiếng Việt như mọi tài liệu khác của repo.
- **Repo này không có test runner.** Mọi bước "verify" là lệnh grep, kiểm tra file tồn tại, hoặc xem ảnh chụp — không phải unit test. Đừng cài test runner để thỏa mãn hình thức TDD.
- **Định dạng ghi nhận phát hiện:** `[H2-x Tên heuristic] [Severity 0-4] [Fix 0-4]` + mô tả + vì sao người dùng nhầm + trang/file.
- Mỗi task kết thúc bằng một commit.

## File Structure

**Sửa trong repo:**
- `.claude/skills/usability-review/SKILL.md` — frontmatter, tiêu đề, bảng người dùng, hard rules, checklist
- `.claude/skills/usability-review/references/*.md` — 9 file, gỡ mọi tham chiếu DictationHub
- `docs/usability-audit-2026-09-04.md` — **tạo mới**, báo cáo audit

**Tạo trong scratchpad (KHÔNG vào repo):**
- `$SCRATCH/audit/package.json` + `node_modules/` — Playwright
- `$SCRATCH/audit/login.mjs` — đăng nhập hai vai, lưu storageState
- `$SCRATCH/audit/capture.mjs` — chụp toàn bộ màn hình theo vai
- `$SCRATCH/audit/shots/` — ảnh chụp
- `$SCRATCH/audit/findings-raw.md` — sổ ghi thô, chưa chấm điểm

`$SCRATCH` = `/tmp/claude-1000/-home-msi-My-Projects-Ielts-CRMWeb/9d427353-b1bd-41b4-9200-c42a7a91b4b8/scratchpad`

---

### Task 1: Chuẩn hóa SKILL.md

**Files:**
- Modify: `.claude/skills/usability-review/SKILL.md`

**Interfaces:**
- Consumes: không có (task đầu tiên)
- Produces: bảng người dùng Admin/Giáo viên và 14 hard rules — Task 4, 5, 6 chấm điểm dựa trên đúng bộ rule này; Task 7 điền lại mục reference implementations của file này.

- [ ] **Step 1: Sửa frontmatter và tiêu đề**

Dòng 3 hiện tại:
```
description: Use when designing, reviewing, or changing any DictationHub screen, flow, dialog, form, error message, empty state, or feedback colour - and when deciding whether a proposed feature is worth building.
```
Thay bằng:
```
description: Use when designing, reviewing, or changing any screen, flow, dialog, form, error message, empty state, or status colour in this CRM - and when deciding whether a proposed feature is worth building.
```

Dòng 6: `# Usability Review (DictationHub)` → `# Usability Review (Anh Ngữ Ms.Phương CRM)`

- [ ] **Step 2: Thay bảng "First, name the user"**

Xóa toàn bộ khối từ `## First, name the user` đến hết đoạn "returning student... needs memorability above all", thay bằng:

```markdown
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
```

- [ ] **Step 3: Sửa hard rule 2**

Rule 2 hiện tại (`**No meaning by audio alone.** Keep visible state for everything the sound conveys.`) thay bằng:

```markdown
2. **Không được mất dữ liệu đang nhập.** Form dài — điểm danh cả lớp, nhập điểm mock test cả
   lớp, phiếu nhận xét — không được mất khi lỡ đóng modal, bấm Esc, hay rớt mạng. App có
   `OfflineBanner` và `utils/retryQueue.js`, nên mất mạng giữa chừng là tình huống có thật,
   không phải giả định.
```

- [ ] **Step 4: Sửa hard rule 12 và thêm rule 14**

Rule 12 hiện tại (`**Constrain student input, not teacher input.**...`) thay bằng:

```markdown
12. **Ràng buộc chặt ô tiền và ô điểm, nới ô admin nhập nhanh.** Ràng buộc ngăn lỗi, nhưng
    quá nhiều ràng buộc làm người dùng thường xuyên chậm đi — chuyên gia thích gõ hơn click.
    Ô số tiền và ô điểm phải chặn giá trị không hợp lệ ngay khi gõ; ô tìm kiếm và ô lọc của
    admin thì đừng bắt click qua nhiều bước.
```

Thêm sau rule 13:

```markdown
14. **Mọi con số tổng phải truy ngược được về dòng chi tiết.** Admin không tin một con số tiền
    không giải thích được. Mỗi tổng ở `FeesPage`, `PayrollTab` và các card `ReportsPage` phải
    mở ra được danh sách dòng đã cộng thành nó.
```

- [ ] **Step 5: Sửa mục reference implementations trong rule 1**

Rule 1 hiện trỏ tới `GapSentence.jsx`, `AnswerHistory.jsx`, `ResultView.jsx` — không tồn tại
ở repo này. Thay câu cuối của rule 1 bằng:

```
   Reference implementations: *chưa xác định — điền sau khi audit (Task 7) tìm được component
   đạt chuẩn trong repo này.*
```

- [ ] **Step 6: Sửa dòng cuối của Review checklist**

Dòng `- [ ] (`CLAUDE.md`) theme tokens, component classes, lucide icons, skeletons, 375/768/1280px` thay bằng:

```
- [ ] (`CLAUDE.md`) navy tokens không hard-code hex, dùng component từ `@/components/ui`,
      icon lucide, `clsx` không template literal, `Skeleton` khi loading, `Empty` khi rỗng,
      toast sau mọi action, kiểm tra 1280/768/375px
```

- [ ] **Step 7: Verify**

```bash
cd '/home/msi/My Projects/Ielts/CRMWeb'
grep -c 'DictationHub\|dictation' .claude/skills/usability-review/SKILL.md
grep -n 'Admin\|Giáo viên\|Rule 14\|^14\.' .claude/skills/usability-review/SKILL.md | head
wc -w .claude/skills/usability-review/SKILL.md
```
Expected: lệnh grep đầu in `0`. Lệnh hai in bảng người dùng và rule 14. `wc -w` nên dưới ~900 từ — skill tự đặt trần ~800 từ; nếu vượt nhiều thì chuyển bớt phần giải thích sang `references/`.

- [ ] **Step 8: Commit**

```bash
git add .claude/skills/usability-review/SKILL.md
git commit -m "docs(skill): retarget usability-review SKILL.md at this CRM

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Chuẩn hóa các file references

**Files:**
- Modify: `.claude/skills/usability-review/references/users-and-goals.md` (3 chỗ)
- Modify: `.claude/skills/usability-review/references/interface-principles.md` (3 chỗ)
- Modify: `.claude/skills/usability-review/references/web-and-mobile-patterns.md` (5 chỗ)
- Modify: `.claude/skills/usability-review/references/interaction-styles.md` (5 chỗ)
- Modify: `.claude/skills/usability-review/references/design-process.md` (5 chỗ)
- Modify: `.claude/skills/usability-review/references/evaluation.md` (3 chỗ)
- Modify: `.claude/skills/usability-review/references/task-analysis.md` (2 chỗ)
- Modify: `.claude/skills/usability-review/references/visual-design.md` (1 chỗ)
- Modify: `.claude/skills/usability-review/references/efficiency.md` (1 chỗ)

**Interfaces:**
- Consumes: bảng người dùng Admin/Giáo viên từ Task 1 — mọi đoạn viết lại phải dùng đúng hai vai đó, không phát minh vai mới.
- Produces: bộ reference sạch, không còn tham chiếu sai. Task 4–6 đọc các file này khi cần đào sâu.

**Nguyên tắc chung cho task này:** chỉ sửa phần *ví dụ và bối cảnh*. **Không sửa phần lý thuyết** — Nielsen, Gestalt, Fitts, thang severity, các con số phủ đều giữ nguyên từng chữ.

- [ ] **Step 1: users-and-goals.md**

Đổi tiêu đề mục `## Why the teacher/student split matters` → `## Why the admin/teacher split matters`, và viết lại hai đoạn dưới nó:

```markdown
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
```

Đoạn "Power law of practice" giữ nguyên, chỉ đổi cụm `teacher flows` → `admin flows` và
`student flows` → `teacher flows`.

Mục `## Why UI change is expensive` ở cuối nhắc `repositories/`, `hooks/`, `features/` — cấu
trúc của dự án cũ. Thay câu cuối bằng:

```markdown
This is the reason this codebase separates `services/` (Supabase data access), `hooks/`
(auth and permissions state), and `pages/` + `components/` (presentation). Keeping new work
on that seam is what keeps the interface cheap to change.
```

- [ ] **Step 2: interface-principles.md**

- Dòng 19: bỏ hẳn gạch đầu dòng về audio-first, thay bằng:
  `- Meaning must never ride on colour alone — attendance status, fee status and payroll state all currently lean on colour, so each needs a second channel.`
- Dòng 30: `**Internal** — within DictationHub.` → `**Internal** — within this CRM.`
- Dòng 57 (natural mapping): thay ví dụ dictation bằng:
  `In the weekly schedule grid, a session's position on screen must match its day and time — a card in Wednesday's column at 18:00 is the only correct place for that session.`

Đồng thời sửa cụm `locales/en` / `locales/vi` ở mục Consistency: repo này chỉ có tiếng Việt,
nên đổi thành `Toàn bộ giao diện là tiếng Việt; không để thuật ngữ tiếng Anh hay tên cột
database rò ra nhãn.`

- [ ] **Step 3: web-and-mobile-patterns.md**

- Dòng 36: `DictationHub has Breadcrumb.jsx and AppShell.jsx for 1 and 3.` → viết lại thành cảnh báo, vì đây là điểm yếu thật của repo:
```markdown
This app has **no breadcrumb and no URL routing** — `App.jsx` keeps the current page in
`useState` and only mirrors it into History API, so the URL never changes. Question 1 (where
am I) is answered by the sidebar highlight alone, question 3 (where have I been) only by the
browser Back button. Any new screen must be checked against all four questions explicitly,
because the framework gives none of them for free.
```
- Dòng 52 taxonomy: `Test → Part → Lesson → Segment` → `Lớp → Buổi (session) → Học viên, cùng với Giáo trình: Loại khóa → Tháng → Buổi → Tài liệu`.
- Mục `## Mobile` (dòng 158–166): thay ba gạch đầu dòng về dictation bằng:
```markdown
Both user groups work on desktop, so mobile is a robustness requirement, not an optimisation
target. What still matters: nothing may overflow horizontally at 768px and 375px, the sidebar
must collapse to a usable menu, and wide tables (fees, payroll, score entry) must scroll
inside their own container rather than breaking the page.
```

- [ ] **Step 4: interaction-styles.md**

Năm chỗ, tất cả đều là ví dụ:
- Dòng 7 và 22: `DictationHub` → `this CRM`. Câu liệt kê các style đang dùng, sửa thành: `menus for navigation, form fill-in for data entry, direct manipulation in the weekly schedule grid, and table editing for scores and attendance.`
- Dòng 98: bỏ `dictation player and segment editor`, thay bằng `weekly schedule grid and the attendance toggles`.
- Dòng 120: `DictationHub` → `this CRM`, giữ nguyên lập luận về wizard.
- Dòng 157: `Read across for DictationHub:` → `Read across for this CRM:`. Kiểm tra đoạn ngay sau đó có nhắc student/teacher không, nếu có thì đổi sang admin/giáo viên.

- [ ] **Step 5: design-process.md**

- Dòng 12: `A DictationHub screen that looks polished but costs a teacher an extra click` → `A screen that looks polished but costs an admin an extra click`.
- Dòng 57: `For the dictation player, vertical; for the teacher content area, horizontal.` → `For the weekly schedule grid, vertical; for the fees table, horizontal.`
- Dòng 73: ví dụ Wizard of Oz — thay bằng `The classic use here would be testing an auto-generated payroll or fee summary by computing it by hand first, before building the calculation.`
- Dòng 135–137: bảng skill level, cột `In DictationHub` → `In this CRM`; ô `A student's first dictation; a teacher's first lesson` → `A teacher's first time writing a review; an admin's first payroll month`.

- [ ] **Step 6: evaluation.md**

- Dòng 19: ví dụ "lab caveat" — thay bằng:
```markdown
For this CRM the "lab" caveat is concrete: an admin closing the month's fees calmly while you
watch is not the same admin doing it under deadline with a parent waiting on the phone.
```
- Dòng 122: `DictationHub UI issues` → `UI issues in this CRM`.
- Dòng 168: cả đoạn "Think-aloud is a poor fit for dictation practice" — thay bằng:
```markdown
**Think-aloud fits this CRM well** — both user groups work at a desk, and no task depends on
listening, so talking through it costs nothing. Use it for both roles; reserve retrospective
think-aloud for anything done under time pressure, such as closing the month's fees.
```
- Mục `## Applying this here` ở cuối nhắc RTA cho practice flow và analytics cho audio — sửa mục 4 và 5 thành: `4. **Think-aloud** with one admin on the fees flow and one teacher on the review flow.` và `5. Analytics is not installed and is out of scope; skip it until there is a reason.`

- [ ] **Step 7: task-analysis.md, visual-design.md, efficiency.md**

- `task-analysis.md` dòng 45: `for DictationHub, that's destructive teacher operations and anything touching` → `here that means anything touching money — recording a payment, setting a session rate — and any delete that cascades (deleting a curriculum month deletes its sessions and materials).`
- `task-analysis.md` dòng 98: `keyboard paths through the dictation flow` → `keyboard paths through score entry and attendance marking`.
- `visual-design.md` dòng 97: `**This is a direct warning for DictationHub.** The app is bilingual EN/VI, and red carries` → `**This is a direct warning here.** The app is entirely in Vietnamese, and red carries`. Giữ nguyên phần còn lại của lập luận.
- `efficiency.md` dòng 33: `Dictation playback already does this; content authoring should too.` → `Nothing in this app has keyboard shortcuts yet; attendance marking and score entry are where they would pay off most.`

- [ ] **Step 8: Verify**

```bash
cd '/home/msi/My Projects/Ielts/CRMWeb'
grep -rn 'DictationHub\|dictation\|Dictation' .claude/skills/usability-review/ | wc -l
grep -rn 'GapSentence\|AnswerHistory\|ResultView\|LibraryPage\|PracticePage\|AppShell\|Breadcrumb.jsx\|locales/' .claude/skills/usability-review/
```
Expected: lệnh đầu in `0`. Lệnh hai không in gì, trừ chỗ `Breadcrumb` nằm trong câu đã viết lại có chủ đích ở Step 3 (nếu còn thì phải là câu nói app **không có** breadcrumb).

- [ ] **Step 9: Commit**

```bash
git add .claude/skills/usability-review/references/
git commit -m "docs(skill): retarget usability-review references at this CRM

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Dựng môi trường quan sát

**Files:**
- Create: `$SCRATCH/audit/package.json`, `$SCRATCH/audit/login.mjs`
- Create: `$SCRATCH/audit/state-admin.json`, `$SCRATCH/audit/state-teacher.json` (sinh ra lúc chạy)
- Không sửa file nào trong repo.

**Interfaces:**
- Consumes: không có
- Produces: hai file `state-<role>.json`. Task 4 và 5 dùng lại bằng `browser.newContext({ storageState: 'state-admin.json' })` — không đăng nhập lại. Vai được xác định bằng sự hiện diện của mục Admin trong sidebar, không đoán theo email.

- [ ] **Step 1: Khởi động dev server**

```bash
cd '/home/msi/My Projects/Ielts/CRMWeb'
npm run dev
```
Chạy nền. Expected: in ra `Local: http://localhost:5173/`. Nếu báo lỗi thiếu biến Supabase thì dừng cả kế hoạch và báo lại — `src/lib/supabase.js` throw khi thiếu env.

- [ ] **Step 2: Kiểm tra app phản hồi**

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:5173/
```
Expected: `200`.

- [ ] **Step 3: Cài Playwright trong scratchpad**

```bash
SCRATCH=/tmp/claude-1000/-home-msi-My-Projects-Ielts-CRMWeb/9d427353-b1bd-41b4-9200-c42a7a91b4b8/scratchpad
mkdir -p $SCRATCH/audit && cd $SCRATCH/audit
npm init -y >/dev/null
npm i playwright
node -e "console.log(require('playwright').chromium.executablePath())"
```
Expected: in ra đường dẫn tới Chromium. Nếu file đó không tồn tại (bản browser trong
`~/.cache/ms-playwright` không khớp phiên bản playwright vừa cài) thì chạy
`npx playwright install chromium` rồi kiểm tra lại. **Tuyệt đối không chạy `npm i` trong thư
mục repo.**

- [ ] **Step 4: Viết script đăng nhập**

Tạo `$SCRATCH/audit/login.mjs`:

```javascript
import { chromium } from 'playwright'

const BASE = 'http://localhost:5173/'
const role = process.argv[2]                  // 'admin' | 'teacher'
const email = process.env.AUDIT_EMAIL
const pass  = process.env.AUDIT_PASS
if (!email || !pass) { console.error('Thiếu AUDIT_EMAIL / AUDIT_PASS'); process.exit(1) }

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()
await page.goto(BASE)
await page.getByRole('textbox').first().fill(email)
await page.locator('input[type="password"]').fill(pass)
await page.getByRole('button', { name: /đăng nhập/i }).click()
await page.waitForSelector('nav', { timeout: 15000 })

// Xác định vai bằng sự hiện diện của mục Admin trong sidebar, không đoán theo email.
const isAdmin = await page.getByRole('button', { name: 'Admin' }).count() > 0
console.log(`${role}: email=${email} isAdmin=${isAdmin}`)

await ctx.storageState({ path: `state-${role}.json` })
await page.screenshot({ path: `shots/00-login-${role}.png`, fullPage: true })
await browser.close()
```

- [ ] **Step 5: Chạy cho cả hai vai**

```bash
cd $SCRATCH/audit && mkdir -p shots
AUDIT_EMAIL='<email admin>' AUDIT_PASS='<mật khẩu>' node login.mjs admin
AUDIT_EMAIL='<email giáo viên>' AUDIT_PASS='<mật khẩu>' node login.mjs teacher
```
Expected: hai dòng in ra, một dòng `isAdmin=true` và một dòng `isAdmin=false`. **Nếu cả hai
cùng `true` hoặc cùng `false` thì dừng lại và báo** — kế hoạch giả định hai vai khác nhau, và
một nửa vòng 2 sẽ vô nghĩa nếu không đúng.

- [ ] **Step 6: Verify**

```bash
ls -la $SCRATCH/audit/state-admin.json $SCRATCH/audit/state-teacher.json $SCRATCH/audit/shots/
cd '/home/msi/My Projects/Ielts/CRMWeb' && git status --porcelain && git diff --stat HEAD -- package.json package-lock.json
```
Expected: hai file state tồn tại và khác rỗng; hai ảnh chụp màn hình đăng nhập tồn tại;
`git status` **không** liệt kê file nào của giai đoạn này; `package.json` và
`package-lock.json` không đổi.

- [ ] **Step 7: Không commit**

Task này cố ý không tạo commit — nó không để lại gì trong repo. Ghi lại trong sổ tay rằng môi
trường đã sẵn sàng và chuyển sang Task 4.

---

### Task 4: Vòng 1 — overview 15 màn hình, hai vai

**Files:**
- Create: `$SCRATCH/audit/capture.mjs`, `$SCRATCH/audit/shots/*.png`
- Create: `$SCRATCH/audit/findings-raw.md`

**Interfaces:**
- Consumes: `state-admin.json`, `state-teacher.json` từ Task 3.
- Produces: `findings-raw.md` — danh sách phát hiện **chưa chấm severity**, mỗi mục có màn hình, heuristic, mô tả. Task 6 đọc file này để chấm điểm.

**Lưu ý điều hướng:** app không có URL routing. Mọi chuyển trang phải bằng cách click nút
trong sidebar theo nhãn tiếng Việt: `Dashboard`, `Lớp Học`, `Học Viên`, `Học Phí` (chỉ admin),
`Báo Cáo`, `Nhận Xét`, `Giảng Dạy`, `Admin` (chỉ admin), và nút cài đặt ở đáy sidebar.

- [ ] **Step 1: Viết script chụp màn hình**

Tạo `$SCRATCH/audit/capture.mjs`:

```javascript
import { chromium } from 'playwright'

const role = process.argv[2]
const NAV = ['Dashboard', 'Lớp Học', 'Học Viên', 'Học Phí', 'Báo Cáo', 'Nhận Xét', 'Giảng Dạy', 'Admin']

const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  storageState: `state-${role}.json`,
})
const page = await ctx.newPage()
await page.goto('http://localhost:5173/')
await page.waitForSelector('nav', { timeout: 15000 })

for (const label of NAV) {
  const btn = page.getByRole('button', { name: label, exact: true })
  if (await btn.count() === 0) { console.log(`${role}: KHÔNG THẤY "${label}"`); continue }
  await btn.first().click()
  await page.waitForTimeout(1500)          // chờ service Supabase trả dữ liệu
  const slug = label.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-').toLowerCase()
  await page.screenshot({ path: `shots/${role}-${slug}.png`, fullPage: true })
  console.log(`${role}: đã chụp ${label}`)
}
await browser.close()
```

- [ ] **Step 2: Chạy cho cả hai vai**

```bash
cd $SCRATCH/audit
node capture.mjs admin
node capture.mjs teacher
```
Expected: vai admin chụp đủ 8 mục; vai teacher in `KHÔNG THẤY "Học Phí"` và
`KHÔNG THẤY "Admin"` — đó là hành vi đúng theo `usePermissions`, không phải lỗi script.

- [ ] **Step 3: Chụp các tab con**

Các tab không nằm trong sidebar. Cả hai bộ tab đều là `<button>` thường (không có
`role="tab"`), nhãn lấy từ `src/pages/ClassDetailPage/index.jsx:12-17` và
`src/pages/SchedulePage.jsx:318,329,340`:

- `ClassDetailPage`: `Học Viên`, `Điểm Danh`, `Bài Tập`, `Mock Test`
- `SchedulePage`: `Lịch Dạy`, `Bảng Lương`, `Tài Liệu`

**Bẫy selector:** nhãn tab `Học Viên` trùng với nhãn mục sidebar `Học Viên`. Phải giới hạn
phạm vi tìm ra ngoài sidebar, nếu không script sẽ click nhầm về trang danh bạ:

```javascript
const main = page.locator('main')       // hoặc: page.locator('aside').locator('..').locator('> div')

async function shootTabs(page, role, prefix, labels) {
  for (const label of labels) {
    await main.getByRole('button', { name: label, exact: true }).first().click()
    await page.waitForTimeout(1500)
    const slug = label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').toLowerCase()
    await page.screenshot({ path: `shots/${role}-${prefix}-${slug}.png`, fullPage: true })
    console.log(`${role}: đã chụp ${prefix}/${label}`)
  }
}

// Vào một lớp bất kỳ rồi chụp 4 tab
await page.getByRole('button', { name: 'Lớp Học', exact: true }).click()
await page.waitForTimeout(1500)
await main.locator('.card').first().click()
await page.waitForTimeout(1500)
await shootTabs(page, role, 'lop', ['Học Viên', 'Điểm Danh', 'Bài Tập', 'Mock Test'])

// Giảng Dạy: 3 tab
await page.getByRole('button', { name: 'Giảng Dạy', exact: true }).click()
await page.waitForTimeout(1500)
await shootTabs(page, role, 'giangday', ['Lịch Dạy', 'Bảng Lương', 'Tài Liệu'])
```

Nếu `main.locator('.card').first()` không mở được lớp nào (danh sách rỗng với vai giáo viên
đó), ghi ngay đó là một phát hiện — một giáo viên không được giao lớp nào nhìn thấy gì? — rồi
bỏ qua 4 tab lớp cho vai đó và ghi rõ trong báo cáo là chưa phủ.

Tổng cộng phải có 15 màn cho vai admin, 13 cho vai giáo viên (thiếu Học Phí và Admin).

- [ ] **Step 4: Đọc từng ảnh và ghi nhận**

Mở lần lượt từng ảnh trong `shots/`. Với **mỗi màn hình**, trả lời bốn câu và ghi vào
`findings-raw.md`:

1. **Tôi đang ở đâu?** Có tiêu đề trang không, sidebar có highlight đúng mục không.
2. **Tôi đi được đâu?** Các lối đi tiếp có nhìn thấy được không.
3. **Tôi đã đi qua đâu?** Có dấu vết nào không (app không có breadcrumb, nên câu trả lời nhiều khả năng là "không" — ghi lại mức độ nghiêm trọng theo từng màn, đừng ghi một lần rồi thôi).
4. **Giờ tôi làm được gì?** Hành động khả dụng có rõ không.

Cộng thêm bốn kiểm tra:
- Xếp hạng hành động trên màn theo tần suất — hành động hay dùng nhất có ở vị trí đắc địa không (Fitts: to, gần, hoặc sát cạnh màn hình).
- Đếm số lựa chọn top-level; quá ~7 mà không nhóm là một phát hiện.
- Nhóm bằng khoảng trắng hay bằng viền (Gestalt: khoảng trắng nhóm mạnh hơn viền).
- Có chỗ nào truyền thông tin **chỉ bằng màu** không (trạng thái điểm danh, trạng thái học phí, chip chấm công là ba chỗ nghi ngờ trước).

Định dạng mỗi mục trong `findings-raw.md`:

```markdown
## [Tên màn hình] — vai [admin|giáo viên]

- [H2-4 Consistency] Nút "Thêm" ở tab Học viên gọi là "＋ Thêm" nhưng ở Danh bạ gọi là
  "Thêm học sinh" — cùng một hành động, hai tên. shots/admin-lop-hoc.png
- [H2-1 Visibility] ...
```

Chưa chấm severity ở bước này. Chấm ở Task 6, sau khi đã thấy toàn cảnh.

- [ ] **Step 5: Kiểm tra không vỡ ở 768px và 375px**

Mobile không phải mục tiêu tối ưu, nhưng hard rule của `CLAUDE.md` vẫn yêu cầu không vỡ. Chạy
lại `capture.mjs` cho vai admin với hai viewport nhỏ, chỉ để phát hiện tràn ngang:

```javascript
// thêm vào capture.mjs, sau khi chụp mỗi màn:
const overflow = await page.evaluate(() =>
  document.documentElement.scrollWidth > document.documentElement.clientWidth
)
if (overflow) console.log(`TRÀN NGANG: ${role} ${label} @${page.viewportSize().width}px`)
```

```bash
cd $SCRATCH/audit
VIEWPORT=768 node capture.mjs admin
VIEWPORT=375 node capture.mjs admin
```
(Sửa `capture.mjs` để đọc `process.env.VIEWPORT`, mặc định 1280.)

Mỗi dòng `TRÀN NGANG` là một phát hiện — ghi vào `findings-raw.md` dưới `[H2-4 Consistency]`
hoặc `[H2-8 Aesthetic]` tùy chỗ, kèm màn hình và độ rộng.

- [ ] **Step 6: Verify**

```bash
ls $SCRATCH/audit/shots/*.png | wc -l
grep -c '^- \[H2-' $SCRATCH/audit/findings-raw.md
grep -c '^## ' $SCRATCH/audit/findings-raw.md
```
Expected: ít nhất 28 ảnh. Số dòng `## ` bằng 28 (15 màn admin + 13 màn giáo viên). Số phát
hiện lớn hơn 0 — nếu một màn nào không có mục nào, kiểm tra lại xem đã thực sự soi hay chưa,
đừng để trống vì lười.

- [ ] **Step 7: Không commit** — `findings-raw.md` là bản nháp trong scratchpad, không vào repo.

---

### Task 5: Vòng 2 — đi sáu luồng nghiệp vụ, hai vai

**Files:**
- Modify: `$SCRATCH/audit/findings-raw.md` (thêm mục cho từng luồng)

**Interfaces:**
- Consumes: `findings-raw.md` từ Task 4, storageState từ Task 3.
- Produces: `findings-raw.md` đầy đủ cả hai vòng — đầu vào duy nhất của Task 6.

**Ràng buộc read-only nhắc lại:** được mở modal, được điền form để xem validation phản ứng thế
nào, nhưng **đóng bằng Hủy hoặc Esc**. Không bấm Lưu, Tạo, Xóa, Ghi danh, Thanh toán, Chấm
công. Mọi thứ xảy ra *sau khi* bấm Lưu — toast, trạng thái "xong", xử lý lỗi — đánh giá bằng
đọc code, và **phải đánh dấu là suy ra từ code** khi ghi nhận.

- [ ] **Step 1: Luồng 1 — Điểm danh một buổi**

Đường đi: Dashboard → card "Lịch hôm nay" → nút "Điểm danh" → `ClassDetailPage` tab Attendance
→ chọn buổi → đánh dấu từng học viên. Cũng thử đường đi thứ hai: Lớp Học → chọn lớp → tab
Điểm danh.

Ghi: **số click** từ lúc đăng nhập tới lúc đánh dấu được học viên đầu tiên · có phải nhớ tên
lớp hay ngày từ màn trước không · trạng thái có/vắng/muộn phân biệt bằng gì ngoài màu · nếu
lớp chưa có buổi nào thì màn hình rỗng có nói làm gì tiếp không.

Chạy cả hai vai. Đọc `src/pages/ClassDetailPage/tabs/AttendanceTab.jsx` và
`src/components/attendance/AttendanceToggle.jsx` cho phần sau khi lưu.

- [ ] **Step 2: Luồng 2 — Thu học phí tháng (chỉ vai admin)**

Đường đi: Học Phí → chọn tháng/năm → lọc theo lớp → chọn học viên còn nợ → mở `PaymentModal`.

Ghi: bộ chọn tháng ở top bar có thấy rõ đang xem tháng nào không · tab lọc trạng thái có nói
rõ đang lọc gì không · trong `PaymentModal` ô chọn Lớp có tự chọn sẵn khi học viên chỉ học một
lớp không (rule 14: con số "còn nợ" có mở ra được dòng chi tiết không) · số tiền có định dạng
`vi-VN` nhất quán không.

Vai giáo viên: xác nhận mục Học Phí **không** hiện trong sidebar, và ghi nhận nếu có bất kỳ
chỗ nào khác trong app vẫn dẫn tới trang này.

- [ ] **Step 3: Luồng 3 — Ghi danh học viên vào lớp**

Ba đường đi khác nhau tồn tại — đi cả ba và so sánh, vì ba đường cùng làm một việc là dấu hiệu
kinh điển của H2-4:
1. `ClassDetailPage` tab Học viên → nút "＋ Thêm" → `BulkEnrollPickerModal`
2. `ClassDetailPage` tab Học viên → "Tạo mới" → `EnrollmentModal` (chỉ admin)
3. `StudentsDirectoryPage` → lọc theo một lớp → chế độ ghi danh → tick → `BulkFeeModal`

Ghi: ba đường có nhất quán về nhãn, thứ tự trường, cách đặt học phí không · `EnrollmentModal`
dài 700 dòng — đếm số trường trên một màn, có vượt ~7 mà không nhóm không · vai giáo viên có
bị chặn đúng chỗ không (`!isAdmin` phải ẩn toggle "Tạo học viên mới").

- [ ] **Step 4: Luồng 4 — Viết phiếu nhận xét và xuất PDF**

Đường đi: Nhận Xét → chọn lớp → chọn học viên → `ReviewForm` → xuất `ReportCardModal`.

Ghi: nếu học viên chưa có mock test thì nút "Thêm đánh giá" bị ẩn — người dùng có hiểu **vì
sao** không, hay chỉ thấy nút biến mất (đây là H2-9: hệ thống từ chối mà không giải thích) ·
ô nhập điểm có ràng buộc theo thang tối đa không · radar chart có đọc được không · xuất PDF có
progress indicator không (lazy-load `jspdf` + `html2canvas` mất thời gian thật).

- [ ] **Step 5: Luồng 5 — Nhập điểm mock test**

Đường đi: Lớp Học → chọn lớp → tab Mock Test → chọn đề → `MockTestScoreTable`.

Ghi: bảng nhập điểm có giữ được dữ liệu khi chuyển ô/chuyển trang không (hard rule 2 mới) ·
đi được bằng bàn phím từ ô này sang ô kia không · vai giáo viên: phải nhập được điểm nhưng
**không** tạo/sửa/xóa được đề — kiểm tra nút có bị ẩn chứ không phải bấm rồi mới báo lỗi
(H2-5: ngăn lỗi thay vì sửa lỗi).

- [ ] **Step 6: Luồng 6 — Chấm công và xem bảng lương**

Đường đi: Giảng Dạy → tab Lịch Dạy → chip chấm công trên `ScheduleCard` → tab Bảng Lương.

Ghi: chip có ba trạng thái với admin và hai với giáo viên — người dùng có đoán được trạng thái
tiếp theo khi bấm không, hay phải thử · trạng thái phân biệt bằng gì ngoài màu xám/xanh/đỏ ·
cột "Chưa XN" ở `PayrollTab` có giải thích được không · con số Lương có mở ra được danh sách
buổi đã cộng thành nó không (rule 14).

**Không bấm chip chấm công** — đó là thao tác ghi. Đọc `src/components/schedule/ScheduleCard.jsx`
và `src/utils/payroll.js` thay thế.

- [ ] **Step 7: Verify**

```bash
grep -c '^## Luồng' $SCRATCH/audit/findings-raw.md
grep -c 'số click' $SCRATCH/audit/findings-raw.md
grep -c 'suy ra từ code' $SCRATCH/audit/findings-raw.md
```
Expected: 6 mục luồng. Mỗi luồng có ghi số click. Có ít nhất vài mục đánh dấu "suy ra từ code"
— nếu không có mục nào thì nhiều khả năng đã bỏ qua phần sau-khi-lưu của mọi luồng.

- [ ] **Step 8: Không commit** — vẫn là bản nháp scratchpad.

---

### Task 6: Chấm điểm và xuất báo cáo

**Files:**
- Create: `docs/usability-audit-2026-09-04.md`

**Interfaces:**
- Consumes: `$SCRATCH/audit/findings-raw.md` — toàn bộ phát hiện của cả hai vòng.
- Produces: báo cáo đã xếp hạng. Task 7 đọc mục "Component đạt chuẩn" của báo cáo này.

- [ ] **Step 1: Chấm severity cho từng phát hiện**

Chấm **sau khi đã đi hết**, không chấm dọc đường. Severity = tần suất × tác động × tính lặp
lại:

| | Mức |
|---|---|
| 0 | Không đồng ý đây là vấn đề |
| 1 | Cosmetic |
| 2 | Minor |
| 3 | Major — quan trọng, phải sửa |
| 4 | Catastrophe — bắt buộc sửa |

Tần suất lấy từ vòng 2: một vấn đề nằm trên luồng điểm danh (làm mỗi buổi) nặng hơn cùng vấn
đề đó nằm trên `SettingsPage` (làm một lần). Vấn đề chỉ ảnh hưởng vai giáo viên vẫn tính đủ
trọng số — đừng hạ điểm vì "admin không gặp".

- [ ] **Step 2: Chấm fix difficulty riêng biệt**

Thang 0–4, 0 = sửa vài phút (đổi nhãn, thêm icon), 4 = phải đổi kiến trúc (ví dụ: thêm
react-router để có URL và breadcrumb thật). **Chấm độc lập với severity** — đó chính là cơ chế
lọc ra nhóm "hậu quả nặng, công sức rẻ".

- [ ] **Step 3: Viết báo cáo**

Tạo `docs/usability-audit-2026-09-04.md` theo bố cục:

```markdown
# Báo cáo Usability Audit — 2026-09-04

## Cách đọc báo cáo này
[Phương pháp: heuristic evaluation theo Nielsen H2, hai vòng overview/detail, hai vai,
dữ liệu Supabase thật, read-only. Định dạng [H2-x] [Severity] [Fix].]

## Làm ngay — severity ≥ 3, fix ≤ 1
[Bảng. Đây là phần có giá trị nhất: hậu quả nặng, sửa rẻ.]

## Toàn bộ phát hiện theo severity
### Severity 4
### Severity 3
### Severity 2
### Severity 1

## Phát hiện theo màn hình
[Nhóm lại cùng dữ liệu theo trang, để lúc sửa một trang thì thấy hết việc của trang đó.]

## Vấn đề hệ thống
[Những thứ không thuộc về một màn nào — ví dụ: không có URL routing nên không màn nào trả lời
được "tôi đã đi qua đâu"; màu là kênh duy nhất ở nhiều chỗ.]

## Component đạt chuẩn
[Những component làm đúng, dùng làm tham chiếu cho code mới. Task 7 lấy từ đây.]

## Giới hạn của báo cáo
- Một người đánh giá bắt được khoảng 35% vấn đề. Đây không phải bản đầy đủ; muốn lên ~75%
  cần thêm 2–4 người chạy cùng một lượt.
- Heuristic evaluation không trả lời được câu "giao diện có giải đúng bài toán không" — nó chỉ
  phát hiện giao diện dị dạng. Câu kia cần quan sát người dùng thật.
- Các phát hiện ở bước ghi dữ liệu là suy ra từ đọc code, không phải quan sát trực tiếp, vì
  đợt audit chạy read-only trên dữ liệu thật. Các mục này được đánh dấu riêng.
```

Mỗi phát hiện viết đủ: heuristic, severity, fix, mô tả, **vì sao người dùng nhầm**, trang và
file cụ thể. Không viết "cải thiện trải nghiệm" hay "làm cho trực quan hơn" — đó là những câu
không hành động được.

- [ ] **Step 4: Verify**

```bash
cd '/home/msi/My Projects/Ielts/CRMWeb'
grep -c '\[H2-' docs/usability-audit-2026-09-04.md
grep -c 'Severity 4\|Severity 3\|Severity 2\|Severity 1' docs/usability-audit-2026-09-04.md
grep -n 'TBD\|TODO\|sau này\|cần xem xét thêm' docs/usability-audit-2026-09-04.md
```
Expected: số phát hiện khớp với `findings-raw.md` (không được rơi rụng khi chuyển sang báo
cáo). Có đủ bốn mục severity. Lệnh cuối **không in gì** — báo cáo không được chứa chỗ để ngỏ.

- [ ] **Step 5: Commit**

```bash
git add docs/usability-audit-2026-09-04.md
git commit -m "docs: Add usability audit report for all screens and six core flows

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Điền reference implementations vào skill

**Files:**
- Modify: `.claude/skills/usability-review/SKILL.md`

**Interfaces:**
- Consumes: mục "Component đạt chuẩn" của `docs/usability-audit-2026-09-04.md`.
- Produces: skill hoàn chỉnh, mọi tham chiếu trỏ vào file có thật và đã kiểm chứng.

- [ ] **Step 1: Điền reference implementation cho rule 1**

Lấy từ mục "Component đạt chuẩn" của báo cáo những component **đã kiểm chứng** là truyền thông
tin bằng nhiều hơn một kênh. Thay dòng placeholder viết ở Task 1 Step 5 bằng đường dẫn thật.

**Nếu audit không tìm được component nào đạt chuẩn**, giữ nguyên dòng placeholder nhưng đổi
nội dung thành ghi chú thẳng thắn: `Reference implementations: chưa có — audit 2026-09-04
không tìm thấy component nào truyền thông tin bằng nhiều hơn một kênh. Xem
docs/usability-audit-2026-09-04.md.` Bịa ra một ví dụ tệ hơn là thừa nhận chưa có.

- [ ] **Step 2: Thêm con trỏ tới báo cáo**

Thêm vào cuối SKILL.md, ngay trước mục `## Source`:

```markdown
## Trạng thái hiện tại

Đợt heuristic evaluation gần nhất: `docs/usability-audit-2026-09-04.md` — toàn bộ màn hình và
sáu luồng nghiệp vụ, hai vai. Đọc nó trước khi sửa bất kỳ màn hình nào có tên trong đó.
```

- [ ] **Step 3: Verify**

```bash
cd '/home/msi/My Projects/Ielts/CRMWeb'
grep -n 'Reference implementations' .claude/skills/usability-review/SKILL.md
for f in $(grep -oE 'src/[A-Za-z0-9/._-]+\.jsx?' .claude/skills/usability-review/SKILL.md | sort -u); do test -f "$f" || echo "THIẾU: $f"; done
```
Expected: dòng reference implementations không còn chữ "chưa xác định". Vòng lặp **không in
dòng THIẾU nào** — mọi file được nhắc tên đều tồn tại.

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/usability-review/SKILL.md
git commit -m "docs(skill): fill verified reference implementations from the audit

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Dọn dẹp và báo cáo**

```bash
cd '/home/msi/My Projects/Ielts/CRMWeb'
git status --porcelain
git log --oneline -5
```
Expected: working tree sạch, bốn commit mới. Dừng dev server. Xác nhận với chủ sản phẩm rằng
`package.json` không đổi và không file audit tạm nào lọt vào repo.

Sau đó trình bày cho chủ sản phẩm: mục "Làm ngay" có bao nhiêu mục, và đề xuất mở một OpenSpec
change cho đợt sửa. **Không tự bắt tay sửa code** — đó là ngoài phạm vi kế hoạch này.
