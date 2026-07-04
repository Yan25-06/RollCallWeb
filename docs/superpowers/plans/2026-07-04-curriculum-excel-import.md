# Import giáo trình từ Excel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho admin import một giáo trình hoàn chỉnh (Tháng → Buổi → nhiều Tài liệu) từ file Excel `.xlsx` xuất từ Google Sheet, theo đúng layout sheet syllabus hiện tại.

**Architecture:** Một parser thuần (`curriculumImportParser.js`, không phụ thuộc React/xlsx ở lõi — nhận grid `{value,link}[][]`) tách khỏi UI để test độc lập bằng Node; một adapter mỏng chuyển worksheet SheetJS → grid; một modal `ImportCurriculumModal.jsx` (theo pattern `ImportStudentsModal`) upload → preview cây → import qua `curriculumService`, bỏ qua tháng đã tồn tại; nút "Import Excel" gắn vào toolbar `MaterialsTab`.

**Tech Stack:** React 18 + Vite (alias `@/` → `src/`), Tailwind navy tokens, `xlsx` (SheetJS 0.18.5, lazy-load), lucide-react, `curriculumService` (Supabase). `"type":"module"` → parser test chạy bằng `node`.

**Spec:** `docs/superpowers/specs/2026-07-04-curriculum-excel-import-design.md`

---

## File Structure

**Tạo mới:**
- `src/utils/curriculumImportParser.js` — parser thuần + adapter worksheet→grid.
- `scripts/test-curriculum-parser.mjs` — test Node cho parser (dự án không có test runner).
- `src/components/schedule/ImportCurriculumModal.jsx` — modal upload/preview/import.

**Sửa:**
- `supabase/migrations/20260704000001_create_curriculum.sql` — `url` nullable.
- `src/components/schedule/MaterialsTab.jsx` — thêm nút "Import Excel" + wiring modal.
- `CLAUDE.md` — ghi chú `url` nullable + tính năng import.

**Lưu ý chung:**
- KHÔNG hard-code màu hex; dùng navy token + badge có sẵn.
- Lazy-load `xlsx` bằng `await import('xlsx')` trong handler (nhất quán CLAUDE.md).
- Migration chưa chạy lên Supabase → sửa trực tiếp file, không tạo migration mới.

---

## Task 1: Migration — `url` nullable

**Files:**
- Modify: `supabase/migrations/20260704000001_create_curriculum.sql`

- [ ] **Step 1: Đổi cột url thành nullable**

Trong `supabase/migrations/20260704000001_create_curriculum.sql`, ở bảng `curriculum_materials`, tìm dòng:
```sql
  url text not null,
```
đổi thành:
```sql
  url text,
```
(Chỉ đổi đúng dòng này. Giữ nguyên `title text not null` và mọi thứ khác.)

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260704000001_create_curriculum.sql
git commit -m "feat(curriculum): url tài liệu cho phép để trống (Đọc dịch chỉ có mã code)"
```

> ⚠️ Bước chạy migration lên Supabase SQL Editor là thao tác thủ công của người vận hành, ngoài phạm vi task này. Vì bảng chưa tồn tại trên production, người vận hành sẽ chạy nguyên file migration (đã sửa) một lần.

---

## Task 2: Parser thuần + test Node

**Files:**
- Create: `src/utils/curriculumImportParser.js`
- Create: `scripts/test-curriculum-parser.mjs`

- [ ] **Step 1: Viết test trước (sẽ fail vì chưa có file parser)**

Tạo `scripts/test-curriculum-parser.mjs`:

```js
import assert from 'node:assert/strict'
import {
  extractFirstUrl,
  parseMaterialsCell,
  parseCurriculumGrid,
} from '../src/utils/curriculumImportParser.js'

const cell = (value, link = null) => ({ value, link })
const empty = { value: null, link: null }
let passed = 0
const test = (name, fn) => { fn(); passed++; console.log('  ✓', name) }

// ── extractFirstUrl ──
test('extractFirstUrl lấy URL đầu tiên, bỏ dấu câu cuối', () => {
  assert.equal(extractFirstUrl('xem: https://a.com/x).'), 'https://a.com/x')
  assert.equal(extractFirstUrl('không có link'), null)
  assert.equal(extractFirstUrl(''), null)
})

