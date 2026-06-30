# Tách Quyền Chấm Công Giáo Viên — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Giáo viên chỉ đánh "Đã dạy"; chỉ admin được đánh "Vắng" và chọn người dạy thay; giáo viên dạy thay thấy card read-only "Dạy thay" ngay trong lưới lịch tuần.

**Architecture:** Thêm cờ quyền `canMarkAbsent` (= `isAdmin`) vào `usePermissions`, truyền xuống `WeeklyGrid` → `ScheduleCard` để giới hạn vòng lặp trạng thái và ẩn dropdown dạy thay với giáo viên thường. `SchedulePage` truyền `subAssignments` (đã load sẵn) vào `WeeklyGrid`, nơi render `SubstituteCard` đúng cột ngày. Xóa banner `SubstituteAssignments` và luồng tự xác nhận dạy thay.

**Tech Stack:** React 18, Vite, Tailwind (navy tokens), clsx, lucide-react. **Không có test runner** — verify bằng `npm run build` + kiểm tra trực quan trên dev server.

---

## Lưu ý quan trọng (đọc trước khi bắt đầu)

- **Không hard-code màu hex.** Dùng Tailwind tokens (navy-*, amber-* đã dùng sẵn trong dự án).
- **Edge case bảo toàn "Vắng":** RLS cho phép giáo viên xóa record của chính mình. Vì vậy `handleToggleAttendance` PHẢI chặn: khi `!canMarkAbsent` và trạng thái hiện tại là `absent` → không làm gì (return sớm). Nếu không, giáo viên thường có thể bấm chip "Vắng" (do admin đặt) và vô tình xóa nó.
- **Card vắng của giáo viên tự hiện đỏ:** không cần code thêm — khi admin đặt `status='absent'`, giáo viên đọc được record của mình qua `getByWeek` (RLS), chip hiển thị "Vắng" tự động. Yêu cầu chỉ là đảm bảo họ không sửa được nó (xem edge case trên).

---

## File Structure

| File | Trách nhiệm | Thay đổi |
|---|---|---|
| `src/hooks/usePermissions.js` | Nguồn chân lý cờ quyền client | Thêm `canMarkAbsent` |
| `src/pages/SchedulePage.jsx` | Container trang Giảng Dạy, load data, handlers | Sửa `handleToggleAttendance`; truyền `canMarkAbsent` + `subAssignments` vào WeeklyGrid; xóa banner + `handleConfirmSubstitute` |
| `src/components/schedule/WeeklyGrid.jsx` | Lưới 7 cột | Nhận `canMarkAbsent` + `subAssignments`; render `SubstituteCard` đúng cột |
| `src/components/schedule/ScheduleCard.jsx` | Card 1 ca dạy + chip chấm công | Nhận `canMarkAbsent`; cập nhật tooltip; điều kiện dropdown dạy thay; export `SubstituteCard` mới |
| `src/components/schedule/SubstituteAssignments.jsx` | Banner dạy thay cũ | **Xóa file** |

---

## Task 1: Thêm cờ quyền `canMarkAbsent`

**Files:**
- Modify: `src/hooks/usePermissions.js`

- [ ] **Step 1: Thêm cờ vào object trả về**

Trong `src/hooks/usePermissions.js`, thêm dòng `canMarkAbsent: isAdmin,` ngay sau `canCheckOwnAttendance: true,`:

```js
export function usePermissions() {
  const { teacher } = useAuth()
  const isAdmin = !!teacher?.is_admin
  return {
    isAdmin,
    canViewFees: isAdmin,
    canAccessAdmin: isAdmin,
    canManageCenterSettings: isAdmin,
    canManageStudents: isAdmin,
    canCreateMockTest: isAdmin,
    canManageClasses: isAdmin,
    canFilterByTeacher: isAdmin,
    canCheckOwnAttendance: true,
    canMarkAbsent: isAdmin,
    canViewAllPayroll: isAdmin,
  }
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build thành công, không lỗi.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/usePermissions.js
git commit -m "feat(permissions): thêm cờ canMarkAbsent (chỉ admin đánh vắng)"
```

---

## Task 2: ScheduleCard — giới hạn trạng thái theo quyền + thêm SubstituteCard

**Files:**
- Modify: `src/components/schedule/ScheduleCard.jsx`

- [ ] **Step 1: Thêm prop `canMarkAbsent` vào `ScheduleCard`**

