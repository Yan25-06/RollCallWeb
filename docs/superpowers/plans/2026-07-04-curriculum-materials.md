# Giáo trình & Tài liệu theo courseType — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay tab "Tài Liệu" per-lớp bằng một **giáo trình có cấu trúc** (Tháng → Buổi → nhiều tài liệu) dùng chung theo courseType, admin CRUD, giáo viên chỉ xem.

**Architecture:** 3 bảng Supabase phân cấp (`curriculum_months` → `curriculum_sessions` → `curriculum_materials`) với RLS admin-full / teacher-select. Một service `curriculumService` theo pattern `fromDB/toDB` trả cây lồng nhau. UI viết lại `MaterialsTab` thành accordion Tháng/Tuần/Buổi, cùng 2 modal mới + 1 modal nâng cấp. courseType gom về hằng số dùng chung `COURSE_TYPES`.

**Tech Stack:** React 18 + Vite (alias `@/`), Tailwind navy tokens, Supabase JS, lucide-react, clsx. Không có test runner → verify thủ công qua `npm run dev` + `npm run build`.

---

## File Structure

**Tạo mới:**
- `supabase/migrations/20260704000001_create_curriculum.sql` — 3 bảng + index + RLS.
- `src/utils/courseTypes.js` — hằng số `COURSE_TYPES` dùng chung.
- `src/services/curriculumService.js` — service 3 cấp, trả cây lồng.
- `src/components/schedule/MonthModal.jsx` — thêm/sửa Tháng.
- `src/components/schedule/SessionModal.jsx` — thêm/sửa Buổi.

**Sửa:**
- `src/components/schedule/materialType.js` — đổi bộ loại sang PPT/Handout/Đọc dịch/Homework/Khác.
- `src/components/schedule/MaterialModal.jsx` — dùng bộ type mới (nội dung không đổi cấu trúc, chỉ nhờ materialType).
- `src/components/schedule/MaterialsTab.jsx` — viết lại hoàn toàn (accordion theo courseType).
- `src/components/classes/ClassModal.jsx` — dropdown courseType dùng `COURSE_TYPES`.
- `src/components/schedule/ScheduleCard.jsx` — thêm màu cho courseType mới trong `COURSE_COLORS`.
- `src/pages/SchedulePage.jsx` — `MaterialsTab` không cần prop `classes` nữa (chỉ cần `isAdmin`).
- `CLAUDE.md` + `README.md` — cập nhật mục "Model tài liệu giảng dạy" + courseType.

**Để nguyên (orphan):** `supabase/migrations/20260627000002_add_class_materials.sql`, bảng `class_materials`, `src/services/classMaterialService.js` (không còn import sau khi viết lại MaterialsTab).

**Lưu ý chung:**
- KHÔNG hard-code màu hex; dùng navy token + tối đa các màu Tailwind badge như `materialType.js` hiện có.
- Mọi async có loading state + toast; confirm trước khi xóa.
- Không có unit test → mỗi task "test" = `npm run build` phải xanh + kiểm mắt theo mô tả. Commit sau mỗi task.

---

## Task 1: Migration — 3 bảng curriculum + RLS

**Files:**
- Create: `supabase/migrations/20260704000001_create_curriculum.sql`

- [ ] **Step 1: Viết file migration**

Tạo `supabase/migrations/20260704000001_create_curriculum.sql` với nội dung chính xác:

```sql
-- Giáo trình dùng chung theo courseType: Tháng → Buổi → Tài liệu.
-- Admin toàn quyền; giáo viên chỉ đọc (giáo trình dùng chung mọi lớp cùng loại).

-- ── curriculum_months ─────────────────────────────────────────
create table if not exists public.curriculum_months (
  id uuid primary key default gen_random_uuid(),
  course_type text not null,
  month_no int not null,
  title text,
  created_by uuid references public.teachers(id),
  created_at timestamptz default now(),
  unique (course_type, month_no)
);
create index if not exists curriculum_months_course_type_idx
  on public.curriculum_months(course_type);

-- ── curriculum_sessions ───────────────────────────────────────
create table if not exists public.curriculum_sessions (
  id uuid primary key default gen_random_uuid(),
  month_id uuid not null references public.curriculum_months(id) on delete cascade,
  week_no int,
  session_no int not null,
  skill text,
  content text,
  note text,
  created_by uuid references public.teachers(id),
  created_at timestamptz default now()
);
create index if not exists curriculum_sessions_month_id_idx
  on public.curriculum_sessions(month_id);

-- ── curriculum_materials ──────────────────────────────────────
create table if not exists public.curriculum_materials (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.curriculum_sessions(id) on delete cascade,
  type text not null check (type in ('ppt', 'handout', 'reading', 'homework', 'other')),
  title text not null,
  url text not null,
  order_index int default 0,
  created_by uuid references public.teachers(id),
  created_at timestamptz default now()
);
create index if not exists curriculum_materials_session_id_idx
  on public.curriculum_materials(session_id);

-- ── RLS ───────────────────────────────────────────────────────
alter table public.curriculum_months   enable row level security;
alter table public.curriculum_sessions enable row level security;
alter table public.curriculum_materials enable row level security;

-- Admin: toàn quyền đọc/ghi
create policy "curriculum_months: admin all"
  on public.curriculum_months for all using (is_admin()) with check (is_admin());
create policy "curriculum_sessions: admin all"
  on public.curriculum_sessions for all using (is_admin()) with check (is_admin());
create policy "curriculum_materials: admin all"
  on public.curriculum_materials for all using (is_admin()) with check (is_admin());

-- Giáo viên (mọi authenticated): chỉ SELECT
create policy "curriculum_months: teacher select"
  on public.curriculum_months for select using (auth.uid() is not null);
create policy "curriculum_sessions: teacher select"
  on public.curriculum_sessions for select using (auth.uid() is not null);
create policy "curriculum_materials: teacher select"
  on public.curriculum_materials for select using (auth.uid() is not null);
```

- [ ] **Step 2: Chạy migration trên Supabase**

