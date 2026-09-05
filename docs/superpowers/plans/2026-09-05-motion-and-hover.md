# Hiệu ứng hover và chuyển động — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm chuyển động phục vụ chức năng — phản hồi khi tương tác và chuyển cảnh khi điều hướng — ở mức tinh tế, và tôn trọng `prefers-reduced-motion` vốn chưa được xử lý ở đâu trong repo.

**Architecture:** Thuần CSS là chính: một thang thời lượng ba mức và hai đường cong khai báo trong `tailwind.config.js`, các class dùng chung sửa trong `index.css`, chuyển cảnh trang/tab bằng `key` + animation có sẵn. Đúng một hook mới (`useMountTransition`) cho thứ CSS thuần không làm được là exit animation của Modal. Không thêm dependency.

**Tech Stack:** Tailwind CSS 3 · React 18 · CSS animation/transition · Playwright (chỉ để kiểm chứng, cài trong scratchpad)

## Global Constraints

- **Không thêm dependency nào vào `package.json`.** Đã cân nhắc và loại `framer-motion` (~30KB gzip trên bundle 263KB gzip).
- **Cường độ tinh tế:** 120–240ms, dịch chuyển 1–4px. Đây là app nhập liệu dùng hàng ngày.
- **Ba mức thời lượng và không hơn:** `fast` 120ms (màu/nền/viền), `base` 180ms (dịch chuyển/bóng), `slow` 240ms (chuyển cảnh trang/modal).
- **Mọi thứ phải tôn trọng `prefers-reduced-motion: reduce`** — kể cả độ trễ tính bằng JS, không chỉ CSS.
- **Không có test runner trong repo.** Bước "verify" là `npm run build`, grep, và ảnh chụp màn hình từ app thật — không cài test runner để cho đúng hình thức TDD.
- Repo dùng `clsx()` cho conditional class, **không** template literal. Import qua alias `@/`.
- Mỗi task kết thúc bằng một commit.

## File Structure

**Sửa:**
- `tailwind.config.js` — thang thời lượng, hai đường cong, hai keyframe exit
- `src/index.css` — khối `prefers-reduced-motion`, tách `.card`/`.card-interactive`, thêm `.pressable`
- `src/components/ui/index.jsx` — `Card` (gắn class theo `onClick`), `StatCard` (thêm prop `onClick`), `Modal` (dùng hook)
- `src/pages/DashboardPage.jsx` — bỏ 4 div bọc, truyền `onClick` vào `StatCard`
- `src/components/schedule/ScheduleCard.jsx` — bỏ hover viết tay, dùng `.card-interactive`
- `src/App.jsx` — `key` chuyển cảnh trang
- `src/pages/ClassDetailPage/index.jsx`, `src/pages/SchedulePage.jsx` — `key` chuyển cảnh tab
- `src/components/students/StudentSidebar.jsx`, `src/pages/FeesPage.jsx`, `src/components/layout/Navbar.jsx` — gắn `.pressable`
- `CLAUDE.md` — ghi quy ước mới

**Tạo:**
- `src/hooks/useMountTransition.js`

**Scratchpad (KHÔNG vào repo):** `$SCRATCH/motion/` — Playwright + ảnh chụp kiểm chứng.
`$SCRATCH` = `/tmp/claude-1000/-home-msi-My-Projects-Ielts-CRMWeb/9d427353-b1bd-41b4-9200-c42a7a91b4b8/scratchpad`

---

### Task 1: Token chuyển động và reduced-motion

**Files:**
- Modify: `tailwind.config.js:42-54` (khối `animation` và `keyframes`)
- Modify: `src/index.css` (thêm khối media query vào lớp `base`)

**Interfaces:**
- Consumes: không có (task đầu tiên)
- Produces: các class Tailwind `duration-fast` / `duration-base` / `duration-slow`, `ease-out-soft` / `ease-in-soft`, và animation `animate-slide-down-out` / `animate-fade-out`. Task 2, 3, 4 dùng đúng các tên này.

- [ ] **Step 1: Thêm thang thời lượng và đường cong**

Trong `tailwind.config.js`, thêm vào `theme.extend` (ngang hàng với `animation`):

