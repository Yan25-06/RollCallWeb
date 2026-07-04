import { useState, useEffect, useCallback, useMemo } from 'react'
import { Plus, ExternalLink, Pencil, Trash2, FileText, ChevronDown, ChevronRight, Upload } from 'lucide-react'
import { clsx } from 'clsx'
import { Button, Empty, Skeleton, toast } from '@/components/ui'
import { curriculumService } from '@/services/curriculumService'
import { COURSE_TYPES } from '@/utils/courseTypes'
import { getMaterialType } from './materialType'
import { MaterialModal } from './MaterialModal'
import { MonthModal } from './MonthModal'
import { SessionModal } from './SessionModal'
import { ImportCurriculumModal } from './ImportCurriculumModal'

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
      <ImportCurriculumModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        defaultCourseType={courseType}
        onImportDone={load}
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

  // Xóa tháng: click lần 1 "vũ trang" xác nhận, click lần 2 mới thực sự xóa
  // (cascade xóa toàn bộ buổi + tài liệu trong tháng, cần chắc chắn trước khi xóa)
  const [confirmDelete, setConfirmDelete] = useState(false)
  useEffect(() => {
    if (!confirmDelete) return
    const t = setTimeout(() => setConfirmDelete(false), 3000)
    return () => clearTimeout(t)
  }, [confirmDelete])
  const handleDeleteClick = () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setConfirmDelete(false)
    onDeleteMonth()
  }

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
            <button
              onClick={handleDeleteClick}
              className={clsx(
                'p-1.5 rounded-lg transition-colors',
                confirmDelete ? 'text-white bg-red-600 hover:bg-red-700' : 'text-navy-400 hover:text-red-600 hover:bg-red-50'
              )}
              title={confirmDelete ? 'Xác nhận xóa? Bấm lại để xóa cả tháng (kèm buổi + tài liệu)' : 'Xóa tháng'}
            >
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
const SessionCard = ({ session, isAdmin, onEdit, onDelete, onAddMaterial, onEditMaterial, onDeleteMaterial }) => {
  // Xóa buổi: click lần 1 "vũ trang" xác nhận, click lần 2 mới thực sự xóa (cascade tài liệu trong buổi)
  const [confirmDelete, setConfirmDelete] = useState(false)
  useEffect(() => {
    if (!confirmDelete) return
    const t = setTimeout(() => setConfirmDelete(false), 3000)
    return () => clearTimeout(t)
  }, [confirmDelete])
  const handleDeleteClick = () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setConfirmDelete(false)
    onDelete()
  }

  // Xóa tài liệu: cùng cơ chế 2 bước, theo dõi id tài liệu đang "vũ trang"
  const [confirmDeleteMaterialId, setConfirmDeleteMaterialId] = useState(null)
  useEffect(() => {
    if (!confirmDeleteMaterialId) return
    const t = setTimeout(() => setConfirmDeleteMaterialId(null), 3000)
    return () => clearTimeout(t)
  }, [confirmDeleteMaterialId])
  const handleDeleteMaterialClick = (m) => {
    if (confirmDeleteMaterialId !== m.id) { setConfirmDeleteMaterialId(m.id); return }
    setConfirmDeleteMaterialId(null)
    onDeleteMaterial(m)
  }

  return (
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
            <button
              onClick={handleDeleteClick}
              className={clsx(
                'p-1 rounded-lg transition-colors',
                confirmDelete ? 'text-white bg-red-600 hover:bg-red-700' : 'text-navy-400 hover:text-red-600 hover:bg-red-50'
              )}
              title={confirmDelete ? 'Xác nhận xóa? Bấm lại để xóa buổi (kèm tài liệu)' : 'Xóa buổi'}
            >
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
            const armed = confirmDeleteMaterialId === m.id
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
                    <button
                      onClick={() => handleDeleteMaterialClick(m)}
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
