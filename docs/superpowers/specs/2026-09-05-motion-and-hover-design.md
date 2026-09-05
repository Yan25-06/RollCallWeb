# Thiết kế: Hiệu ứng hover và chuyển động

Ngày: 2026-09-05

## Bối cảnh

Yêu cầu: web "sinh động hơn". Sau khi làm rõ, phạm vi thu về hai loại chuyển động **phục vụ
chức năng**, không phải trang trí:

1. **Phản hồi rõ hơn khi tương tác** — hover, nhấn, focus.
2. **Chuyển cảnh mượt khi điều hướng** — đổi trang, đổi tab, mở/đóng modal.

Loại trừ khỏi phạm vi: hiệu ứng dữ liệu (số đếm tăng dần, biểu đồ vẽ dần) và trang trí thần
thái thương hiệu (icon nhún nhảy, gradient chạy, hiệu ứng ăn mừng).

**Cường độ: tinh tế** — 120–240ms, dịch chuyển 1–4px. Người dùng cảm được app mượt nhưng
không chỉ ra được hiệu ứng nào. Đây là app nhập liệu dùng hàng ngày; chuyển động rõ rệt sẽ
thành ma sát lặp lại với admin làm hàng chục thao tác mỗi ngày.

## Hiện trạng

Repo đã có nền tảng, không phải xây từ đầu:

- 5 animation token trong `tailwind.config.js`: `fade-in`, `slide-up`, `slide-down`,
  `pulse-soft`, `shimmer`.
- `.btn` đã có `transition-all duration-200` và **`active:scale-[0.97]`**; `.btn-primary` có
  `active:bg-navy-900`.
- `*:focus-visible` có outline 2px navy-500, offset 2px — đạt chuẩn, không cần đụng.
- `.card` có `transition-shadow duration-200 hover:shadow-navy`.
- Hàng bảng có `transition-colors duration-150 hover:bg-navy-50`.

**Lỗ hổng lớn nhất: không có chỗ nào trong repo xử lý `prefers-reduced-motion`.** Một số
người bật thiết lập này vì chuyển động gây chóng mặt hoặc buồn nôn thật sự. Thêm chuyển động
mà không tôn trọng nó thì càng thêm càng hại.

## Hướng kỹ thuật đã chọn

**Thuần CSS, cộng một hook tự viết cho exit animation của Modal.** Không thêm dependency.

Đã cân nhắc và loại `framer-motion`: nó tốn **~30KB gzip** thêm vào bundle đang là 263KB
gzip, và phần lợi lớn nhất của nó — chuyển cảnh giữa route — không dùng được vì app không
dùng react-router. Cái duy nhất CSS thuần chịu thua là exit animation (Modal hiện
`return null` ngay khi `open=false`), và một hook ~15 dòng giải quyết đúng chỗ đó.

Cũng đã loại phương án CSS thuần túy không hook: nó để lại điểm chướng "mở thì mượt, đóng thì
giật" mà mắt bắt được ngay và phá vỡ đúng cảm giác mượt đang muốn đạt.

## Phần 1 — Token chuyển động và reduced-motion

### Token

Thêm vào `tailwind.config.js` → `theme.extend`:

```js
transitionDuration:       { fast: '120ms', base: '180ms', slow: '240ms' },
transitionTimingFunction: {
  'out-soft': 'cubic-bezier(0.2, 0, 0, 1)',   // vào: giảm tốc, cảm giác "đáp xuống"
  'in-soft':  'cubic-bezier(0.4, 0, 1, 1)',   // ra: tăng tốc, biến đi nhanh
},
```

Quy tắc gán, **ba mức và không hơn** (thêm mức thứ tư là bắt đầu tùy tiện):

| Loại thay đổi | Thời lượng |
|---|---|
| Màu, nền, viền | `fast` (120ms) |
| Dịch chuyển, bóng | `base` (180ms) |
| Chuyển cảnh trang / modal | `slow` (240ms) |

Thêm hai keyframe mới cho exit của Modal — một cho hộp thoại, một cho lớp phủ:

```js
slideDownOut: { from: { opacity: 1, transform: 'translateY(0)' },
                to:   { opacity: 0, transform: 'translateY(8px)' } },
fadeOut:      { from: { opacity: 1 }, to: { opacity: 0 } },
```
đăng ký thành hai animation:
`'slide-down-out': 'slideDownOut 0.24s cubic-bezier(0.4,0,1,1)'` và
`'fade-out': 'fadeOut 0.24s cubic-bezier(0.4,0,1,1)'`.

### Reduced motion

Thêm vào `src/index.css`:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Hệ quả đã biết trước:** khối này tắt luôn shimmer của skeleton. Đó là hành vi đúng — shimmer
chạy vô hạn và "không bao giờ animate mãi mãi" là quy tắc cứng với nhóm người dùng này. Skeleton
vẫn giữ nền gradient tĩnh nên vẫn phân biệt được với nội dung thật. **Phải kiểm tra thực tế
điểm này khi làm**, không mặc định là ổn.

## Phần 2 — Phản hồi tương tác

Vấn đề không phải thiếu hiệu ứng, mà là hiệu ứng đang **nói dối** và **nói không đều**.

### a) `.card` hứa hẹn sai — false affordance

`.card` có `hover:shadow-navy`, và `.stat-card` kế thừa (`@apply card p-5 ...`). Nên bốn thẻ
thống kê ở Dashboard nhấc bóng khi rê chuột dù phần lớn không bấm được: trông bấm được, bấm
thì không có gì.

