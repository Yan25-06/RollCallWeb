import { useState, useEffect, useRef } from 'react'
import { X, Loader2, CheckCircle } from 'lucide-react'
import { Button, toast } from '@/components/ui'
import { ReportCardContent } from '@/components/reviews/ReportCardModal'
import { reviewService } from '@/services/reviewService'
import { attendanceService } from '@/services/attendanceService'
import { homeworkService } from '@/services/homeworkService'
import { generalCommentService } from '@/services/generalCommentService'

const loadStudentData = async (student, cls, dateRange) => {
  const classId = cls?.id
  const [reviews, attRate, hwRecs, comment] = await Promise.all([
    reviewService.getByStudent(student.id, classId),
    attendanceService.getRateByRange(student.id, classId, dateRange.fromDate, dateRange.toDate),
    homeworkService.getByRange(student.id, classId, dateRange.fromDate, dateRange.toDate),
    generalCommentService.get(student.id, classId),
  ])

  const reviewsInRange = reviews.filter(r => r.date >= dateRange.fromDate && r.date <= dateRange.toDate)
  const latestReview = reviewsInRange[0] ?? null

  const attendanceDetail = attRate
    ? { pct: attRate.pct, present: attRate.present, total: attRate.total, absentDates: attRate.absentDates ?? [] }
    : null

  let homeworkDetail = null
  if (hwRecs.length) {
    let done = 0, inProg = 0
    const missing = []
    hwRecs.forEach(r => {
      if (r.progress === 'done' || r.progress === 100) done++
      else {
        if (r.progress === 'in_progress' || r.progress === 50) inProg++
        missing.push({ date: r.date, sessionTopic: r.sessionTopic })
      }
    })
    missing.sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    homeworkDetail = {
      pct: Math.round((done * 100 + inProg * 50) / hwRecs.length),
      done,
      total: hwRecs.length,
      missing,
    }
  }

  return { student, latestReview, attendanceDetail, homeworkDetail, generalComment: comment }
}

/**
 * BulkExportModal — exports PNG report cards for all students with a review
 * in the current date range, bundled as a zip file.
 *
 * @param {boolean}  open
 * @param {Function} onClose
 * @param {Array}    students   - enrolled active students in the class
 * @param {Object}   cls        - class object
 * @param {Object}   settings   - { centerName, teacherName }
 * @param {Object}   dateRange  - { fromDate, toDate }
 */
