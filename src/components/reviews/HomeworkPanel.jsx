import { useState, useEffect } from 'react'
import { BookOpen, CheckCircle2, Clock, Circle } from 'lucide-react'
import { homeworkService } from '@/services/homeworkService'
import { toast } from '@/components/ui'

const fmtDate = (d) => {
  if (!d) return ''
  const dt = new Date(d)
  return `${dt.getDate()}/${dt.getMonth() + 1}/${dt.getFullYear()}`
}

const PROGRESS_CONFIG = {
  done:        { label: 'Hoàn tất',      color: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2, iconColor: 'text-emerald-500' },
  in_progress: { label: 'Chưa hoàn tất', color: 'bg-amber-50 text-amber-700',    icon: Clock,        iconColor: 'text-amber-500'   },
  not_done:    { label: 'Không nộp',     color: 'bg-red-50 text-red-500',        icon: Circle,       iconColor: 'text-red-400'     },
}

/**
 * HomeworkPanel — session-based homework list + completion % for a student within dateRange.
 * Uses homeworks (Theo Buổi), not hw_assignments.
 * Props: studentId, classId, dateRange = { fromDate, toDate }
 */
export const HomeworkPanel = ({ studentId, classId, dateRange }) => {
  const { fromDate, toDate } = dateRange
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!studentId || !classId || !fromDate || !toDate) { setLoading(false); return }
    setLoading(true)
    homeworkService.getByRange(studentId, classId, fromDate, toDate)
      .then(setRecords)
      .catch(() => toast.error('Không thể tải bài tập'))
      .finally(() => setLoading(false))
  }, [studentId, classId, fromDate, toDate])

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-navy-100 shadow-navy-sm p-6 flex items-center justify-center text-navy-400 text-sm">
        Đang tải...
      </div>
    )
  }

  const total      = records.length
  const doneCount  = records.filter(r => r.progress === 'done' || r.progress === 100).length
  const inProgCount = records.filter(r => r.progress === 'in_progress' || r.progress === 50).length
  const pct = total > 0 ? Math.round((doneCount * 100 + inProgCount * 50) / total) : null

  if (total === 0) {
    return (
      <div className="bg-white rounded-2xl border border-navy-100 shadow-navy-sm p-6 flex flex-col items-center justify-center gap-2 text-center">
        <BookOpen size={24} className="text-navy-200" />
        <p className="text-sm text-navy-400">Chưa có bài tập theo buổi trong khoảng thời gian này</p>
      </div>
    )
  }

  const pctColor = pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'
  const badgeColor = pct >= 80 ? 'bg-emerald-100 text-emerald-700' : pct >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'

  return (
    <div className="bg-white rounded-2xl border border-navy-100 shadow-navy-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-navy-50 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-navy-800">Bài tập theo buổi</p>
          <p className="text-xs text-navy-400">
            {doneCount}/{total} buổi — <span className={`font-semibold ${pctColor}`}>{pct}% hiệu suất</span>
          </p>
        </div>
        <span className={`text-sm font-bold px-3 py-1 rounded-full ${badgeColor}`}>{pct}%</span>
      </div>

      <div className="divide-y divide-navy-50 max-h-52 overflow-y-auto">
        {records.map(rec => {
          const progress = rec.progress === 100 ? 'done' : rec.progress === 50 ? 'in_progress' : (rec.progress || 'not_done')
          const cfg      = PROGRESS_CONFIG[progress] || PROGRESS_CONFIG.not_done
          const Icon     = cfg.icon
          const label    = rec.title || rec.sessionTopic || `Buổi ${fmtDate(rec.date)}`

          return (
            <div key={rec.id} className="flex items-center gap-3 px-4 py-2.5">
              <Icon size={15} className={`${cfg.iconColor} shrink-0`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-navy-700 truncate">{label}</p>
                <p className="text-xs text-navy-400">{fmtDate(rec.date)}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${cfg.color}`}>
                {cfg.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