```js
      transitionDuration:       { fast: '120ms', base: '180ms', slow: '240ms' },
      transitionTimingFunction: {
        'out-soft': 'cubic-bezier(0.2, 0, 0, 1)',
        'in-soft':  'cubic-bezier(0.4, 0, 1, 1)',
      },
```

- [ ] **Step 2: Thêm hai animation exit**

Trong cùng file, thêm vào `theme.extend.animation`:

```js
        'slide-down-out': 'slideDownOut 0.24s cubic-bezier(0.4,0,1,1)',
        'fade-out':       'fadeOut 0.24s cubic-bezier(0.4,0,1,1)',
```

và vào `theme.extend.keyframes`:

```js
        slideDownOut: { from: { opacity: 1, transform: 'translateY(0)' },
                        to:   { opacity: 0, transform: 'translateY(8px)' } },
        fadeOut:      { from: { opacity: 1 }, to: { opacity: 0 } },
```

- [ ] **Step 3: Thêm khối reduced-motion**

Trong `src/index.css`, ngay sau khối `*:focus-visible` (khoảng dòng 62), bên trong
`@layer base`:

```css
  /* Tôn trọng prefers-reduced-motion: một số người bật thiết lập này vì chuyển động
     gây chóng mặt hoặc buồn nôn thật sự. Tắt cả animation lặp vô hạn (shimmer). */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
```

- [ ] **Step 4: Verify build và token sinh ra đúng class**

```bash
cd '/home/msi/My Projects/Ielts/CRMWeb'
npm run build 2>&1 | grep -E "error|✓ built"
grep -c "prefers-reduced-motion" dist/assets/*.css
```
Expected: `✓ built`. Lệnh grep in `1` — khối media query có mặt trong CSS đã build. Nếu in `0`
thì khối đang bị đặt ngoài `@layer base` hoặc bị Tailwind purge, phải sửa lại vị trí.

- [ ] **Step 5: Commit**

```bash
git add tailwind.config.js src/index.css
git commit -m "$(cat <<'EOF'
feat(motion): add duration/easing tokens and honour prefers-reduced-motion

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Tách `.card` / `.card-interactive` và thêm `.pressable`

**Files:**
- Modify: `src/index.css` (khối `.card` khoảng dòng 102-105; thêm `.card-interactive` và `.pressable`)
- Modify: `src/components/ui/index.jsx` (`Card` khoảng dòng 40-47, `StatCard` khoảng dòng 149-172)
- Modify: `src/pages/DashboardPage.jsx:126-165`
- Modify: `src/components/schedule/ScheduleCard.jsx` (khối className của card, khoảng dòng 123-131)

**Interfaces:**
- Consumes: `duration-base`, `ease-out-soft`, `duration-fast` từ Task 1.
- Produces: class `.card-interactive` và `.pressable`; `StatCard` nhận thêm prop `onClick` (kiểu `() => void`, optional). Task 5 gắn `.pressable` vào các control khác.

- [ ] **Step 1: Tách class card trong `index.css`**

Thay khối `.card` hiện tại:

```css
  .card {
    @apply bg-white rounded-2xl border border-navy-100 shadow-navy-sm
           transition-shadow duration-200 hover:shadow-navy;
  }
```

bằng:

```css
  /* .card tĩnh — không hover. Chỉ thẻ thật sự bấm được mới dùng .card-interactive,
     nếu không hiệu ứng nhấc lên là một lời hứa sai (false affordance). */
  .card {
    @apply bg-white rounded-2xl border border-navy-100 shadow-navy-sm;
  }
  .card-interactive {
    @apply card transition-all duration-base ease-out-soft
           hover:shadow-navy hover:-translate-y-0.5;
  }
```

- [ ] **Step 2: Thêm `.pressable`**

Ngay sau khối `.card-interactive`:

```css
  /* Phản hồi khi nhấn cho control không dùng .btn (chip lọc, tab, mục nav). */
  .pressable {
    @apply transition-transform duration-fast active:scale-[0.97];
  }