Tách làm hai class:

- `.card` — tĩnh, không hover.
- `.card-interactive` — `hover:shadow-navy hover:-translate-y-0.5` + `transition-all duration-base ease-out-soft`.

Component `Card` (`src/components/ui/index.jsx`) gắn `card-interactive` **khi và chỉ khi** có
prop `onClick` — cùng điều kiện đã dùng cho `cursor-pointer`.

Kiểm tra sau khi đổi: các `StatCard` có `onClick` (Dashboard "Chưa đóng phí" → FeesPage) vẫn
phải nhấc lên; các thẻ không có thì đứng yên.

### b) Chỉ `.btn` có phản hồi khi nhấn

Nhiều control không dùng `.btn` nên hover có mà nhấn thì bất động — và đây là những thứ được
bấm nhiều nhất mỗi ngày:

- chip lọc trạng thái (`FeesPage`, `StudentSidebar`)
- tab (`ClassDetailPage`, `SchedulePage`)
- hai nút "＋ Thêm" / "Tạo mới" trong `StudentSidebar`
- chip chấm công trên `ScheduleCard`
- mục nav trong `Navbar`

Thêm một utility trong `index.css`:

```css
.pressable { @apply transition-transform duration-fast active:scale-[0.97]; }
```

rồi gắn vào các control trên, thay vì rải `active:scale-[0.97]` bằng tay từng chỗ.

### c) `ScheduleCard` tự chế hiệu ứng riêng

Đang có `hover:shadow-md hover:-translate-y-0.5` viết tay — cùng ý đồ với `.card-interactive`
nhưng khác giá trị bóng. Cho nó dùng class chung và xóa bản viết tay. Đây là lỗi nhất quán,
không phải lựa chọn thẩm mỹ.

### Không đụng vào

- Hover hàng bảng (`hover:bg-navy-50`) — đã đủ và đúng mức tinh tế.
- Focus ring — đã đạt chuẩn.

## Phần 3 — Chuyển cảnh điều hướng

### a) Đổi trang

`App.jsx` render bằng `switch` trong `renderPage()`. Bọc vùng nội dung:

```jsx
<div key={currentPage} className="animate-fade-in">{renderPage()}</div>
```

**Không đổi hành vi hiện có:** các trang vốn là component khác nhau nên đã remount sẵn khi đổi
trang; thêm `key` không phát sinh lần gọi Supabase nào. Trong trang `classes`, chuyển
list ↔ detail không đổi `currentPage` nên không remount — đúng như hiện tại.

### b) Đổi tab

Cùng cách, `key={activeTab}` trên khối nội dung tab ở `ClassDetailPage` (4 tab) và
`SchedulePage` (3 tab). Đây là chỗ giật nhất hiện nay: nhảy giữa "Điểm danh" và "Mock Test"
là hai bảng khác hẳn nhau xuất hiện tức thì.

### c) Modal đóng — chỗ duy nhất cần hook

Thêm `src/hooks/useMountTransition.js`:

```js
import { useState, useEffect } from 'react'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

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

`Modal` (`src/components/ui/index.jsx`) đổi `if (!open) return null` thành
`if (!mounted) return null`; class animation của `.modal-box` chọn theo `open`
(`animate-slide-up` khi vào, `animate-slide-down-out` khi ra), overlay tương tự với
`animate-fade-in` / `animate-fade-out`.

**Bẫy phải xử lý, đã tính vào hook ở trên:** khối `prefers-reduced-motion` ở Phần 1 rút thời
lượng animation về 0.01ms **nhưng `setTimeout` vẫn đợi đủ 240ms**. Không xử lý thì với người
bật thiết lập đó, modal biến mất ngay nhưng overlay vô hình còn chặn click thêm một phần tư
giây — tức là tính năng "tôn trọng reduced-motion" lại tạo lỗi mới cho đúng nhóm nó định bảo
vệ. Vì thế hook tự đọc `matchMedia` và dùng `delay = 0`.

Lưu ý phụ: `useEffect` hiện có của `Modal` (Esc, focus trap, khóa scroll nền) chạy theo `open`,
không theo `mounted` — giữ nguyên, để trong 240ms đang đóng thì Esc và focus trap đã ngừng
tác dụng, đúng ý muốn.

### Không làm (YAGNI)

- Hiệu ứng danh sách hiện lần lượt từng dòng.
- Chuyển cảnh cho sidebar chi tiết học viên.
- Chuyển cảnh có hướng (trái/phải theo chiều điều hướng) — cần theo dõi lịch sử điều hướng,
  đắt hơn nhiều so với giá trị thêm vào.

## Cách kiểm chứng

Không có test runner trong repo. Kiểm chứng bằng quan sát trực tiếp:

1. `npm run build` sạch.
2. Chạy `npm run dev`, điều khiển Chromium qua Playwright (cài trong scratchpad, không vào
   `package.json`), chụp màn hình trước/sau ở các trạng thái: card thường vs card bấm được,
   modal đang đóng giữa chừng, đổi tab.
3. **Chạy lại toàn bộ với `prefers-reduced-motion: reduce`** — Playwright hỗ trợ
   `newContext({ reducedMotion: 'reduce' })`. Kiểm tra hai điều: skeleton vẫn nhìn ra là đang
   tải, và modal đóng xong click được ngay không bị overlay chặn.
4. Cập nhật mục Design system trong `CLAUDE.md` với thang thời lượng, quy tắc
   `.card` vs `.card-interactive`, và utility `.pressable`.