// ── parseMaterialsCell: đủ 4 loại ──
test('parseMaterialsCell tách PPT/Handout(link ẩn)/Đọc dịch(code)/Homework', () => {
  const c = cell(
    'PPT: https://canva.link/a\nHandout: HANDOUT-B1\nĐọc dịch: BTB1\nHomework: https://forms.gle/x',
    'https://docs.google.com/document/d/HANDOUT1',
  )
  const m = parseMaterialsCell(c)
  assert.equal(m.length, 4)
  assert.deepEqual(m[0], { type: 'ppt', title: 'PPT', url: 'https://canva.link/a' })
  assert.deepEqual(m[1], { type: 'handout', title: 'HANDOUT-B1', url: 'https://docs.google.com/document/d/HANDOUT1' })
  assert.deepEqual(m[2], { type: 'reading', title: 'BTB1', url: null })
  assert.deepEqual(m[3], { type: 'homework', title: 'Homework', url: 'https://forms.gle/x' })
})

// ── Handout: link ẩn trùng link PPT → bỏ (url null) ──
test('parseMaterialsCell bỏ link ẩn Handout khi trùng link PPT', () => {
  const c = cell(
    'PPT: https://canva.link/x\nHandout: HANDOUT-B\nĐọc dịch:\nHomework: https://forms.gle/y',
    'https://canva.link/x',
  )
  const handout = parseMaterialsCell(c).find(x => x.type === 'handout')
  assert.equal(handout.url, null)
})

// ── Đọc dịch CÓ url trong text → dùng url ──
test('parseMaterialsCell: Đọc dịch có URL thì dùng URL', () => {
  const m = parseMaterialsCell(cell('Đọc dịch: https://docs.google.com/d/z'))
  assert.deepEqual(m, [{ type: 'reading', title: 'Đọc dịch', url: 'https://docs.google.com/d/z' }])
})

// ── Dictation → type reading ──
test('parseMaterialsCell: Dictation map sang type reading', () => {
  const m = parseMaterialsCell(cell('Dictation: NGHE CHÉP CHÍNH TẢ'))
  assert.deepEqual(m, [{ type: 'reading', title: 'NGHE CHÉP CHÍNH TẢ', url: null }])
})

// ── Hai link Homework trong một ô ──
test('parseMaterialsCell: 2 dòng link → 2 homework', () => {
  const m = parseMaterialsCell(cell(
    'Homework: LInk gg form (1): https://forms.gle/a \nLink gg form practice: https://forms.gle/b',
  ))
  const hw = m.filter(x => x.type === 'homework')
  assert.equal(hw.length, 2)
  assert.equal(hw[0].url, 'https://forms.gle/a')
  assert.equal(hw[1].url, 'https://forms.gle/b')
})

// ── Ô tài liệu rỗng → không tạo tài liệu ──
test('parseMaterialsCell: các nhãn rỗng → []', () => {
  assert.deepEqual(parseMaterialsCell(cell('PPT:\nHandout:\nĐọc dịch:\nHomework:')), [])
})

// ── Grid: tháng + forward-fill tuần + buổi + ghi chú ──
test('parseCurriculumGrid: tháng, forward-fill tuần, ghi chú F+G', () => {
  const grid = [
    [cell('THÁNG 1: NỀN TẢNG'), empty, empty, empty, empty, empty, empty],
    [cell('Tuần'), cell('Buổi'), cell('Kỹ năng'), cell('Nội dung'), cell('Tài liệu'), empty, empty],
    [cell('Tuần 1'), cell(1), cell('Reading'), cell('ND1'), cell('PPT: https://canva.link/a'), cell('ghi chú F'), cell('MINI TEST 1')],
    [empty, cell(2), cell('Listening'), cell('ND2'), cell('PPT: https://canva.link/b'), empty, empty],
    [cell('Tuần 2'), cell(3), cell('Reading'), cell('ND3'), cell(''), empty, empty],
  ]
  const { months, warnings } = parseCurriculumGrid(grid)
  assert.equal(warnings.length, 0)
  assert.equal(months.length, 1)
  assert.equal(months[0].monthNo, 1)
  assert.equal(months[0].title, 'NỀN TẢNG')
  assert.equal(months[0].sessions.length, 3)
  assert.equal(months[0].sessions[0].weekNo, 1)
  assert.equal(months[0].sessions[1].weekNo, 1)   // forward-filled
  assert.equal(months[0].sessions[2].weekNo, 2)
  assert.equal(months[0].sessions[0].skill, 'Reading')
  assert.equal(months[0].sessions[0].note, 'ghi chú F\nMINI TEST 1')
  assert.equal(months[0].sessions[2].materials.length, 0)
})

