# Báo cáo Usability Audit — 2026-09-04

## Cách đọc báo cáo này

Phương pháp: heuristic evaluation theo Nielsen H2 (10 heuristic), hai vòng — vòng 1
overview toàn bộ 28 màn hình (15 cho vai admin, 13 cho vai giáo viên, do `Học Phí` và
`Admin` chỉ admin thấy), vòng 2 đi sâu sáu luồng nghiệp vụ cốt lõi. Dữ liệu là dữ liệu
Supabase thật của trung tâm, chạy read-only tuyệt đối (không Lưu/Tạo/Xóa/Ghi danh/Thanh
toán/Chấm công thật) qua Playwright điều khiển Chromium, kèm đọc mã nguồn để xác minh
những gì không thể quan sát trực tiếp mà không ghi dữ liệu (điều gì xảy ra sau khi bấm
Lưu, RLS có chặn đúng không, v.v.).

Định dạng mỗi phát hiện: `[H2-x Tên heuristic] [Severity 0-4] [Fix 0-4]` + mô tả + vì
sao người dùng nhầm + trang/file cụ thể. Phát hiện nào chỉ xác minh được qua đọc code
(không thao tác trực tiếp trên UI thật) được đánh dấu **[suy ra từ code]**.

## Làm ngay — severity ≥ 3, fix ≤ 1

Đây là phần có giá trị nhất: hậu quả nặng, sửa rẻ.

| # | Heuristic | Sev | Fix | Vấn đề | File |
|---|---|---|---|---|---|
| 1 | H2-4 Consistency | 3 | 1 | `FeesTable.jsx` thiếu nhánh "học phí kỳ vọng = 0đ" mà `FeesPage.jsx` đã có, khiến badge dòng đó hiện sai "Còn nợ" | `src/components/fees/FeesTable.jsx:11-12`, `src/pages/FeesPage.jsx:13-18` |

## Toàn bộ phát hiện theo severity

### Severity 4 — Catastrophe, bắt buộc sửa

Không có phát hiện nào ở mức này trong đợt audit — không quan sát được tình huống nào
khiến người dùng mất dữ liệu, không đăng nhập được, hoặc bị chặn hoàn toàn khỏi một
luồng nghiệp vụ cốt lõi.

### Severity 3 — Major, quan trọng, phải sửa

**[H2-4 Consistency] [Severity 3] [Fix 1] Trạng thái học phí "Còn nợ" sai cho dòng có học phí kỳ vọng = 0đ**

`src/components/fees/FeesTable.jsx` dòng 11-12 tính badge trạng thái theo thứ tự:
```js
if (paid <= 0) return { label: 'Còn nợ', variant: 'danger' }
if (paid >= expected) return { label: 'Đã đóng', variant: 'success' }
```
— **không xét `expected` trước khi xét `paid`**. Trong khi đó `src/pages/FeesPage.jsx`
dòng 13-18 — dùng để đếm số liệu tab lọc và summary card — đã xử lý đúng trường hợp
này bằng một nhánh riêng đứng đầu:
```js
const getPaymentStatus = (paid, expected) => {
  if (expected <= 0) return 'free'
  if (paid >= expected) return 'paid'
  if (paid > 0) return 'partial'
  return 'debt'
}
```
(nhãn `'free'` hiển thị là "Miễn phí", `STATUS_LABELS.free` dòng 31). Khi
`expected = 0` (học phí tháng chưa cấu hình, hoặc enrollment miễn phí) và
`paid = 0`: `FeesTable` cho `0 <= 0` đúng ngay ở nhánh đầu tiên → hiện badge đỏ
"Còn nợ". `FeesPage.getPaymentStatus` cùng dữ liệu lại trả về `'free'` — không đếm
vào tab "Còn nợ" (`tabCounts.debt`) lẫn tab "Đã đóng đủ". Hai nơi tính cùng một khái
niệm "trạng thái học phí" theo hai công thức khác nhau: `FeesTable.jsx` chưa được cập
nhật theo cùng logic 4 nhánh (`free`/`paid`/`partial`/`debt`) mà `FeesPage.jsx` đã có
— nghĩa là bug nằm ở `FeesTable.jsx` thiếu nhánh `free`, không phải hai file "ngược
thứ tự" như đọc lướt qua có thể tưởng.

