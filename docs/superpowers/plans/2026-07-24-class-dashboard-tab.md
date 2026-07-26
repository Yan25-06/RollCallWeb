# Tab "Tổng Quan" (Dashboard) trong trang lớp học — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm tab "Tổng Quan" vào `ClassDetailPage` hiển thị bảng so sánh điểm danh % và bài tập của tất cả học viên đang học trong lớp; bấm 1 dòng mở chi tiết học viên ở tab "Học Viên".

**Architecture:** Một hàm thuần `buildClassOverviewRows` (utils, test bằng Node) dựng dữ liệu từ 5 batch fetch sẵn có; component `DashboardTab` render bảng; `ClassDetailPage` nâng state chọn học viên (`pendingStudentId`) để điều hướng chéo tab; `StudentsTab` nhận `initialStudentId`.

**Tech Stack:** React 18, Tailwind (navy tokens), Supabase service layer (chỉ đọc, không đổi service/DB/RLS), Node script cho test hàm thuần.

---

## File Structure

| File | Trách nhiệm |
|------|-------------|
| `src/utils/classOverview.js` | **Mới** — hàm thuần `buildClassOverviewRows`, không import React/supabase |
| `scripts/test-class-overview.mjs` | **Mới** — test Node cho hàm thuần |
| `src/pages/ClassDetailPage/tabs/DashboardTab.jsx` | **Mới** — fetch + render bảng so sánh |
| `src/pages/ClassDetailPage/index.jsx` | **Sửa** — thêm tab, đổi `initialTab` default, `pendingStudentId`, render nhánh |
| `src/pages/ClassDetailPage/tabs/StudentsTab.jsx` | **Sửa** — prop `initialStudentId` cho lựa chọn ban đầu |
| `CLAUDE.md` | **Sửa** — cập nhật mô tả tab của `ClassDetailPage` |

---

## Task 1: Hàm thuần `buildClassOverviewRows`

**Files:**
- Create: `src/utils/classOverview.js`
- Test: `scripts/test-class-overview.mjs`

- [ ] **Step 1: Viết test thất bại**

Create `scripts/test-class-overview.mjs`:

```js
import assert from 'node:assert'
import { buildClassOverviewRows } from '../src/utils/classOverview.js'

// today cố định để test ổn định
const TODAY = '2026-07-24'

const students = [
  { id: 's1', name: 'Nguyễn A' },
  { id: 's2', name: 'Trần B' },
  { id: 's3', name: 'Lê C' },   // active nhưng chưa có bài tập
  { id: 's4', name: 'Phạm D' }, // dropped → không xuất hiện
]
const enrollments = [
  { studentId: 's1', status: 'active' },
  { studentId: 's2', status: 'active' },
  { studentId: 's3', status: 'active' },
  { studentId: 's4', status: 'dropped' },
]
const sessions = [
  { id: 'ss1', date: '2026-07-01' }, // past
  { id: 'ss2', date: '2026-07-10' }, // past
  { id: 'ss3', date: '2026-08-01' }, // future → không tính mẫu số
]
// mặc định có mặt: chỉ present===false mới là vắng
const attendance = [
  { studentId: 's1', sessionId: 'ss1', present: false }, // A vắng 1/2 buổi past
  { studentId: 's2', sessionId: 'ss1', present: true },
  { studentId: 's2', sessionId: 'ss2', present: true },
]
const homeworks = [
  { studentId: 's1', progress: 'done' },
  { studentId: 's1', progress: 'in_progress' },
  { studentId: 's2', progress: 100 },
  { studentId: 's2', progress: 'done' },
]

const rows = buildClassOverviewRows({ students, enrollments, sessions, attendance, homeworks, today: TODAY })

// chỉ HS active, sắp theo tên (vi): Lê C, Nguyễn A, Trần B
assert.deepStrictEqual(rows.map(r => r.studentId), ['s3', 's1', 's2'])

const a = rows.find(r => r.studentId === 's1')
assert.strictEqual(a.attendanceRate, 50)  // (2 past - 1 absent)/2 = 50%
assert.strictEqual(a.hwDone, 1)
assert.strictEqual(a.hwTotal, 2)
assert.strictEqual(a.hwRate, 50)

const b = rows.find(r => r.studentId === 's2')
assert.strictEqual(b.attendanceRate, 100) // không vắng
assert.strictEqual(b.hwDone, 2)
assert.strictEqual(b.hwTotal, 2)
assert.strictEqual(b.hwRate, 100)

const c = rows.find(r => r.studentId === 's3')
assert.strictEqual(c.attendanceRate, 100) // không bản ghi vắng → 100%
assert.strictEqual(c.hwDone, 0)
assert.strictEqual(c.hwTotal, 0)
assert.strictEqual(c.hwRate, 0)

// lớp không có buổi past → attendanceRate null
const noPast = buildClassOverviewRows({
  students, enrollments,
  sessions: [{ id: 'ssx', date: '2026-08-01' }],
  attendance: [], homeworks: [], today: TODAY,
})
assert.strictEqual(noPast.find(r => r.studentId === 's1').attendanceRate, null)

console.log('OK — buildClassOverviewRows', rows.length, 'rows')
```

