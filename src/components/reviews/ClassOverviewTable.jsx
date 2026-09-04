import { useState, useEffect, useMemo } from 'react'
import { FileSpreadsheet, Users } from 'lucide-react'
import { clsx } from 'clsx'
import { Skeleton, toast } from '@/components/ui'
import { reviewService } from '@/services/reviewService'
import { enrollmentService } from '@/services/enrollmentService'
import { studentService } from '@/services/studentService'
import { attendanceService } from '@/services/attendanceService'
import { homeworkService } from '@/services/homeworkService'

// Default present: only absent records exist; use sessionCount as denominator
const calcAttendancePct = (studentId, { sessionCount, records }) => {
  if (sessionCount === 0) return null
  const absent = records.filter(r => r.studentId === studentId && r.present === false).length
  return Math.round(((sessionCount - absent) / sessionCount) * 1000) / 10
}

const calcHomeworkPct = (studentId, hwRecords) => {
  const recs = hwRecords.filter(r => r.studentId === studentId)
  if (recs.length === 0) return null
  let done = 0, inProg = 0
  recs.forEach(r => {
    if (r.progress === 'done') done++
    else if (r.progress === 'in_progress') inProg++
  })
  return Math.round((done * 100 + inProg * 50) / recs.length)
}

// Extract latest + previous mock scores for a student from the prebuilt map (task 1.1)
const getMockInfo = (studentId, mocksByStudent) => {
  const entries = mocksByStudent?.get(studentId) ?? []
  if (entries.length === 0) return { latestScore: null, latestMax: null, delta: null }
  const latest = entries[0]
  const prev   = entries[1] ?? null
  const latestScore = latest.result.totalScore
  const latestMax   = (latest.mockTest.sections ?? []).reduce((s, sec) => s + (sec.maxScore || 0), 0)
  const delta = prev != null ? latestScore - prev.result.totalScore : null
  return { latestScore, latestMax, delta }
}

const MockScoreCell = ({ score, max }) => {
  if (score == null) return <span className="text-xs text-navy-300">—</span>
  return <span className="text-xs font-semibold text-navy-700">{score}/{max}</span>
}

const MockDeltaCell = ({ delta }) => {
  if (delta == null) return <span className="text-xs text-navy-300">—</span>
  if (delta === 0) return <span className="text-xs text-navy-400">—</span>
  const up = delta > 0
  return (
    <span className={clsx('text-xs font-semibold', up ? 'text-emerald-600' : 'text-red-500')}>
      {up ? '▲' : '▼'} {up ? '+' : ''}{delta}
    </span>
  )
}

const PctBadge = ({ pct }) => {
  if (pct == null) return <span className="text-xs text-navy-300">—</span>
  const cls = pct >= 80 ? 'bg-emerald-100 text-emerald-700'
            : pct >= 60 ? 'bg-amber-100 text-amber-700'
            : 'bg-red-100 text-red-700'
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>{pct}%</span>
}