// ── Grid: buổi không có tháng phía trên → warning ──
test('parseCurriculumGrid: buổi mồ côi → warning, không tạo', () => {
  const grid = [
    [empty, cell(5), cell('Reading'), cell('ND'), cell('PPT: https://a.com/x'), empty, empty],
  ]
  const { months, warnings } = parseCurriculumGrid(grid)
  assert.equal(months.length, 0)
  assert.equal(warnings.length, 1)
})

console.log(`\n${passed} test(s) passed.`)
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `node scripts/test-curriculum-parser.mjs`
Expected: FAIL — lỗi kiểu `Cannot find module '.../src/utils/curriculumImportParser.js'`.

- [ ] **Step 3: Viết parser**

Tạo `src/utils/curriculumImportParser.js`:

```js
// Parser giáo trình từ sheet syllabus (Google Sheet xuất .xlsx).
// Lõi thuần: nhận grid [{ value, link }][] — không import xlsx/React → test bằng node.

// Cột trong sheet syllabus (0-based)
const COL = { week: 0, session: 1, skill: 2, content: 3, materials: 4, noteF: 5, noteG: 6, noteH: 7 }

const MONTH_RE = /^\s*THÁNG\s+(\d+)\s*:?\s*(.*)$/i
const WEEK_RE = /tuần\s+(\d+)/i
const URL_RE = /https?:\/\/\S+/

// Nhãn tài liệu → type (khớp cả biến thể không dấu, hoa/thường)
const MATERIAL_LABELS = [
  { re: /^ppt$/i, type: 'ppt' },
  { re: /^handout$/i, type: 'handout' },
  { re: /^(đọc dịch|doc dich|dictation)$/i, type: 'reading' },
  { re: /^homework$/i, type: 'homework' },
]

const DEFAULT_TITLE = { ppt: 'PPT', handout: 'Handout', reading: 'Đọc dịch', homework: 'Homework' }

export function extractFirstUrl(text) {
  if (!text) return null
  const m = String(text).match(URL_RE)
  return m ? m[0].replace(/[)\].,;]+$/, '') : null
}

function labelToType(label) {
  const key = String(label).trim().toLowerCase()
  for (const { re, type } of MATERIAL_LABELS) {
    if (re.test(key)) return type
  }
  return null
}

// Tách 1 ô tài liệu (cột E) → mảng { type, title, url }
export function parseMaterialsCell(cellObj) {
  const text = cellObj?.value != null ? String(cellObj.value) : ''
  const hiddenLink = cellObj?.link || null
  const lines = text.split(/\r?\n/)

  // Tìm trước link PPT để dedupe link ẩn Handout
  let pptUrl = null
  for (const raw of lines) {
    const line = raw.trim()
    const idx = line.indexOf(':')
    if (idx !== -1 && labelToType(line.slice(0, idx)) === 'ppt') {
      pptUrl = extractFirstUrl(line.slice(idx + 1))
      break
    }
  }

  const materials = []
  let currentType = null

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    let type = null
    let value = line
    const idx = line.indexOf(':')
    if (idx !== -1) {
      const t = labelToType(line.slice(0, idx))
      if (t) { type = t; value = line.slice(idx + 1).trim() }
    }

    if (type) {
      currentType = type
    } else {
      // Dòng nối tiếp (VD link Homework thứ 2) — gắn vào nhãn trước nếu có URL
      if (!currentType) continue
      type = currentType
      value = line
    }

    const url = extractFirstUrl(value)
    if (url) {
      const title = value.replace(url, '').replace(/[-–:]\s*$/, '').trim()
      materials.push({ type, title: title || DEFAULT_TITLE[type], url })
    } else if (value) {
      // Chỉ có mã code, không URL
      let mUrl = null
      if (type === 'handout' && hiddenLink && hiddenLink !== pptUrl) mUrl = hiddenLink
      materials.push({ type, title: value, url: mUrl })
    }
    // value rỗng → bỏ qua nhãn
  }
  return materials
}

const cellText = (c) => (c?.value != null ? String(c.value).trim() : '')

// Parse toàn grid → { months, warnings }
export function parseCurriculumGrid(grid) {
  const months = []
  const warnings = []
  let currentMonth = null
  let currentWeekNo = null

  grid.forEach((row, i) => {
    const aText = cellText(row[COL.week])
    const bCell = row[COL.session]

    // Dòng Tháng
    const mMonth = aText.match(MONTH_RE)
    if (mMonth) {
      currentMonth = { monthNo: Number(mMonth[1]), title: (mMonth[2] || '').trim() || null, sessions: [] }
      months.push(currentMonth)
      currentWeekNo = null
      return
    }

    // Dòng header ("Tuần" | "Buổi")
    if (aText.toLowerCase() === 'tuần' || cellText(bCell).toLowerCase() === 'buổi') return

    // Cập nhật tuần nếu cột A có "Tuần N"
    const mWeek = aText.match(WEEK_RE)
    if (mWeek) currentWeekNo = Number(mWeek[1])

    // Dòng buổi: cột B là số
    const bVal = bCell?.value
    const sessionNo = typeof bVal === 'number'
      ? bVal
      : (cellText(bCell) !== '' && !Number.isNaN(Number(bVal)) ? Number(bVal) : null)
    if (sessionNo == null) return

    if (!currentMonth) {
      warnings.push({ row: i + 1, message: `Buổi ${sessionNo} không thuộc tháng nào (thiếu dòng THÁNG phía trên)` })
      return
    }

    const note = [row[COL.noteF], row[COL.noteG], row[COL.noteH]]
      .map(cellText).filter(Boolean).join('\n') || null

    currentMonth.sessions.push({
      weekNo: currentWeekNo,
      sessionNo,
      skill: cellText(row[COL.skill]) || null,
      content: cellText(row[COL.content]) || null,
      note,
      materials: parseMaterialsCell(row[COL.materials]),
    })
  })

  return { months, warnings }
}

// Adapter mỏng: worksheet SheetJS → grid. Nhận XLSX qua tham số để lõi không phụ thuộc xlsx.
export function worksheetToGrid(ws, XLSX) {
  if (!ws || !ws['!ref']) return []
  const range = XLSX.utils.decode_range(ws['!ref'])
  const grid = []
  for (let r = range.s.r; r <= range.e.r; r++) {
    const rowArr = []
    for (let c = range.s.c; c <= Math.min(range.e.c, COL.noteH); c++) {
      const addr = XLSX.utils.encode_cell({ r, c })
      const cell = ws[addr]
      rowArr[c] = cell ? { value: cell.v ?? null, link: cell.l?.Target ?? null } : { value: null, link: null }
    }
    grid.push(rowArr)
  }
  return grid
}

export function parseCurriculumSheet(ws, XLSX) {
  return parseCurriculumGrid(worksheetToGrid(ws, XLSX))
}
```