```

- [ ] **Step 3: `Card` gắn class theo `onClick`**

Trong `src/components/ui/index.jsx`, thay:

```jsx
export const Card = ({ children, className, onClick, navy }) => (
  <div
    onClick={onClick}
    className={clsx(navy ? 'card-navy' : 'card', onClick && 'cursor-pointer', className)}
  >
    {children}
  </div>
)
```

bằng:

```jsx
export const Card = ({ children, className, onClick, navy }) => (
  <div
    onClick={onClick}
    className={clsx(
      navy ? 'card-navy' : (onClick ? 'card-interactive' : 'card'),
      onClick && 'cursor-pointer',
      className
    )}
  >
    {children}
  </div>
)
```

- [ ] **Step 4: `StatCard` nhận `onClick`**

`StatCard` hiện không có prop `onClick`, nên quy tắc của `Card` không với tới nó. Thay dòng
signature và thẻ bọc ngoài:

```jsx
export const StatCard = ({ label, value, sub, icon, accent, className, onClick }) => (
  <div
    onClick={onClick}
    className={clsx('stat-card', onClick && 'card-interactive cursor-pointer', className)}
  >
```

(phần thân bên trong giữ nguyên hoàn toàn.)

`.stat-card` trong `index.css` (`@apply card p-5 flex flex-col gap-1`) **không cần sửa**: sau
Step 1 thì `.card` đã hết hover, nên `.stat-card` tự động thành tĩnh. Hover chỉ quay lại khi
`StatCard` được truyền `onClick` và tự thêm `card-interactive`.

- [ ] **Step 5: `DashboardPage` truyền `onClick` thẳng vào StatCard**

Bốn thẻ ở `DashboardPage.jsx:126-165` đang bọc ngoài bằng `<div className="cursor-pointer" onClick={...}>`.
Bỏ div bọc, chuyển `onClick` vào chính `StatCard`. Ví dụ thẻ đầu tiên:

```jsx
        <StatCard
          label="Học Sinh"
          value={students.length}
          sub={`${classes.length} lớp`}
          icon={<Users size={16} />}
          accent="navy"
          className="h-full"
          onClick={() => onNavigate('students')}
        />
```

Làm tương tự cho ba thẻ còn lại, giữ nguyên đích điều hướng của từng thẻ:
`classes` · `fees` · `fees`.

- [ ] **Step 6: `ScheduleCard` dùng class chung**

Trong `src/components/schedule/ScheduleCard.jsx`, khối className của card ngoài cùng đang là:

```jsx
        'group relative rounded-xl border p-2.5 cursor-pointer transition-all duration-150',
        'hover:shadow-md hover:-translate-y-0.5',
```

Thay hai dòng đó bằng:

```jsx
        'group relative rounded-xl border p-2.5 cursor-pointer',
        'transition-all duration-base ease-out-soft hover:shadow-navy hover:-translate-y-0.5',
```

Không dùng thẳng `.card-interactive` ở đây vì card lịch có `rounded-xl`, viền và nền riêng
theo loại khóa (`color.bg`, `color.border`) — dùng class kia sẽ ghi đè mất. Điều cần thống
nhất là **giá trị bóng và thời lượng**, và hai dòng trên làm đúng việc đó.

- [ ] **Step 7: Verify**

```bash
cd '/home/msi/My Projects/Ielts/CRMWeb'
npm run build 2>&1 | grep -E "error|✓ built"
grep -c 'className="cursor-pointer" onClick' src/pages/DashboardPage.jsx
grep -n "card-interactive\|pressable" src/index.css src/components/ui/index.jsx
```
Expected: `✓ built`. Lệnh grep thứ hai in `0` (đã bỏ hết div bọc). Lệnh cuối in các dòng định
nghĩa `.card-interactive`, `.pressable` trong CSS và hai chỗ dùng trong `ui/index.jsx`.

- [ ] **Step 8: Commit**

```bash
git add src/index.css src/components/ui/index.jsx src/pages/DashboardPage.jsx src/components/schedule/ScheduleCard.jsx
git commit -m "$(cat <<'EOF'
fix(ui): only lift cards that are actually clickable

.card mất hover; .card-interactive mới mang hover và chỉ được gắn khi có
onClick. StatCard nhận prop onClick nên 4 thẻ Dashboard bỏ được div bọc,
còn 8 thẻ ở Học phí và Admin thôi hứa hẹn sai.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Hook `useMountTransition` và exit animation cho Modal

**Files:**
- Create: `src/hooks/useMountTransition.js`
- Modify: `src/components/ui/index.jsx` (`Modal`, khoảng dòng 69-131)
- Modify: `src/index.css` (`.modal-overlay`, `.modal-box` khoảng dòng 195-204)

**Interfaces:**
- Consumes: `animate-slide-down-out`, `animate-fade-out` từ Task 1.
- Produces: `useMountTransition(isOpen: boolean, duration?: number) => boolean` — trả `true` khi DOM còn phải sống. `Modal` giữ nguyên API công khai (`open`, `onClose`, `title`, `children`, `footer`), không component gọi nào phải sửa.

- [ ] **Step 1: Viết hook**

Tạo `src/hooks/useMountTransition.js`:

```js
import { useState, useEffect } from 'react'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Giữ DOM sống thêm `duration` ms sau khi isOpen chuyển sang false, để kịp chạy
 * exit animation. Trả về true khi còn phải render.
 *
 * Với người bật prefers-reduced-motion, CSS đã rút animation về 0.01ms nhưng
 * setTimeout thì không — nên phải tự đọc matchMedia và bỏ hẳn độ trễ, nếu không
 * overlay vô hình sẽ chặn click thêm một phần tư giây với đúng nhóm người dùng
 * mà thiết lập đó định bảo vệ.
 */
export const useMountTransition = (isOpen, duration = 240) => {
  const [mounted, setMounted] = useState(isOpen)

  useEffect(() => {
    if (isOpen) { setMounted(true); return }
    const delay = prefersReducedMotion() ? 0 : duration
    const t = setTimeout(() => setMounted(false), delay)
    return () => clearTimeout(t)
  }, [isOpen, duration])

  return mounted
}
```

- [ ] **Step 2: Bỏ animation cố định khỏi class modal**

Trong `src/index.css`, animation đang được nhét cứng vào class nên không đổi được theo trạng
thái. Bỏ ra để `Modal` tự chọn:

```css
  .modal-overlay {
    @apply fixed inset-0 bg-navy-950/40 backdrop-blur-sm z-50
           flex items-center justify-center p-4;
  }
  .modal-box {
    @apply bg-white rounded-3xl shadow-navy-xl w-full max-w-lg
           overflow-hidden
           flex flex-col max-h-[90vh];
  }
```
(đã xóa `animate-fade-in` ở overlay và `animate-slide-up` ở box.)

- [ ] **Step 3: `Modal` dùng hook và chọn animation theo trạng thái**

Trong `src/components/ui/index.jsx`, thêm import ở đầu file:

```jsx
import { useMountTransition } from '@/hooks/useMountTransition'
```

Trong thân `Modal`, ngay sau `const titleId = useId()`:

```jsx
  const mounted = useMountTransition(open, 240)
```

Thay `if (!open) return null` bằng `if (!mounted) return null`, rồi gắn animation theo `open`:

```jsx
    <div
      className={clsx('modal-overlay', open ? 'animate-fade-in' : 'animate-fade-out')}
      onClick={e => e.target === e.currentTarget && onClose?.()}
    >
      <div
        className={clsx('modal-box', open ? 'animate-slide-up' : 'animate-slide-down-out')}
        ref={boxRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
```

**Giữ nguyên `useEffect` hiện có** (Esc, focus trap, khóa scroll nền) chạy theo `open` chứ
không theo `mounted` — trong 240ms đang đóng thì Esc và focus trap đã ngừng tác dụng, đúng ý
muốn, và scroll nền được trả lại ngay.

- [ ] **Step 4: Verify build và kiểm tra không component nào phải sửa theo**

```bash
cd '/home/msi/My Projects/Ielts/CRMWeb'
npm run build 2>&1 | grep -E "error|✓ built"
grep -rn "<Modal" --include='*.jsx' src | wc -l
grep -n "if (!mounted) return null" src/components/ui/index.jsx
```
Expected: `✓ built`. Lệnh thứ hai in số modal đang dùng (chỉ để biết phạm vi ảnh hưởng — API
không đổi nên không cần sửa chỗ nào). Lệnh cuối in đúng một dòng.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useMountTransition.js src/components/ui/index.jsx src/index.css
git commit -m "$(cat <<'EOF'
feat(motion): animate modal on close, not just on open

Hook giữ DOM sống thêm 240ms để chạy exit animation, và tự bỏ độ trễ khi
người dùng bật prefers-reduced-motion — nếu không overlay vô hình sẽ chặn
click với đúng nhóm mà thiết lập đó bảo vệ.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Chuyển cảnh đổi trang và đổi tab

**Files:**
- Modify: `src/App.jsx:222-224`
- Modify: `src/pages/ClassDetailPage/index.jsx:147-160`
- Modify: `src/pages/SchedulePage.jsx` (khối nội dung sau dãy tab, từ khoảng dòng 344)

**Interfaces:**
- Consumes: `animate-fade-in` (đã có sẵn từ trước).
- Produces: không có gì cho task sau.

- [ ] **Step 1: Chuyển cảnh đổi trang**

Trong `src/App.jsx`, thay:

```jsx
        <div className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
          {renderPage()}
        </div>
```

bằng:

```jsx
        <div key={currentPage} className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 animate-fade-in">
          {renderPage()}
        </div>
```

`key` không đổi hành vi: các trang vốn là component khác nhau nên đã remount sẵn khi đổi
trang. Trong trang `classes`, chuyển list ↔ detail không đổi `currentPage` nên không remount —
đúng như hiện tại.

- [ ] **Step 2: Chuyển cảnh đổi tab ở ClassDetailPage**

Thay `<div className="flex-1 pt-5">` (dòng 147) bằng:

```jsx
      <div key={activeTab} className="flex-1 pt-5 animate-fade-in">
```

- [ ] **Step 3: Chuyển cảnh đổi tab ở SchedulePage**

`SchedulePage` không có một thẻ bọc chung cho nội dung tab — ba khối
`{activeTab === '...' && (...)}` nằm thẳng dưới dãy tab. Bọc cả ba khối đó lại:

```jsx
      <div key={activeTab} className="animate-fade-in">
        {activeTab === 'schedule' && (
          ...giữ nguyên toàn bộ khối cũ...
        )}
        {activeTab === 'payroll' && (
          ...giữ nguyên...
        )}
        {activeTab === 'materials' && (
          ...giữ nguyên...
        )}
      </div>
```

Chỉ thêm thẻ bọc, không sửa nội dung bên trong. Chú ý thẻ bọc phải đóng **sau** khối
`materials` và **trước** phần render `ScheduleModal` ở cuối component — nếu bọc cả modal vào
thì modal sẽ remount mỗi lần đổi tab.

- [ ] **Step 4: Verify**

```bash
cd '/home/msi/My Projects/Ielts/CRMWeb'
npm run build 2>&1 | grep -E "error|✓ built"
grep -n "key={currentPage}" src/App.jsx
grep -n "key={activeTab}" src/pages/ClassDetailPage/index.jsx src/pages/SchedulePage.jsx
```
Expected: `✓ built` và ba dòng `key=` xuất hiện đúng ba chỗ.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/pages/ClassDetailPage/index.jsx src/pages/SchedulePage.jsx
git commit -m "$(cat <<'EOF'
feat(motion): fade page and tab content on switch

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Gắn `.pressable` vào các control không dùng `.btn`

**Files:**
- Modify: `src/components/students/StudentSidebar.jsx` (2 nút header, 4 chip lọc)
- Modify: `src/pages/FeesPage.jsx` (4 tab lọc trạng thái)
- Modify: `src/components/layout/Navbar.jsx` (mục nav sidebar + bottom nav)
- Modify: `src/pages/ClassDetailPage/index.jsx` (4 nút tab)
- Modify: `src/pages/SchedulePage.jsx` (3 nút tab)
- Modify: `src/components/schedule/ScheduleCard.jsx` (chip chấm công)

**Interfaces:**
- Consumes: class `.pressable` từ Task 2.
- Produces: không có gì cho task sau.

- [ ] **Step 1: `StudentSidebar`**

Thêm `pressable` vào className của hai nút header (`id="add-student-btn"`,
`id="create-student-btn"`) và của nút chip lọc trong vòng lặp `FILTER_TABS.map`. Ví dụ chip:

```jsx
              className={clsx(
                'py-1 text-xs font-medium rounded-lg transition-all whitespace-nowrap pressable',
```

- [ ] **Step 2: `FeesPage` — 4 tab lọc trạng thái**

Trong vòng lặp `PAYMENT_TABS.map`, thêm `pressable` vào chuỗi class tĩnh:

```jsx
              className={clsx(
                'px-3 py-1.5 rounded-xl text-sm font-medium transition-all pressable',
```

- [ ] **Step 3: `Navbar`**

Ba chỗ: vòng lặp `navItems.map` của sidebar desktop, nút Admin ngay dưới nó, và các nút trong
bottom nav mobile. Cùng một cách — thêm `pressable` vào chuỗi class tĩnh trong `clsx`:

```jsx
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 w-full text-left pressable',
                activePage === id
                  ? 'bg-white/15 text-white'
                  : 'text-navy-300 hover:bg-white/8 hover:text-white'
              )}
```

Nút Admin có thêm `border-t border-navy-700 mt-1 pt-4` trong chuỗi tĩnh — giữ nguyên, chỉ nối
thêm `pressable`.

- [ ] **Step 4: Nút tab ở `ClassDetailPage` và `SchedulePage`**

`ClassDetailPage`: thêm `pressable` vào className của nút trong `TABS.map`.
`SchedulePage`: thêm vào cả ba nút `Lịch dạy` / `Bảng lương` / `Tài liệu`:

```jsx
            'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px pressable',
```

- [ ] **Step 5: Chip chấm công ở `ScheduleCard`**

Thêm `pressable` vào chuỗi class của nút chip:

```jsx
            'mt-2 w-full inline-flex items-center justify-center gap-1 px-1 py-1 rounded-lg text-[11px] font-semibold border transition-colors pressable',
```

- [ ] **Step 6: Verify**

```bash
cd '/home/msi/My Projects/Ielts/CRMWeb'
npm run build 2>&1 | grep -E "error|✓ built"
grep -rn "pressable" --include='*.jsx' src | wc -l
```
Expected: `✓ built`. Số chỗ dùng `pressable` ít nhất là 10 (2 nút + 1 chip lọc ở
StudentSidebar, 1 ở FeesPage, 3 ở Navbar, 1 ở ClassDetailPage, 3 ở SchedulePage, 1 ở
ScheduleCard — các vòng lặp tính một lần).

- [ ] **Step 7: Commit**

```bash
git add src
git commit -m "$(cat <<'EOF'
feat(motion): add press feedback to controls that do not use .btn

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Kiểm chứng bằng quan sát, gồm cả reduced-motion

**Files:**
- Create: `$SCRATCH/motion/check.mjs`, `$SCRATCH/motion/shots/*.png`
- Không sửa file nào trong repo ở task này.

**Interfaces:**
- Consumes: toàn bộ thay đổi của Task 1–5.
- Produces: kết luận đưa vào Task 7 (`CLAUDE.md`) và báo lại cho chủ sản phẩm.

- [ ] **Step 1: Dựng môi trường**

```bash
cd '/home/msi/My Projects/Ielts/CRMWeb' && npm run dev &
SCRATCH=/tmp/claude-1000/-home-msi-My-Projects-Ielts-CRMWeb/9d427353-b1bd-41b4-9200-c42a7a91b4b8/scratchpad
mkdir -p $SCRATCH/motion/shots && cd $SCRATCH/motion
npm init -y >/dev/null && npm i playwright
```
Ghi lại cổng thật mà Vite in ra (5173 nếu trống, 5174 nếu đã có tiến trình khác chiếm).
**Không chạy `npm i` trong thư mục repo.**

- [ ] **Step 2: Viết script kiểm chứng**

Tạo `$SCRATCH/motion/check.mjs` — chạy được ở cả hai chế độ chuyển động:

```javascript
import { chromium } from 'playwright'

const BASE = process.env.BASE ?? 'http://localhost:5173/'
const reduced = process.env.REDUCED === '1'
const tag = reduced ? 'reduced' : 'normal'

const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  reducedMotion: reduced ? 'reduce' : 'no-preference',
})
const page = await ctx.newPage()
await page.goto(BASE)
await page.getByRole('textbox').first().fill(process.env.AUDIT_EMAIL)
await page.locator('input[type="password"]').fill(process.env.AUDIT_PASS)
await page.getByRole('button', { name: /đăng nhập/i }).click()
await page.waitForSelector('nav', { timeout: 20000 })
await page.waitForTimeout(2500)

// 1. Thẻ bấm được nhấc lên, thẻ không bấm được đứng yên
await page.locator('.stat-card').first().hover()
await page.waitForTimeout(400)
await page.screenshot({ path: `shots/${tag}-dashboard-hover.png` })

await page.getByRole('button', { name: 'Học phí', exact: true }).click()
await page.waitForTimeout(2200)
await page.locator('.stat-card').first().hover()
await page.waitForTimeout(400)
await page.screenshot({ path: `shots/${tag}-fees-hover.png` })

// 2. Skeleton còn nhìn ra là đang tải không (chụp ngay khi vừa đổi trang)
await page.getByRole('button', { name: 'Báo cáo', exact: true }).click()
await page.waitForTimeout(150)
await page.screenshot({ path: `shots/${tag}-loading.png` })

// 3. Modal đóng xong click được ngay chưa — phép thử cái bẫy setTimeout
await page.getByRole('button', { name: 'Học phí', exact: true }).click()
await page.waitForTimeout(2200)
await page.getByRole('button', { name: /ghi nhận thanh toán/i }).click()
await page.waitForTimeout(600)
await page.screenshot({ path: `shots/${tag}-modal-open.png` })
await page.keyboard.press('Escape')
const t0 = Date.now()
// Nếu overlay vô hình còn chặn, click này sẽ timeout
await page.getByRole('button', { name: /ghi nhận thanh toán/i })
  .click({ timeout: 3000 })
  .then(() => console.log(`${tag}: click lại được sau ${Date.now() - t0}ms`))
  .catch(() => console.log(`${tag}: THẤT BẠI — overlay còn chặn click sau khi đóng modal`))

await browser.close()
```

- [ ] **Step 3: Chạy cả hai chế độ**

```bash
cd $SCRATCH/motion
BASE='http://localhost:5173/' AUDIT_EMAIL='<email admin>' AUDIT_PASS='<mật khẩu>' node check.mjs
BASE='http://localhost:5173/' REDUCED=1 AUDIT_EMAIL='<email admin>' AUDIT_PASS='<mật khẩu>' node check.mjs
```
(Thay `BASE` bằng cổng thật ở Step 1; thông tin đăng nhập truyền qua biến môi trường, **không
ghi vào file nào trong repo**.)

Expected: cả hai lượt in `click lại được sau ...ms`. Lượt `normal` khoảng 250–400ms; lượt
`reduced` phải **dưới 150ms** — nếu nó cũng ~250ms thì hook đang không đọc `matchMedia`, quay
lại Task 3 Step 1.

Nếu bất kỳ lượt nào in `THẤT BẠI` thì dừng lại và sửa Task 3 trước khi đi tiếp.

- [ ] **Step 4: Đọc ảnh và đối chiếu ba điều**

Mở lần lượt các ảnh trong `shots/` và xác nhận:

1. `normal-dashboard-hover.png` — thẻ đầu tiên **có** nhấc lên và đổ bóng (Dashboard bấm được).
2. `normal-fees-hover.png` — thẻ đầu tiên **đứng yên**, không bóng (Học phí không bấm được).
3. `reduced-loading.png` — skeleton **vẫn nhìn ra là đang tải**: còn nền gradient xám, phân
   biệt được với vùng trắng trống. Đây là điểm spec yêu cầu kiểm tra thực tế chứ không mặc
   định. Nếu skeleton trở nên vô hình thì phải cho `.skeleton` một nền tĩnh rõ hơn dưới
   `prefers-reduced-motion` và ghi lại việc đó.

- [ ] **Step 5: Dọn dẹp**

```bash
cd '/home/msi/My Projects/Ielts/CRMWeb'
git status --porcelain
git diff --stat HEAD -- package.json package-lock.json
```
Expected: không file tạm nào của task này lọt vào repo; `package.json` và `package-lock.json`
không đổi. Tắt dev server.

- [ ] **Step 6: Không commit** — task này không tạo file nào trong repo.

---

### Task 7: Ghi quy ước vào CLAUDE.md

**Files:**
- Modify: `CLAUDE.md` (mục `### Design system`)

**Interfaces:**
- Consumes: kết luận từ Task 6 (đặc biệt là hành vi skeleton dưới reduced-motion).
- Produces: tài liệu chốt, không có gì cho task sau.

- [ ] **Step 1: Thêm mục chuyển động**

Trong `CLAUDE.md`, thêm vào cuối mục `### Design system` (ngay trước `### Phân quyền UI`):

```markdown
- **Chuyển động:** ba mức thời lượng, không hơn — `duration-fast` (120ms) cho màu/nền/viền,
  `duration-base` (180ms) cho dịch chuyển/bóng, `duration-slow` (240ms) cho chuyển cảnh
  trang/modal. Đường cong: `ease-out-soft` khi vào, `ease-in-soft` khi ra. Mức tinh tế —
  dịch chuyển tối đa 4px; đây là app nhập liệu dùng hàng ngày, chuyển động rõ rệt thành ma
  sát lặp lại.
- **`prefers-reduced-motion` là bắt buộc.** `index.css` có khối tắt animation toàn cục. Mọi
  độ trễ tính bằng JS (`setTimeout` chờ exit animation) cũng phải tự đọc
  `matchMedia('(prefers-reduced-motion: reduce)')` và bỏ độ trễ — CSS không rút ngắn
  `setTimeout` hộ. Xem `src/hooks/useMountTransition.js`.
- **Chỉ thẻ bấm được mới nhấc lên.** `.card` tĩnh; `.card-interactive` mang hover và chỉ được
  gắn khi có `onClick` (xem `Card` và `StatCard` trong `components/ui/index.jsx`). Thẻ nhấc
  lên mà bấm không có gì là một lời hứa sai.
- **Control không dùng `.btn` thì gắn `.pressable`** để có phản hồi khi nhấn — chip lọc, tab,
  mục nav, chip chấm công.
```

- [ ] **Step 2: Ghi kết luận về skeleton**

Nếu Task 6 Step 4 phát hiện skeleton cần nền tĩnh rõ hơn dưới `prefers-reduced-motion`, thêm
một dòng nữa mô tả đúng cách đã xử lý. Nếu skeleton vẫn nhìn ra được mà không cần sửa gì,
thêm dòng này để đợt sau khỏi kiểm tra lại:

```markdown
- Dưới `prefers-reduced-motion`, shimmer của `.skeleton` bị tắt (animation lặp vô hạn) nhưng
  nền gradient tĩnh vẫn đủ để nhận ra đang tải — đã kiểm chứng 2026-09-05.
```

- [ ] **Step 3: Verify**

```bash
cd '/home/msi/My Projects/Ielts/CRMWeb'
grep -n "duration-fast\|prefers-reduced-motion\|card-interactive\|pressable" CLAUDE.md
```
Expected: in ra các dòng vừa thêm.

- [ ] **Step 4: Commit và báo cáo**

```bash
git add CLAUDE.md
git commit -m "$(cat <<'EOF'
docs: Record motion conventions in CLAUDE.md

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
git log --oneline -7
git status --porcelain
```
Expected: working tree sạch, 6 commit mới (Task 6 không tạo commit).

Báo lại cho chủ sản phẩm: kết quả hai lượt kiểm chứng (thời gian click lại được ở chế độ
thường và chế độ reduced-motion), và tình trạng skeleton dưới reduced-motion.
