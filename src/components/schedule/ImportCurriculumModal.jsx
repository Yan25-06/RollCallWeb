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