- [ ] **Step 4: Chạy test để xác nhận pass**

Run: `node scripts/test-curriculum-parser.mjs`
Expected: PASS — in ra `9 test(s) passed.` (mỗi test có dấu ✓).

- [ ] **Step 5: Build kiểm tra (parser không phá build)**

Run: `npm run build`
Expected: build thành công.

- [ ] **Step 6: Commit**

```bash
git add src/utils/curriculumImportParser.js scripts/test-curriculum-parser.mjs
git commit -m "feat(curriculum): parser import giáo trình từ Excel + test Node"
```

---

## Task 3: Kiểm parser với file thật (integration, không sửa code)

**Files:** không sửa code — chỉ kiểm bằng script tạm.

- [ ] **Step 1: Chạy parser trên `syllabus.xlsx` thật**

Chạy lệnh (không lưu file, chạy inline để kiểm shape thật):
```bash
node --input-type=module -e "
import XLSX from 'xlsx';
import { parseCurriculumSheet } from './src/utils/curriculumImportParser.js';
const wb = XLSX.readFile('syllabus.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const { months, warnings } = parseCurriculumSheet(ws, XLSX);
console.log('Tháng:', months.length);
console.log('Tổng buổi:', months.reduce((s,m)=>s+m.sessions.length,0));
const b1 = months[0].sessions[0];
console.log('Buổi 1 — số tài liệu:', b1.materials.length);
console.log(JSON.stringify(b1.materials, null, 2));
const b19 = months.flatMap(m=>m.sessions).find(s=>s.sessionNo===19);
console.log('Buổi 19 — số homework:', b19.materials.filter(x=>x.type==='homework').length);
const b29 = months.flatMap(m=>m.sessions).find(s=>s.sessionNo===29);
console.log('Buổi 29 — số tài liệu (kỳ vọng 0):', b29.materials.length);
console.log('Warnings:', warnings.length);
"
```
Expected:
- Tháng: 3
- Tổng buổi: 36
- Buổi 1 — số tài liệu: 4 (ppt canva có url; handout `HANDOUT-B1` có url Google Doc; reading `BTB1` url null; homework forms.gle có url)
- Buổi 19 — số homework: 2
- Buổi 29 — số tài liệu: 0
- Warnings: 0

- [ ] **Step 2: Nếu kết quả lệch kỳ vọng**

