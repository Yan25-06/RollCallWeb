import { useRef, useState } from 'react'
import { X, Download, FileImage, Loader2 } from 'lucide-react'
import { Button, toast } from '@/components/ui'
import { buildTagSummary, POSITIVE_TAGS } from './QuickTagEditor'
import { DEFAULT_SKILL_CONFIG } from '@/services/classService'

const fmtDate = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
}

// '2026-06-05' -> '5/6'
const fmtDayShort = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getDate()}/${d.getMonth() + 1}`
}

/**
 * Reusable card body — rendered inside ReportCardModal (for preview/single export)
 * and inside BulkExportModal (for bulk PNG export).
 */
export const ReportCardContent = ({ student, cls, latestReview, settings = {}, dateRange, attendancePct, homeworkPct, attendanceDetail, homeworkDetail, generalComment }) => {
  // Ưu tiên detail; fallback về pct cũ nếu caller chưa truyền detail.
  const attPct = attendanceDetail?.pct ?? attendancePct
  const attPresent = attendanceDetail?.present
  const attTotal = attendanceDetail?.total
  const attAbsentDates = attendanceDetail?.absentDates ?? []
  const hwPct = homeworkDetail?.pct ?? homeworkPct
  const hwDone = homeworkDetail?.done
  const hwTotal = homeworkDetail?.total
  const hwMissing = homeworkDetail?.missing ?? []

  const hasReview = !!latestReview
  const tagSummary = hasReview ? buildTagSummary(latestReview?.tags ?? []) : ''

  return (
    <div className="bg-white border-2 border-navy-200 overflow-hidden font-sans">
      {/* Header */}
      <div className="bg-gradient-to-br from-navy-900 to-navy-700 text-white px-6 py-5">
        <p className="text-xl font-bold tracking-wide">{settings.centerName || 'Trung Tâm Anh Ngữ'}</p>
        <p className="text-sm opacity-70 mt-0.5">PHIẾU NHẬN XÉT HỌC VIÊN</p>
      </div>

      {/* Student info */}
      <div className="px-6 py-4 bg-navy-50 border-b border-navy-100">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <div><span className="font-semibold text-navy-600">Họ và tên:</span> <span className="text-navy-900">{student?.name ?? '—'}</span></div>
          <div><span className="font-semibold text-navy-600">Lớp:</span> <span className="text-navy-900">{cls?.name ?? '—'}</span></div>
          {dateRange?.fromDate && dateRange?.toDate && (
            <div className="col-span-2">
              <span className="font-semibold text-navy-600">Khoảng thời gian:</span>{' '}
              <span className="text-navy-900">{fmtDate(dateRange.fromDate)} – {fmtDate(dateRange.toDate)}</span>
            </div>
          )}
          <div><span className="font-semibold text-navy-600">Ngày đánh giá:</span> <span className="text-navy-900">{fmtDate(latestReview?.date)}</span></div>
          <div><span className="font-semibold text-navy-600">Giáo viên:</span> <span className="text-navy-900">{latestReview?.teacherName || settings.teacherName || '—'}</span></div>
        </div>
      </div>

      {hasReview ? (
        <div className="px-6 py-4 flex flex-col gap-4">
          {/* Attendance + homework stats */}
          {(attPct != null || hwPct != null) && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-navy-50 rounded-xl px-4 py-3">
                <p className="text-xs text-navy-500 mb-1 text-center">Chuyên cần</p>
                <p className="text-2xl font-bold text-navy-800 text-center">{attPct != null ? `${attPct}%` : '—'}</p>
                {attTotal != null && (
                  <p className="text-xs text-navy-500 text-center mt-0.5">{attPresent}/{attTotal} buổi</p>
                )}
                {attAbsentDates.length > 0 && (
                  <p className="text-xs text-red-600 mt-1.5 leading-snug">
                    Vắng: {attAbsentDates.map(fmtDayShort).join(', ')}
                  </p>
                )}
              </div>
              <div className="bg-navy-50 rounded-xl px-4 py-3">
                <p className="text-xs text-navy-500 mb-1 text-center">Bài tập</p>
                <p className="text-2xl font-bold text-navy-800 text-center">{hwPct != null ? `${hwPct}%` : '—'}</p>
                {hwTotal != null && (
                  <p className="text-xs text-navy-500 text-center mt-0.5">{hwDone}/{hwTotal} buổi</p>
                )}
                {hwMissing.length > 0 && (
                  <p className="text-xs text-amber-600 mt-1.5 leading-snug">
                    Chưa hoàn thành: {hwMissing.map(m => m.sessionTopic ? `${fmtDayShort(m.date)} (${m.sessionTopic})` : fmtDayShort(m.date)).join(', ')}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Skill scores table — maxScore from scoreMax snapshot, fallback 9 */}
          {(() => {
            const skillConfig = cls?.skillConfig ?? DEFAULT_SKILL_CONFIG
            const scores = latestReview?.scores ?? {}
            const hasScores = skillConfig.some(sk => scores[sk.name] != null)
            if (!hasScores) return null
            return (
              <div>
                <p className="text-xs font-bold text-navy-600 uppercase tracking-wide mb-2">Điểm Kỹ Năng</p>
                <div className="grid grid-cols-2 gap-2">
                  {skillConfig.map(skill => {
                    const score = scores[skill.name]
                    if (score == null) return null
                    const maxScore = latestReview?.scoreMax?.[skill.name] ?? 9
                    const pct = Math.round((score / maxScore) * 100)
                    const barColor = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-navy-600' : 'bg-amber-500'
                    return (
                      <div key={skill.name} className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-baseline">
                          <span className="text-sm font-medium text-navy-700">{skill.name}</span>
                          <span className="text-base font-bold text-navy-900">{score}<span className="text-xs font-normal text-navy-400">/{maxScore}</span></span>
                        </div>
                        <div className="h-2.5 bg-navy-100 rounded-full overflow-hidden">
                          <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}

          {/* Tags */}
          {latestReview.tags?.length > 0 && (
            <div>
              <p className="text-xs font-bold text-navy-600 uppercase tracking-wide mb-2">Nhận Xét</p>
              <div className="flex flex-wrap gap-1.5">
                {latestReview.tags.map(t => (
                  <span key={t} className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                    POSITIVE_TAGS.includes(t)
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>{t}</span>
                ))}
              </div>
              {tagSummary && <p className="text-xs text-navy-600 mt-1.5 italic">{tagSummary}</p>}
            </div>
          )}

          {/* Remark */}
          {latestReview.remark && (
            <div>
              <p className="text-xs font-bold text-navy-600 uppercase tracking-wide mb-1">Ghi Chú</p>
              <p className="text-sm text-navy-700 whitespace-pre-wrap">{latestReview.remark}</p>
            </div>
          )}

          {/* Advice */}
          {latestReview.advice && (
            <div className="bg-navy-50 border border-navy-200 rounded-xl px-4 py-3">
              <p className="text-xs font-bold text-navy-600 uppercase tracking-wide mb-1">💡 Lời Khuyên</p>
              <p className="text-sm text-navy-700 whitespace-pre-wrap">{latestReview.advice}</p>
            </div>
          )}

          {/* General comment */}
          {generalComment?.text && (
            <div className="border border-blue-200 rounded-xl px-4 py-3 bg-blue-50">
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">Nhận Xét Tổng Kết</p>
              <p className="text-sm text-navy-700 whitespace-pre-wrap">{generalComment.text}</p>
            </div>
          )}

          {/* Footer: ngày lập */}
          <div className="border-t border-navy-100 pt-3">
            <p className="text-xs text-navy-400">Ngày lập: {new Date().toLocaleDateString('vi-VN')}</p>
          </div>
        </div>
      ) : (
        <div className="px-6 py-8 text-center text-navy-400">
          <p>Chưa có dữ liệu đánh giá để xuất phiếu.</p>
        </div>
      )}
    </div>
  )
}

export const ReportCardModal = ({ open, onClose, student, cls, latestReview, settings = {}, dateRange, attendanceDetail, homeworkDetail, generalComment }) => {
  const cardRef  = useRef(null)
  const [loading, setLoading] = useState(null) // 'png' | 'pdf' | null

  if (!open) return null

  const hasReview = !!latestReview

  const exportAs = async (type) => {
    if (!cardRef.current || !hasReview) return
    setLoading(type)
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(cardRef.current, { scale: 2, useCORS: true, logging: false })

      const studentName = student?.name ?? 'hoc-vien'
      const dateStr = new Date().toISOString().split('T')[0]
      const filename = `phieu-nhan-xet-${studentName.replace(/\s+/g, '-')}-${dateStr}`

      if (type === 'png') {
        const link = document.createElement('a')
        link.download = `${filename}.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
      } else {
        const { jsPDF } = await import('jspdf')
        const imgData = canvas.toDataURL('image/png')
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
        const pageW = pdf.internal.pageSize.getWidth()
        const imgH  = (canvas.height * pageW) / canvas.width
        pdf.addImage(imgData, 'PNG', 0, 0, pageW, imgH)
        pdf.save(`${filename}.pdf`)
      }
    } catch (e) {
      console.error('Report card export failed:', e)
      toast.error('Xuất phiếu nhận xét thất bại. Vui lòng thử lại.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-navy-100">
          <p className="font-semibold text-navy-900">Phiếu Kết Quả Học Viên</p>
          <button onClick={onClose} className="p-1.5 rounded-lg text-navy-400 hover:bg-navy-50 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Report card preview */}
        <div className="p-5 overflow-y-auto max-h-[70vh]">
          <div ref={cardRef}>
            <ReportCardContent
              student={student}
              cls={cls}
              latestReview={latestReview}
              settings={settings}
              dateRange={dateRange}
              attendanceDetail={attendanceDetail}
              homeworkDetail={homeworkDetail}
              generalComment={generalComment}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-navy-100">
          <Button variant="secondary" size="sm" onClick={onClose}>Đóng</Button>
          <Button
            variant="secondary" size="sm"
            disabled={!hasReview || loading === 'png'}
            onClick={() => exportAs('png')}
            className="flex items-center gap-1.5"
            title={!hasReview ? 'Cần tạo đánh giá trước khi xuất phiếu' : undefined}
          >
            {loading === 'png' ? <Loader2 size={14} className="animate-spin" /> : <FileImage size={14} />}
            Tải Ảnh
          </Button>
          <Button
            variant="primary" size="sm"
            disabled={!hasReview || loading === 'pdf'}
            onClick={() => exportAs('pdf')}
            className="flex items-center gap-1.5"
            title={!hasReview ? 'Cần tạo đánh giá trước khi xuất phiếu' : undefined}
          >
            {loading === 'pdf' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Tải PDF
          </Button>
        </div>
      </div>
    </div>
  )
}
