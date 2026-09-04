import { useState, useEffect, useMemo } from 'react'
import { CheckCircle2, XCircle, CalendarCheck } from 'lucide-react'
import { attendanceService } from '@/services/attendanceService'
import { sessionService } from '@/services/sessionService'

const fmtDate = (d) => {
  const dt = new Date(d)
  return `${dt.getDate()}/${dt.getMonth() + 1}/${dt.getFullYear()}`
}

/**
 * AttendancePanel — list of sessions + attendance % for a student within dateRange.
 * Props: studentId, classId, dateRange = { fromDate, toDate }
 *
 * Mặc định có mặt: mỗi buổi trong khoảng tính là "Có mặt" trừ khi có bản ghi
 * present === false. Mẫu số là SỐ BUỔI trong khoảng, không phải số bản ghi.
 */
export const AttendancePanel = ({ studentId, classId, dateRange }) => {
  const { fromDate, toDate } = dateRange

  const [sessions, setSessions] = useState([])
  const [records, setRecords] = useState([])
  const [ratePct, setRatePct] = useState(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      sessionService.getByClass(classId),
      attendanceService.getByRange(studentId, classId, fromDate, toDate),
      attendanceService.getRateByRange(studentId, classId, fromDate, toDate),
    ])
      .then(([allSessions, recs, rate]) => {
        if (cancelled) return
        setSessions(allSessions.filter(s => s.date >= fromDate && s.date <= toDate))
        setRecords(recs)
        setRatePct(rate?.pct ?? null)
      })
      .catch(() => { if (!cancelled) { setSessions([]); setRecords([]); setRatePct(null) } })
    return () => { cancelled = true }
  }, [studentId, classId, fromDate, toDate])

  const items = useMemo(() => {
    const absentMap = new Map(records.filter(r => r.present === false).map(r => [r.sessionId, r]))
    return sessions
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(s => {
        const absent = absentMap.get(s.id)
        return { id: s.id, date: s.date, present: !absent, note: absent ? absent.note : '' }
      })
  }, [sessions, records])

  const total   = items.length
  const present = items.filter(i => i.present).length

  if (total === 0) {
    return (
      <div className="bg-white rounded-2xl border border-navy-100 shadow-navy-sm p-6 flex flex-col items-center justify-center gap-2 text-center">
        <CalendarCheck size={24} className="text-navy-200" />
        <p className="text-sm text-navy-400">Chưa có dữ liệu điểm danh trong khoảng thời gian này</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-navy-100 shadow-navy-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-navy-50 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-navy-800">Điểm danh</p>
          <p className="text-xs text-navy-400">{present}/{total} buổi — <span className={ratePct >= 80 ? 'text-emerald-600 font-semibold' : ratePct >= 60 ? 'text-amber-600 font-semibold' : 'text-red-600 font-semibold'}>{ratePct}% chuyên cần</span></p>
        </div>
        <span className={`text-sm font-bold px-3 py-1 rounded-full ${ratePct >= 80 ? 'bg-emerald-100 text-emerald-700' : ratePct >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
          {ratePct}%
        </span>
      </div>

      {/* Session list */}
      <div className="divide-y divide-navy-50 max-h-52 overflow-y-auto">
        {items.map(rec => (
          <div key={rec.id} className="flex items-center gap-3 px-4 py-2.5">
            {rec.present
              ? <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
              : <XCircle      size={15} className="text-red-400 shrink-0" />
            }
            <span className="text-sm text-navy-700 flex-1">{fmtDate(rec.date)}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${rec.present ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
              {rec.present ? 'Có mặt' : 'Vắng'}
            </span>
            {!rec.present && rec.note && (
              <span className="text-xs text-navy-400 italic truncate max-w-[100px]">{rec.note}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