Nếu số liệu không khớp (VD buổi 1 ra 3 thay vì 4, hoặc warnings > 0), quay lại Task 2 sửa parser + bổ sung test tương ứng vào `scripts/test-curriculum-parser.mjs`, chạy lại test + build, commit fix. Nếu khớp hết → không cần commit (task này chỉ kiểm chứng).

---

## Task 4: `ImportCurriculumModal`

**Files:**
- Create: `src/components/schedule/ImportCurriculumModal.jsx`

- [ ] **Step 1: Viết modal**

Tạo `src/components/schedule/ImportCurriculumModal.jsx`:

```jsx
import { useState, useRef } from 'react'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'
import { Modal, Button, Badge } from '@/components/ui'
import { curriculumService } from '@/services/curriculumService'
import { COURSE_TYPES } from '@/utils/courseTypes'
import { parseCurriculumSheet } from '@/utils/curriculumImportParser'
import { getMaterialType } from './materialType'

/**
 * ImportCurriculumModal — import giáo trình (Tháng→Buổi→Tài liệu) từ file Excel.
 * @param {boolean}  open
 * @param {Function} onClose
 * @param {string}   defaultCourseType - courseType gợi ý (tab đang hiển thị)
 * @param {Function} onImportDone - gọi sau khi import xong để reload
 */
export const ImportCurriculumModal = ({ open, onClose, defaultCourseType = COURSE_TYPES[0], onImportDone }) => {
  const [courseType, setCourseType] = useState(defaultCourseType)
  const [parsed, setParsed] = useState(null)      // { months, warnings }
  const [fileError, setFileError] = useState('')
  const [expanded, setExpanded] = useState(() => new Set())
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [result, setResult] = useState(null)
  const fileRef = useRef(null)

  const reset = () => {
    setParsed(null)
    setFileError('')
    setExpanded(new Set())
    setResult(null)
    setProgress({ done: 0, total: 0 })
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleClose = () => { reset(); onClose?.() }

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    reset()
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setFileError('Chỉ chấp nhận file .xlsx hoặc .xls')
      return
    }
    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const XLSX = await import('xlsx')
        const wb = XLSX.read(evt.target.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const res = parseCurriculumSheet(ws, XLSX)
        if (res.months.length === 0) {
          setFileError('Không đọc được giáo trình nào từ file. Kiểm tra định dạng sheet.')
          return
        }
        setParsed(res)
      } catch {
        setFileError('Không đọc được file. Kiểm tra lại định dạng.')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const toggle = (monthNo) => setExpanded(prev => {
    const next = new Set(prev)
    next.has(monthNo) ? next.delete(monthNo) : next.add(monthNo)
    return next
  })

  const totalSessions = parsed ? parsed.months.reduce((s, m) => s + m.sessions.length, 0) : 0
  const totalMaterials = parsed
    ? parsed.months.reduce((s, m) => s + m.sessions.reduce((ss, x) => ss + x.materials.length, 0), 0)
    : 0

  const handleImport = async () => {
    if (!parsed) return
    setImporting(true)
    setProgress({ done: 0, total: totalSessions })

    let createdMonths = 0, createdSessions = 0, createdMaterials = 0
    let skippedMonths = 0, failed = 0
    let doneSessions = 0

    // Các monthNo đã tồn tại trong courseType này
    let existingMonthNos = new Set()
    try {
      const tree = await curriculumService.getByCourseType(courseType)
      existingMonthNos = new Set(tree.map(m => m.monthNo))
    } catch {
      // nếu lỗi đọc, coi như chưa có tháng nào (import sẽ thử tạo, trùng sẽ báo lỗi ở createMonth)
    }

    for (const month of parsed.months) {
      if (existingMonthNos.has(month.monthNo)) {
        skippedMonths++
        doneSessions += month.sessions.length
        setProgress({ done: doneSessions, total: totalSessions })
        continue
      }
      let monthId
      try {
        const created = await curriculumService.createMonth({
          courseType, monthNo: month.monthNo, title: month.title,
        })
        monthId = created.id
        createdMonths++
      } catch {
        failed++
        doneSessions += month.sessions.length
        setProgress({ done: doneSessions, total: totalSessions })
        continue
      }

      for (const s of month.sessions) {
        try {
          const sess = await curriculumService.createSession({
            monthId, weekNo: s.weekNo, sessionNo: s.sessionNo,
            skill: s.skill, content: s.content, note: s.note,
          })
          createdSessions++
          for (let k = 0; k < s.materials.length; k++) {
            const mat = s.materials[k]
            try {
              await curriculumService.createMaterial({
                sessionId: sess.id, type: mat.type, title: mat.title, url: mat.url, orderIndex: k,
              })
              createdMaterials++
            } catch { failed++ }
          }
        } catch { failed++ }
        doneSessions++
        setProgress({ done: doneSessions, total: totalSessions })
      }
    }

    setImporting(false)
    setResult({ createdMonths, createdSessions, createdMaterials, skippedMonths, failed })
    if (createdSessions > 0 || createdMonths > 0) onImportDone?.()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Import giáo trình từ Excel"
      footer={
        result ? (
          <div className="flex justify-end w-full">
            <Button variant="primary" onClick={handleClose}>Đóng</Button>
          </div>
        ) : (
          <div className="flex justify-end gap-2 w-full">
            <Button variant="ghost" onClick={handleClose}>Hủy</Button>
            <Button variant="primary" onClick={handleImport} disabled={importing || !parsed}>
              {importing
                ? `Đang import... ${progress.done}/${progress.total}`
                : parsed ? `Import ${parsed.months.length} tháng` : 'Import'}
            </Button>
          </div>
        )
      }
    >
      <div className="flex flex-col gap-4">
        {/* Kết quả */}
        {result && (
          <div className="flex flex-col gap-3 items-center py-4 text-center">
            <CheckCircle size={40} className="text-emerald-500" />
            <p className="font-semibold text-navy-900">Import hoàn tất</p>
            <div className="flex flex-col gap-1 text-sm text-navy-600">
              <p>{result.createdMonths} tháng, {result.createdSessions} buổi, {result.createdMaterials} tài liệu đã tạo</p>
              {result.skippedMonths > 0 && (
                <p className="text-amber-600">{result.skippedMonths} tháng bị bỏ qua (đã tồn tại)</p>
              )}
              {result.failed > 0 && <p className="text-red-600">{result.failed} mục lỗi</p>}
            </div>
          </div>
        )}

        {!result && (
          <>
            {/* Chọn loại khóa đích */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-navy-700 shrink-0">Loại khóa đích:</span>
              <select
                value={courseType}
                onChange={e => setCourseType(e.target.value)}
                className="select text-sm"
              >
                {COURSE_TYPES.map(ct => <option key={ct} value={ct}>{ct}</option>)}
              </select>
            </div>

            {/* Upload */}
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-navy-200 rounded-xl p-5 flex flex-col items-center gap-2 cursor-pointer hover:border-navy-400 hover:bg-navy-50 transition-all"
            >
              <FileSpreadsheet size={28} className="text-navy-400" />
              <p className="text-sm text-navy-600 font-medium">Chọn file Excel (.xlsx)</p>
              <p className="text-xs text-navy-400">Sheet giáo trình: Tháng → Tuần/Buổi → Tài liệu</p>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
            </div>

            {fileError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-sm text-red-700">
                <AlertCircle size={16} className="shrink-0" />
                {fileError}
              </div>
            )}

            {/* Cảnh báo parse */}
            {parsed?.warnings.length > 0 && (
              <div className="flex flex-col gap-1 p-3 bg-amber-50 rounded-xl text-xs text-amber-700">
                <p className="font-semibold">{parsed.warnings.length} dòng cảnh báo (sẽ bỏ qua):</p>
                {parsed.warnings.slice(0, 5).map((w, i) => <p key={i}>Dòng {w.row}: {w.message}</p>)}
              </div>
            )}

            {/* Preview cây */}
            {parsed && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-navy-700">
                    {parsed.months.length} tháng · {totalSessions} buổi · {totalMaterials} tài liệu
                  </p>
                </div>
                <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
                  {parsed.months.map(month => {
                    const matCount = month.sessions.reduce((s, x) => s + x.materials.length, 0)
                    const isOpen = expanded.has(month.monthNo)
                    return (
                      <div key={month.monthNo} className="rounded-xl border border-navy-100 overflow-hidden">
                        <button
                          onClick={() => toggle(month.monthNo)}
                          className="w-full flex items-center gap-2 px-3 py-2 bg-navy-50 hover:bg-navy-100 transition-colors text-left"
                        >
                          {isOpen ? <ChevronDown size={15} className="shrink-0 text-navy-500" /> : <ChevronRight size={15} className="shrink-0 text-navy-500" />}
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-navy-800 text-white shrink-0">Tháng {month.monthNo}</span>
                          <span className="text-sm text-navy-800 truncate flex-1">{month.title || '(chưa có tiêu đề)'}</span>
                          <span className="text-xs text-navy-400 shrink-0">{month.sessions.length} buổi · {matCount} tài liệu</span>
                        </button>
                        {isOpen && (
                          <ul className="divide-y divide-navy-50">
                            {month.sessions.map(s => (
                              <li key={s.sessionNo} className="flex items-center gap-2 px-3 py-1.5 text-xs">
                                <span className="font-semibold text-navy-700 shrink-0">Buổi {s.sessionNo}</span>
                                {s.weekNo != null && <span className="text-navy-400 shrink-0">T{s.weekNo}</span>}
                                {s.skill && <span className="text-navy-500 shrink-0">{s.skill}</span>}
                                <span className="flex-1" />
                                <span className="flex items-center gap-1 shrink-0">
                                  {s.materials.map((m, i) => {
                                    const t = getMaterialType(m.type)
                                    return <span key={i} className={clsx('px-1.5 py-0.5 rounded', t.badge)}>{t.label}</span>
                                  })}
                                  {s.materials.length === 0 && <span className="text-navy-300">—</span>}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )
                  })}
                </div>
                {result === null && <Badge variant="warning">Tháng đã tồn tại trong loại khóa này sẽ bị bỏ qua.</Badge>}
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
```