Người triển khai dán nội dung file vào **Supabase SQL Editor** → Run (giống các migration khác trong repo; dự án không dùng CLI migrate). Kỳ vọng: 3 bảng + 6 policy tạo thành công, không lỗi.

Kiểm nhanh trong SQL Editor:
```sql
select table_name from information_schema.tables
where table_schema = 'public' and table_name like 'curriculum_%';
```
Expected: 3 dòng (`curriculum_months`, `curriculum_sessions`, `curriculum_materials`).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260704000001_create_curriculum.sql
git commit -m "feat(curriculum): migration 3 bảng giáo trình + RLS"
```

---

## Task 2: Hằng số courseType dùng chung

**Files:**
- Create: `src/utils/courseTypes.js`
- Modify: `src/components/classes/ClassModal.jsx`
- Modify: `src/components/schedule/ScheduleCard.jsx:9-14`

- [ ] **Step 1: Tạo hằng số**

Tạo `src/utils/courseTypes.js`:

```js
// Danh sách loại khóa dùng chung cho cả web (dropdown lớp, giáo trình, map màu).
export const COURSE_TYPES = ['IELTS', 'TOEIC', 'TOEIC SW', 'KHÁC']
```

- [ ] **Step 2: ClassModal dùng hằng số**

Trong `src/components/classes/ClassModal.jsx`:

Thêm import ở đầu file (cùng cụm import hiện có):
```jsx
import { COURSE_TYPES } from '@/utils/courseTypes'
```

Đổi giá trị mặc định `courseType: 'Giao Tiếp'` (3 chỗ: state khởi tạo ~dòng 27, nhánh edit ~dòng 45, nhánh reset ~dòng 59) thành:
```jsx
courseType: COURSE_TYPES[0],
```
Với nhánh edit giữ fallback: `courseType: classItem.courseType || COURSE_TYPES[0],`

Thay khối `<option>` cứng (dòng ~176-180) bằng render từ hằng số:
```jsx
<select
  name="courseType"
  value={formData.courseType}
  onChange={handleChange}
  className="select"
>
  {COURSE_TYPES.map(ct => (
    <option key={ct} value={ct}>{ct}</option>
  ))}
