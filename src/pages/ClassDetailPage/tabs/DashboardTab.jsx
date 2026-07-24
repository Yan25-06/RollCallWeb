import { useState, useEffect, useMemo } from 'react'
import { clsx } from 'clsx'
import { Users, ArrowUpDown } from 'lucide-react'
import { Skeleton, Empty } from '@/components/ui'
import { getInitials } from '@/utils/helpers'
import { buildClassOverviewRows } from '@/utils/classOverview'
import { studentService } from '@/services/studentService'
import { enrollmentService } from '@/services/enrollmentService'
import { sessionService } from '@/services/sessionService'
import { attendanceService } from '@/services/attendanceService'
import { homeworkService } from '@/services/homeworkService'

// Ngưỡng cảnh báo HS yếu (chỉnh tại đây nếu cần)
const ATT_WARN = 75  // điểm danh dưới 75% → cảnh báo
const HW_WARN  = 50  // tỷ lệ bài tập dưới 50% → cảnh báo

const SortHeader = ({ label, active, dir, onClick, align = 'right' }) => (
  <th className={clsx('py-2 px-3', align === 'right' ? 'text-right' : 'text-left')}>
    <button
      onClick={onClick}
      className={clsx(
        'inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide transition-colors',
        active ? 'text-navy-800' : 'text-navy-400 hover:text-navy-700'
      )}
    >
      {label}
      <ArrowUpDown size={12} className={clsx(active ? 'opacity-100' : 'opacity-40')} />
      {active && <span className="text-[10px]">{dir === 'asc' ? '↑' : '↓'}</span>}
    </button>
  </th>
)

export const DashboardTab = ({ classId, onSelectStudent }) => {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' })

  useEffect(() => {
    let alive = true
    setLoading(true)
    Promise.all([
      studentService.getAll(),
      enrollmentService.getByClass(classId),
      sessionService.getByClass(classId),
      attendanceService.getByClass(classId),
      homeworkService.getByClass(classId),
    ])
      .then(([students, enrollments, sessions, attendance, homeworks]) => {
        if (!alive) return
        setRows(buildClassOverviewRows({ students, enrollments, sessions, attendance, homeworks }))
      })
      .catch(() => { if (alive) setRows([]) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [classId])

  const toggleSort = (key) =>
    setSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })

  const sortedRows = useMemo(() => {
    const arr = [...rows]
    const { key, dir } = sort
    const mul = dir === 'asc' ? 1 : -1
    arr.sort((a, b) => {
      if (key === 'name') return a.name.localeCompare(b.name, 'vi') * mul
      // null (chưa có buổi) xuống cuối bất kể chiều
      const av = key === 'att' ? a.attendanceRate : a.hwRate
      const bv = key === 'att' ? b.attendanceRate : b.hwRate
      if (av === null && bv === null) return 0
      if (av === null) return 1
      if (bv === null) return -1
      return (av - bv) * mul
    })
    return arr
  }, [rows, sort])

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
      </div>
    )
  }

  if (rows.length === 0) {
    return <Empty icon={<Users size={40} />} title="Lớp chưa có học viên đang học" desc="Thêm học viên ở tab Học Viên để xem tổng quan" />
  }

  return (
    <div className="bg-white rounded-2xl border border-navy-100 shadow-navy-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-navy-100 bg-navy-50/50">
              <SortHeader label="Học viên" align="left" active={sort.key === 'name'} dir={sort.dir} onClick={() => toggleSort('name')} />
              <SortHeader label="Điểm danh" active={sort.key === 'att'} dir={sort.dir} onClick={() => toggleSort('att')} />
              <SortHeader label="Bài tập" active={sort.key === 'hw'} dir={sort.dir} onClick={() => toggleSort('hw')} />
            </tr>
          </thead>
          <tbody>
            {sortedRows.map(r => (
              <tr
                key={r.studentId}
                onClick={() => onSelectStudent?.(r.studentId)}
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter') onSelectStudent?.(r.studentId) }}
                className="border-b border-navy-50 last:border-0 hover:bg-navy-50 cursor-pointer transition-colors focus:outline-none focus:bg-navy-50"
              >
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-navy-800 text-white text-xs font-bold flex items-center justify-center shrink-0 select-none">
                      {getInitials(r.name)}
                    </div>
                    <span className="font-medium text-navy-800 truncate">{r.name}</span>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-right">
                  <span className={clsx(
                    'font-semibold tabular-nums',
                    r.attendanceRate === null ? 'text-navy-300'
                      : r.attendanceRate < ATT_WARN ? 'text-red-600' : 'text-navy-800'
                  )}>
                    {r.attendanceRate === null ? '—' : `${r.attendanceRate}%`}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right">
                  <span className="font-semibold text-navy-800 tabular-nums">{r.hwDone}/{r.hwTotal}</span>
                  <span className={clsx(
                    'text-xs ml-1.5 tabular-nums',
                    r.hwTotal > 0 && r.hwRate < HW_WARN ? 'text-amber-600' : 'text-navy-400'
                  )}>
                    ({r.hwRate}%)
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