- [ ] **Step 2: Xác minh `Badge` có variant `warning`**

Run: `grep -n "warning" src/components/ui/index.jsx`
Expected: có style cho `variant="warning"` trong `Badge`. **Nếu KHÔNG có**, đổi `<Badge variant="warning">...` thành một dòng ghi chú thường:
```jsx
<p className="text-xs text-amber-600">Tháng đã tồn tại trong loại khóa này sẽ bị bỏ qua.</p>
```
và bỏ dòng `<Badge variant="warning">`. Kiểm tra trước khi tiếp tục.

- [ ] **Step 3: Build kiểm tra**

Run: `npm run build`
Expected: build thành công, không lỗi import.

- [ ] **Step 4: Commit**

```bash
git add src/components/schedule/ImportCurriculumModal.jsx
git commit -m "feat(curriculum): modal import giáo trình từ Excel (preview + progress)"
```

---

## Task 5: Wiring vào `MaterialsTab`

**Files:**
- Modify: `src/components/schedule/MaterialsTab.jsx`

- [ ] **Step 1: Thêm import**

Trong `src/components/schedule/MaterialsTab.jsx`, ở cụm import icon lucide (dòng đầu), thêm `Upload`:
```jsx
import { Plus, ExternalLink, Pencil, Trash2, FileText, ChevronDown, ChevronRight, Upload } from 'lucide-react'
```
Và thêm import modal (cạnh các import modal khác như `MonthModal`):
```jsx
import { ImportCurriculumModal } from './ImportCurriculumModal'
```