</select>
```

- [ ] **Step 3: Thêm màu cho courseType mới**

Trong `src/components/schedule/ScheduleCard.jsx`, thay object `COURSE_COLORS` (dòng 9-14) thành:
```jsx
export const COURSE_COLORS = {
  'IELTS':    { bg: 'bg-navy-100', border: 'border-navy-300', text: 'text-navy-800', dot: 'bg-navy-500' },
  'TOEIC':    { bg: 'bg-teal-50',  border: 'border-teal-200', text: 'text-teal-700', dot: 'bg-teal-500' },
  'TOEIC SW': { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
  'default':  { bg: 'bg-gray-50',  border: 'border-gray-200', text: 'text-gray-600', dot: 'bg-gray-400' },
}
```
(`KHÁC` và giá trị cũ như 'Giao Tiếp' tự rơi về `default` qua `getCourseColor`.)

- [ ] **Step 4: Build kiểm tra**

Run: `npm run build`
Expected: build thành công, không lỗi import/syntax.

- [ ] **Step 5: Commit**

```bash
git add src/utils/courseTypes.js src/components/classes/ClassModal.jsx src/components/schedule/ScheduleCard.jsx
git commit -m "feat(course-type): gom courseType về hằng số dùng chung COURSE_TYPES"
```

---

## Task 3: Bộ loại tài liệu mới

**Files:**
- Modify: `src/components/schedule/materialType.js`

- [ ] **Step 1: Đổi MATERIAL_TYPES**

Thay toàn bộ mảng trong `src/components/schedule/materialType.js` (giữ nguyên `TYPE_MAP` + `getMaterialType` phía dưới):

```js
// Loại tài liệu giảng dạy — dùng chung bởi MaterialsTab và MaterialModal.
export const MATERIAL_TYPES = [
  { value: 'ppt',      label: 'PPT',       badge: 'bg-blue-100 text-blue-700' },
  { value: 'handout',  label: 'Handout',   badge: 'bg-green-100 text-green-700' },
  { value: 'reading',  label: 'Đọc dịch',  badge: 'bg-purple-100 text-purple-700' },
  { value: 'homework', label: 'Homework',  badge: 'bg-orange-100 text-orange-700' },
  { value: 'other',    label: 'Khác',      badge: 'bg-navy-50 text-navy-700' },
]
```

- [ ] **Step 2: Build kiểm tra**

Run: `npm run build`
Expected: build thành công. (MaterialModal đang import `MATERIAL_TYPES` — vẫn hợp lệ.)

- [ ] **Step 3: Commit**

```bash
git add src/components/schedule/materialType.js
git commit -m "feat(curriculum): đổi bộ loại tài liệu sang PPT/Handout/Đọc dịch/Homework"
```

---

## Task 4: Service layer `curriculumService`

**Files:**
- Create: `src/services/curriculumService.js`

- [ ] **Step 1: Viết service**

Tạo `src/services/curriculumService.js`. Theo pattern `studentService`/`classMaterialService`: `fromDB/toDB`, `throw new Error`, `create*` gắn `created_by` qua `getUid()`. `getByCourseType` chạy 3 query rồi lồng cây ở client.

```js
import { supabase } from '@/lib/supabase'
import { getUid } from './studentService'

// ── Months ────────────────────────────────────────────────────
const monthFromDB = (row) => row ? {
  id: row.id,
  courseType: row.course_type,
  monthNo: row.month_no,
  title: row.title,
  createdBy: row.created_by,
  createdAt: row.created_at,
} : null

const monthToDB = (data) => {
  const row = {}
  if (data.courseType !== undefined) row.course_type = data.courseType
  if (data.monthNo !== undefined) row.month_no = data.monthNo
  if (data.title !== undefined) row.title = data.title
  return row
}

// ── Sessions ──────────────────────────────────────────────────
const sessionFromDB = (row) => row ? {
  id: row.id,
  monthId: row.month_id,
  weekNo: row.week_no,
  sessionNo: row.session_no,
  skill: row.skill,
  content: row.content,
  note: row.note,
  createdBy: row.created_by,
  createdAt: row.created_at,
} : null

const sessionToDB = (data) => {
  const row = {}
  if (data.monthId !== undefined) row.month_id = data.monthId
  if (data.weekNo !== undefined) row.week_no = data.weekNo
  if (data.sessionNo !== undefined) row.session_no = data.sessionNo
  if (data.skill !== undefined) row.skill = data.skill
  if (data.content !== undefined) row.content = data.content
  if (data.note !== undefined) row.note = data.note
  return row
}

// ── Materials ─────────────────────────────────────────────────
const materialFromDB = (row) => row ? {
  id: row.id,
  sessionId: row.session_id,
  type: row.type,
  title: row.title,
  url: row.url,
  orderIndex: row.order_index,
  createdBy: row.created_by,
  createdAt: row.created_at,
} : null

const materialToDB = (data) => {
  const row = {}
  if (data.sessionId !== undefined) row.session_id = data.sessionId
  if (data.type !== undefined) row.type = data.type
  if (data.title !== undefined) row.title = data.title
  if (data.url !== undefined) row.url = data.url
  if (data.orderIndex !== undefined) row.order_index = data.orderIndex
  return row
}

export const curriculumService = {
  // Trả cây: [{ ...month, sessions: [{ ...session, materials: [...] }] }]
  async getByCourseType(courseType) {
    const { data: months, error: mErr } = await supabase
      .from('curriculum_months')
      .select('*')
      .eq('course_type', courseType)
      .order('month_no', { ascending: true })
    if (mErr) throw new Error(mErr.message)
    const monthList = (months ?? []).map(monthFromDB)
    if (monthList.length === 0) return []

    const monthIds = monthList.map(m => m.id)
    const { data: sessions, error: sErr } = await supabase
      .from('curriculum_sessions')
      .select('*')
      .in('month_id', monthIds)
      .order('session_no', { ascending: true })
    if (sErr) throw new Error(sErr.message)
    const sessionList = (sessions ?? []).map(sessionFromDB)

    let materialList = []
    if (sessionList.length > 0) {
      const sessionIds = sessionList.map(s => s.id)
      const { data: materials, error: matErr } = await supabase
        .from('curriculum_materials')
        .select('*')
        .in('session_id', sessionIds)
        .order('order_index', { ascending: true })
      if (matErr) throw new Error(matErr.message)
      materialList = (materials ?? []).map(materialFromDB)
    }

    // Lồng cây
    const matBySession = new Map()
    for (const mat of materialList) {
      if (!matBySession.has(mat.sessionId)) matBySession.set(mat.sessionId, [])
      matBySession.get(mat.sessionId).push(mat)
    }
    const sessByMonth = new Map()
    for (const s of sessionList) {
      const withMats = { ...s, materials: matBySession.get(s.id) ?? [] }
      if (!sessByMonth.has(s.monthId)) sessByMonth.set(s.monthId, [])
      sessByMonth.get(s.monthId).push(withMats)
    }
    return monthList.map(m => ({ ...m, sessions: sessByMonth.get(m.id) ?? [] }))
  },

  // ── Months ──
  async createMonth(data) {
    const created_by = await getUid()
    const { data: row, error } = await supabase
      .from('curriculum_months')
      .insert({ ...monthToDB(data), created_by })
      .select().single()
    if (error) throw new Error(error.message)
    return monthFromDB(row)
  },
  async updateMonth(id, data) {
    const { data: row, error } = await supabase
      .from('curriculum_months')
      .update(monthToDB(data)).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return monthFromDB(row)
  },
  async removeMonth(id) {
    const { error } = await supabase.from('curriculum_months').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },

  // ── Sessions ──
  async createSession(data) {
    const created_by = await getUid()
    const { data: row, error } = await supabase
      .from('curriculum_sessions')
      .insert({ ...sessionToDB(data), created_by })
      .select().single()
    if (error) throw new Error(error.message)
    return sessionFromDB(row)
  },
  async updateSession(id, data) {
    const { data: row, error } = await supabase
      .from('curriculum_sessions')
      .update(sessionToDB(data)).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return sessionFromDB(row)
  },
  async removeSession(id) {
    const { error } = await supabase.from('curriculum_sessions').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },

  // ── Materials ──
  async createMaterial(data) {
    const created_by = await getUid()
    const { data: row, error } = await supabase
      .from('curriculum_materials')
      .insert({ ...materialToDB(data), created_by })
      .select().single()
    if (error) throw new Error(error.message)
    return materialFromDB(row)
  },
  async updateMaterial(id, data) {
    const { data: row, error } = await supabase
      .from('curriculum_materials')
      .update(materialToDB(data)).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return materialFromDB(row)
  },
  async removeMaterial(id) {
    const { error } = await supabase.from('curriculum_materials').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },
}
```

- [ ] **Step 2: Build kiểm tra**

Run: `npm run build`
Expected: build thành công (service chưa được import nơi khác nên chỉ kiểm cú pháp).

- [ ] **Step 3: Commit**

```bash
git add src/services/curriculumService.js
git commit -m "feat(curriculum): service layer 3 cấp trả cây lồng"
```

---

## Task 5: MonthModal

**Files:**
- Create: `src/components/schedule/MonthModal.jsx`

- [ ] **Step 1: Viết MonthModal**

Tạo `src/components/schedule/MonthModal.jsx` (mẫu theo `MaterialModal.jsx`: state form, validate, footer có nút Xóa khi edit + confirm 2 bước).

```jsx
import { useState, useEffect } from 'react'
import { Modal, Button, Input } from '@/components/ui'
import { Trash2 } from 'lucide-react'

const EMPTY_FORM = { monthNo: '', title: '' }

/**
 * MonthModal — thêm/sửa Tháng trong giáo trình.
 * @param {Object|null} editingItem - null = thêm, object = sửa
 * @param {Function} onSave   - ({ data, isEdit, id })
 * @param {Function} onDelete - (id)
 */
export const MonthModal = ({ open, onClose, editingItem, onSave, onDelete }) => {
  const isEdit = !!editingItem
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(editingItem
        ? { monthNo: String(editingItem.monthNo ?? ''), title: editingItem.title ?? '' }
        : EMPTY_FORM)
      setErrors({})
      setConfirmDelete(false)
    }
  }, [open, editingItem])

  const set = (f, v) => setForm(s => ({ ...s, [f]: v }))

  const validate = () => {
    const e = {}
    const n = Number(form.monthNo)
    if (!form.monthNo.toString().trim() || !Number.isInteger(n) || n < 1)
      e.monthNo = 'Nhập số tháng hợp lệ (≥ 1)'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    onSave?.({ data: { monthNo: Number(form.monthNo), title: form.title.trim() || null }, isEdit, id: editingItem?.id })
    onClose?.()
  }

  const handleDelete = () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    onDelete?.(editingItem.id)
    onClose?.()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Sửa Tháng' : 'Thêm Tháng'}
      footer={
        <div className="flex items-center justify-between gap-2">
          {isEdit && (
            <Button variant="danger" size="sm" onClick={handleDelete} className="flex items-center gap-1.5">
              <Trash2 size={14} />
              {confirmDelete ? 'Xác nhận xóa?' : 'Xóa'}
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="secondary" size="sm" onClick={onClose}>Hủy</Button>
            <Button variant="primary" size="sm" onClick={handleSubmit}>
              {isEdit ? 'Cập nhật' : 'Thêm tháng'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <Input
          label="Số tháng"
          type="number"
          min={1}
          placeholder="VD: 1"
          value={form.monthNo}
          onChange={e => set('monthNo', e.target.value)}
          error={errors.monthNo}
        />
        <Input
          label="Tiêu đề chủ đề (tùy chọn)"
          placeholder="VD: XÂY DỰNG NỀN TẢNG CƠ BẢN..."
          value={form.title}
          onChange={e => set('title', e.target.value)}
        />
      </div>
    </Modal>
  )
}
```

- [ ] **Step 2: Build kiểm tra**

Run: `npm run build`
Expected: build thành công.

- [ ] **Step 3: Commit**

```bash
git add src/components/schedule/MonthModal.jsx
git commit -m "feat(curriculum): MonthModal thêm/sửa tháng"
```

---

## Task 6: SessionModal

**Files:**
- Create: `src/components/schedule/SessionModal.jsx`

- [ ] **Step 1: Viết SessionModal**

Tạo `src/components/schedule/SessionModal.jsx`. Không có component `Textarea` trong `@/components/ui` → dùng native `<textarea>` với label pattern `text-sm font-medium text-navy-700` và class `input` (đã có sẵn trong `index.css`).

```jsx
import { useState, useEffect } from 'react'
import { Modal, Button, Input } from '@/components/ui'
import { Trash2 } from 'lucide-react'

const EMPTY_FORM = { weekNo: '', sessionNo: '', skill: '', content: '', note: '' }

/**
 * SessionModal — thêm/sửa Buổi trong một Tháng.
 * @param {string}      monthId     - tháng đang thêm buổi (ngữ cảnh, dùng khi tạo)
 * @param {Object|null} editingItem - null = thêm, object = sửa
 * @param {Function} onSave   - ({ data, isEdit, id })
 * @param {Function} onDelete - (id)
 */
export const SessionModal = ({ open, onClose, monthId, editingItem, onSave, onDelete }) => {
  const isEdit = !!editingItem
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(editingItem
        ? {
            weekNo: editingItem.weekNo != null ? String(editingItem.weekNo) : '',
            sessionNo: editingItem.sessionNo != null ? String(editingItem.sessionNo) : '',
            skill: editingItem.skill ?? '',
            content: editingItem.content ?? '',
            note: editingItem.note ?? '',
          }
        : EMPTY_FORM)
      setErrors({})
      setConfirmDelete(false)
    }
  }, [open, editingItem])

  const set = (f, v) => setForm(s => ({ ...s, [f]: v }))

  const validate = () => {
    const e = {}
    const n = Number(form.sessionNo)
    if (!form.sessionNo.toString().trim() || !Number.isInteger(n) || n < 1)
      e.sessionNo = 'Nhập số buổi hợp lệ (≥ 1)'
    if (form.weekNo.toString().trim()) {
      const w = Number(form.weekNo)
      if (!Number.isInteger(w) || w < 1) e.weekNo = 'Số tuần phải là số nguyên ≥ 1'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    const data = {
      weekNo: form.weekNo.toString().trim() ? Number(form.weekNo) : null,
      sessionNo: Number(form.sessionNo),
      skill: form.skill.trim() || null,
      content: form.content.trim() || null,
      note: form.note.trim() || null,
    }
    if (!isEdit) data.monthId = monthId
    onSave?.({ data, isEdit, id: editingItem?.id })
    onClose?.()
  }

  const handleDelete = () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    onDelete?.(editingItem.id)
    onClose?.()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Sửa Buổi' : 'Thêm Buổi'}
      footer={
        <div className="flex items-center justify-between gap-2">
          {isEdit && (
            <Button variant="danger" size="sm" onClick={handleDelete} className="flex items-center gap-1.5">
              <Trash2 size={14} />
              {confirmDelete ? 'Xác nhận xóa?' : 'Xóa'}
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="secondary" size="sm" onClick={onClose}>Hủy</Button>
            <Button variant="primary" size="sm" onClick={handleSubmit}>
              {isEdit ? 'Cập nhật' : 'Thêm buổi'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Buổi số"
            type="number"
            min={1}
            placeholder="VD: 1"
            value={form.sessionNo}
            onChange={e => set('sessionNo', e.target.value)}
            error={errors.sessionNo}
          />
          <Input
            label="Tuần (tùy chọn)"
            type="number"
            min={1}
            placeholder="VD: 1"
            value={form.weekNo}
            onChange={e => set('weekNo', e.target.value)}
            error={errors.weekNo}
          />
        </div>

        <Input
          label="Kỹ năng (tùy chọn)"
          placeholder="VD: Reading, Listening..."
          value={form.skill}
          onChange={e => set('skill', e.target.value)}
        />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-navy-700">Nội dung giảng dạy (tùy chọn)</label>
          <textarea
            className="input min-h-[80px] resize-y"
            placeholder="Mô tả nội dung buổi học..."
            value={form.content}
            onChange={e => set('content', e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-navy-700">Ghi chú (tùy chọn)</label>
          <textarea
            className="input min-h-[60px] resize-y"
            placeholder="Ghi chú thêm..."
            value={form.note}
            onChange={e => set('note', e.target.value)}
          />
        </div>
      </div>
    </Modal>
  )
}
```

- [ ] **Step 2: Xác minh class `input` tồn tại**

Run: `grep -n "\.input" src/index.css`
Expected: có định nghĩa `.input` (dùng bởi `.select` các form khác). Nếu KHÔNG có, thay `className="input ..."` bằng chuỗi Tailwind của `Input` trong `@/components/ui` (copy class từ `Input` component). Kiểm tra trước khi tiếp tục.

- [ ] **Step 3: Build kiểm tra**

Run: `npm run build`
Expected: build thành công.

- [ ] **Step 4: Commit**

```bash
git add src/components/schedule/SessionModal.jsx
git commit -m "feat(curriculum): SessionModal thêm/sửa buổi"
```

---

## Task 7: MaterialModal — validate link không phân biệt (giữ) + type mới (đã tự động)

**Files:**
- Modify: `src/components/schedule/MaterialModal.jsx`

MaterialModal đã render `MATERIAL_TYPES` động (Task 3 đã đổi bộ type) → không cần sửa logic. Chỉ đổi `EMPTY_FORM.type` mặc định để khớp value mới.

- [ ] **Step 1: Đổi type mặc định**

Trong `src/components/schedule/MaterialModal.jsx` đổi dòng:
```jsx
const EMPTY_FORM = { title: '', url: '', type: 'slide' }
```
thành:
```jsx
const EMPTY_FORM = { title: '', url: '', type: 'ppt' }
```
Và trong `useEffect` đổi fallback `type: editingItem.type ?? 'slide'` → `type: editingItem.type ?? 'ppt'`.

- [ ] **Step 2: Build kiểm tra**

Run: `npm run build`
Expected: build thành công.

- [ ] **Step 3: Commit**

```bash
git add src/components/schedule/MaterialModal.jsx
git commit -m "feat(curriculum): MaterialModal mặc định type ppt"
```

---

## Task 8: MaterialsTab viết lại — accordion Tháng/Tuần/Buổi

**Files:**
- Modify: `src/components/schedule/MaterialsTab.jsx` (viết lại toàn bộ)
- Modify: `src/pages/SchedulePage.jsx:503-508`

- [ ] **Step 1: Viết lại MaterialsTab**

Thay TOÀN BỘ nội dung `src/components/schedule/MaterialsTab.jsx`:

```jsx
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Plus, ExternalLink, Pencil, Trash2, FileText, ChevronDown, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'
import { Button, Empty, Skeleton, toast } from '@/components/ui'
import { curriculumService } from '@/services/curriculumService'
import { COURSE_TYPES } from '@/utils/courseTypes'
import { getMaterialType } from './materialType'
import { MaterialModal } from './MaterialModal'
import { MonthModal } from './MonthModal'
import { SessionModal } from './SessionModal'

/**
 * MaterialsTab — giáo trình & tài liệu theo courseType.
 * Admin: CRUD tháng/buổi/tài liệu. Giáo viên: chỉ xem.
 * @param {boolean} isAdmin
 */
export const MaterialsTab = ({ isAdmin = false }) => {
  const [courseType, setCourseType] = useState(COURSE_TYPES[0])
  const [tree, setTree] = useState([])          // [{ ...month, sessions:[{...session, materials:[]}] }]
  const [loading, setLoading] = useState(false)
  const [collapsed, setCollapsed] = useState(() => new Set())  // month ids đang thu gọn

  // Modal state
  const [monthModal, setMonthModal] = useState({ open: false, editing: null })
  const [sessionModal, setSessionModal] = useState({ open: false, editing: null, monthId: null })
  const [materialModal, setMaterialModal] = useState({ open: false, editing: null, sessionId: null })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setTree(await curriculumService.getByCourseType(courseType))
    } catch {
      toast.error('Không thể tải giáo trình')
      setTree([])
    } finally {
      setLoading(false)
    }
  }, [courseType])

  useEffect(() => { load() }, [load])

  const toggleCollapse = (monthId) => setCollapsed(prev => {
    const next = new Set(prev)
    next.has(monthId) ? next.delete(monthId) : next.add(monthId)
    return next
  })

  // ── Month handlers ──
  const saveMonth = useCallback(async ({ data, isEdit, id }) => {
    try {
      if (isEdit) { await curriculumService.updateMonth(id, data); toast.success('Đã cập nhật tháng') }
      else { await curriculumService.createMonth({ ...data, courseType }); toast.success('Đã thêm tháng') }
      await load()
    } catch (e) {
      toast.error(e.message?.includes('duplicate') ? 'Số tháng đã tồn tại' : 'Không thể lưu tháng')
    }
  }, [courseType, load])

  const deleteMonth = useCallback(async (id) => {
    try { await curriculumService.removeMonth(id); toast.success('Đã xóa tháng'); await load() }
    catch { toast.error('Không thể xóa tháng') }
  }, [load])

  // ── Session handlers ──
  const saveSession = useCallback(async ({ data, isEdit, id }) => {
    try {
      if (isEdit) { await curriculumService.updateSession(id, data); toast.success('Đã cập nhật buổi') }
      else { await curriculumService.createSession(data); toast.success('Đã thêm buổi') }
      await load()
    } catch { toast.error('Không thể lưu buổi') }
  }, [load])

  const deleteSession = useCallback(async (id) => {
    try { await curriculumService.removeSession(id); toast.success('Đã xóa buổi'); await load() }
    catch { toast.error('Không thể xóa buổi') }
  }, [load])

  // ── Material handlers ──
  const saveMaterial = useCallback(async ({ data, isEdit, id }) => {
    try {
      if (isEdit) { await curriculumService.updateMaterial(id, data); toast.success('Đã cập nhật tài liệu') }
      else { await curriculumService.createMaterial({ ...data, sessionId: materialModal.sessionId }); toast.success('Đã thêm tài liệu') }
      await load()
    } catch { toast.error('Không thể lưu tài liệu') }
  }, [load, materialModal.sessionId])

  const deleteMaterial = useCallback(async (id) => {
    try { await curriculumService.removeMaterial(id); toast.success('Đã xóa tài liệu'); await load() }
    catch { toast.error('Không thể xóa tài liệu') }
  }, [load])

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar: chọn loại khóa + thêm tháng */}
      <div className="flex items-center gap-2 bg-white rounded-2xl border border-navy-100 shadow-navy-sm px-3 py-2 flex-wrap">
        <span className="text-xs text-navy-400 shrink-0">Loại khóa:</span>
        <select
          value={courseType}
          onChange={e => setCourseType(e.target.value)}
          className="text-xs border border-navy-200 rounded-lg px-2.5 py-1.5 text-navy-700 bg-navy-50 hover:bg-navy-100 focus:outline-none focus:ring-2 focus:ring-navy-300 transition-colors cursor-pointer"
        >
          {COURSE_TYPES.map(ct => <option key={ct} value={ct}>{ct}</option>)}
        </select>
        <div className="flex-1" />
        {isAdmin && (
          <Button variant="primary" size="sm" onClick={() => setMonthModal({ open: true, editing: null })} className="flex items-center gap-1.5 shrink-0">
            <Plus size={14} /> Thêm tháng
          </Button>
        )}
      </div>

      {/* Nội dung giáo trình */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-navy-100 shadow-navy-sm p-4 flex flex-col gap-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : tree.length === 0 ? (
        <div className="bg-white rounded-2xl border border-navy-100 shadow-navy-sm p-12">
          <Empty
            icon={<FileText size={40} />}
            title="Chưa có giáo trình"
            desc={isAdmin ? 'Bấm "Thêm tháng" để bắt đầu xây giáo trình cho loại khóa này.' : 'Loại khóa này chưa có giáo trình.'}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {tree.map(month => (
            <MonthBlock
              key={month.id}
              month={month}
              isAdmin={isAdmin}
              collapsed={collapsed.has(month.id)}
              onToggle={() => toggleCollapse(month.id)}
              onEditMonth={() => setMonthModal({ open: true, editing: month })}
              onDeleteMonth={() => deleteMonth(month.id)}
              onAddSession={() => setSessionModal({ open: true, editing: null, monthId: month.id })}
              onEditSession={(s) => setSessionModal({ open: true, editing: s, monthId: month.id })}
              onDeleteSession={(s) => deleteSession(s.id)}
              onAddMaterial={(s) => setMaterialModal({ open: true, editing: null, sessionId: s.id })}
              onEditMaterial={(m) => setMaterialModal({ open: true, editing: m, sessionId: m.sessionId })}
              onDeleteMaterial={(m) => deleteMaterial(m.id)}
            />
          ))}
        </div>
      )}

      <MonthModal
        open={monthModal.open}
        onClose={() => setMonthModal({ open: false, editing: null })}
        editingItem={monthModal.editing}
        onSave={saveMonth}
        onDelete={deleteMonth}
      />
      <SessionModal
        open={sessionModal.open}
        onClose={() => setSessionModal({ open: false, editing: null, monthId: null })}
        monthId={sessionModal.monthId}
        editingItem={sessionModal.editing}
        onSave={saveSession}
        onDelete={deleteSession}
      />
      <MaterialModal
        open={materialModal.open}
        onClose={() => setMaterialModal({ open: false, editing: null, sessionId: null })}
        editingItem={materialModal.editing}
        onSave={saveMaterial}
        onDelete={deleteMaterial}
      />
    </div>
  )
}

