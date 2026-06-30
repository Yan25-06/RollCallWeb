import { clsx } from 'clsx'
import { ScheduleCard, SubstituteCard } from './ScheduleCard'

const DAY_NAMES = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']
// Display order: Mon(1) → Sun(0) for Vietnamese convention
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

// Trả về 'YYYY-MM-DD' cho một dayOfWeek trong tuần bắt đầu từ weekStart (Date, là Thứ Hai).
const dateForDay = (weekStart, dayOfWeek) => {
  if (!weekStart) return null
  const d = new Date(weekStart)
  const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  d.setDate(d.getDate() + offset)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * WeeklyGrid — 7-column CSS grid schedule view
 * @param {Array} scheduleItems - all ScheduleItems from phf_schedule
 * @param {Array} classes       - all Classes from phf_classes
 * @param {Map}   studentCounts - Map<classId, activeCount>
 * @param {Function} onEdit     - callback(item) when a card is clicked
 * @param {Function} onAddDay   - callback(dayOfWeek) when "+" in column header clicked
 */
export const WeeklyGrid = ({ scheduleItems = [], classes = [], studentCounts = new Map(), showTeacher = false, onEdit, onAddDay, weekStart = null, canCheckAttendance = false, canMarkAbsent = false, attendanceMap = new Map(), onToggleAttendance, onAttendanceNote, teachers = [], onSetSubstitute, subAssignments = [] }) => {
  const byDay = {}
  for (const day of DAY_ORDER) {
    byDay[day] = scheduleItems
      .filter(s => s.dayOfWeek === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  }

  // Nhóm buổi dạy thay theo dayOfWeek (suy từ chuỗi date 'YYYY-MM-DD')
  const subsByDay = {}
  for (const day of DAY_ORDER) subsByDay[day] = []
  for (const a of subAssignments) {
    if (!a.date) continue
    const dow = new Date(a.date + 'T00:00:00').getDay()
    if (subsByDay[dow]) subsByDay[dow].push(a)
  }

  const getClass = (classId) => classes.find(c => c.id === classId)

  return (
    <>
      {/* Desktop: 7-column grid */}
      <div className="hidden md:grid grid-cols-7 gap-2">
        {DAY_ORDER.map((day) => {
          const date = dateForDay(weekStart, day)
          const items = byDay[day].filter(item => {
            if (!date) return true
            const cls = getClass(item.classId)
            return !cls?.startDate || date >= cls.startDate
          })
          return (
          <div key={day} className="flex flex-col gap-2 min-w-0">
            {/* Column header */}
            <div className="flex items-center justify-between px-1">
              <span className={clsx(
                'text-xs font-semibold',
                day === new Date().getDay() ? 'text-navy-800' : 'text-navy-400'
              )}>
                {DAY_NAMES[day]}
                {day === new Date().getDay() && (
                  <span className="ml-1 inline-block w-1.5 h-1.5 bg-navy-600 rounded-full align-middle" />
                )}
              </span>
              <button
                onClick={() => onAddDay?.(day)}
                className="text-navy-300 hover:text-navy-600 text-xs w-5 h-5 flex items-center justify-center rounded hover:bg-navy-50 transition-colors"
                title={`Thêm ca ${DAY_NAMES[day]}`}
              >
                +
              </button>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-1.5">
              {items.length === 0 && subsByDay[day].length === 0 ? (
                <div className="h-16 rounded-xl border-2 border-dashed border-navy-100 flex items-center justify-center">
                  <span className="text-navy-200 text-xs">Trống</span>
                </div>
              ) : (
                <>
                  {items.map(item => (
                    <ScheduleCard
                      key={item.id}
                      item={item}
                      cls={getClass(item.classId)}
                      studentCount={studentCounts.get(item.classId)}
                      showTeacher={showTeacher}
                      onEdit={onEdit}
                      canCheckAttendance={canCheckAttendance}
                      canMarkAbsent={canMarkAbsent}
                      attendanceRecord={attendanceMap.get(`${item.id}_${date}`) ?? null}
                      onToggleAttendance={(it) => onToggleAttendance?.(it, date)}
                      onAttendanceNote={(it, note) => onAttendanceNote?.(it, date, note)}
                      teachers={teachers}
                      onSetSubstitute={(it, teacherId) => onSetSubstitute?.(it, date, teacherId)}
                    />
                  ))}
                  {subsByDay[day].map(a => (
                    <SubstituteCard key={`sub_${a.id}`} assignment={a} />
                  ))}
                </>
              )}
            </div>
          </div>
          )
        })}
      </div>

      {/* Mobile: stacked daily list */}
      <div className="md:hidden flex flex-col gap-4">
        {DAY_ORDER.map((day) => {
          const date = dateForDay(weekStart, day)
          const items = byDay[day].filter(item => {
            if (!date) return true
            const cls = getClass(item.classId)
            return !cls?.startDate || date >= cls.startDate
          })
          if (items.length === 0 && subsByDay[day].length === 0) return null
          return (
            <div key={day} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className={clsx(
                  'text-sm font-semibold',
                  day === new Date().getDay() ? 'text-navy-800' : 'text-navy-500'
                )}>
                  {DAY_NAMES[day]}
                </span>
                {day === new Date().getDay() && (
                  <span className="text-xs bg-navy-100 text-navy-700 px-2 py-0.5 rounded-full font-medium">Hôm nay</span>
                )}
              </div>
              <div className="flex flex-col gap-2 pl-2">
                {items.map(item => (
                    <ScheduleCard
                      key={item.id}
                      item={item}
                      cls={getClass(item.classId)}
                      studentCount={studentCounts.get(item.classId)}
                      showTeacher={showTeacher}
                      onEdit={onEdit}
                      canCheckAttendance={canCheckAttendance}
                      canMarkAbsent={canMarkAbsent}
                      attendanceRecord={attendanceMap.get(`${item.id}_${date}`) ?? null}
                      onToggleAttendance={(it) => onToggleAttendance?.(it, date)}
                      onAttendanceNote={(it, note) => onAttendanceNote?.(it, date, note)}
                      teachers={teachers}
                      onSetSubstitute={(it, teacherId) => onSetSubstitute?.(it, date, teacherId)}
                    />
                ))}
                {subsByDay[day].map(a => (
                  <SubstituteCard key={`sub_${a.id}`} assignment={a} />
                ))}
              </div>
            </div>
          )
        })}
        {scheduleItems.length === 0 && (
          <p className="text-center text-navy-300 text-sm py-8">Chưa có lịch dạy</p>
        )}
      </div>
    </>
  )
}