- [ ] **Step 2: Thêm state modal import**

Ngay dưới dòng khai báo `const [materialModal, setMaterialModal] = useState(...)`, thêm:
```jsx
const [importOpen, setImportOpen] = useState(false)
```

- [ ] **Step 3: Thêm nút "Import Excel" vào toolbar**

Trong khối toolbar, tìm đoạn nút "Thêm tháng" (chỉ hiện khi `isAdmin`):
```jsx
        {isAdmin && (
          <Button variant="primary" size="sm" onClick={() => setMonthModal({ open: true, editing: null })} className="flex items-center gap-1.5 shrink-0">
            <Plus size={14} /> Thêm tháng
          </Button>
        )}
```
đổi thành (thêm nút Import ngay trước nút "Thêm tháng", cùng điều kiện `isAdmin`):
```jsx
        {isAdmin && (
          <>
            <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)} className="flex items-center gap-1.5 shrink-0">
              <Upload size={14} /> Import Excel
            </Button>
            <Button variant="primary" size="sm" onClick={() => setMonthModal({ open: true, editing: null })} className="flex items-center gap-1.5 shrink-0">
              <Plus size={14} /> Thêm tháng
            </Button>
          </>
        )}
```

- [ ] **Step 4: Render modal import**

Ngay trước thẻ đóng `</div>` cuối cùng của component (sau `<MaterialModal ... />`), thêm:
```jsx
      <ImportCurriculumModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        defaultCourseType={courseType}
        onImportDone={load}
      />
```

- [ ] **Step 5: Build kiểm tra**

Run: `npm run build`
Expected: build thành công.

- [ ] **Step 6: Commit**

```bash
git add src/components/schedule/MaterialsTab.jsx
git commit -m "feat(curriculum): nút Import Excel trong tab Tài Liệu"
```

---

## Task 6: Cập nhật tài liệu

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Cập nhật CLAUDE.md**