- [ ] **Step 2: Chạy test xác nhận FAIL**

Run: `node scripts/test-class-overview.mjs`
Expected: FAIL — `Cannot find module '../src/utils/classOverview.js'` (chưa tạo file).

- [ ] **Step 3: Viết hàm thuần**

Create `src/utils/classOverview.js`:

```js
// Hàm thuần dựng dữ liệu tổng quan lớp cho tab Dashboard.
// Không import React/supabase → test được bằng Node.
// Điểm danh dùng quy ước "mặc định có mặt": chỉ present===false mới tính vắng,
// mẫu số = số buổi đã qua (date <= today) của lớp — khớp attendanceService.getRate.
// Bài tập dùng cùng phân loại như homeworkService.getStats.

const isDone = (p) => p === 'done' || p === 100

const localToday = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const buildClassOverviewRows = ({
  students = [],
  enrollments = [],
  sessions = [],
  attendance = [],
  homeworks = [],
  today = localToday(),
} = {}) => {
  const studentById = new Map(students.map(s => [s.id, s]))

  const pastSessionIds = new Set(
    sessions.filter(s => s.date && s.date <= today).map(s => s.id)
  )
  const pastCount = pastSessionIds.size

  return enrollments
    .filter(e => e.status === 'active')
    .map(e => {
      const student = studentById.get(e.studentId)
      const name = student?.name ?? '—'

      const absent = attendance.filter(
        a => a.studentId === e.studentId && pastSessionIds.has(a.sessionId) && a.present === false
      ).length
      const attendanceRate = pastCount === 0
        ? null
        : Math.round(((pastCount - absent) / pastCount) * 100)

      const hw = homeworks.filter(h => h.studentId === e.studentId)
      const hwTotal = hw.length
      const hwDone = hw.filter(h => isDone(h.progress)).length
      const hwRate = hwTotal > 0 ? Math.round((hwDone / hwTotal) * 100) : 0

      return { studentId: e.studentId, name, status: e.status, attendanceRate, hwDone, hwTotal, hwRate }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'))
}
```

- [ ] **Step 4: Chạy test xác nhận PASS**

Run: `node scripts/test-class-overview.mjs`
Expected: PASS — in ra `OK — buildClassOverviewRows 3 rows`.

- [ ] **Step 5: Commit**

```bash
git add src/utils/classOverview.js scripts/test-class-overview.mjs
git commit -m "feat(class): hàm thuần buildClassOverviewRows cho dashboard lớp"
```

---

## Task 2: Component `DashboardTab`

**Files:**
- Create: `src/pages/ClassDetailPage/tabs/DashboardTab.jsx`

- [ ] **Step 1: Viết component**

Create `src/pages/ClassDetailPage/tabs/DashboardTab.jsx`:

