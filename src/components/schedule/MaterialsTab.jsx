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
