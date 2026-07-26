# Thiết kế: Tab "Tổng Quan" (Dashboard) trong trang lớp học

**Ngày:** 2026-07-24
**Trạng thái:** Đã duyệt thiết kế, chờ review spec

## Mục tiêu

Thêm một tab **"Tổng Quan"** vào trang chi tiết lớp (`ClassDetailPage`) hiển thị dữ liệu
tổng quan của **tất cả học viên trong lớp cùng một lúc** dưới dạng bảng so sánh — thay
vì phải bấm từng học viên như tab "Học Viên" hiện tại. Mục đích: giáo viên/admin nhìn
nhanh toàn lớp và phát hiện học viên yếu (chuyên cần thấp, ít nộp bài).

## Phạm vi

**Trong phạm vi:**
- Tab mới "Tổng Quan" là tab đầu tiên của `ClassDetailPage`, trở thành trang mặc định khi mở lớp.
- Bảng so sánh: mỗi học viên đang học 1 dòng, cột **Điểm danh %** và **Bài tập** (hoàn thành/tổng + %).
- Cảnh báo màu cho học viên yếu; sắp xếp theo cột.
- Bấm 1 dòng → chuyển sang tab "Học Viên" và chọn sẵn học viên đó.

**Ngoài phạm vi (theo lựa chọn người dùng):**
- Không có cột Mock Test.
- Không có cột Trạng thái / Học phí.
- Không thay đổi service layer, DB schema, hay RLS.
- Không thêm popup/modal chi tiết (tái dùng master-detail của tab "Học Viên").

## Kiến trúc

### Nguồn dữ liệu (không N+1)
Service layer đã có sẵn các batch method quét cả lớp trong 1 query mỗi loại. Tab lấy dữ
liệu qua `Promise.all` gồm **5 lời gọi** (4 batch class-wide + danh bạ HS để tra tên):

- `enrollmentService.getByClass(classId)` — danh sách ghi danh (lọc `status === 'active'`).
- `sessionService.getByClass(classId)` — các buổi học của lớp.
- `attendanceService.getByClass(classId)` — toàn bộ bản ghi điểm danh của lớp.
- `homeworkService.getByClass(classId)` — toàn bộ bản ghi bài tập của lớp.
- `studentService.getAll()` — để tra tên học viên (giống cách `StudentsTab` đang làm).

Không thêm service method mới. Không gọi `supabase.*` trực tiếp trong component.

### Component & file mới

**`src/utils/classOverview.js`** — hàm thuần (không side-effect, không import React/supabase, test được bằng Node), theo pattern của `src/utils/payroll.js`:

```
buildClassOverviewRows({ enrollments, sessions, attendance, homeworks }) → Row[]
```

`Row = { studentId, name, status, attendanceRate, hwDone, hwTotal, hwRate }`

Quy tắc tính (khớp logic hiện có, tránh lệch số với tab "Học Viên"):
- **Điểm danh %** — dùng đúng công thức "mặc định có mặt" của `attendanceService.getRate`:
  - Mẫu số = số buổi của lớp có `date <= hôm nay` (`pastSessions`). Giống nhau cho mọi HS.
  - Vắng = số bản ghi attendance của HS đó có `present === false` thuộc `pastSessions`.
  - `attendanceRate = round((pastSessions - absent) / pastSessions * 100)`.
  - Nếu `pastSessions === 0` → `attendanceRate = null` (hiển thị "—").
- **Bài tập** — dùng cùng cách phân loại của `homeworkService.getStats`:
  - `hwDone` = số bản ghi bài tập của HS có `progress === 'done'` hoặc `progress === 100`.
  - `hwTotal` = tổng số bản ghi bài tập của HS trong lớp.
  - `hwRate = hwTotal > 0 ? round(hwDone / hwTotal * 100) : 0`.
- `name` lấy từ student; hàm nhận thêm map/`students` để tra tên, hoặc `DashboardTab`
  đã tự lấy `studentService.getAll()` — **quyết định:** truyền `students` vào hàm thuần
  để hàm không phụ thuộc thứ tự fetch. Do đó `DashboardTab` gọi thêm `studentService.getAll()`
  (tổng 5 batch call) — nhất quán với cách `StudentsTab` đang làm.

**`src/pages/ClassDetailPage/tabs/DashboardTab.jsx`** — component tab:
- Props: `{ classId, onSelectStudent }`.
- `useEffect` theo `classId`: `Promise.all` 5 batch call → `buildClassOverviewRows(...)` → set rows.
- Render:
  - Loading: skeleton rows (tái dùng `Skeleton` từ `@/components/ui`).
  - Empty (lớp chưa có HS active): `<Empty />` từ `@/components/ui`.
  - Bảng so sánh (xem dưới).