// ── MonthBlock: header tháng + nhóm tuần + các buổi ────────────
const MonthBlock = ({
  month, isAdmin, collapsed, onToggle,
  onEditMonth, onDeleteMonth, onAddSession,
  onEditSession, onDeleteSession, onAddMaterial, onEditMaterial, onDeleteMaterial,
}) => {
  // Gom buổi theo tuần (giữ thứ tự session_no đã sort từ service)
  const weeks = useMemo(() => {
    const map = new Map()
    for (const s of month.sessions) {
      const key = s.weekNo ?? '—'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(s)
    }
    return [...map.entries()]  // [[weekNo|'—', sessions[]]]
  }, [month.sessions])

  return (
    <div className="bg-white rounded-2xl border border-navy-100 shadow-navy-sm overflow-hidden">
      {/* Header tháng */}
      <div className="flex items-center gap-2 px-4 py-3 bg-navy-50 border-b border-navy-100">
        <button onClick={onToggle} className="p-1 rounded-lg text-navy-500 hover:text-navy-800 hover:bg-navy-100 transition-colors shrink-0">
          {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        </button>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-navy-800 text-white shrink-0">Tháng {month.monthNo}</span>
        <span className="text-sm font-semibold text-navy-900 min-w-0 truncate">{month.title || '(chưa có tiêu đề)'}</span>
        <div className="flex-1" />
        {isAdmin && (
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="secondary" size="sm" onClick={onAddSession} className="flex items-center gap-1">
              <Plus size={13} /> Buổi
            </Button>
            <button onClick={onEditMonth} className="p-1.5 rounded-lg text-navy-400 hover:text-navy-700 hover:bg-navy-100 transition-colors" title="Sửa tháng">
              <Pencil size={14} />
            </button>
            <button onClick={onDeleteMonth} className="p-1.5 rounded-lg text-navy-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Xóa tháng">
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="p-4 flex flex-col gap-4">
          {month.sessions.length === 0 ? (
            <p className="text-sm text-navy-400 text-center py-4">Chưa có buổi nào trong tháng này.</p>
          ) : weeks.map(([weekKey, sessions]) => (
            <div key={weekKey} className="flex flex-col gap-2">
              {weekKey !== '—' && (
                <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">Tuần {weekKey}</p>
              )}
              {sessions.map(s => (
                <SessionCard
                  key={s.id}
                  session={s}
                  isAdmin={isAdmin}
                  onEdit={() => onEditSession(s)}
                  onDelete={() => onDeleteSession(s)}
                  onAddMaterial={() => onAddMaterial(s)}
                  onEditMaterial={onEditMaterial}
                  onDeleteMaterial={onDeleteMaterial}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── SessionCard: 1 buổi + danh sách tài liệu ───────────────────
const SessionCard = ({ session, isAdmin, onEdit, onDelete, onAddMaterial, onEditMaterial, onDeleteMaterial }) => (
  <div className="rounded-xl border border-navy-100 p-3">
    <div className="flex items-start gap-2">
      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-navy-100 text-navy-800 shrink-0">Buổi {session.sessionNo}</span>
      {session.skill && (
        <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 shrink-0">{session.skill}</span>
      )}
      <div className="flex-1" />
      {isAdmin && (
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onAddMaterial} className="p-1 rounded-lg text-navy-400 hover:text-navy-700 hover:bg-navy-50 transition-colors" title="Thêm tài liệu">
            <Plus size={14} />
          </button>
          <button onClick={onEdit} className="p-1 rounded-lg text-navy-400 hover:text-navy-700 hover:bg-navy-50 transition-colors" title="Sửa buổi">
            <Pencil size={13} />
          </button>
          <button onClick={onDelete} className="p-1 rounded-lg text-navy-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Xóa buổi">
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>

    {session.content && <p className="text-sm text-navy-700 mt-1.5 whitespace-pre-wrap">{session.content}</p>}
    {session.note && <p className="text-xs text-navy-400 mt-1 italic">Ghi chú: {session.note}</p>}

    {/* Danh sách tài liệu */}
    {session.materials.length > 0 && (
      <ul className="flex flex-col gap-1.5 mt-2.5">
        {session.materials.map(m => {
          const t = getMaterialType(m.type)
          return (
            <li key={m.id} className="flex items-center gap-2">
              <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-md shrink-0', t.badge)}>{t.label}</span>
              <a href={m.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-navy-800 hover:text-navy-600 hover:underline min-w-0">
                <span className="truncate">{m.title}</span>
                <ExternalLink size={12} className="shrink-0 text-navy-400" />
              </a>
              {isAdmin && (
                <div className="flex items-center gap-0.5 shrink-0 ml-auto">
                  <button onClick={() => onEditMaterial(m)} className="p-1 rounded-lg text-navy-400 hover:text-navy-700 hover:bg-navy-50 transition-colors" title="Sửa">
                    <Pencil size={12} />
                  </button>
                  <button onClick={() => onDeleteMaterial(m)} className="p-1 rounded-lg text-navy-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Xóa">
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    )}
  </div>
)
```

- [ ] **Step 2: Cập nhật SchedulePage truyền prop**

Trong `src/pages/SchedulePage.jsx` (khối `activeTab === 'materials'`, dòng ~503-508) đổi:
```jsx
{activeTab === 'materials' && (
  <MaterialsTab
    classes={visibleClasses}
    isAdmin={isAdmin}
  />
)}
```
thành:
```jsx
{activeTab === 'materials' && (
  <MaterialsTab isAdmin={isAdmin} />
)}
```

- [ ] **Step 3: Build kiểm tra**

Run: `npm run build`
Expected: build thành công, không còn import `classMaterialService` ở MaterialsTab.

- [ ] **Step 4: Commit**

```bash
git add src/components/schedule/MaterialsTab.jsx src/pages/SchedulePage.jsx
git commit -m "feat(curriculum): viết lại tab Tài Liệu thành accordion giáo trình"
```

---

## Task 9: Verify thủ công end-to-end

**Files:** không sửa code (chỉ kiểm thử; nếu phát hiện lỗi thì quay lại task tương ứng).

- [ ] **Step 1: Chạy dev server**

Run: `npm run dev`
Mở http://localhost:5173, đăng nhập tài khoản **admin**.

- [ ] **Step 2: Kiểm luồng admin**

Vào trang "Giảng Dạy" → tab "Tài Liệu":
- Chọn loại khóa (IELTS/TOEIC/TOEIC SW/KHÁC) ở dropdown.
- "Thêm tháng" → nhập số tháng + tiêu đề → xuất hiện block tháng.
- Trong block tháng bấm "Buổi" → nhập Buổi số, Tuần, Kỹ năng, Nội dung, Ghi chú → xuất hiện card buổi, nhóm dưới nhãn "Tuần N".
- Trên card buổi bấm "＋" (thêm tài liệu) → nhập tên "HANDOUT-B1" + link https + chọn loại → xuất hiện chip loại + link mở tab mới.
- Thử thêm 2-3 tài liệu vào cùng 1 buổi → hiển thị danh sách nhiều link dưới buổi (đúng mục tiêu "1 buổi nhiều tài liệu").
- Sửa/xóa tài liệu, sửa/xóa buổi, sửa/xóa tháng (có confirm 2 bước) → dữ liệu cập nhật.
- Thu gọn/mở block tháng bằng nút chevron.
- Đổi dropdown loại khóa khác → thấy giáo trình khác (rỗng nếu chưa nhập).

Expected: mọi thao tác có toast success/error, không lỗi console.

- [ ] **Step 3: Kiểm luồng giáo viên thường + RLS**

Đăng nhập tài khoản **giáo viên thường** (không admin):
- Tab "Tài Liệu": chọn loại khóa, thấy giáo trình admin đã nhập (read-only).
- KHÔNG thấy nút "Thêm tháng", "Buổi", nút sửa/xóa nào.
- Bấm link tài liệu mở được.

Expected: giáo viên chỉ xem; RLS chặn ghi (không có nút ghi ở UI, và nếu gọi service trực tiếp sẽ lỗi policy).

- [ ] **Step 4: Kiểm ClassModal courseType**

Vào Lớp → tạo/sửa lớp → dropdown "Phân loại (Tag)" hiển thị đúng IELTS / TOEIC / TOEIC SW / KHÁC.

Expected: đúng danh sách mới, lưu được.

- [ ] **Step 5: Build production**

Run: `npm run build`
Expected: build xanh, không warning chặn.

- [ ] **Step 6: Commit (nếu có sửa lỗi phát sinh)**

```bash
git add -A
git commit -m "fix(curriculum): xử lý lỗi phát hiện khi verify"
```
(Bỏ qua nếu không có sửa.)

---

## Task 10: Cập nhật seed + tài liệu dự án

**Files:**
- Modify: `supabase/seed/seed_mock_data.sql`
- Modify: `CLAUDE.md`
- Modify: `README.md`

- [ ] **Step 1: Thêm seed mẫu**

Trong `supabase/seed/seed_mock_data.sql`, thêm (đúng vùng insert dữ liệu mock, sau các bảng lớp) một tháng + 2 buổi + vài tài liệu cho courseType 'IELTS'. Vì seed chạy trong SQL Editor (bypass RLS) và idempotent theo teacher mock, thêm cleanup tương ứng:

```sql
-- Cleanup giáo trình mock (scope theo courseType demo)
delete from public.curriculum_months where course_type = 'IELTS' and month_no in (1);

-- Giáo trình IELTS mẫu
with m as (
  insert into public.curriculum_months (course_type, month_no, title, created_by)
  values ('IELTS', 1, 'XÂY DỰNG NỀN TẢNG CƠ BẢN', '<<TEACHER_ADMIN_ID>>')
  returning id
), s1 as (
  insert into public.curriculum_sessions (month_id, week_no, session_no, skill, content, note, created_by)
  select id, 1, 1, 'Reading', 'Khởi động: từ loại, cụm từ & mệnh đề. Paraphrasing.', null, '<<TEACHER_ADMIN_ID>>' from m
  returning id
)
insert into public.curriculum_materials (session_id, type, title, url, order_index, created_by)
select id, 'ppt', 'Slide Unit 1', 'https://example.com/slide1', 0, '<<TEACHER_ADMIN_ID>>' from s1
union all
select id, 'homework', 'Homework Unit 1', 'https://forms.gle/example1', 1, '<<TEACHER_ADMIN_ID>>' from s1;
```

Lưu ý: dùng đúng placeholder id admin mà file seed đang dùng (kiểm biến/placeholder hiện có trong file — vd `<<TEACHER_ADMIN_EMAIL>>` được resolve sang id qua CTE ở đầu file; tái dùng cùng cơ chế thay vì `<<TEACHER_ADMIN_ID>>` nếu file dùng cách khác). Điều chỉnh cho khớp pattern hiện tại của file seed.

- [ ] **Step 2: Cập nhật CLAUDE.md**

Trong `CLAUDE.md`:
- Thay mục "## Model tài liệu giảng dạy (migration 20260627000002)" bằng mô tả mới: giáo trình theo courseType (3 bảng `curriculum_months/sessions/materials`, migration `20260704000001`), `curriculumService`, tab "Tài Liệu" là accordion Tháng→Tuần→Buổi, loại tài liệu PPT/Handout/Đọc dịch/Homework/Khác. Ghi rõ `class_materials` cũ + `classMaterialService` để orphan.
- Cập nhật mô tả tab "Tài Liệu" trong phần SchedulePage cho khớp (bỏ "gắn theo lớp", thêm "theo courseType, admin CRUD, GV xem").
- Thêm ghi chú: courseType gom về `src/utils/courseTypes.js` (`COURSE_TYPES`), dùng chung ClassModal + giáo trình + COURSE_COLORS.

- [ ] **Step 3: Cập nhật README.md**

Trong `README.md`, cập nhật phần nói về tab Tài Liệu / tài liệu giảng dạy cho khớp mô tả mới (giáo trình theo courseType). Nếu README chưa nhắc tới, thêm 1 đoạn ngắn ở mục tính năng "Giảng Dạy".

- [ ] **Step 4: Commit**

```bash
git add supabase/seed/seed_mock_data.sql CLAUDE.md README.md
git commit -m "docs(curriculum): seed mẫu + cập nhật CLAUDE.md/README"
```

---

## Self-Review Notes (đã kiểm)

- **Spec coverage:** 3 bảng (T1), RLS admin/teacher (T1), COURSE_TYPES dùng chung + ClassModal + màu (T2), bộ loại mới (T3), service 3 cấp trả cây (T4), MonthModal (T5), SessionModal (T6), MaterialModal type mới (T7), MaterialsTab accordion + SchedulePage (T8), verify RLS + luồng (T9), seed + CLAUDE.md/README + orphan class_materials (T10). ✔
- **Type consistency:** service dùng camelCase `monthNo/sessionNo/weekNo/orderIndex/sessionId/monthId`; modal `onSave({ data, isEdit, id })` khớp handler trong MaterialsTab; `createMonth({ ...data, courseType })`, `createSession(data)` (data đã có `monthId`), `createMaterial({ ...data, sessionId })`. ✔
- **Rủi ro cần chú ý khi thực thi:** (a) class `input` trong SessionModal — Step 6.2 xác minh trước; (b) placeholder id admin trong seed — Step 10.1 nhắc khớp cơ chế file seed thật; (c) unique `(course_type, month_no)` → toast "Số tháng đã tồn tại" xử lý ở saveMonth.