Sửa dòng signature của `ScheduleCard` (dòng ~98) để nhận prop `canMarkAbsent` (default `false`):

```jsx
export const ScheduleCard = ({ item, cls, studentCount, showTeacher, onEdit, canCheckAttendance = false, canMarkAbsent = false, attendanceRecord = null, onToggleAttendance, onAttendanceNote, teachers = [], onSetSubstitute }) => {
```

- [ ] **Step 2: Cập nhật tooltip chip theo quyền**

Trong nút chip chấm công (khối `canCheckAttendance && (...)`, thuộc tính `title`), thay chuỗi `title` cứng bằng biểu thức theo `canMarkAbsent`:

Tìm:
```jsx
            title="Bấm để đổi: Chưa xác nhận → Đã dạy → Vắng"
```

Thay bằng:
```jsx
            title={canMarkAbsent ? 'Bấm để đổi: Chưa xác nhận → Đã dạy → Vắng' : 'Bấm để đổi: Chưa xác nhận → Đã dạy'}
```

- [ ] **Step 3: Giới hạn dropdown dạy thay chỉ cho admin**

Tìm khối render `SubstituteDropdown` (điều kiện `canCheckAttendance && isAbsent`):

```jsx
      {/* Khi Vắng: chọn người dạy thay + ghi chú */}
      {canCheckAttendance && isAbsent && (
        <SubstituteDropdown
```

Thay điều kiện thành `canMarkAbsent && isAbsent`:

```jsx
      {/* Khi Vắng: chọn người dạy thay + ghi chú (chỉ admin) */}
      {canMarkAbsent && isAbsent && (
        <SubstituteDropdown
```

- [ ] **Step 4: Thêm component `SubstituteCard` (read-only) ở cuối file**

Thêm vào cuối `src/components/schedule/ScheduleCard.jsx` (sau `ScheduleCard`):

```jsx
// ─── SubstituteCard ────────────────────────────────────────
// Card read-only hiển thị buổi GV hiện tại được giao dạy thay.
// Không có chip chấm công, không click chỉnh sửa.
export const SubstituteCard = ({ assignment }) => {
  const color = getCourseColor() // default xám
  return (
    <div className={clsx('relative rounded-xl border p-2.5', color.bg, color.border)}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className={clsx('w-2 h-2 rounded-full shrink-0', color.dot)} />
        <span className={clsx('text-xs font-semibold truncate', color.text)}>
          {assignment.className ?? '—'}
        </span>
        <span className="ml-auto shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
          Dạy thay
        </span>
      </div>
      <div className={clsx('flex items-center gap-1 text-xs', color.text)}>
        <Clock size={11} className="shrink-0" />
        <span>{fmtTime(assignment.startTime)}–{fmtTime(assignment.endTime)}</span>
      </div>
      {assignment.room && (
        <div className={clsx('flex items-center gap-1 text-xs mt-0.5', color.text, 'opacity-80')}>
          <MapPin size={11} className="shrink-0" />
          <span className="truncate">{assignment.room}</span>
        </div>
      )}
      <div className={clsx('text-xs mt-0.5 truncate', color.text, 'opacity-70')}>
        Thay: {assignment.mainTeacherName ?? '—'}
      </div>
    </div>
  )
}
```

Lưu ý: `getCourseColor`, `clsx`, `Clock`, `MapPin`, `fmtTime` đã được import sẵn ở đầu file — không cần thêm import.

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: build thành công, không lỗi.

- [ ] **Step 6: Commit**

```bash
git add src/components/schedule/ScheduleCard.jsx
git commit -m "feat(schedule): ScheduleCard giới hạn vắng theo quyền + thêm SubstituteCard read-only"
```

---

## Task 3: WeeklyGrid — nhận canMarkAbsent + render SubstituteCard đúng cột

**Files:**
- Modify: `src/components/schedule/WeeklyGrid.jsx`

- [ ] **Step 1: Import `SubstituteCard`**

Sửa dòng import đầu file:

```jsx
import { ScheduleCard, SubstituteCard } from './ScheduleCard'
```

- [ ] **Step 2: Thêm props `canMarkAbsent` và `subAssignments` vào signature**

Sửa signature `WeeklyGrid` (dòng ~28), thêm `canMarkAbsent = false` và `subAssignments = []`:

```jsx
export const WeeklyGrid = ({ scheduleItems = [], classes = [], studentCounts = new Map(), showTeacher = false, onEdit, onAddDay, weekStart = null, canCheckAttendance = false, canMarkAbsent = false, attendanceMap = new Map(), onToggleAttendance, onAttendanceNote, teachers = [], onSetSubstitute, subAssignments = [] }) => {
```

- [ ] **Step 3: Nhóm subAssignments theo dayOfWeek**

Ngay sau khối `for (const day of DAY_ORDER) { ... }` (sau dòng ~34, trước `const getClass`), thêm helper nhóm dạy thay theo cột ngày:

```jsx
  // Nhóm buổi dạy thay theo dayOfWeek (suy từ chuỗi date 'YYYY-MM-DD')
  const subsByDay = {}
  for (const day of DAY_ORDER) subsByDay[day] = []
  for (const a of subAssignments) {
    if (!a.date) continue
    const dow = new Date(a.date + 'T00:00:00').getDay()
    if (subsByDay[dow]) subsByDay[dow].push(a)
  }
```

- [ ] **Step 4: Truyền `canMarkAbsent` xuống ScheduleCard (desktop + mobile)**

Trong CẢ HAI khối render `<ScheduleCard ...>` (desktop dòng ~79, mobile dòng ~126), thêm prop `canMarkAbsent={canMarkAbsent}` ngay sau `canCheckAttendance={canCheckAttendance}`:

```jsx
                      canCheckAttendance={canCheckAttendance}
                      canMarkAbsent={canMarkAbsent}
```

- [ ] **Step 5: Render SubstituteCard trong cột desktop**

Trong khối desktop, bên trong `<div className="flex flex-col gap-1.5">` (khối "Cards"), thêm danh sách dạy thay NGAY SAU phần `items.length === 0 ? (...) : (...)`. Sửa khối để bao cả 2 phần:

Tìm (desktop, dòng ~72-95):
```jsx
            {/* Cards */}
            <div className="flex flex-col gap-1.5">
              {items.length === 0 ? (
                <div className="h-16 rounded-xl border-2 border-dashed border-navy-100 flex items-center justify-center">
                  <span className="text-navy-200 text-xs">Trống</span>
                </div>
              ) : (
                items.map(item => (
                    <ScheduleCard
                      key={item.id}
                      item={item}
                      cls={getClass(item.classId)}
                      studentCount={studentCounts.get(item.classId)}
                      showTeacher={showTeacher}
                      onEdit={onEdit}
                      canCheckAttendance={canCheckAttendance}
                      canMarkAbsent={canMarkAbsent}
                      attendanceRecord={attendanceMap.get(`${item.id}_${date}`) ?? null}
                      onToggleAttendance={(it) => onToggleAttendance?.(it, date)}
                      onAttendanceNote={(it, note) => onAttendanceNote?.(it, date, note)}
                      teachers={teachers}
                      onSetSubstitute={(it, teacherId) => onSetSubstitute?.(it, date, teacherId)}
                    />
                ))
              )}
            </div>
```

Thay phần điều kiện "Trống" để KHÔNG hiện "Trống" khi có buổi dạy thay, và render các `SubstituteCard` sau danh sách ca thường:

```jsx
            {/* Cards */}
            <div className="flex flex-col gap-1.5">
              {items.length === 0 && subsByDay[day].length === 0 ? (
                <div className="h-16 rounded-xl border-2 border-dashed border-navy-100 flex items-center justify-center">
                  <span className="text-navy-200 text-xs">Trống</span>
                </div>
              ) : (
                <>
                  {items.map(item => (
                    <ScheduleCard
                      key={item.id}
                      item={item}
                      cls={getClass(item.classId)}
                      studentCount={studentCounts.get(item.classId)}
                      showTeacher={showTeacher}
                      onEdit={onEdit}
                      canCheckAttendance={canCheckAttendance}
                      canMarkAbsent={canMarkAbsent}
                      attendanceRecord={attendanceMap.get(`${item.id}_${date}`) ?? null}
                      onToggleAttendance={(it) => onToggleAttendance?.(it, date)}
                      onAttendanceNote={(it, note) => onAttendanceNote?.(it, date, note)}
                      teachers={teachers}
                      onSetSubstitute={(it, teacherId) => onSetSubstitute?.(it, date, teacherId)}
                    />
                  ))}
                  {subsByDay[day].map(a => (
                    <SubstituteCard key={`sub_${a.id}`} assignment={a} />
                  ))}
                </>
              )}
            </div>
```