Quan sát trực tiếp trên dữ liệu thật: học viên "Kim Khánh" (lớp T02, tháng 9/2026)
có "Học phí kỳ vọng: 0đ", "Đã đóng: 0đ", badge "Còn nợ" — đúng kịch bản trên (shots
`admin-hoc-phi.png`).

**Vì sao người dùng nhầm:** admin thấy badge đỏ trên dòng 0đ, tưởng cần thu tiền hoặc
nhắc phụ huynh dù thực tế không có gì để thu; hoặc nếu 0đ là do quên nhập
`monthly_fee` (lỗi cấu hình thật), badge "Còn nợ" trông giống mọi dòng nợ bình thường
khác nên lỗi cấu hình bị che giấu thay vì được làm nổi bật.

**Fix:** import và dùng lại `getPaymentStatus` đã có sẵn ở `src/pages/FeesPage.jsx`
trong `FeesTable.jsx` thay vì tính badge bằng logic riêng — xóa hẳn phép tính trùng
lặp ở dòng 11-12, map trạng thái `'free'` sang một badge trung tính (VD "Miễn phí",
màu xám) thay vì rơi vào nhánh "Còn nợ".

---

**[H2-1 Visibility of system status] [Severity 3] [Fix 2] Tổng lương "Thực nhận" ở PayrollTab không mở ra được danh sách buổi đã cộng thành nó — vi phạm trực tiếp hard rule 14 mới thêm**

`src/components/schedule/PayrollTab.jsx` không có bất kỳ `onClick`/Modal nào gắn vào
cột "Thực nhận" (hay bất kỳ cột số nào khác: Buổi/Lịch, Đã dạy, Vắng, Chưa XN, Dạy
thay). So sánh với `ReportsPage` — nơi card Điểm Danh và Học Phí đã có drill-down modal
khi click cột tháng (đã ghi trong `CLAUDE.md`) — PayrollTab hoàn toàn không có cơ chế
tương đương. Admin thấy "Thực nhận: 0đ" hay bất kỳ số tiền nào ở `admin-giangday-bang-luong.png`
nhưng không có cách nào bấm vào để xem nó được cộng từ những buổi dạy cụ thể nào.

**Vì sao người dùng nhầm:** khi số liệu lương trông sai (ví dụ thiếu một buổi dạy thay),
admin không có cách tự kiểm tra ngay trên UI — phải nhờ kỹ thuật xem database, hoặc
nghi ngờ sai mà không chứng minh được, làm giảm lòng tin vào con số lương ngay từ lần
đầu dùng.

**Fix:** thêm modal liệt kê buổi theo `teacherId` + tháng đang chọn (ngày, lớp, trạng
thái, có tính lương hay không) khi bấm vào ô "Thực nhận", tái dùng pattern modal đã có
ở `ReportsPage`.

### Severity 2 — Minor

**[H2-4 Consistency] [Severity 2] [Fix 0] Nhãn tiếng Anh "từ Schedule" rò ra giữa UI toàn tiếng Việt**

`src/components/students/StudentDetailPanel.jsx:373`:
```jsx
<span className="text-xs text-navy-300">từ Schedule</span>
```
Card "BUỔI TIẾP THEO" trong sidebar chi tiết học viên hiện chữ "Xem lịch" (tiếng Việt)
ngay phía trên "từ Schedule" (tiếng Anh) — thấy trực tiếp ở `admin-lop-hoc-vien.png`.

**Vì sao người dùng nhầm:** đây là app hoàn toàn tiếng Việt cho người dùng không rành
tiếng Anh kỹ thuật; một từ tiếng Anh lạc giữa câu đọc như lỗi dịch thuật, làm giảm độ
tin cậy của phần mềm dù không ảnh hưởng chức năng.

**Fix:** đổi `"từ Schedule"` thành `"từ Thời khóa biểu"` hoặc bỏ hẳn — 1 dòng.

---

**[H2-4 Consistency] [Severity 2] [Fix 1] Bộ chọn "Loại khóa" ở tab Tài Liệu dùng `<select>` gốc thay vì component `Select` dùng chung**

