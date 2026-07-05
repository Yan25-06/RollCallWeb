# Tab Tài Liệu đọc trực tiếp từ Google Sheet — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tab "Tài Liệu" (SchedulePage) đọc giáo trình trực tiếp từ Google Sheets API v4; bỏ CRUD trên web + import `.xlsx`; admin cấu hình link Sheet cho từng loại khóa trong app.

**Architecture:** Google Sheet là nguồn chân lý duy nhất. Link Sheet mỗi `courseType` lưu ở bảng mới `curriculum_sheets` (RLS: mọi GV đọc, admin ghi). Fetch qua Sheets API v4 với API key (`VITE_GOOGLE_SHEETS_API_KEY`), chuyển response về grid `[{ value, link }]` rồi tái dùng parser hiện có `curriculumImportParser.js`. Cache kết quả trong phiên theo `courseType`.

**Spec:** `docs/superpowers/specs/2026-07-05-curriculum-google-sheet-design.md`
**Điều chỉnh so với spec:** dùng bảng mới `curriculum_sheets` thay vì key trong `settings` — vì `settings` là per-teacher (row theo `teacher_id`), giáo viên thường sẽ không đọc được link do admin lưu trong row của admin.

**Tech Stack:** React 18 + Vite, Supabase (Postgres + RLS), Google Sheets API v4 (REST, fetch thuần, không thêm thư viện), test parser bằng Node script (không có test runner).

**Quy ước:** import alias `@/`, UI components từ `@/components/ui`, không hard-code màu hex, toast sau mỗi action, tiếng Việt toàn bộ UI.

---

### Task 1: Bảng `curriculum_sheets` + `curriculumSheetService`

**Files:**
- Create: `supabase/migrations/20260705000001_add_curriculum_sheets.sql`
- Create: `src/services/curriculumSheetService.js`

- [ ] **Step 1.1: Viết migration**

Tạo `supabase/migrations/20260705000001_add_curriculum_sheets.sql`:

```sql
-- Link Google Sheet giáo trình theo loại khóa.
-- Google Sheet là nguồn chân lý cho giáo trình (thay 3 bảng curriculum_* — để orphan, không drop).
-- RLS cùng pattern curriculum_*: mọi GV đã đăng nhập đọc được, chỉ admin ghi.
create table if not exists public.curriculum_sheets (
  course_type text primary key,
  sheet_url text not null,
  updated_at timestamptz not null default now()
);

alter table public.curriculum_sheets enable row level security;

create policy "curriculum_sheets: authenticated select"
  on public.curriculum_sheets for select
  using (auth.uid() is not null);

create policy "curriculum_sheets: admin insert"
  on public.curriculum_sheets for insert
  with check (is_admin());

create policy "curriculum_sheets: admin update"
  on public.curriculum_sheets for update
  using (is_admin()) with check (is_admin());

create policy "curriculum_sheets: admin delete"
  on public.curriculum_sheets for delete
  using (is_admin());
```

- [ ] **Step 1.2: Chạy migration trên Supabase**

Dán nội dung file vào **Supabase SQL Editor** và Run (project không có supabase CLI local — đây là cách các migration trước được áp dụng). Xác nhận không lỗi, bảng xuất hiện trong Table Editor.

- [ ] **Step 1.3: Viết service**

Tạo `src/services/curriculumSheetService.js`:

```js
import { supabase } from '@/lib/supabase'

// Map link Google Sheet theo loại khóa: { 'IELTS': 'https://...', ... }
export const curriculumSheetService = {
  async getAll() {
    const { data, error } = await supabase.from('curriculum_sheets').select('*')
    if (error) throw new Error(error.message)
    return Object.fromEntries((data ?? []).map(r => [r.course_type, r.sheet_url]))
  },

  async upsert(courseType, sheetUrl) {
    const { error } = await supabase
      .from('curriculum_sheets')
      .upsert(
        { course_type: courseType, sheet_url: sheetUrl, updated_at: new Date().toISOString() },
        { onConflict: 'course_type' },
      )
    if (error) throw new Error(error.message)
  },

  async remove(courseType) {
    const { error } = await supabase.from('curriculum_sheets').delete().eq('course_type', courseType)
    if (error) throw new Error(error.message)
  },
}
```