- [ ] **Step 6: Render SubstituteCard trong mục mobile**

Trong khối mobile, hiện tại `if (items.length === 0) return null` (dòng ~110) sẽ ẩn cả ngày chỉ có dạy thay. Sửa để vẫn hiện ngày khi có dạy thay, và render thêm các `SubstituteCard`.

Tìm (mobile):
```jsx
          const items = byDay[day].filter(item => {
            if (!date) return true
            const cls = getClass(item.classId)
            return !cls?.startDate || date >= cls.startDate
          })
          if (items.length === 0) return null
```

Thay dòng `if` thành:
```jsx
          if (items.length === 0 && subsByDay[day].length === 0) return null
```

Sau đó tìm khối render danh sách mobile (`<div className="flex flex-col gap-2 pl-2">`):
```jsx
              <div className="flex flex-col gap-2 pl-2">
                {items.map(item => (
                    <ScheduleCard
                      key={item.id}
                      item={item}
                      cls={getClass(item.classId)}
                      studentCount={studentCounts.get(item.classId)}
                      showTeacher={showTeacher}
                      onEdit={onEdit}
                      canCheckAttendance={canCheckAttendance}
                      canMarkAbsent={canMarkAbsent}
                      attendanceRecord={attendanceMap.get(`${item.id}_${date}`) ?? null}
                      onToggleAttendance={(it) => onToggleAttendance?.(it, date)}
                      onAttendanceNote={(it, note) => onAttendanceNote?.(it, date, note)}
                      teachers={teachers}
                      onSetSubstitute={(it, teacherId) => onSetSubstitute?.(it, date, teacherId)}
                    />
                ))}
              </div>
```

Thêm các `SubstituteCard` sau `items.map`:
```jsx
              <div className="flex flex-col gap-2 pl-2">
                {items.map(item => (
                    <ScheduleCard
                      key={item.id}
                      item={item}
                      cls={getClass(item.classId)}
                      studentCount={studentCounts.get(item.classId)}
                      showTeacher={showTeacher}
                      onEdit={onEdit}
                      canCheckAttendance={canCheckAttendance}
                      canMarkAbsent={canMarkAbsent}
                      attendanceRecord={attendanceMap.get(`${item.id}_${date}`) ?? null}
                      onToggleAttendance={(it) => onToggleAttendance?.(it, date)}
                      onAttendanceNote={(it, note) => onAttendanceNote?.(it, date, note)}
                      teachers={teachers}
                      onSetSubstitute={(it, teacherId) => onSetSubstitute?.(it, date, teacherId)}
                    />
                ))}
                {subsByDay[day].map(a => (
                  <SubstituteCard key={`sub_${a.id}`} assignment={a} />
                ))}
              </div>
```

- [ ] **Step 7: Verify build**

Run: `npm run build`
Expected: build thành công, không lỗi.

- [ ] **Step 8: Commit**

```bash
git add src/components/schedule/WeeklyGrid.jsx
git commit -m "feat(schedule): WeeklyGrid render card dạy thay đúng cột + truyền canMarkAbsent"
```

---

## Task 4: SchedulePage — sửa vòng lặp trạng thái, truyền props, xóa banner

**Files:**
- Modify: `src/pages/SchedulePage.jsx`

- [ ] **Step 1: Lấy `canMarkAbsent` từ usePermissions**

Sửa dòng destructure (dòng ~48):

```jsx
  const { canFilterByTeacher: isAdmin, canCheckOwnAttendance, canMarkAbsent, canViewAllPayroll } = usePermissions()
```

- [ ] **Step 2: Sửa `handleToggleAttendance` — chặn vắng cho giáo viên + bảo toàn absent**

Thay toàn bộ thân hàm `handleToggleAttendance` (dòng ~206-224):