export const BulkExportModal = ({ open, onClose, students = [], cls, settings = {}, dateRange }) => {
  const [phase, setPhase] = useState('idle') // idle | loading | rendering | done | error
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [studentsData, setStudentsData] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const zipRef  = useRef(null)
  const cardRef = useRef(null)

  // Reset state each time modal opens
  useEffect(() => {
    if (open) {
      setPhase('idle')
      setProgress({ current: 0, total: 0 })
      setStudentsData([])
      setCurrentIndex(0)
      zipRef.current = null
    }
  }, [open])

  const startExport = async () => {
    if (!students.length) return
    setPhase('loading')
    try {
      const allData = await Promise.all(students.map(s => loadStudentData(s, cls, dateRange)))
      const filtered = allData.filter(d => d.latestReview != null)

      if (filtered.length === 0) {
        toast.info('Không có học sinh nào có đánh giá trong kỳ này.')
        setPhase('idle')
        return
      }

      const { default: JSZip } = await import('jszip')
      zipRef.current = new JSZip()
      setStudentsData(filtered)
      setProgress({ current: 0, total: filtered.length })
      setCurrentIndex(0)
      setPhase('rendering')
    } catch (err) {
      console.error('Bulk export load error:', err)
      toast.error('Tải dữ liệu thất bại: ' + err.message)
      setPhase('error')
    }
  }

  // Sequential render: capture current student's card, add to zip, then advance
  useEffect(() => {
    if (phase !== 'rendering') return

    if (currentIndex >= studentsData.length) {
      // All cards captured — generate and download zip
      zipRef.current.generateAsync({ type: 'blob' }).then(blob => {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        const date = new Date().toISOString().split('T')[0]
        link.href = url
        link.download = `phieu-${(cls?.name || 'lop').replace(/\s+/g, '-')}-${date}.zip`
        link.click()
        URL.revokeObjectURL(url)
        setPhase('done')
      }).catch(err => {
        toast.error('Tạo file zip thất bại: ' + err.message)
        setPhase('error')
      })
      return
    }

    // Give React time to paint the card before capturing
    const timer = setTimeout(async () => {
      if (!cardRef.current) return
      try {
        const { default: html2canvas } = await import('html2canvas')
        const canvas = await html2canvas(cardRef.current, { scale: 2, useCORS: true, logging: false })
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
        const name = studentsData[currentIndex].student.name.replace(/\s+/g, '-')
        zipRef.current.file(`phieu-${name}.png`, blob)
        setProgress(p => ({ ...p, current: p.current + 1 }))
        setCurrentIndex(i => i + 1)
      } catch (err) {
        toast.error('Lỗi tạo ảnh: ' + err.message)
        setPhase('error')
      }
    }, 150)
    return () => clearTimeout(timer)
  }, [phase, currentIndex, studentsData, cls])

  if (!open) return null

  const currentData = phase === 'rendering' && currentIndex < studentsData.length
    ? studentsData[currentIndex]
    : null

  return (
    <>
      {/* Off-screen render area for html2canvas — must be visible (not display:none) */}
      {currentData && (
        <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '520px' }}>
          <div ref={cardRef}>
            <ReportCardContent
              student={currentData.student}
              cls={cls}
              latestReview={currentData.latestReview}
              settings={settings}
              dateRange={dateRange}
              attendanceDetail={currentData.attendanceDetail}
              homeworkDetail={currentData.homeworkDetail}
              generalComment={currentData.generalComment}
            />
          </div>
        </div>
      )}

      {/* Progress modal */}
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-navy-100">
            <p className="font-semibold text-navy-900">Xuất phiếu hàng loạt</p>
            {phase !== 'rendering' && (
              <button onClick={onClose} className="p-1.5 rounded-lg text-navy-400 hover:bg-navy-50 transition-colors">
                <X size={18} />
              </button>
            )}
          </div>

          <div className="p-6 flex flex-col gap-4">

            {phase === 'idle' && (
              <>
                <p className="text-sm text-navy-600">
                  Xuất phiếu PNG cho tất cả học sinh có đánh giá trong kỳ lọc, đóng gói thành 1 file zip.
                </p>
                <p className="text-xs text-navy-400">{students.length} học sinh trong lớp · lớp <span className="font-medium">{cls?.name}</span></p>
                <div className="flex gap-2 justify-end">
                  <Button variant="secondary" size="sm" onClick={onClose}>Hủy</Button>
                  <Button variant="primary" size="sm" onClick={startExport}>Bắt đầu xuất</Button>
                </div>
              </>
            )}

            {phase === 'loading' && (
              <div className="flex flex-col items-center gap-3 py-4">
                <Loader2 size={32} className="animate-spin text-navy-400" />
                <p className="text-sm text-navy-600">Đang tải dữ liệu học sinh...</p>
              </div>
            )}

            {phase === 'rendering' && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-navy-700 font-medium text-center">
                  Đang tạo phiếu... {progress.current} / {progress.total}
                </p>
                <div className="h-2 bg-navy-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-navy-600 rounded-full transition-all duration-300"
                    style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-xs text-navy-400 text-center">Vui lòng không đóng cửa sổ này</p>
              </div>
            )}

            {phase === 'done' && (
              <div className="flex flex-col items-center gap-3 py-4">
                <CheckCircle size={36} className="text-emerald-500" />
                <p className="text-sm text-navy-700 font-medium">Đã xuất {progress.total} phiếu thành công!</p>
                <Button variant="primary" size="sm" onClick={onClose}>Đóng</Button>
              </div>
            )}

            {phase === 'error' && (
              <div className="flex flex-col items-center gap-3 py-4">
                <p className="text-sm text-red-600">Có lỗi xảy ra. Vui lòng thử lại.</p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={onClose}>Đóng</Button>
                  <Button variant="primary" size="sm" onClick={startExport}>Thử lại</Button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  )
}