const fmtDateVN = (d) => {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

/**
 * ClassOverviewTable — summary table of all students in a class.
 * Props: classId, cls (object), dateRange = { fromDate, toDate }
 */
export const ClassOverviewTable = ({ classId, cls, dateRange, mocksByStudent = new Map() }) => {
  const [allReviews,     setAllReviews]     = useState([])
  const [activeStudents, setActiveStudents] = useState([])
  const [attData,        setAttData]        = useState({ sessionCount: 0, records: [] })
  const [hwRecords,      setHwRecords]      = useState([])
  const [loading,        setLoading]        = useState(false)

  // Load students once per class
  useEffect(() => {
    if (!classId) { setActiveStudents([]); return }
    enrollmentService.getByClass(classId).then(async (enrollments) => {
      const activeIds = enrollments.filter(e => e.status === 'active').map(e => e.studentId)
      const all = await studentService.getAll()
      setActiveStudents(all.filter(s => activeIds.includes(s.id)))
    }).catch(() => {})
  }, [classId])

  // Reload reviews + attendance + homework when classId or dateRange changes
  useEffect(() => {
    if (!classId) {
      setAllReviews([])
      setAttData({ sessionCount: 0, records: [] })
      setHwRecords([])
      return
    }
    setLoading(true)
    Promise.all([
      reviewService.getByClass(classId),
      attendanceService.getByClassRange(classId, dateRange.fromDate, dateRange.toDate),
      homeworkService.getByClassRange(classId, dateRange.fromDate, dateRange.toDate),
    ]).then(([reviews, att, hw]) => {
      setAllReviews(reviews)
      setAttData(att)
      setHwRecords(hw)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [classId, dateRange.fromDate, dateRange.toDate])

  const rows = useMemo(() => {
    if (!classId) return []
    return activeStudents.map(s => {
      const studentReviews = allReviews
        .filter(r => r.studentId === s.id && r.date >= dateRange.fromDate && r.date <= dateRange.toDate)
      const latestReview = studentReviews[0] ?? null
      const attPct       = calcAttendancePct(s.id, attData)
      const hwPct        = calcHomeworkPct(s.id, hwRecords)
      const tags         = Array.isArray(latestReview?.tags) ? latestReview.tags : []
      const lastRemark   = latestReview?.remark || tags[0] || '—'
      const mockInfo     = getMockInfo(s.id, mocksByStudent)
      return { student: s, attPct, hwPct, lastRemark, mockInfo }
    })
  }, [classId, activeStudents, allReviews, attData, hwRecords, dateRange.fromDate, dateRange.toDate, mocksByStudent])

  const handleExportExcel = async () => {
    if (!rows.length) return

    let XLSX
    try {
      XLSX = await import('xlsx')
    } catch {
      toast.error('Không tải được thư viện xuất Excel. Vui lòng thử lại.')
      return
    }

    const fromVN = fmtDateVN(dateRange.fromDate)
    const toVN   = fmtDateVN(dateRange.toDate)

    const header = ['Họ tên', '% Chuyên cần', '% Bài tập', 'Mock gần nhất', 'Chênh lệch', 'Nhận xét gần nhất']
    const data = rows.map(({ student, attPct, hwPct, lastRemark, mockInfo }) => [
      student.name,
      attPct != null ? `${attPct}%` : '—',
      hwPct  != null ? `${hwPct}%`  : '—',
      mockInfo.latestScore != null ? `${mockInfo.latestScore}/${mockInfo.latestMax}` : '—',
      mockInfo.delta != null && mockInfo.delta !== 0
        ? `${mockInfo.delta > 0 ? '+' : ''}${mockInfo.delta}`
        : '—',
      lastRemark,
    ])

    const titleRow  = [`Tổng quan lớp: ${cls?.name ?? ''}`]
    const rangeRow  = [`Khoảng thời gian: ${fromVN} - ${toVN}`]
    const emptyRow  = []

    const ws = XLSX.utils.aoa_to_sheet([titleRow, rangeRow, emptyRow, header, ...data])
    ws['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 40 }]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Tổng quan lớp')

    const className = cls?.name?.replace(/\s+/g, '-') ?? 'lop'
    XLSX.writeFile(wb, `tong-quan-${className}-${dateRange.fromDate}-${dateRange.toDate}.xlsx`)
  }

  if (!classId) {
    return (
      <div className="bg-white rounded-2xl border border-navy-100 shadow-navy-sm p-16 flex flex-col items-center justify-center gap-3 text-center">
        <Users size={28} className="text-navy-200" strokeWidth={1.5} />
        <p className="text-navy-400">Chọn lớp để xem tổng quan</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <div className="bg-white rounded-2xl border border-navy-100 shadow-navy-sm overflow-hidden">
          <Skeleton className="h-10 rounded-none" />
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 rounded-none border-t border-navy-50" />)}
        </div>
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-navy-100 shadow-navy-sm p-16 flex flex-col items-center justify-center gap-3 text-center">
        <Users size={28} className="text-navy-200" strokeWidth={1.5} />
        <p className="text-navy-400">Lớp này chưa có học viên</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header + export button */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-navy-800">{cls?.name} · {rows.length} học viên</p>
          <p className="text-xs text-navy-400">Tổng hợp theo khoảng ngày đã lọc</p>
        </div>
        <button
          onClick={handleExportExcel}
          disabled={rows.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FileSpreadsheet size={14} />
          Xuất Excel
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-navy-100 shadow-navy-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-navy-50 border-b border-navy-100">
                <th className="text-left px-4 py-3 font-semibold text-navy-600 text-xs uppercase tracking-wide">Họ tên</th>
                <th className="text-center px-3 py-3 font-semibold text-navy-600 text-xs uppercase tracking-wide">Chuyên cần</th>
                <th className="text-center px-3 py-3 font-semibold text-navy-600 text-xs uppercase tracking-wide">Bài tập</th>
                <th className="text-center px-3 py-3 font-semibold text-navy-600 text-xs uppercase tracking-wide">Mock gần nhất</th>
                <th className="text-center px-3 py-3 font-semibold text-navy-600 text-xs uppercase tracking-wide">Chênh lệch</th>
                <th className="text-left px-4 py-3 font-semibold text-navy-600 text-xs uppercase tracking-wide">Nhận xét gần nhất</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-50">
              {rows.map(({ student, attPct, hwPct, lastRemark, mockInfo }) => (
                <tr key={student.id} className="hover:bg-navy-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-navy-800">{student.name}</td>
                  <td className="px-3 py-3 text-center"><PctBadge pct={attPct} /></td>
                  <td className="px-3 py-3 text-center"><PctBadge pct={hwPct} /></td>
                  <td className="px-3 py-3 text-center"><MockScoreCell score={mockInfo.latestScore} max={mockInfo.latestMax} /></td>
                  <td className="px-3 py-3 text-center"><MockDeltaCell delta={mockInfo.delta} /></td>
                  <td className="px-4 py-3 text-navy-500 text-xs max-w-[200px] truncate">{lastRemark}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