```jsx
  // Chấm công: GV chỉ pending↔present; admin pending→present→absent→pending.
  const handleToggleAttendance = useCallback(async (item, date) => {
    const cls = classes.find(c => c.id === item.classId)
    if (!cls?.teacherId) { toast.error('Không tìm thấy lớp/giáo viên'); return }
    const record = attendanceMap.get(`${item.id}_${date}`)
    const cur = record?.status === 'present' ? 'present' : record?.status === 'absent' ? 'absent' : 'pending'
    try {
      if (cur === 'pending') {
        await teacherAttendanceService.upsert({ scheduleId: item.id, date, teacherId: cls.teacherId, status: 'present', note: record?.note ?? null })
      } else if (cur === 'present') {
        if (canMarkAbsent) {
          await teacherAttendanceService.upsert({ scheduleId: item.id, date, teacherId: cls.teacherId, status: 'absent', note: record?.note ?? null, substituteTeacherId: record?.substituteTeacherId ?? null })
        } else {
          // GV thường: present → pending (xóa record), KHÔNG sang absent
          await teacherAttendanceService.remove(item.id, date)
        }
      } else {
        // cur === 'absent'
        if (!canMarkAbsent) return   // GV thường không được sửa "Vắng" do admin đặt
        await teacherAttendanceService.remove(item.id, date)
      }
      await loadAttendance()
    } catch {
      toast.error('Không thể chấm công')
    }
  }, [classes, attendanceMap, loadAttendance, canMarkAbsent])
```

- [ ] **Step 3: Truyền `canMarkAbsent` + `subAssignments` vào WeeklyGrid**

Trong JSX render `<WeeklyGrid ...>` (dòng ~485), thêm 2 prop. Sau `canCheckAttendance={canCheckOwnAttendance}` thêm `canMarkAbsent={canMarkAbsent}`, và sau `onSetSubstitute={handleSetSubstitute}` thêm `subAssignments={subAssignments}`:

```jsx
                  <WeeklyGrid
                    scheduleItems={visibleSchedule}
                    classes={visibleClasses}
                    studentCounts={studentCounts}
                    showTeacher={showTeacher}
                    onEdit={openEdit}
                    onAddDay={openAdd}
                    weekStart={weekStart}
                    canCheckAttendance={canCheckOwnAttendance}
                    canMarkAbsent={canMarkAbsent}
                    attendanceMap={attendanceMap}
                    onToggleAttendance={handleToggleAttendance}
                    onAttendanceNote={handleSetAttendanceNote}
                    teachers={teachers}
                    onSetSubstitute={handleSetSubstitute}
                    subAssignments={subAssignments}
                  />
```

- [ ] **Step 4: Xóa banner SubstituteAssignments khỏi JSX**

Xóa khối (dòng ~433-441):

```jsx
            {/* Buổi được giao dạy thay — above the grid */}
            {!loading && subAssignments.length > 0 && (
              <div className="mb-4">
                <SubstituteAssignments
                  assignments={subAssignments}
                  onConfirm={handleConfirmSubstitute}
                />
              </div>
            )}
```

- [ ] **Step 5: Xóa import và handler không còn dùng**

Xóa dòng import (dòng ~15):
```jsx
import { SubstituteAssignments } from '@/components/schedule/SubstituteAssignments'
```

Xóa handler `handleConfirmSubstitute` (dòng ~266-274):
```jsx
  const handleConfirmSubstitute = useCallback(async (assignment) => {
    try {
      await teacherAttendanceService.confirmSubstitute(assignment.scheduleId, assignment.date, true)
      toast.success('Đã xác nhận dạy thay')
      await loadSubAssignments()
    } catch {
      toast.error('Không thể xác nhận')
    }
  }, [loadSubAssignments])
```

Lưu ý: GIỮ `loadSubAssignments` + effect của nó + state `subAssignments` (vẫn cần để truyền vào WeeklyGrid).

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: build thành công, không lỗi, không cảnh báo về import thiếu.

- [ ] **Step 7: Commit**

```bash
git add src/pages/SchedulePage.jsx
git commit -m "feat(schedule): GV không tự đánh vắng, card dạy thay vào lưới, bỏ banner xác nhận"
```

---

## Task 5: Xóa file SubstituteAssignments.jsx

**Files:**
- Delete: `src/components/schedule/SubstituteAssignments.jsx`

- [ ] **Step 1: Xác nhận không còn tham chiếu**

Run: `grep -rn "SubstituteAssignments" src/`
Expected: không có kết quả nào trong `src/` (chỉ còn trong docs).

- [ ] **Step 2: Xóa file**

```bash
git rm src/components/schedule/SubstituteAssignments.jsx
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: build thành công.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(schedule): xóa SubstituteAssignments không còn dùng"
```