- [ ] **Step 1.4: Build kiểm tra syntax**

Run: `npm run build`
Expected: build thành công, không lỗi import.

- [ ] **Step 1.5: Commit**

```bash
git add supabase/migrations/20260705000001_add_curriculum_sheets.sql src/services/curriculumSheetService.js
git commit -m "feat(curriculum): bảng curriculum_sheets + service lưu link Google Sheet theo khóa"
```

---

### Task 2: Util thuần `googleSheetGrid.js` (TDD, test bằng Node)

Chuyển response Sheets API → grid cho parser + gắn id tổng hợp cho cây. Thuần, không import gì → test bằng Node như `curriculumImportParser`.

**Files:**
- Create: `src/utils/googleSheetGrid.js`
- Test: `scripts/test-googlesheet-grid.mjs`

- [ ] **Step 2.1: Viết test (fail trước)**

Tạo `scripts/test-googlesheet-grid.mjs`:

```js
import assert from 'node:assert/strict'
import { extractSpreadsheetId, apiRowsToGrid, attachIds } from '../src/utils/googleSheetGrid.js'

let passed = 0
const test = (name, fn) => { fn(); passed++; console.log('  ✓', name) }

// ── extractSpreadsheetId ──
test('extractSpreadsheetId lấy id từ URL đầy đủ', () => {
  assert.equal(
    extractSpreadsheetId('https://docs.google.com/spreadsheets/d/1AbC-xYz_123/edit#gid=0'),
    '1AbC-xYz_123',
  )
})
test('extractSpreadsheetId trả null khi link sai', () => {
  assert.equal(extractSpreadsheetId('https://example.com/foo'), null)
  assert.equal(extractSpreadsheetId(''), null)
  assert.equal(extractSpreadsheetId(null), null)
})

// ── apiRowsToGrid ──
test('apiRowsToGrid map formattedValue + hyperlink của ô', () => {
  const rowData = [
    { values: [{ formattedValue: 'THÁNG 1: CƠ BẢN' }] },
    { values: [{ formattedValue: 'Tuần 1' }, { formattedValue: '1', hyperlink: 'https://a.com' }] },
  ]
  const grid = apiRowsToGrid(rowData)
  assert.deepEqual(grid[0][0], { value: 'THÁNG 1: CƠ BẢN', link: null })
  assert.deepEqual(grid[1][1], { value: '1', link: 'https://a.com' })
})
test('apiRowsToGrid lấy link từ textFormatRuns khi không có hyperlink', () => {
  const rowData = [{
    values: [{
      formattedValue: 'Handout: HANDOUT-B1',
      textFormatRuns: [{ startIndex: 0 }, { startIndex: 9, format: { link: { uri: 'https://doc.com/h1' } } }],
    }],
  }]
  assert.equal(apiRowsToGrid(rowData)[0][0].link, 'https://doc.com/h1')
})
test('apiRowsToGrid chịu được dòng/ô rỗng', () => {
  const grid = apiRowsToGrid([{}, { values: [{}] }, undefined])
  assert.deepEqual(grid[0], [])
  assert.deepEqual(grid[1][0], { value: null, link: null })
  assert.deepEqual(grid[2], [])
})

// ── attachIds ──
test('attachIds gắn id ổn định cho tháng/buổi/tài liệu', () => {
  const months = [{
    monthNo: 2, title: 'CHỦ ĐỀ', sessions: [{
      weekNo: 1, sessionNo: 3, skill: 'Reading', content: 'Bài 1', note: null,
      materials: [{ type: 'ppt', title: 'PPT', url: 'https://a.com' }],
    }],
  }]
  const tree = attachIds(months)
  assert.equal(tree[0].id, 'm2')
  assert.equal(tree[0].sessions[0].id, 'm2-s0')
  assert.equal(tree[0].sessions[0].materials[0].id, 'm2-s0-t0')
  // Giữ nguyên field gốc
  assert.equal(tree[0].sessions[0].sessionNo, 3)
  assert.equal(tree[0].sessions[0].materials[0].url, 'https://a.com')
})

console.log(`\n${passed} tests passed ✓`)
```

- [ ] **Step 2.2: Chạy test, xác nhận fail**

