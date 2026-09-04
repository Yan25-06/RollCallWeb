import { useState } from 'react'
import { clsx } from 'clsx'
import { Clock, MapPin, Users, CalendarCheck, ChevronDown } from 'lucide-react'
import { getCourseColor } from './ScheduleCard'
import { fmtTime } from '@/utils/helpers'

const DAY_NAMES = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']

/**
 * DailyAgenda — sidebar showing today's teaching schedule
 * @param {Array}    todayItems    - schedule items for today (dayOfWeek = today)
 * @param {Array}    classes       - all classes
 * @param {Map}      studentCounts - Map<classId, count>
 * @param {Function} onAttendance  - callback(classId) navigate to attendance
 */
export const DailyAgenda = ({ todayItems = [], classes = [], studentCounts = new Map(), showTeacher = false, onAttendance }) => {
  const [collapsed, setCollapsed] = useState(false)
  const today = new Date()
  const todayLabel = `${DAY_NAMES[today.getDay()]}, ${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`

  const sorted = [...todayItems].sort((a, b) => a.startTime.localeCompare(b.startTime))
  const getClass = (classId) => classes.find(c => c.id === classId)

  return (
    <div className="bg-white rounded-2xl border border-navy-100 shadow-navy-sm overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer select-none border-b border-navy-50"
        onClick={() => setCollapsed(c => !c)}
      >
        <div>
          <p className="text-sm font-semibold text-navy-800">Hôm nay</p>
          <p className="text-xs text-navy-400">{todayLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          {sorted.length > 0 && (
            <span className="text-xs bg-navy-100 text-navy-700 px-2 py-0.5 rounded-full font-medium">
              {sorted.length} ca
            </span>
          )}
          <ChevronDown
            size={16}
            className={clsx('text-navy-400 transition-transform duration-200', collapsed && 'rotate-180')}
          />
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div className="divide-y divide-navy-50">
          {sorted.length === 0 ? (
            <div className="px-4 py-6 flex flex-col items-center gap-2 text-center">
              <CalendarCheck size={24} className="text-navy-200" />
              <p className="text-sm text-navy-400">Hôm nay không có ca dạy</p>
            </div>
          ) : (
            sorted.map(item => {
              const cls = getClass(item.classId)
              const color = getCourseColor(cls?.courseType)
              const count = studentCounts.get(item.classId)

              return (
                <div key={item.id} className="px-4 py-3 hover:bg-navy-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="min-w-0">
                        {/* Loại khóa hiện bằng badge có chữ thay cho chấm màu không chú giải */}
                        <div className="flex items-center gap-2 min-w-0">
                          <p className={clsx('text-sm font-semibold truncate', color.text)}>
                            {cls?.name ?? '—'}
                          </p>
                          {cls?.courseType && (
                            <span className={clsx(
                              'shrink-0 px-1.5 py-0.5 rounded-md border text-[10px] font-semibold uppercase tracking-wide',
                              color.bg, color.text, color.border
                            )}>
                              {cls.courseType}
                            </span>
                          )}
                        </div>
                        {showTeacher && cls?.teacherName && (
                          <p className="text-xs text-navy-400 truncate">{cls.teacherName}</p>
                        )}
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="flex items-center gap-1 text-xs text-navy-400">
                            <Clock size={11} />
                            {fmtTime(item.startTime)}–{fmtTime(item.endTime)}
                          </span>
                          {item.room && (
                            <span className="flex items-center gap-1 text-xs text-navy-400">
                              <MapPin size={11} />
                              {item.room}
                            </span>
                          )}
                          {count != null && (
                            <span className="flex items-center gap-1 text-xs text-navy-400">
                              <Users size={11} />
                              {count}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action: quick attendance */}
                    <div className="shrink-0">
                      <button
                        onClick={() => onAttendance?.(item.classId)}
                        className="flex items-center gap-1 text-xs font-medium text-navy-600 hover:text-navy-900 bg-navy-50 hover:bg-navy-100 px-2.5 py-1.5 rounded-lg transition-colors"
                        title="Đến trang điểm danh"
                      >
                        <CalendarCheck size={13} />
                        Điểm danh
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
