# Redesign Tab Tài Liệu (Master-Detail) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đổi giao diện tab "Tài Liệu" (SchedulePage) từ accordion dọc dài sang layout master-detail: sidebar trái điều hướng Tháng → Tuần → Buổi, panel phải hiện chi tiết buổi + tài liệu bấm trực tiếp.

**Architecture:** `MaterialsTab.jsx` giữ vai trò container (state data + modal + handler CRUD gọi `curriculumService`, không đổi logic data), thêm state `selectedSessionId`. Tách 2 component trình bày mới `CurriculumSidebar.jsx` và `SessionDetailPanel.jsx`, cùng hook `useArmedDelete.js` gom cơ chế xóa 2 bước đang lặp 3 lần. Spec đã duyệt: `docs/superpowers/specs/2026-07-05-materials-tab-redesign-design.md`.

**Tech Stack:** React 18 + Vite, Tailwind (navy tokens, KHÔNG hex), `clsx`, lucide-react, component từ `@/components/ui`. Project **không có test runner** → mỗi task xác minh bằng `npm run build` (bắt lỗi syntax/import), cuối cùng kiểm thử thủ công qua `npm run dev`.

**Lưu ý quy ước (từ CLAUDE.md):** import alias `@/`, `clsx()` cho class điều kiện, chữ trên nền sáng dùng `navy-500` trở lên (`navy-300/400` chỉ cho icon/viền/placeholder), trên nền tối dùng `navy-300`.

---

### Task 1: Hook `useArmedDelete` (xóa 2 bước dùng chung)

**Files:**
- Create: `src/components/schedule/useArmedDelete.js`

- [ ] **Step 1: Viết hook**

Cơ chế "vũ trang": bấm lần 1 đánh dấu id đang chờ xác nhận, tự hủy sau 3s; bấm lần 2 (cùng id) mới gọi xóa thật. Dùng được cho cả trường hợp 1 item (truyền id cố định) lẫn danh sách (truyền id từng item).

```js
import { useState, useEffect, useCallback } from 'react'

/**
 * useArmedDelete — cơ chế xóa 2 bước dùng chung.
 * Bấm lần 1 "vũ trang" (armedId = id, tự hủy sau `timeout` ms),
 * bấm lần 2 cùng id mới thực sự gọi onDelete.
 */
export const useArmedDelete = (timeout = 3000) => {
  const [armedId, setArmedId] = useState(null)

  useEffect(() => {
    if (armedId === null) return
    const t = setTimeout(() => setArmedId(null), timeout)
    return () => clearTimeout(t)
  }, [armedId, timeout])

  const fire = useCallback((id, onDelete) => {
    if (armedId !== id) { setArmedId(id); return }
    setArmedId(null)
    onDelete()
  }, [armedId])

  return { armedId, fire }
}
```

- [ ] **Step 2: Build để bắt lỗi syntax**

Run: `npm run build`
Expected: build thành công (hook chưa được import ở đâu, chỉ check syntax).

- [ ] **Step 3: Commit**

```bash
git add src/components/schedule/useArmedDelete.js
git commit -m "feat(curriculum): hook useArmedDelete gom cơ chế xóa 2 bước"
```

---

### Task 2: Component `CurriculumSidebar`

**Files:**
- Create: `src/components/schedule/CurriculumSidebar.jsx`

- [ ] **Step 1: Viết component**

Sidebar trái: mỗi tháng là header navy đậm đóng/mở được (mặc định mở tháng đầu, các tháng sau đóng — dùng Set `toggled` lật trạng thái mặc định theo index, container sẽ remount bằng `key={courseType}` khi đổi giáo trình). Trong tháng: nhãn Tuần + dòng buổi gọn (KHÔNG hiện tài liệu). Admin có nút ＋ buổi / sửa / xóa (2 bước) trên header tháng.

