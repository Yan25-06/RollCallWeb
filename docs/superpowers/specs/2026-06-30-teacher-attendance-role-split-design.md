# Design: Tách quyền chấm công giáo viên

**Ngày:** 2026-06-30  
**Phạm vi:** Trang Giảng Dạy — Tab Lịch Dạy

---

## Bối cảnh

Hệ thống chấm công giáo viên hiện tại cho phép mọi giáo viên tự toggle 3 trạng thái: Chưa xác nhận → Đã dạy → Vắng. Điều này cho phép giáo viên tự đánh vắng chính mình và tự chọn người dạy thay — không phù hợp với quy trình thực tế tại trung tâm.

**Quy trình thực tế:** Giáo viên báo vắng qua Zalo/điện thoại cho admin. Admin vào app đánh vắng và phân công người dạy thay.

---

## Yêu cầu

1. **Giáo viên** chỉ được đánh "Đã dạy" — không được tự đánh "Vắng".
2. **Admin** giữ đầy đủ 3 trạng thái và quyền chọn người dạy thay.
3. Giáo viên được giao dạy thay thấy card "Dạy thay" trực tiếp trong lưới lịch tuần (đúng ngày, đúng giờ).
4. Card dạy thay là read-only — không cần xác nhận trong app (giáo viên báo ngoài app).
5. Xóa banner `SubstituteAssignments` và nút xác nhận dạy thay cũ.

---

## Thiết kế

### 1. Permission layer

Thêm cờ vào `src/hooks/usePermissions.js`:

```js
canMarkAbsent: isAdmin   // chỉ admin mới được đánh "Vắng" và chọn người dạy thay
```

Cờ `canCheckOwnAttendance` giữ nguyên (`true` cho mọi GV) — vẫn kiểm soát việc hiện/ẩn chip chấm công.

Prop truyền: `SchedulePage` → `WeeklyGrid (canMarkAbsent)` → `ScheduleCard (canMarkAbsent)`.

### 2. Vòng lặp trạng thái (`ScheduleCard` + `handleToggleAttendance`)

| Role | Trạng thái hiện tại | Sau khi bấm chip |
|---|---|---|
| Giáo viên (`!canMarkAbsent`) | pending | → present |
| Giáo viên (`!canMarkAbsent`) | present | → pending (xóa record) |
| Admin (`canMarkAbsent`) | pending | → present |
| Admin (`canMarkAbsent`) | present | → absent |
| Admin (`canMarkAbsent`) | absent | → pending (xóa record) |

Logic thay đổi trong `handleToggleAttendance` ở `SchedulePage`:
- Khi `!canMarkAbsent` và trạng thái hiện tại là `present` → xóa record (về pending), **không** chuyển sang absent.

Tooltip chip cập nhật theo role:
- Giáo viên: `"Chưa xác nhận → Đã dạy"`
- Admin: `"Chưa xác nhận → Đã dạy → Vắng"`

SubstituteDropdown + ghi chú inline: chỉ render khi `canMarkAbsent && isAbsent` (thêm điều kiện `canMarkAbsent`, giữ nguyên phần còn lại).

### 3. Card dạy thay trong `WeeklyGrid`

**Prop mới:** `subAssignments` (mảng, truyền từ `SchedulePage`).

Mỗi item: `{ scheduleId, date, classId, className, room, startTime, endTime, mainTeacherName }`.

**Đặt vào đúng cột:** Tính `dayOfWeek = new Date(date + 'T00:00:00').getDay()`.

**Render `SubstituteCard`** (component nhỏ trong cùng file `WeeklyGrid` hoặc `ScheduleCard`):
- Style: màu `default` (xám), border, không có chip chấm công, không có `onClick` chỉnh sửa.
- Badge góc trên phải: `"Dạy thay"` — màu amber (`bg-amber-100 text-amber-700 border-amber-200`).
- Nội dung: tên lớp (`className`), giờ (`startTime–endTime`), phòng (`room`), dòng nhỏ `"Thay: {mainTeacherName}"`.
- Card nằm cùng cột với các `ScheduleCard` thường trong ngày đó.

### 4. Dọn dẹp

| Thứ bị xóa | File |
|---|---|
| `<SubstituteAssignments>` trong JSX | `SchedulePage.jsx` |
| `handleConfirmSubstitute` handler | `SchedulePage.jsx` |
| `loadSubAssignments` effect (đổi thành truyền vào WeeklyGrid) | `SchedulePage.jsx` |
| `src/components/schedule/SubstituteAssignments.jsx` | xóa file |
| `confirmSubstitute` method | `teacherAttendanceService.js` (giữ nếu muốn, nhưng không dùng) |

`getSubstituteAssignments` **giữ nguyên** — `SchedulePage` vẫn gọi để lấy data truyền vào `WeeklyGrid`.

---

## Các file thay đổi

| File | Loại thay đổi |
|---|---|
| `src/hooks/usePermissions.js` | Thêm `canMarkAbsent` |
| `src/pages/SchedulePage.jsx` | Truyền `canMarkAbsent`, sửa `handleToggleAttendance`, xóa banner/confirm |
| `src/components/schedule/WeeklyGrid.jsx` | Nhận `subAssignments`, render `SubstituteCard` |
| `src/components/schedule/ScheduleCard.jsx` | Nhận `canMarkAbsent`, cập nhật tooltip, điều kiện SubstituteDropdown |
| `src/components/schedule/SubstituteAssignments.jsx` | **Xóa** |

---

## Không thay đổi

- DB schema — không cần migration.
- `teacherAttendanceService` — không thay đổi (chỉ có thể bỏ dùng `confirmSubstitute`).
- RLS — admin đã có full write trên `teacher_attendance` từ migration cũ.
- `PayrollTab` — logic lương dạy thay (`substitute_confirmed`) không thay đổi (field vẫn còn trong DB).
- `CLAUDE.md` — cập nhật sau khi implement xong.