`src/components/schedule/MaterialsTab.jsx` dòng 110-116 tự dựng `<select>` với class
Tailwind viết tay (`border-navy-200 rounded-lg ... bg-navy-50`) thay vì import
`Select` từ `@/components/ui` như CLAUDE.md yêu cầu ("Dùng component từ
`@/components/ui`... không tự tạo input mới trừ khi thật cần"). Hậu quả nhìn thấy được
ở `admin-giangday-tai-lieu.png`: mũi tên dropdown và chiều cao ô khác các `Select`
khác trong app (VD ô "Tất cả lớp" ở `admin-hoc-phi.png`).

**Vì sao người dùng nhầm:** không phải lỗi nặng, nhưng phá vỡ cảm giác "cùng một hệ
thống" — người dùng để ý chi tiết có thể thấy ô này "khác" mà không rõ vì sao.

**Fix:** thay `<select>` bằng `<Select>` từ `@/components/ui`, giữ nguyên danh sách
`COURSE_TYPES`.

---

**[H2-1 Visibility / H2-8 Aesthetic] [Severity 2] [Fix 1] Tên lớp bị cắt còn 1 ký tự + "…" trên lưới lịch tuần, không có tooltip để xem đầy đủ**

Quan sát trực tiếp `admin-giang-day.png`: card buổi dạy "Thứ 2" dòng cuối hiện tên lớp
là **"T…"** (chỉ 1 ký tự trước dấu ba chấm) dù tên lớp gốc chỉ dài 3 ký tự (VD "T03").
Xác nhận qua code: `src/components/schedule/ScheduleCard.jsx:136`
```jsx
<span className={clsx('text-xs font-semibold truncate', color.text)}>
```
dùng `truncate` (CSS `text-overflow: ellipsis`) nhưng **không có `title=` attribute**
để trình duyệt hiện tooltip khi hover — khác với chip chấm công cùng file (dòng 145)
đã có `title=`. Cột `phòng` (dòng 171, 222) cũng `truncate` không `title`.

**Vì sao người dùng nhầm:** trong lưới 7 cột với nhiều buổi trùng giờ, tên lớp là
thông tin định danh chính; bị cắt còn 1 ký tự thì admin không phân biệt được đây là
lớp nào mà không bấm vào xem chi tiết — chậm hơn so với chỉ cần hover.

**Fix:** thêm `title={cls?.name}` và `title={item.room}` vào 2 span đó — 2 dòng.

---

**[H2-4 Consistency] [Severity 2] [Fix 2] "Nhận Xét", "Giảng Dạy", "Admin" chỉ vào được qua drawer hamburger ở mobile — bottom nav cố định luôn cắt còn 5 mục đầu**

`src/components/layout/Navbar.jsx:165` — thanh điều hướng dưới cùng ở mobile
(`<lg`, tức <1024px) luôn lấy `navItems.slice(0, 5)`, bất kể vai trò. Với vai admin,
"Nhận Xét", "Giảng Dạy", "Admin", "Cài Đặt" chỉ vào được qua drawer (icon ☰ ở góc trên
phải header mobile, dòng 116-118) — đã xác nhận đúng thiết kế (mẫu bottom-tab-bar +
"more" drawer, không phải lỗi thiếu tính năng). Tuy nhiên **mục đang active không có
tín hiệu nào trên bottom nav khi trang hiện tại nằm ngoài 5 mục đó** (VD đang ở "Giảng
Dạy": không có icon nào trong 5 icon bottom-nav được tô đậm/active) — câu hỏi "tôi
đang ở đâu?" chỉ còn dựa vào tiêu đề trang, ở màn hình nhỏ dễ bị cuộn khuất.

**Vì sao người dùng nhầm:** trên desktop, sidebar luôn tô đậm mục đang chọn nên "tôi
đang ở đâu" luôn có câu trả lời tại chỗ; trên mobile, một khi vào các trang ngoài
top-5, tín hiệu đó biến mất hoàn toàn cho tới khi cuộn lên đầu trang.

**Fix:** thêm một trạng thái "còn mục khác đang active" trên nút hamburger (chấm nhỏ)
khi `activePage` không nằm trong 5 mục đầu.

### Severity 1 — Cosmetic

**[H2-8 Aesthetic and minimalist design] [Severity 1] [Fix 1] Trục Y biểu đồ "Điểm Danh theo tháng" ở Báo Cáo không ghi đơn vị**

`admin-bao-cao.png`: trục tung chạy 0–100 không có ký hiệu `%` hay chú thích — người
xem phải đoán đây là phần trăm chuyên cần hay số buổi. Dữ liệu thực tế (cột đạt ~80-90)
gợi ý là phần trăm, nhưng không có gì xác nhận trên biểu đồ. Fix: thêm hậu tố `%` vào
nhãn trục hoặc tiêu đề biểu đồ.

## Phát hiện theo màn hình

- **Học Phí** (`FeesPage.jsx`, `FeesTable.jsx`): #1 (Severity 3).
- **Giảng Dạy → Bảng Lương** (`PayrollTab.jsx`): #2 (Severity 3).
- **Học Viên → chi tiết học viên** (`StudentDetailPanel.jsx`): "từ Schedule" (Severity 2).
- **Giảng Dạy → Tài Liệu** (`MaterialsTab.jsx`): `<select>` gốc (Severity 2).
- **Giảng Dạy → Lịch Dạy** (`ScheduleCard.jsx`): tên lớp bị cắt (Severity 2).
- **Toàn app, mobile <1024px** (`Navbar.jsx`): active-state biến mất ngoài top-5 (Severity 2).
- **Báo Cáo** (`ReportsPage` / card Điểm Danh): trục Y thiếu đơn vị (Severity 1).

## Vấn đề hệ thống

- **Không có URL routing** — đã ghi trong skill (`references/web-and-mobile-patterns.md`).
  Xác nhận thêm một điểm quan trọng khi đi thực tế: **`ClassDetailPage` lại có một
  breadcrumb cục bộ** ("Lớp học › TSW04", thấy ở mọi tab con — `admin-lop-hoc-vien.png`,
  `admin-lop-điem-danh.png`, `admin-lop-mock-test.png`, `admin-lop-bai-tap.png`).
  Nghĩa là pattern breadcrumb **đã tồn tại và hoạt động tốt ở một nơi**, nhưng không
  được áp dụng cho các khu vực đa cấp khác có cùng nhu cầu — `Giảng Dạy` (3 tab, một
  trong số đó là `Bảng Lương` xem theo tháng) và `Nhận Xét` (chọn lớp → chọn học viên)
  không có breadcrumb tương đương dù độ sâu điều hướng tương tự. Đây là điểm khởi đầu
  tốt để mở rộng nhất quán, không phải xây từ đầu.
- **Màu không phải kênh duy nhất ở những nơi đã kiểm tra**: dot màu loại khóa
  (`DailyAgenda`), badge trạng thái điểm danh, chip chấm công, badge "Còn nợ/Đã đóng"
  — tất cả đều có text kèm màu, không có trường hợp nào chỉ dùng màu đơn thuần trong
  phạm vi đã audit. Đây là điểm tốt, không phải vấn đề — ghi lại để không lặp lại công
  kiểm tra này ở đợt sau.
- **Không phát hiện tràn ngang (horizontal overflow)** ở 5 trang đã kiểm tra tại
  768px và 375px (Dashboard, Lớp Học, Học Viên, Học Phí, Báo Cáo, vai admin) — script
  capture có kiểm tra `scrollWidth > clientWidth` và không ghi nhận trường hợp nào.
  **Chưa kiểm tra** Nhận Xét, Giảng Dạy (3 tab), Admin, và các tab con của lớp ở hai
  viewport này — xem "Giới hạn của báo cáo".

## Component đạt chuẩn

Những implementation sau đáng dùng làm tham chiếu cho code mới, vì truyền thông tin
bằng nhiều hơn một kênh hoặc xử lý đúng theo hard rule:

- **`src/components/mock-test/MockTestScoreTable.jsx` (`ScoreCell`, dòng 8-40):**
  input điểm có `min`/`max` theo `section.maxScore`, tự kẹp giá trị về max khi vượt
  kèm `toast.warning` giải thích rõ ("Điểm tối đa {tên}: {số}"), cộng `title=` tooltip.
  Đúng tinh thần hard rule 12 (ràng buộc chặt ô điểm) — ví dụ tốt nhất tìm được cho
  ràng buộc-kèm-giải-thích thay vì chỉ chặn im lặng.
- **`src/components/reviews/RadarChartPanel.jsx` (dòng 139-148, 160-167):** khi học
  viên chưa có mock test, nút "Thêm Đánh Giá" không chỉ ẩn đi mà được **thay bằng dòng
  chữ giải thích** ("Cần tạo mock test trước khi thêm đánh giá" / "Tạo mock test
  trước") — đúng H2-9 (giúp người dùng nhận biết, chẩn đoán, phục hồi từ lỗi/giới hạn)
  thay vì để nút biến mất không lời giải thích như kế hoạch audit ban đầu lo ngại.
- **`src/pages/AdminPanelPage.jsx` (nút Cấp/Thu hồi Admin, dòng 343-363):** hành động
  đổi quyền admin — cao rủi ro nhất trong app — có icon riêng cho từng chiều
  (`ShieldCheck`/`ShieldOff`) + màu (xanh/đỏ) + text, và bắt buộc qua `ConfirmDialog`
  (dòng 497-503) trước khi thực thi, đúng hard rule "confirm trước hành động quan
  trọng chạm tới phân quyền".
- **`src/components/fees/PaymentModal.jsx` (dòng 61-65):** tự động chọn sẵn lớp khi
  học viên chỉ có đúng 1 enrollment đang active (`classIds.length === 1 ? classIds[0] : ''`)
  — giảm đúng 1 click cho trường hợp phổ biến nhất mà không ảnh hưởng trường hợp đa lớp.
- **`src/components/attendance/AttendanceToggle.jsx` (dòng 14-16):** trạng thái điểm
  danh ghép màu (emerald/red) với nhãn chữ ("Có mặt"/"Vắng") ngay trên cùng badge —
  đúng hard rule 1 (không dùng màu làm kênh thông tin duy nhất). Đây là ví dụ rule-1
  duy nhất tìm được trong đợt audit này; không có ví dụ thứ hai đạt chuẩn tương đương.

**Reference implementation cho rule 1** (đã cập nhật lại trong `SKILL.md` ở Task 7):
`AttendanceToggle.jsx`. `MockTestScoreTable.jsx` và `RadarChartPanel.jsx` ở trên minh
họa rule 12 và H2-9 tương ứng — không phải rule 1, dù đều là ví dụ tốt cho hard rule
riêng của chúng.

## Giới hạn của báo cáo

- Một người đánh giá bắt được khoảng 35% vấn đề. Đây không phải bản đầy đủ; muốn lên
  ~75% cần thêm 2–4 người chạy cùng một lượt.
- Heuristic evaluation không trả lời được câu "giao diện có giải đúng bài toán không"
  — nó chỉ phát hiện giao diện dị dạng. Câu kia cần quan sát người dùng thật.
- Do ràng buộc read-only tuyệt đối trên dữ liệu thật, các luồng viết dữ liệu **không
  được click thao tác thật đến bước cuối** — thay vào đó xác minh qua đọc mã nguồn.
  Các mục sau là **suy ra từ code**, không phải quan sát trực tiếp: hành vi RLS khi
  giáo viên bấm nút "Xếp Lịch" (không đủ bằng chứng để kết luận có lỗi phân quyền hay
  không — nút hiện ra cho mọi vai trò, cần một đợt kiểm tra riêng với tài khoản
  giáo viên thật để xác nhận backend có chặn đúng); toàn bộ nội dung Component đạt
  chuẩn; chi tiết luồng "Ghi danh 3 đường" (không đi hết cả ba đường vì giới hạn thời
  gian của đợt audit — `EnrollmentModal.jsx` dài 700 dòng với 3 khối trường học phí lặp
  lại theo 3 chế độ hiển thị, đáng xem lại kỹ hơn ở đợt sau); luồng xuất PDF phiếu nhận
  xét (không xuất thật, chỉ xác nhận qua `CLAUDE.md` rằng đã lazy-load `jspdf`).
- Kiểm tra tràn ngang 768px/375px chỉ phủ 5/15 màn hình vai admin (xem "Vấn đề hệ
  thống") — chưa kiểm tra Nhận Xét, Giảng Dạy, Admin, và các tab con của lớp ở hai
  viewport này.
- Card "Lớp Học" hiện "X HỌC VIÊN / N" ở một số lớp và không hiện "/N" ở lớp khác —
  đã xác nhận qua code (`ClassCard.jsx:107`, `cls.maxStudents > 0`) đây là **hành vi
  đúng theo thiết kế** (lớp không đặt sĩ số tối đa), không phải bug — ghi lại ở đây để
  tránh đợt sau audit lại cùng một câu hỏi.