Trong `CLAUDE.md`, tại mục mô tả model giáo trình (phần nói về `curriculum_materials` / migration `20260704000001`), bổ sung 2 ý:
1. Cột `curriculum_materials.url` **nullable** (tài liệu "Đọc dịch" có thể chỉ có mã code, không link).
2. Tab "Tài Liệu" có nút **"Import Excel"** (chỉ admin): import giáo trình từ file `.xlsx` xuất từ Google Sheet qua `ImportCurriculumModal` + parser thuần `src/utils/curriculumImportParser.js` (nhận diện dòng Tháng/Tuần/Buổi, tách ô tài liệu theo nhãn PPT/Handout/Đọc dịch/Dictation/Homework, lấy hyperlink ẩn cho Handout). Parser có test Node tại `scripts/test-curriculum-parser.mjs` (chạy `node scripts/test-curriculum-parser.mjs`). Import bỏ qua tháng đã tồn tại trong cùng courseType.

Viết ngắn gọn, khớp văn phong các mục hiện có. Xác minh tên file/hàm bằng cách đọc code thật trước khi viết.

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(curriculum): ghi chú url nullable + tính năng import Excel"
```

---

## Task 7: Verify thủ công end-to-end

**Files:** không sửa code (chỉ kiểm thử; nếu phát hiện lỗi quay lại task tương ứng).

- [ ] **Step 1: Chạy lại test parser + build**

Run: `node scripts/test-curriculum-parser.mjs && npm run build`
Expected: tất cả test pass + build xanh.

- [ ] **Step 2: Kiểm UI (yêu cầu migration đã chạy trên Supabase + tài khoản admin)**

> Bước này cần: (a) đã chạy migration `20260704000001` (bản `url` nullable) lên Supabase SQL Editor; (b) file `.env` có key Supabase; (c) đăng nhập admin. Nếu môi trường chưa sẵn, ghi rõ đây là bước thủ công còn tồn để người vận hành làm.

Run: `npm run dev` → mở http://localhost:5173 → đăng nhập admin → trang "Giảng Dạy" → tab "Tài Liệu":
- Chọn loại khóa **TOEIC**.
- Bấm "Import Excel" → chọn `syllabus.xlsx`.
- Preview: kỳ vọng 3 tháng, 36 buổi. Mở rộng Tháng 1 → Buổi 1 có 4 badge (PPT/Handout/Đọc dịch/Homework).
- Bấm "Import 3 tháng" → progress chạy → toast/khối kết quả: 3 tháng, 36 buổi, ~nhiều tài liệu; 0 bỏ qua lần đầu.
- Đóng modal → cây giáo trình TOEIC hiển thị đầy đủ. Mở 1 tài liệu Handout → link Google Doc mở đúng; tài liệu "Đọc dịch" mã code không có nút mở link (url trống).
- Bấm "Import Excel" lại → import lần 2 → kết quả: 3 tháng **bị bỏ qua** (không nhân đôi dữ liệu).

Expected: mọi thao tác có phản hồi, không lỗi console, không tạo trùng.

- [ ] **Step 3: Kiểm quyền giáo viên thường**

Đăng nhập giáo viên thường → tab "Tài Liệu": **không** thấy nút "Import Excel" (và không thấy "Thêm tháng").

- [ ] **Step 4: Commit (nếu có sửa lỗi phát sinh)**

```bash
git add -A
git commit -m "fix(curriculum): xử lý lỗi phát hiện khi verify import"
```
(Bỏ qua nếu không có sửa.)

---

## Self-Review Notes (đã kiểm)

- **Spec coverage:** migration url nullable (T1), parser thuần + label map + hyperlink dedupe + 2-homework + note F/G (T2, test 9 ca), kiểm file thật (T3), modal upload/preview/progress/skip-existing (T4), wiring nút admin (T5), docs (T6), verify E2E + RLS quyền (T7). ✔
- **Type consistency:** parser trả `{ months:[{ monthNo, title, sessions:[{ weekNo, sessionNo, skill, content, note, materials:[{type,title,url}] }] }], warnings:[{row,message}] }`; modal gọi `curriculumService.createMonth({courseType,monthNo,title})`, `createSession({monthId,weekNo,sessionNo,skill,content,note})`, `createMaterial({sessionId,type,title,url,orderIndex})` — khớp service Task 4 của tính năng giáo trình. ✔
- **Rủi ro thực thi:** (a) `Badge variant="warning"` — Step 4.2 xác minh trước, có fallback; (b) migration phải chạy lại bản mới trên Supabase trước khi test UI — nêu rõ ở T7 Step 2; (c) parser đọc hyperlink dựa trên `cell.l.Target` — đã xác nhận SheetJS 0.18.5 giữ link mặc định.