```jsx
import { useState, useEffect, useMemo } from 'react'
import { clsx } from 'clsx'
import { Users, ArrowUpDown } from 'lucide-react'
import { Skeleton, Empty } from '@/components/ui'
import { getInitials } from '@/utils/helpers'
import { buildClassOverviewRows } from '@/utils/classOverview'
import { studentService } from '@/services/studentService'
import { enrollmentService } from '@/services/enrollmentService'
import { sessionService } from '@/services/sessionService'
import { attendanceService } from '@/services/attendanceService'
import { homeworkService } from '@/services/homeworkService'

// Ngưỡng cảnh báo HS yếu (chỉnh tại đây nếu cần)
const ATT_WARN = 75  // điểm danh dưới 75% → cảnh báo
const HW_WARN  = 50  // tỷ lệ bài tập dưới 50% → cảnh báo

const SortHeader = ({ label, active, dir, onClick, align = 'right' }) => (
  <th className={clsx('py-2 px-3', align === 'right' ? 'text-right' : 'text-left')}>
    <button
      onClick={onClick}
      className={clsx(
        'inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide transition-colors',
        active ? 'text-navy-800' : 'text-navy-400 hover:text-navy-700'
      )}
    >
      {label}
      <ArrowUpDown size={12} className={clsx(active ? 'opacity-100' : 'opacity-40')} />
      {active && <span className="text-[10px]">{dir === 'asc' ? '↑' : '↓'}</span>}
    </button>
  </th>
)

export const DashboardTab = ({ classId, onSelectStudent }) => {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' })

  useEffect(() => {
    let alive = true
    setLoading(true)
    Promise.all([
      studentService.getAll(),
      enrollmentService.getByClass(classId),
      sessionService.getByClass(classId),
      attendanceService.getByClass(classId),
      homeworkService.getByClass(classId),
    ])
      .then(([students, enrollments, sessions, attendance, homeworks]) => {
        if (!alive) return
        setRows(buildClassOverviewRows({ students, enrollments, sessions, attendance, homeworks }))
      })
      .catch(() => { if (alive) setRows([]) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [classId])

  const toggleSort = (key) =>
    setSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })

  const sortedRows = useMemo(() => {
    const arr = [...rows]
    const { key, dir } = sort
    const mul = dir === 'asc' ? 1 : -1
    arr.sort((a, b) => {
      if (key === 'name') return a.name.localeCompare(b.name, 'vi') * mul
      // null (chưa có buổi) xuống cuối bất kể chiều
      const av = key === 'att' ? a.attendanceRate : a.hwRate
      const bv = key === 'att' ? b.attendanceRate : b.hwRate
      if (av === null && bv === null) return 0
      if (av === null) return 1
      if (bv === null) return -1
      return (av - bv) * mul
    })
    return arr
  }, [rows, sort])

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
      </div>
    )
  }

  if (rows.length === 0) {
    return <Empty icon={<Users size={40} />} title="Lớp chưa có học viên đang học" desc="Thêm học viên ở tab Học Viên để xem tổng quan" />
  }

  return (
    <div className="bg-white rounded-2xl border border-navy-100 shadow-navy-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-navy-100 bg-navy-50/50">
              <SortHeader label="Học viên" align="left" active={sort.key === 'name'} dir={sort.dir} onClick={() => toggleSort('name')} />
              <SortHeader label="Điểm danh" active={sort.key === 'att'} dir={sort.dir} onClick={() => toggleSort('att')} />
              <SortHeader label="Bài tập" active={sort.key === 'hw'} dir={sort.dir} onClick={() => toggleSort('hw')} />
            </tr>
          </thead>
          <tbody>
            {sortedRows.map(r => (
              <tr
                key={r.studentId}
                onClick={() => onSelectStudent?.(r.studentId)}
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter') onSelectStudent?.(r.studentId) }}
                className="border-b border-navy-50 last:border-0 hover:bg-navy-50 cursor-pointer transition-colors focus:outline-none focus:bg-navy-50"
              >
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-navy-800 text-white text-xs font-bold flex items-center justify-center shrink-0 select-none">
                      {getInitials(r.name)}
                    </div>
                    <span className="font-medium text-navy-800 truncate">{r.name}</span>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-right">
                  <span className={clsx(
                    'font-semibold tabular-nums',
                    r.attendanceRate === null ? 'text-navy-300'
                      : r.attendanceRate < ATT_WARN ? 'text-red-600' : 'text-navy-800'
                  )}>
                    {r.attendanceRate === null ? '—' : `${r.attendanceRate}%`}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right">
                  <span className="font-semibold text-navy-800 tabular-nums">{r.hwDone}/{r.hwTotal}</span>
                  <span className={clsx(
                    'text-xs ml-1.5 tabular-nums',
                    r.hwTotal > 0 && r.hwRate < HW_WARN ? 'text-amber-600' : 'text-navy-400'
                  )}>
                    ({r.hwRate}%)
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Xác nhận build không lỗi import**

Run: `npm run build`
Expected: build thành công (không lỗi resolve import). Component chưa được render ở đâu — bước này chỉ chặn lỗi cú pháp/import.

- [ ] **Step 3: Commit**

```bash
git add src/pages/ClassDetailPage/tabs/DashboardTab.jsx
git commit -m "feat(class): component DashboardTab bảng tổng quan học viên"
```

---

## Task 3: `StudentsTab` nhận `initialStudentId`

**Files:**
- Modify: `src/pages/ClassDetailPage/tabs/StudentsTab.jsx`

- [ ] **Step 1: Thêm prop và dùng cho lựa chọn ban đầu**

Trong `src/pages/ClassDetailPage/tabs/StudentsTab.jsx`, đổi chữ ký component (dòng 13):

```jsx
export const StudentsTab = ({ classId, onEnrollmentChange, isAdmin = false, initialStudentId = null }) => {
```

Trong `loadData` (khối chọn học viên mặc định, dòng 35-39), ưu tiên `initialStudentId` nếu nó thuộc lớp:

```jsx
      if (!selectedStudentId || !classEnrollments.find(e => e.studentId === selectedStudentId)) {
        const wanted = initialStudentId && classEnrollments.find(e => e.studentId === initialStudentId)
          ? initialStudentId
          : null
        const firstActive = classEnrollments.find(e => e.status === 'active')
        const first = firstActive || classEnrollments[0]
        setSelectedStudentId(wanted || first?.studentId || null)
      }
```

Thêm `initialStudentId` vào deps của `useCallback` (dòng 46) — đổi `}, [classId])` thành `}, [classId, initialStudentId])`.

Thêm một `useEffect` phản ứng khi `initialStudentId` đổi lúc tab đã mở sẵn (đặt ngay sau `useEffect` load hiện có, sau dòng 50):

```jsx
  useEffect(() => {
    if (initialStudentId) {
      setSelectedStudentId(initialStudentId)
      setMobileShowDetail(true)
    }
  }, [initialStudentId])
