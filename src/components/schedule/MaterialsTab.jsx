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
  const requestIdRef = useRef(0)                   // stamp mỗi lần gọi load() để bỏ qua phản hồi cũ (đổi courseType nhanh)

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
    // Stamp request này — nếu courseType đổi trước khi await xong, requestIdRef.current
    // đã bị lần gọi load() mới ghi đè, nên so sánh lại requestId cho biết response còn "mới" hay không.
    const requestId = ++requestIdRef.current
    if (!sheetUrl) { setTree([]); setError(null); setLoading(false); return }
    if (!force && cacheRef.current.has(courseType)) {
      setTree(cacheRef.current.get(courseType))
      setError(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { tree: t, warnings } = await googleSheetCurriculumService.fetchCurriculum(sheetUrl)
      if (requestId !== requestIdRef.current) return // đã có lần gọi load() mới hơn — bỏ qua kết quả cũ
      cacheRef.current.set(courseType, t)
      setTree(t)
      if (warnings.length > 0) toast.info(`${warnings.length} dòng trong Sheet bị bỏ qua (sai định dạng)`)
    } catch (e) {
      if (requestId !== requestIdRef.current) return
      setTree([])
      setError(e.message || 'Không thể tải giáo trình')
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
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