### Bảng so sánh
- Cột: **Học viên** (avatar initials + tên) · **Điểm danh** (`%` hoặc `—`) · **Bài tập** (`done/total` + `(rate%)`).
- Chỉ hiện HS `status === 'active'`, mặc định sắp theo tên (locale `vi`).
- Header cột **Điểm danh** và **Bài tập** bấm được để sort tăng/giảm (state cục bộ trong `DashboardTab`).
- Cảnh báo màu (semantic token, không hard-code hex):
  - Điểm danh `< 75%` → tô cảnh báo (amber/đỏ).
  - Tỷ lệ bài tập `< 50%` → tô cảnh báo.
  - Các ngưỡng khai báo hằng số đầu file để dễ chỉnh.
- Mỗi dòng bấm được (`onClick` → `onSelectStudent(studentId)`), có hover state; a11y: `role`/`tabIndex` hợp lý.

### Điều hướng "bấm dòng → mở chi tiết HS"

Hiện `StudentsTab` tự quản `selectedStudentId` nội bộ (mặc định chọn HS active đầu tiên).
Để mở đúng HS từ Dashboard, nâng phần chọn lên `ClassDetailPage`:

- `ClassDetailPage` thêm state `pendingStudentId` (default `null`).
- `DashboardTab.onSelectStudent(id)` → `setPendingStudentId(id)` + `setActiveTab('students')`.
- Truyền `initialStudentId={pendingStudentId}` xuống `StudentsTab`.
- `StudentsTab` thêm prop `initialStudentId`: nếu có và nằm trong enrollments của lớp thì
  dùng làm lựa chọn ban đầu (thay cho "HS active đầu tiên"); giữ nguyên hành vi cũ khi `null`.
- Sau khi tiêu thụ, `ClassDetailPage` reset `pendingStudentId = null` để không ghi đè lựa
  chọn thủ công của người dùng ở các lần chuyển tab sau (reset khi rời tab students hoặc
  khi `StudentsTab` báo đã chọn xong — chi tiết chốt ở bước lập kế hoạch).

### Tab bar
- Mảng `TABS` trong `ClassDetailPage/index.jsx` thêm `{ id: 'dashboard', label: 'Tổng Quan', disabled: false }` ở **đầu** mảng.
- `initialTab` default đổi `'students'` → `'dashboard'`.
- Các nơi mở lớp với tab tường minh (Dashboard page truyền `'attendance'` qua `classInitialTab`) không bị ảnh hưởng.
- Thêm nhánh render `activeTab === 'dashboard' && <DashboardTab .../>`.

## Phân quyền
- Tab hiển thị cho mọi giáo viên (không có dữ liệu học phí nên không cần gating admin).
- Không cần đổi RLS. Dữ liệu đọc-only từ các bảng giáo viên đã có quyền SELECT.

## Xử lý lỗi & trạng thái
- Lỗi fetch: nuốt lỗi và hiển thị bảng rỗng / `<Empty />` (nhất quán với `StudentsTab`),
  không làm vỡ trang. (Toast không bắt buộc cho view đọc-only; theo pattern hiện tại.)
- Loading state: skeleton.
- Empty state: `<Empty />` khi không có HS active.

## Kiểm thử
- `src/utils/classOverview.js` là hàm thuần → test bằng Node script (giống
  `scripts/test-curriculum-parser.mjs`): các case điểm danh mặc-định-có-mặt, có buổi tương
  lai (không tính mẫu số), HS chưa có bản ghi bài tập (0/0 → rate 0), lớp không có buổi
  (`attendanceRate = null`).
- Không có test runner cấu hình sẵn → kiểm thử thủ công UI + node script cho hàm thuần.

## Files thay đổi
| File | Thay đổi |
|------|----------|
| `src/utils/classOverview.js` | **Mới** — hàm thuần `buildClassOverviewRows` |
| `src/pages/ClassDetailPage/tabs/DashboardTab.jsx` | **Mới** — component tab |
| `src/pages/ClassDetailPage/index.jsx` | Thêm tab vào `TABS`, đổi `initialTab` default, state `pendingStudentId`, nhánh render, truyền prop |
| `src/pages/ClassDetailPage/tabs/StudentsTab.jsx` | Thêm prop `initialStudentId` cho lựa chọn ban đầu |
| `scripts/test-class-overview.mjs` | **Mới (tùy chọn)** — test hàm thuần |
| `CLAUDE.md` | Cập nhật mô tả các tab của `ClassDetailPage` |

## Cập nhật tài liệu
Sau khi implement: cập nhật `CLAUDE.md` phần mô tả `ClassDetailPage` (danh sách tab + tab mặc định).