```

- [ ] **Step 2: Xác nhận build**

Run: `npm run build`
Expected: build thành công.

- [ ] **Step 3: Commit**

```bash
git add src/pages/ClassDetailPage/tabs/StudentsTab.jsx
git commit -m "feat(class): StudentsTab nhận initialStudentId để mở sẵn học viên"
```

---

## Task 4: Nối tab vào `ClassDetailPage`

**Files:**
- Modify: `src/pages/ClassDetailPage/index.jsx`

- [ ] **Step 1: Import + thêm tab + state**

Thêm import (sau dòng 7 `import { StudentsTab } ...`):

```jsx
import { DashboardTab } from './tabs/DashboardTab'
```

Đổi mảng `TABS` (dòng 12-17) — thêm 'dashboard' ở đầu:

```jsx
const TABS = [
  { id: 'dashboard',   label: 'Tổng Quan', disabled: false },
  { id: 'students',    label: 'Học Viên',  disabled: false },
  { id: 'attendance',  label: 'Điểm Danh', disabled: false },
  { id: 'assignments', label: 'Bài Tập',   disabled: false },
  { id: 'mocktest',    label: 'Mock Test',  disabled: false },
]
```

Đổi default `initialTab` (dòng 19) `'students'` → `'dashboard'`:

```jsx
export const ClassDetailPage = ({ classId, onBack, initialTab = 'dashboard', isAdmin = false }) => {
```

Thêm state `pendingStudentId` ngay sau `const [loading, setLoading] = useState(true)` (dòng 23):

```jsx
  const [pendingStudentId, setPendingStudentId] = useState(null)
```

- [ ] **Step 2: Handler điều hướng từ dashboard**

Thêm handler (đặt trước `if (loading) {`, sau `useEffect` fallback, khoảng dòng 50):

```jsx
  const handleSelectFromDashboard = (studentId) => {
    setPendingStudentId(studentId)
    setActiveTab('students')
  }
```

- [ ] **Step 3: Render nhánh dashboard + truyền prop cho StudentsTab**

Trong khối `{/* Tab content */}` (dòng 148-160), thêm nhánh dashboard trước nhánh students và truyền `initialStudentId` vào `StudentsTab`:

```jsx
        {activeTab === 'dashboard' && (
          <DashboardTab classId={classId} onSelectStudent={handleSelectFromDashboard} />
        )}
        {activeTab === 'students' && (
          <StudentsTab classId={classId} isAdmin={isAdmin} onEnrollmentChange={loadHeader} initialStudentId={pendingStudentId} />
        )}
```

- [ ] **Step 4: Kiểm thử thủ công**

Run: `npm run dev`
Kiểm tra bằng tay:
1. Mở 1 lớp → landing vào tab "Tổng Quan", thấy bảng học viên với cột Điểm danh %, Bài tập.
2. So khớp: điểm danh % của 1 HS bằng số trong tab "Học Viên" (StudentDetailPanel) của HS đó.
3. Bấm header "Điểm danh"/"Bài tập" → sort đổi chiều; HS "—" (chưa có buổi) xuống cuối.
4. HS điểm danh <75% hiện đỏ; bài tập <50% hiện amber.
5. Bấm 1 dòng → nhảy sang tab "Học Viên" mở đúng HS đó.
6. Lớp rỗng → hiện empty state, không vỡ.
7. Từ Dashboard trang chủ bấm "Điểm danh" của 1 lớp → vẫn mở thẳng tab Điểm Danh (không bị tab Tổng Quan chiếm).

Expected: tất cả đúng.

- [ ] **Step 5: Commit**

```bash
git add src/pages/ClassDetailPage/index.jsx
git commit -m "feat(class): gắn tab Tổng Quan vào ClassDetailPage + điều hướng chọn học viên"
```

---

## Task 5: Cập nhật CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Cập nhật mô tả tab**

Trong `CLAUDE.md`, tìm câu mô tả các tab của `ClassDetailPage` (đoạn "`ClassDetailPage` có các tab: Students, Attendance, Homework, MockTest."). Sửa thành phản ánh tab mới, ví dụ:

```
`ClassDetailPage` có các tab: **Dashboard (Tổng Quan)**, Students, Attendance, Homework, MockTest. Tab mặc định khi mở lớp là **Dashboard** (`initialTab` default `'dashboard'`); tab Dashboard (`DashboardTab.jsx`) hiển thị bảng so sánh điểm danh %/bài tập của mọi HS đang học (dữ liệu qua hàm thuần `src/utils/classOverview.js` từ 5 batch fetch, không N+1), bấm 1 dòng → chuyển tab Students mở sẵn HS đó qua prop `initialStudentId` (state `pendingStudentId` ở `ClassDetailPage`). Prop `initialTab` vẫn cho phép mở thẳng tab Attendance từ Dashboard trang chủ.
```

Giữ nguyên phần còn lại của đoạn (mô tả tab Students, các prop khác).

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: cập nhật CLAUDE.md cho tab Tổng Quan của lớp"
```

---

## Self-Review Notes

- **Spec coverage:** Layout bảng (Task 2), cột điểm danh %+bài tập (Task 1+2), cảnh báo màu + sort (Task 2), điều hướng bấm dòng (Task 3+4), tab đầu + mặc định (Task 4), hàm thuần + test (Task 1), cập nhật CLAUDE.md (Task 5). Không đụng service/DB/RLS. ✓
- **Type consistency:** Row shape `{ studentId, name, status, attendanceRate, hwDone, hwTotal, hwRate }` dùng nhất quán ở Task 1 (định nghĩa), Task 2 (render). Prop `onSelectStudent`/`initialStudentId` khớp giữa Task 2/3/4. ✓
- **Không placeholder:** mọi step có code/lệnh cụ thể. ✓