```jsx
import { useState } from 'react'
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'
import { useArmedDelete } from './useArmedDelete'

/** Gom buổi theo tuần, giữ thứ tự session_no đã sort từ service. */
const groupByWeek = (sessions) => {
  const map = new Map()
  for (const s of sessions) {
    const key = s.weekNo ?? '—'
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(s)
  }
  return [...map.entries()]  // [[weekNo|'—', sessions[]]]
}

/** Nhãn 1 dòng cho buổi ở sidebar: dòng đầu của content, fallback skill. */
const sessionLabel = (s) =>
  (s.content || '').split('\n')[0].trim() || s.skill || '(chưa có nội dung)'

/**
 * CurriculumSidebar — cây điều hướng Tháng → Tuần → Buổi (không hiện tài liệu).
 * Container nên render với key={courseType} để reset trạng thái đóng/mở khi đổi giáo trình.
 */
export const CurriculumSidebar = ({
  tree, selectedSessionId, isAdmin,
  onSelectSession, onAddSession, onEditMonth, onDeleteMonth,
}) => {
  // Mặc định: tháng đầu (index 0) mở, còn lại đóng. `toggled` chứa id các tháng bị lật khỏi mặc định.
  const [toggled, setToggled] = useState(() => new Set())
  const isCollapsed = (monthId, idx) => (toggled.has(monthId) ? idx === 0 : idx !== 0)
  const toggle = (monthId) => setToggled(prev => {
    const next = new Set(prev)
    next.has(monthId) ? next.delete(monthId) : next.add(monthId)
    return next
  })

  const monthDel = useArmedDelete()

  return (
    <div className="w-full lg:w-72 shrink-0 bg-white rounded-2xl border border-navy-100 shadow-navy-sm p-2 flex flex-col gap-1.5">
      {tree.map((month, idx) => {
        const collapsed = isCollapsed(month.id, idx)
        const armed = monthDel.armedId === month.id
        return (
          <div key={month.id}>
            {/* Header tháng */}
            <div
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-navy-900 to-navy-800 px-2.5 py-2 text-white cursor-pointer select-none"
              onClick={() => toggle(month.id)}
            >
              {collapsed ? <ChevronRight size={14} className="shrink-0" /> : <ChevronDown size={14} className="shrink-0" />}
              <span className="text-sm font-bold min-w-0 truncate">
                Tháng {month.monthNo}{month.title ? ` · ${month.title}` : ''}
              </span>
              <span className="ml-auto text-[11px] text-navy-300 shrink-0">{month.sessions.length} buổi</span>
              {isAdmin && (
                <span className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                  <button onClick={() => onAddSession(month.id)} className="p-1 rounded-md text-navy-300 hover:text-white hover:bg-white/10 transition-colors" title="Thêm buổi">
                    <Plus size={13} />
                  </button>
                  <button onClick={() => onEditMonth(month)} className="p-1 rounded-md text-navy-300 hover:text-white hover:bg-white/10 transition-colors" title="Sửa tháng">
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={() => monthDel.fire(month.id, () => onDeleteMonth(month.id))}
                    className={clsx(
                      'p-1 rounded-md transition-colors',
                      armed ? 'text-white bg-red-600 hover:bg-red-700' : 'text-navy-300 hover:text-red-300 hover:bg-white/10'
                    )}
                    title={armed ? 'Xác nhận xóa? Bấm lại để xóa cả tháng (kèm buổi + tài liệu)' : 'Xóa tháng'}
                  >
                    <Trash2 size={12} />
                  </button>
                </span>
              )}
            </div>

            {/* Danh sách buổi theo tuần */}
            {!collapsed && (
              <div className="flex flex-col gap-0.5 py-1.5 pl-2">
                {month.sessions.length === 0 ? (
                  <p className="text-xs text-navy-400 px-2 py-1.5">Chưa có buổi nào.</p>
                ) : groupByWeek(month.sessions).map(([weekKey, sessions]) => (
                  <div key={weekKey} className="flex flex-col gap-0.5">
                    {weekKey !== '—' && (
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-navy-500 px-2 pt-1.5">Tuần {weekKey}</p>
                    )}
                    {sessions.map(s => {
                      const active = s.id === selectedSessionId
                      return (
                        <button
                          key={s.id}
                          onClick={() => onSelectSession(s.id)}
                          className={clsx(
                            'flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors border-l-[3px]',
                            active
                              ? 'bg-navy-50 border-navy-800'
                              : 'border-transparent hover:bg-navy-50/60'
                          )}
                        >
                          <span className={clsx(
                            'text-[11px] font-semibold px-1.5 py-0.5 rounded shrink-0',
                            active ? 'bg-navy-800 text-white' : 'bg-navy-50 text-navy-700'
                          )}>
                            B{s.sessionNo}
                          </span>
                          <span className={clsx(
                            'text-xs min-w-0 truncate',
                            active ? 'font-semibold text-navy-900' : 'text-navy-500'
                          )}>
                            {sessionLabel(s)}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Build để bắt lỗi syntax/import**

Run: `npm run build`
Expected: build thành công.

- [ ] **Step 3: Commit**

```bash
git add src/components/schedule/CurriculumSidebar.jsx
git commit -m "feat(curriculum): sidebar điều hướng tháng/tuần/buổi cho tab Tài Liệu"
```

---

### Task 3: Component `SessionDetailPanel`

**Files:**
- Create: `src/components/schedule/SessionDetailPanel.jsx`

- [ ] **Step 1: Viết component**

Panel phải: header badge Buổi + skill + breadcrumb "Tháng x · Tuần y" + nút sửa/xóa buổi (admin); tiêu đề = `content` (dòng đầu to đậm, các dòng sau hiện dưới dạng đoạn); ghi chú in nghiêng; mục "TÀI LIỆU · n" + nút thêm (admin); mỗi tài liệu 1 hàng lớn — **có `url` thì cả hàng là `<a>` mở tab mới, không có chữ "Mở link"**; không có `url` thì hàng thường không icon. Nút sửa/xóa tài liệu nằm NGOÀI thẻ `<a>`.

```jsx
import { Plus, Pencil, Trash2, ExternalLink, FileText } from 'lucide-react'
import { clsx } from 'clsx'
import { Button, Empty } from '@/components/ui'
import { getMaterialType } from './materialType'
import { useArmedDelete } from './useArmedDelete'