Run: `node scripts/test-googlesheet-grid.mjs`
Expected: FAIL — `Cannot find module '../src/utils/googleSheetGrid.js'`

- [ ] **Step 2.3: Viết implementation**

Tạo `src/utils/googleSheetGrid.js`:

```js
// Chuyển response Google Sheets API v4 → grid [{ value, link }][] cho curriculumImportParser.
// Thuần (không import gì) → test bằng Node: node scripts/test-googlesheet-grid.mjs

export function extractSpreadsheetId(url) {
  const m = String(url || '').match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  return m ? m[1] : null
}

// Link của ô: hyperlink toàn ô, hoặc link đầu tiên trong textFormatRuns (link một phần text)
function cellLink(cell) {
  if (!cell) return null
  if (cell.hyperlink) return cell.hyperlink
  const run = (cell.textFormatRuns || []).find(r => r.format?.link?.uri)
  return run ? run.format.link.uri : null
}

// rowData (Sheets API, fields=formattedValue,hyperlink,textFormatRuns) → grid cho parseCurriculumGrid
export function apiRowsToGrid(rowData = []) {
  return rowData.map(row =>
    (row?.values ?? []).map(cell => ({
      value: cell?.formattedValue ?? null,
      link: cellLink(cell),
    })),
  )
}

// Gắn id tổng hợp (ổn định trong phiên) để UI dùng làm key/selectedSessionId —
// dữ liệu từ Sheet không có id như DB.
export function attachIds(months) {
  return months.map(m => ({
    id: `m${m.monthNo}`,
    ...m,
    sessions: m.sessions.map((s, si) => ({
      id: `m${m.monthNo}-s${si}`,
      ...s,
      materials: s.materials.map((t, ti) => ({ id: `m${m.monthNo}-s${si}-t${ti}`, ...t })),
    })),
  }))
}
```

- [ ] **Step 2.4: Chạy test, xác nhận pass**

Run: `node scripts/test-googlesheet-grid.mjs`
Expected: `6 tests passed ✓`

Chạy luôn test parser cũ để chắc không đụng gì: `node scripts/test-curriculum-parser.mjs` — Expected: pass toàn bộ.

- [ ] **Step 2.5: Commit**

```bash
git add src/utils/googleSheetGrid.js scripts/test-googlesheet-grid.mjs
git commit -m "feat(curriculum): util chuyển response Sheets API v4 sang grid cho parser"
```

---

### Task 3: Service fetch `googleSheetCurriculumService`

**Files:**
- Create: `src/services/googleSheetCurriculumService.js`
- Modify: `.env` (user tự thêm key — xem Task 7)

- [ ] **Step 3.1: Viết service**

Tạo `src/services/googleSheetCurriculumService.js`:

```js
import { parseCurriculumGrid } from '@/utils/curriculumImportParser'
import { extractSpreadsheetId, apiRowsToGrid, attachIds } from '@/utils/googleSheetGrid'

const API_KEY = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY
// Chỉ lấy field cần thiết — giảm payload đáng kể so với full gridData
const FIELDS = 'sheets(data(rowData(values(formattedValue,hyperlink,textFormatRuns))))'

// Đọc giáo trình trực tiếp từ Google Sheet (sheet tab đầu tiên).
// Trả { tree, warnings } — tree cùng shape curriculumService.getByCourseType cũ
// ([{ ...month, sessions: [{ ...session, materials: [] }] }]) để UI con dùng nguyên.
export const googleSheetCurriculumService = {
  async fetchCurriculum(sheetUrl) {
    if (!API_KEY) throw new Error('Chưa cấu hình VITE_GOOGLE_SHEETS_API_KEY trong .env')
    const id = extractSpreadsheetId(sheetUrl)
    if (!id) throw new Error('Link Google Sheet không hợp lệ')

    let res
    try {
      res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${id}?includeGridData=true&fields=${encodeURIComponent(FIELDS)}&key=${API_KEY}`,
      )
    } catch {
      throw new Error('Không kết nối được Google Sheets — kiểm tra mạng')
    }
    if (res.status === 403)
      throw new Error('Không có quyền đọc Sheet — kiểm tra chia sẻ "Ai có link đều xem được" và API key')
    if (res.status === 404) throw new Error('Không tìm thấy Sheet — kiểm tra lại link')
    if (!res.ok) throw new Error(`Google Sheets API lỗi (${res.status})`)

    const json = await res.json()
    const rowData = json.sheets?.[0]?.data?.[0]?.rowData ?? []
    const { months, warnings } = parseCurriculumGrid(apiRowsToGrid(rowData))
    return { tree: attachIds(months), warnings }
  },
}
```

- [ ] **Step 3.2: Build kiểm tra**

Run: `npm run build`
Expected: build thành công.

- [ ] **Step 3.3: Commit**

```bash
git add src/services/googleSheetCurriculumService.js
git commit -m "feat(curriculum): service đọc giáo trình từ Google Sheets API v4"
```

---

### Task 4: `SheetConfigModal` — admin cấu hình link Sheet

**Files:**
- Create: `src/components/schedule/SheetConfigModal.jsx`

- [ ] **Step 4.1: Viết component**

Tạo `src/components/schedule/SheetConfigModal.jsx` (theo pattern Modal của `MonthModal.jsx`):

```jsx
import { useState, useEffect } from 'react'
import { Modal, Button, Input, toast } from '@/components/ui'
import { COURSE_TYPES } from '@/utils/courseTypes'
import { curriculumSheetService } from '@/services/curriculumSheetService'