---

## Task 6: Kiểm tra trực quan trên dev server

**Files:** không sửa code (chỉ verify).

- [ ] **Step 1: Chạy dev server**

Run: `npm run dev`
Mở http://localhost:5173 → đăng nhập.

- [ ] **Step 2: Verify với tài khoản GIÁO VIÊN thường**

- Vào trang "Giảng Dạy" → tab "Lịch Dạy".
- Bấm chip chấm công trên 1 ca: "Chưa xác nhận" → "Đã dạy" → bấm lại → "Chưa xác nhận". Tooltip chỉ hiện "Chưa xác nhận → Đã dạy".
- KHÔNG có cách nào để chuyển sang "Vắng" hay thấy dropdown chọn người dạy thay.

- [ ] **Step 3: Verify với tài khoản ADMIN**

- Bấm chip: "Chưa xác nhận" → "Đã dạy" → "Vắng" → bấm lại → "Chưa xác nhận".
- Khi "Vắng": hiện dropdown "Dạy thay" + ô ghi chú. Chọn 1 giáo viên làm người dạy thay.

- [ ] **Step 4: Verify card dạy thay (đăng nhập bằng giáo viên được giao dạy thay)**

- Đăng nhập tài khoản giáo viên vừa được admin chọn dạy thay.
- Trong lưới lịch tuần (đúng ngày buổi đó), thấy card xám có badge vàng "Dạy thay", dòng "Thay: {tên GV chính}", giờ + phòng.
- Card này KHÔNG có chip chấm công, không mở modal khi bấm.
- Không còn banner "Buổi được giao dạy thay" phía trên lưới.

- [ ] **Step 5: Verify edge case bảo toàn "Vắng"**

- Với giáo viên CHÍNH bị admin đánh vắng: card của họ hiện chip "Vắng" (đỏ). Bấm vào chip KHÔNG xóa được (vẫn "Vắng").

- [ ] **Step 6: Dừng dev server.** Nếu mọi thứ đúng, chuyển sang Task 7.

---

## Task 7: Cập nhật tài liệu

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Cập nhật mục chấm công trong CLAUDE.md**

Tìm mục "**Chấm công giáo viên — opt-in 3 trạng thái**" và "**ScheduleCard (chấm công):**" và "**SubstituteAssignments**" trong CLAUDE.md, cập nhật để phản ánh:
- Giáo viên thường: 2 trạng thái (Chưa xác nhận ↔ Đã dạy). Cờ mới `canMarkAbsent` (= isAdmin).
- Chỉ admin: đánh "Vắng" + chọn người dạy thay.
- Giáo viên dạy thay thấy `SubstituteCard` (read-only, badge "Dạy thay") trong `WeeklyGrid`, không còn banner `SubstituteAssignments` (đã xóa) và không còn luồng tự xác nhận dạy thay.
- Cập nhật danh sách cờ `usePermissions` thêm `canMarkAbsent`.

(Viết lại các đoạn liên quan cho khớp; giữ văn phong tiếng Việt hiện có.)

- [ ] **Step 2: Cập nhật mục usePermissions**

Trong phần "Phân quyền UI", thêm `canMarkAbsent` (= isAdmin) vào danh sách cờ ngữ nghĩa.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: cập nhật CLAUDE.md cho tách quyền chấm công giáo viên"
```

---

## Self-Review (đã thực hiện khi viết plan)

- **Spec coverage:** ✅ Yêu cầu 1 (GV chỉ đánh dạy) → Task 1+2+4. Yêu cầu 2 (admin đầy đủ) → Task 2+4. Yêu cầu 3 (card dạy thay trong lưới) → Task 2+3. Yêu cầu 4 (read-only) → SubstituteCard không có handler. Yêu cầu 5 (xóa banner) → Task 4+5.
- **Edge case bổ sung:** chặn GV thường xóa record "Vắng" do admin đặt (Task 4 Step 2) — không có trong spec gốc nhưng cần để bảo mật đúng ý định.
- **Type consistency:** `SubstituteCard` nhận `assignment` với các field `{ id, className, startTime, endTime, room, mainTeacherName }` — khớp với output của `getSubstituteAssignments` trong `teacherAttendanceService`. `canMarkAbsent` đặt tên nhất quán qua mọi file.
- **Không placeholder:** mọi step có code/command cụ thể.