/**
 * SessionDetailPanel — chi tiết buổi đang chọn + danh sách tài liệu.
 * @param {{session: Object, month: Object}|null} selected
 */
export const SessionDetailPanel = ({
  selected, isAdmin,
  onEditSession, onDeleteSession, onAddMaterial, onEditMaterial, onDeleteMaterial,
}) => {
  const sessionDel = useArmedDelete()
  const materialDel = useArmedDelete()

  if (!selected) {
    return (
      <div className="flex-1 w-full bg-white rounded-2xl border border-navy-100 shadow-navy-sm p-12">
        <Empty
          icon={<FileText size={40} />}
          title="Chưa chọn buổi"
          desc="Chọn một buổi ở danh sách bên trái để xem nội dung và tài liệu."
        />
      </div>
    )
  }

  const { session, month } = selected
  const [titleLine, ...restLines] = (session.content || '').split('\n')
  const rest = restLines.join('\n').trim()
  const sessionArmed = sessionDel.armedId === session.id

  return (
    <div className="flex-1 w-full min-w-0 bg-white rounded-2xl border border-navy-100 shadow-navy-sm p-4 sm:p-5">
      {/* Header buổi */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-navy-800 text-white shrink-0">Buổi {session.sessionNo}</span>
        {session.skill && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 shrink-0">{session.skill}</span>
        )}
        <span className="text-xs text-navy-500">
          Tháng {month.monthNo}{session.weekNo ? ` · Tuần ${session.weekNo}` : ''}
        </span>
        {isAdmin && (
          <div className="flex items-center gap-1 shrink-0 ml-auto">
            <button onClick={() => onEditSession(session)} className="p-1.5 rounded-lg text-navy-400 hover:text-navy-700 hover:bg-navy-50 transition-colors" title="Sửa buổi">
              <Pencil size={14} />
            </button>
            <button
              onClick={() => sessionDel.fire(session.id, () => onDeleteSession(session))}
              className={clsx(
                'p-1.5 rounded-lg transition-colors',
                sessionArmed ? 'text-white bg-red-600 hover:bg-red-700' : 'text-navy-400 hover:text-red-600 hover:bg-red-50'
              )}
              title={sessionArmed ? 'Xác nhận xóa? Bấm lại để xóa buổi (kèm tài liệu)' : 'Xóa buổi'}
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Nội dung + ghi chú */}
      <h3 className="text-lg font-bold text-navy-900 mt-3">{titleLine.trim() || '(chưa có nội dung)'}</h3>
      {rest && <p className="text-sm text-navy-700 mt-1 whitespace-pre-wrap">{rest}</p>}
      {session.note && <p className="text-xs text-navy-500 italic mt-1.5">Ghi chú: {session.note}</p>}

      {/* Mục tài liệu */}
      <div className="flex items-center gap-3 mt-5 mb-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-navy-500 shrink-0">
          Tài liệu · {session.materials.length}
        </span>
        <div className="flex-1 h-px bg-navy-100" />
        {isAdmin && (
          <Button variant="secondary" size="sm" onClick={() => onAddMaterial(session)} className="flex items-center gap-1 shrink-0">
            <Plus size={13} /> Thêm tài liệu
          </Button>
        )}
      </div>

      {session.materials.length === 0 ? (
        <p className="text-sm text-navy-400 text-center py-6">Chưa có tài liệu cho buổi này.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {session.materials.map(m => {
            const t = getMaterialType(m.type)
            const armed = materialDel.armedId === m.id
            const inner = (
              <>
                <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-md shrink-0', t.badge)}>{t.label}</span>
                <span className="text-sm font-medium text-navy-900 min-w-0 truncate">{m.title}</span>
                {m.url && <ExternalLink size={13} className="shrink-0 text-navy-400" />}
              </>
            )
            return (
              <li
                key={m.id}
                className={clsx(
                  'flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-colors',
                  m.url ? 'border-navy-100 hover:border-navy-300 hover:bg-navy-50/50' : 'border-navy-100'
                )}
              >
                {m.url ? (
                  <a href={m.url} target="_blank" rel="noopener noreferrer" className="flex flex-1 items-center gap-2 min-w-0">
                    {inner}
                  </a>
                ) : (
                  <div className="flex flex-1 items-center gap-2 min-w-0">{inner}</div>
                )}
                {isAdmin && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button onClick={() => onEditMaterial(m)} className="p-1 rounded-lg text-navy-400 hover:text-navy-700 hover:bg-navy-50 transition-colors" title="Sửa">
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => materialDel.fire(m.id, () => onDeleteMaterial(m))}
                      className={clsx(
                        'p-1 rounded-lg transition-colors',
                        armed ? 'text-white bg-red-600 hover:bg-red-700' : 'text-navy-400 hover:text-red-600 hover:bg-red-50'
                      )}
                      title={armed ? 'Xác nhận xóa?' : 'Xóa'}
                    >
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
}
```

- [ ] **Step 2: Build để bắt lỗi syntax/import**

Run: `npm run build`
Expected: build thành công.

- [ ] **Step 3: Commit**

```bash
git add src/components/schedule/SessionDetailPanel.jsx
git commit -m "feat(curriculum): panel chi tiết buổi với tài liệu bấm trực tiếp"
```

---

### Task 4: Rewire `MaterialsTab` sang layout master-detail

**Files:**
- Modify: `src/components/schedule/MaterialsTab.jsx` (thay toàn bộ file — bỏ `MonthBlock`/`SessionCard` cũ, giữ nguyên toolbar + handlers + modals)

- [ ] **Step 1: Viết lại file**

Giữ nguyên: state `courseType/tree/loading`, `load()`, toàn bộ handler CRUD, 4 modal. Thêm: `selectedSessionId` + derive `selected` (session + month) + effect tự chọn buổi đầu khi selection không còn tồn tại (đổi khóa học, xóa buổi/tháng, load lần đầu). Bỏ: state `collapsed`, component `MonthBlock`, `SessionCard`, các import không dùng.

Nội dung file mới đầy đủ:

```jsx
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Plus, FileText, Upload } from 'lucide-react'
import { Button, Empty, Skeleton, toast } from '@/components/ui'
import { curriculumService } from '@/services/curriculumService'
import { COURSE_TYPES } from '@/utils/courseTypes'
import { CurriculumSidebar } from './CurriculumSidebar'
import { SessionDetailPanel } from './SessionDetailPanel'
import { MaterialModal } from './MaterialModal'
import { MonthModal } from './MonthModal'
import { SessionModal } from './SessionModal'
import { ImportCurriculumModal } from './ImportCurriculumModal'

/**
 * MaterialsTab — giáo trình & tài liệu theo courseType, layout master-detail:
 * sidebar trái (tháng → tuần → buổi) + panel phải (chi tiết buổi + tài liệu).
 * Admin: CRUD tháng/buổi/tài liệu. Giáo viên: chỉ xem.
 * @param {boolean} isAdmin
 */
export const MaterialsTab = ({ isAdmin = false }) => {
  const [courseType, setCourseType] = useState(COURSE_TYPES[0])
  const [tree, setTree] = useState([])          // [{ ...month, sessions:[{...session, materials:[]}] }]
  const [loading, setLoading] = useState(false)
  const [selectedSessionId, setSelectedSessionId] = useState(null)

  // Modal state
  const [monthModal, setMonthModal] = useState({ open: false, editing: null })
  const [sessionModal, setSessionModal] = useState({ open: false, editing: null, monthId: null })
  const [materialModal, setMaterialModal] = useState({ open: false, editing: null, sessionId: null })
  const [importOpen, setImportOpen] = useState(false)

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

  // Buổi đang chọn (kèm tháng chứa nó) — null nếu id không còn trong tree
  const selected = useMemo(() => {
    for (const month of tree)
      for (const session of month.sessions)
        if (session.id === selectedSessionId) return { session, month }
    return null
  }, [tree, selectedSessionId])

  // Tự chọn buổi đầu tiên khi selection không còn hợp lệ
  // (load lần đầu, đổi loại khóa, xóa buổi/tháng đang chọn)
  useEffect(() => {
    if (loading || selected) return
    const firstMonth = tree.find(m => m.sessions.length > 0)
    setSelectedSessionId(firstMonth?.sessions[0]?.id ?? null)
  }, [loading, selected, tree])

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
          <>
            <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)} className="flex items-center gap-1.5 shrink-0">
              <Upload size={14} /> Import Excel
            </Button>
            <Button variant="primary" size="sm" onClick={() => setMonthModal({ open: true, editing: null })} className="flex items-center gap-1.5 shrink-0">
              <Plus size={14} /> Thêm tháng
            </Button>
          </>
        )}
      </div>

      {/* Nội dung giáo trình */}
      {loading ? (
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="w-full lg:w-72 shrink-0 bg-white rounded-2xl border border-navy-100 shadow-navy-sm p-3 flex flex-col gap-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 rounded-lg" />)}
          </div>
          <div className="flex-1 bg-white rounded-2xl border border-navy-100 shadow-navy-sm p-4">
            <Skeleton className="h-40 rounded-xl" />
          </div>
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
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-start">
          <CurriculumSidebar
            key={courseType}
            tree={tree}
            selectedSessionId={selectedSessionId}
            isAdmin={isAdmin}
            onSelectSession={setSelectedSessionId}
            onAddSession={(monthId) => setSessionModal({ open: true, editing: null, monthId })}
            onEditMonth={(month) => setMonthModal({ open: true, editing: month })}
            onDeleteMonth={deleteMonth}
          />
          <SessionDetailPanel
            selected={selected}
            isAdmin={isAdmin}
            onEditSession={(s) => setSessionModal({ open: true, editing: s, monthId: selected?.month.id })}
            onDeleteSession={(s) => deleteSession(s.id)}
            onAddMaterial={(s) => setMaterialModal({ open: true, editing: null, sessionId: s.id })}
            onEditMaterial={(m) => setMaterialModal({ open: true, editing: m, sessionId: m.sessionId })}
            onDeleteMaterial={(m) => deleteMaterial(m.id)}
          />
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
      <ImportCurriculumModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        defaultCourseType={courseType}
        onImportDone={load}
      />
    </div>
  )
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build thành công, không còn cảnh báo import thừa (`clsx`, `Pencil`, `Trash2`, `ChevronDown`, `ChevronRight`, `ExternalLink`, `getMaterialType`, `useMemo`... đã bỏ hoặc còn dùng đúng chỗ — `useMemo` vẫn dùng cho `selected`).

- [ ] **Step 3: Commit**

```bash
git add src/components/schedule/MaterialsTab.jsx
git commit -m "feat(curriculum): tab Tài Liệu chuyển sang layout master-detail"
```

---

### Task 5: Kiểm thử thủ công qua dev server

**Files:** không sửa file (chỉ verify; nếu phát hiện lỗi → sửa + commit fix).

- [ ] **Step 1: Chạy dev server**

Run: `npm run dev`
Mở http://localhost:5173 → đăng nhập → trang "Giảng Dạy" → tab "Tài Liệu".

- [ ] **Step 2: Checklist chức năng (theo spec)**

Với tài khoản **admin**:
1. Sidebar hiện các tháng, tháng đầu mở sẵn, buổi đầu được chọn, panel phải hiện đúng buổi đó.
2. Click buổi khác → panel đổi nội dung; click header tháng → đóng/mở.
3. Đổi loại khóa (IELTS → TOEIC) → sidebar reset, tự chọn buổi đầu của giáo trình mới; loại khóa chưa có giáo trình → Empty "Chưa có giáo trình".
4. Tài liệu **có link**: click bất kỳ đâu trên hàng (trừ nút sửa/xóa) → mở tab mới đúng URL, có icon ↗, hover đổi màu viền.
5. Tài liệu **không link** (Đọc dịch chỉ mã code): hàng không bấm được, không icon ↗.
6. CRUD: thêm/sửa/xóa tháng (nút trên header tháng, xóa 2 bước — bấm 1 lần nút đỏ lên, đợi 3s tự hết), thêm buổi từ header tháng, sửa/xóa buổi từ panel, thêm/sửa/xóa tài liệu từ panel. Sau mỗi thao tác toast hiện + data refresh.
7. **Xóa buổi đang chọn** → panel tự chuyển sang buổi đầu tiên còn lại, không trắng trang. **Xóa tháng chứa buổi đang chọn** → tương tự.
8. Import Excel vẫn hoạt động, import xong tree refresh.

Với tài khoản **giáo viên thường** (`isAdmin=false`):
9. Không thấy bất kỳ nút Thêm/Sửa/Xóa/Import nào (toolbar chỉ còn chọn loại khóa); vẫn chọn buổi + bấm link được.

Responsive:
10. Thu hẹp cửa sổ < 1024px (breakpoint `lg`): sidebar full-width nằm trên, panel bên dưới, vẫn thao tác được.

- [ ] **Step 3: Sửa lỗi nếu có, commit fix**

```bash
git add -A src/
git commit -m "fix(curriculum): <mô tả lỗi đã sửa>"
```

---

### Task 6: Cập nhật CLAUDE.md

**Files:**
- Modify: `CLAUDE.md` — mục "Trang \"Giảng Dạy\" (SchedulePage) — 3 tab" (bullet Tab "Tài Liệu") và mục "Model giáo trình dùng chung" (bullet UI).

- [ ] **Step 1: Cập nhật 2 chỗ mô tả UI tab Tài Liệu**

Thay mô tả "Hiển thị dạng accordion..." bằng mô tả layout mới. Nội dung thay thế cho bullet trong mục "Trang Giảng Dạy" (giữ phần đầu về courseType/COURSE_TYPES, thay phần mô tả hiển thị):

> Hiển thị **master-detail**: sidebar trái (`CurriculumSidebar.jsx`) là cây Tháng (header navy đóng/mở, mặc định mở tháng đầu) → nhãn Tuần → dòng Buổi gọn (không hiện tài liệu, buổi đang chọn highlight); panel phải (`SessionDetailPanel.jsx`) hiện chi tiết buổi đang chọn + tài liệu dạng hàng lớn — **có `url` thì cả hàng là link mở tab mới**, không có `url` hiện tiêu đề thường. Dưới breakpoint `lg` hai khối xếp dọc. State `selectedSessionId` ở `MaterialsTab` (container), tự chọn buổi đầu khi đổi khóa/xóa buổi đang chọn. Cơ chế xóa 2 bước gom vào hook `useArmedDelete` (`src/components/schedule/useArmedDelete.js`).

Cập nhật tương tự cho câu "UI: tab "Tài Liệu" trong SchedulePage → `MaterialsTab.jsx` (accordion: ...)" trong mục "Model giáo trình dùng chung" (đổi "(accordion: dropdown chọn courseType → block Tháng...)" thành "(master-detail: sidebar `CurriculumSidebar` + panel `SessionDetailPanel`, dropdown chọn courseType ở toolbar)"). Giữ nguyên phần modal + xóa 2 bước (bổ sung "qua hook `useArmedDelete`").

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(curriculum): cập nhật CLAUDE.md mô tả layout master-detail tab Tài Liệu"
```