/**
 * SheetConfigModal — admin dán link Google Sheet giáo trình cho từng loại khóa.
 * @param {Object} sheetMap - { courseType: url } hiện tại
 * @param {Function} onSaved - gọi sau khi lưu thành công (parent reload map)
 */
export const SheetConfigModal = ({ open, onClose, sheetMap, onSaved }) => {
  const [values, setValues] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (open) setValues({ ...sheetMap }) }, [open, sheetMap])

  const set = (ct, v) => setValues(s => ({ ...s, [ct]: v }))

  const handleSave = async () => {
    setSaving(true)
    try {
      for (const ct of COURSE_TYPES) {
        const url = (values[ct] || '').trim()
        const old = sheetMap[ct] || ''
        if (url === old) continue
        if (url) await curriculumSheetService.upsert(ct, url)
        else await curriculumSheetService.remove(ct)
      }
      toast.success('Đã lưu cấu hình Sheet')
      onSaved?.()
      onClose?.()
    } catch (e) {
      toast.error(e.message || 'Không thể lưu cấu hình')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cấu hình Google Sheet giáo trình"
      footer={
        <div className="flex gap-2 ml-auto justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>Hủy</Button>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Đang lưu…' : 'Lưu'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-xs text-navy-500">
          Dán link file Google Sheet giáo trình cho từng loại khóa. Sheet phải ở chế độ chia sẻ
          «Ai có link đều xem được». Để trống để gỡ link.
        </p>
        {COURSE_TYPES.map(ct => (
          <Input
            key={ct}
            label={ct}
            placeholder="https://docs.google.com/spreadsheets/d/…"
            value={values[ct] || ''}
            onChange={e => set(ct, e.target.value)}
          />
        ))}
      </div>
    </Modal>
  )
}
```

- [ ] **Step 4.2: Build kiểm tra**

Run: `npm run build`
Expected: build thành công (component chưa được import ở đâu — OK).

- [ ] **Step 4.3: Commit**

```bash
git add src/components/schedule/SheetConfigModal.jsx
git commit -m "feat(curriculum): modal admin cấu hình link Google Sheet theo khóa"
```

---

### Task 5: Viết lại `MaterialsTab` — đọc từ Sheet, bỏ CRUD

**Files:**
- Modify: `src/components/schedule/MaterialsTab.jsx` (thay toàn bộ nội dung)

Lưu ý: `CurriculumSidebar` và `SessionDetailPanel` **giữ nguyên không sửa** — chúng nhận `isAdmin` prop; truyền `isAdmin={false}` cứng để ẩn mọi nút sửa/xóa (dữ liệu từ Sheet là read-only), các handler CRUD không truyền (chỉ gọi khi isAdmin).

- [ ] **Step 5.1: Thay toàn bộ `MaterialsTab.jsx`**

```jsx
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { FileText, RefreshCw, ExternalLink, Settings } from 'lucide-react'
import { Button, Empty, Skeleton, toast } from '@/components/ui'
import { curriculumSheetService } from '@/services/curriculumSheetService'
import { googleSheetCurriculumService } from '@/services/googleSheetCurriculumService'
import { COURSE_TYPES } from '@/utils/courseTypes'
import { CurriculumSidebar } from './CurriculumSidebar'
import { SessionDetailPanel } from './SessionDetailPanel'
import { SheetConfigModal } from './SheetConfigModal'

/**
 * MaterialsTab — giáo trình đọc trực tiếp từ Google Sheet theo courseType (read-only).
 * Nguồn chân lý là Google Sheet; admin cấu hình link qua SheetConfigModal,
 * chỉnh sửa nội dung làm trực tiếp trên Sheet.
 * @param {boolean} isAdmin - hiện nút "Cấu hình Sheet"
 */
export const MaterialsTab = ({ isAdmin = false }) => {
  const [courseType, setCourseType] = useState(COURSE_TYPES[0])
  const [sheetMap, setSheetMap] = useState(null)   // null = đang tải cấu hình
  const [tree, setTree] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedSessionId, setSelectedSessionId] = useState(null)
  const [configOpen, setConfigOpen] = useState(false)
  const cacheRef = useRef(new Map())               // courseType → tree (cache trong phiên)

  const sheetUrl = sheetMap?.[courseType] || null

  // Nạp map link Sheet (mọi GV đọc được)
  const loadSheetMap = useCallback(async () => {
    try {
      setSheetMap(await curriculumSheetService.getAll())
    } catch {
      toast.error('Không thể tải cấu hình Sheet')
      setSheetMap({})
    }
  }, [])

  useEffect(() => { loadSheetMap() }, [loadSheetMap])

  // Nạp giáo trình từ Google Sheet (cache theo courseType, force = nút Làm mới)
  const load = useCallback(async (force = false) => {
    if (!sheetUrl) { setTree([]); setError(null); return }
    if (!force && cacheRef.current.has(courseType)) {
      setTree(cacheRef.current.get(courseType))
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { tree: t, warnings } = await googleSheetCurriculumService.fetchCurriculum(sheetUrl)
      cacheRef.current.set(courseType, t)
      setTree(t)
      if (warnings.length > 0) toast.info(`${warnings.length} dòng trong Sheet bị bỏ qua (sai định dạng)`)
    } catch (e) {
      setTree([])
      setError(e.message || 'Không thể tải giáo trình')
    } finally {
      setLoading(false)
    }
  }, [courseType, sheetUrl])

  useEffect(() => { if (sheetMap) load() }, [sheetMap, load])

  // Buổi đang chọn (kèm tháng chứa nó) — null nếu id không còn trong tree
  const selected = useMemo(() => {
    for (const month of tree)
      for (const session of month.sessions)
        if (session.id === selectedSessionId) return { session, month }
    return null
  }, [tree, selectedSessionId])

  // Tự chọn buổi đầu tiên khi selection không còn hợp lệ (đổi khóa, làm mới, load đầu)
  useEffect(() => {
    if (loading || selected) return
    const firstMonth = tree.find(m => m.sessions.length > 0)
    setSelectedSessionId(firstMonth?.sessions[0]?.id ?? null)
  }, [loading, selected, tree])

  const handleConfigSaved = useCallback(() => {
    cacheRef.current.clear()
    loadSheetMap()
  }, [loadSheetMap])

  const initialLoading = sheetMap === null || loading

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar: chọn loại khóa + Làm mới + Mở Sheet + Cấu hình (admin) */}
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
        {sheetUrl && (
          <>
            <Button variant="secondary" size="sm" onClick={() => load(true)} disabled={loading} className="flex items-center gap-1.5 shrink-0">
              <RefreshCw size={14} className={loading ? 'animate-spin' : undefined} /> Làm mới
            </Button>
            <a href={sheetUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
              <Button variant="secondary" size="sm" className="flex items-center gap-1.5">
                <ExternalLink size={14} /> Mở Sheet
              </Button>
            </a>
          </>
        )}
        {isAdmin && (
          <Button variant="primary" size="sm" onClick={() => setConfigOpen(true)} className="flex items-center gap-1.5 shrink-0">
            <Settings size={14} /> Cấu hình Sheet
          </Button>
        )}
      </div>

      {/* Nội dung giáo trình */}
      {initialLoading ? (
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="w-full lg:w-72 shrink-0 bg-white rounded-2xl border border-navy-100 shadow-navy-sm p-3 flex flex-col gap-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 rounded-lg" />)}
          </div>
          <div className="flex-1 bg-white rounded-2xl border border-navy-100 shadow-navy-sm p-4">
            <Skeleton className="h-40 rounded-xl" />
          </div>
        </div>
      ) : !sheetUrl ? (
        <div className="bg-white rounded-2xl border border-navy-100 shadow-navy-sm p-12">
          <Empty
            icon={<FileText size={40} />}
            title="Chưa cấu hình Google Sheet"
            desc={isAdmin
              ? 'Bấm "Cấu hình Sheet" để dán link file Google Sheet giáo trình cho loại khóa này.'
              : 'Loại khóa này chưa được cấu hình giáo trình. Liên hệ admin.'}
          />
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-navy-100 shadow-navy-sm p-12 flex flex-col items-center gap-3">
          <Empty icon={<FileText size={40} />} title="Không tải được giáo trình" desc={error} />
          <Button variant="secondary" size="sm" onClick={() => load(true)} className="flex items-center gap-1.5">
            <RefreshCw size={14} /> Thử lại
          </Button>
        </div>
      ) : tree.length === 0 ? (
        <div className="bg-white rounded-2xl border border-navy-100 shadow-navy-sm p-12">
          <Empty
            icon={<FileText size={40} />}
            title="Sheet chưa có nội dung"
            desc='Không tìm thấy dòng "THÁNG n:" nào trong Sheet — kiểm tra định dạng file giáo trình.'
          />
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-start">
          <CurriculumSidebar
            key={courseType}
            tree={tree}
            selectedSessionId={selectedSessionId}
            isAdmin={false}
            onSelectSession={setSelectedSessionId}
          />
          <SessionDetailPanel selected={selected} isAdmin={false} />
        </div>
      )}

      <SheetConfigModal
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        sheetMap={sheetMap ?? {}}
        onSaved={handleConfigSaved}
      />
    </div>
  )
}
```

- [ ] **Step 5.2: Kiểm tra `toast.info` tồn tại**

Run: `grep -n "info" src/components/ui/index.jsx` (hoặc Grep tool)
Nếu toast chỉ có `success/error`: đổi `toast.info(...)` trong Step 5.1 thành `toast.success(...)`.

- [ ] **Step 5.3: Build + chạy dev thử tay**

Run: `npm run build` — Expected: thành công.
Run: `npm run dev` → mở trang Giảng Dạy → tab Tài Liệu:
- Chưa có key/.env → empty state "Chưa cấu hình Google Sheet" (chưa có link) hiển thị đúng.
- Đăng nhập admin → nút "Cấu hình Sheet" hiện; giáo viên thường → không hiện.

- [ ] **Step 5.4: Commit**

```bash
git add src/components/schedule/MaterialsTab.jsx
git commit -m "feat(curriculum): tab Tài Liệu đọc trực tiếp từ Google Sheet, bỏ CRUD"
```

---

### Task 6: Xóa file orphan (CRUD modal + import)

**Files:**
- Delete: `src/components/schedule/ImportCurriculumModal.jsx`
- Delete: `src/components/schedule/MonthModal.jsx`
- Delete: `src/components/schedule/SessionModal.jsx` (⚠️ chỉ file trong `schedule/` — KHÔNG đụng `src/components/classes/SessionModal.jsx` là modal điểm danh)
- Delete: `src/components/schedule/MaterialModal.jsx`

Giữ nguyên: `curriculumImportParser.js` + test (parser vẫn dùng cho Sheets API), `useArmedDelete.js` (SessionDetailPanel vẫn import), `curriculumService.js` + 3 bảng `curriculum_*` (orphan theo tiền lệ `class_materials`, không drop).

- [ ] **Step 6.1: Xác nhận không còn ai import 4 file này**

Run: `grep -rn "ImportCurriculumModal\|MonthModal\|MaterialModal\|schedule/SessionModal\|from './SessionModal'" src/`
Expected: chỉ còn match trong chính 4 file sắp xóa (và `classes/` import `./SessionModal` riêng của nó — không tính).

- [ ] **Step 6.2: Xóa file**

```bash
git rm src/components/schedule/ImportCurriculumModal.jsx src/components/schedule/MonthModal.jsx src/components/schedule/SessionModal.jsx src/components/schedule/MaterialModal.jsx
```

- [ ] **Step 6.3: Build + test**

Run: `npm run build` — Expected: thành công, không lỗi import.
Run: `node scripts/test-curriculum-parser.mjs && node scripts/test-googlesheet-grid.mjs` — Expected: pass toàn bộ.

- [ ] **Step 6.4: Commit**

```bash
git commit -m "refactor(curriculum): xóa modal CRUD + import Excel (giáo trình đọc từ Google Sheet)"
```

---

### Task 7: Cấu hình + tài liệu

**Files:**
- Modify: `CLAUDE.md` (mục "Model giáo trình dùng chung" + mục Env + tab "Tài Liệu")
- Modify: `README.md` (phần env/tính năng nếu có mô tả giáo trình)
- Modify: `.env.example` nếu tồn tại (thêm `VITE_GOOGLE_SHEETS_API_KEY=`)

- [ ] **Step 7.1: Cập nhật CLAUDE.md**

Sửa các mục liên quan:
- Mục **Env bắt buộc**: thêm dòng — `VITE_GOOGLE_SHEETS_API_KEY` (tùy chọn, bắt buộc cho tab Tài Liệu đọc Google Sheet; thiếu → tab báo lỗi cấu hình khi fetch).
- Mục **tab "Tài Liệu"** (trong phần SchedulePage 3 tab) và mục **Model giáo trình dùng chung**: viết lại mô tả — Google Sheet là nguồn chân lý; bảng `curriculum_sheets` (migration `20260705000001`) lưu link theo `courseType`, RLS mọi GV đọc/admin ghi; service `curriculumSheetService` + `googleSheetCurriculumService` (Sheets API v4, API key, fields tối thiểu); util thuần `googleSheetGrid.js` (test `node scripts/test-googlesheet-grid.mjs`); parser `curriculumImportParser.js` tái dùng; cache trong phiên + nút Làm mới/Mở Sheet/Cấu hình Sheet; 3 bảng `curriculum_*` + `curriculumService.js` giờ **orphan** (không drop); 4 modal CRUD/import đã xóa.

- [ ] **Step 7.2: Cập nhật README.md** (nếu có mô tả tính năng giáo trình/env) — cùng nội dung tóm tắt.

- [ ] **Step 7.3: Hướng dẫn user setup (ghi vào cuối README hoặc DEPLOYMENT.md, mục mới "Google Sheets API")**

Nội dung cần ghi:
1. Google Cloud Console → tạo project → bật **Google Sheets API** → Credentials → tạo **API key**.
2. Giới hạn key: API restrictions = Google Sheets API; Application restrictions = HTTP referrers (domain web + `http://localhost:5173/*`).
3. Thêm vào `.env`: `VITE_GOOGLE_SHEETS_API_KEY=<key>`.
4. Mỗi file Sheet giáo trình: Share → "Anyone with the link" → Viewer.
5. Trên web (admin): tab Tài Liệu → "Cấu hình Sheet" → dán link từng khóa.

- [ ] **Step 7.4: Kiểm tra cuối**

Run: `npm run build && node scripts/test-curriculum-parser.mjs && node scripts/test-googlesheet-grid.mjs`
Expected: tất cả pass.

Test tay end-to-end (cần user cung cấp API key + 1 sheet thật): cấu hình link IELTS → tab hiển thị cây tháng/buổi/tài liệu, link Handout mở được, nút Làm mới hoạt động, giáo viên thường thấy read-only.

- [ ] **Step 7.5: Commit**

```bash
git add CLAUDE.md README.md DEPLOYMENT.md
git commit -m "docs(curriculum): cập nhật tài liệu — giáo trình đọc trực tiếp từ Google Sheet"
```
