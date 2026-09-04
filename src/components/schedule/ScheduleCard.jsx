import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronDown } from 'lucide-react'
import { clsx } from 'clsx'
import { Clock, MapPin, Users } from 'lucide-react'
import { getAttendanceStatus } from './attendanceStatus'
import { fmtTime } from '@/utils/helpers'

// ─── Color Mapping by courseType ──────────────────────────
export const COURSE_COLORS = {
  'IELTS':    { bg: 'bg-navy-100', border: 'border-navy-300', text: 'text-navy-800', dot: 'bg-navy-500' },
  'TOEIC':    { bg: 'bg-teal-50',  border: 'border-teal-200', text: 'text-teal-700', dot: 'bg-teal-500' },
  'TOEIC SW': { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
  'default':  { bg: 'bg-gray-50',  border: 'border-gray-200', text: 'text-gray-600', dot: 'bg-gray-400' },
}

export const getCourseColor = (courseType) =>
  COURSE_COLORS[courseType] ?? COURSE_COLORS['default']

// ─── SubstituteDropdown ────────────────────────────────────
// Custom dropdown: trigger hiện tên ngắn, options list hiện tên đầy đủ.
const TRUNC = 7
const trunc = (s) => s.length > TRUNC ? s.slice(0, TRUNC - 1) + '…' : s

const SubstituteDropdown = ({ teachers, cls, value, onChange, noteVal, onNote, onOpenChange }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const handleSetOpen = (val) => {
    setOpen(val)
    onOpenChange?.(val)
  }

  useEffect(() => {
    if (!open) return
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) handleSetOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const options = teachers.filter(t => t.id !== cls?.teacherId)
  const selected = options.find(t => t.id === value)
  const selectedLabel = selected ? (selected.name || selected.email || '?') : null
  const triggerText = selectedLabel ? `Dạy thay: ${trunc(selectedLabel)}` : '— Không có người dạy thay —'

  const pick = useCallback((id) => { onChange(id); handleSetOpen(false) }, [onChange])

  return (
    <div className="mt-1.5 flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => handleSetOpen(!open)}
          className="w-full flex items-center justify-between text-xs px-2 py-1 rounded-lg border border-red-200 bg-white text-navy-700 focus:outline-none focus:ring-1 focus:ring-red-300"
        >
          <span className="truncate">{triggerText}</span>
          <ChevronDown size={11} className="shrink-0 ml-1 opacity-50" />
        </button>
        {open && (
          <div className="absolute z-50 top-full left-0 right-0 mt-0.5 bg-white border border-red-200 rounded-lg shadow-lg overflow-hidden">
            <button
              type="button"
              onClick={() => pick('')}
              className="w-full text-left px-2 py-1.5 text-xs text-navy-400 hover:bg-navy-50"
            >
              — Không có người dạy thay —
            </button>
            {options.map(t => {
              const label = t.name || t.email || '?'
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => pick(t.id)}
                  className={clsx(
                    'w-full text-left px-2 py-1.5 text-xs hover:bg-navy-50',
                    t.id === value ? 'font-semibold text-navy-800 bg-navy-50' : 'text-navy-700'
                  )}
                >
                  Dạy thay: {label}
                </button>
              )
            })}
          </div>
        )}
      </div>
      <input
        type="text"
        value={noteVal}
        onChange={(e) => onNote(e.target.value)}
        placeholder="Ghi chú"
        className="w-full text-xs px-2 py-1 rounded-lg border border-red-200 bg-white text-navy-700 placeholder:text-navy-300 focus:outline-none focus:ring-1 focus:ring-red-300"
      />
    </div>
  )
}

// ─── ScheduleCard ──────────────────────────────────────────
export const ScheduleCard = ({ item, cls, studentCount, showTeacher, onEdit, canCheckAttendance = false, canMarkAbsent = false, attendanceRecord = null, onToggleAttendance, onAttendanceNote, teachers = [], onSetSubstitute }) => {
  const color = getCourseColor(cls?.courseType)

  // 3 trạng thái: không có record (hoặc status lạ) = 'pending'; 'present'; 'absent'.
  const status = attendanceRecord?.status === 'present' ? 'present'
    : attendanceRecord?.status === 'absent' ? 'absent'
    : 'pending'
  const isAbsent = status === 'absent'
  const att = getAttendanceStatus(status)

  // Nâng z-index khi dropdown dạy thay đang mở để không bị card bên dưới che
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // Ghi chú ca dạy — chỉ hiện khi Vắng, debounce lưu
  const [noteVal, setNoteVal] = useState(attendanceRecord?.note ?? '')
  const noteTimer = useRef(null)
  useEffect(() => { setNoteVal(attendanceRecord?.note ?? '') }, [attendanceRecord?.note])

  const handleNote = (val) => {
    setNoteVal(val)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => onAttendanceNote?.(item, val), 400)
  }

  return (
    <div
      className={clsx(
        'group relative rounded-xl border p-2.5 cursor-pointer transition-all duration-150',
        'hover:shadow-md hover:-translate-y-0.5',
        color.bg, color.border,
        isAbsent && clsx('border-l-4', att.bar),
        dropdownOpen && 'z-10'
      )}
      onClick={() => onEdit?.(item)}
    >
      {/* Tên lớp — dòng riêng, chữ nổi nhất trên card: đây là thứ mắt quét tìm trong lưới 7 cột */}
      <div className={clsx('text-sm font-bold leading-tight truncate', color.text)} title={cls?.name}>
        {cls?.name ?? '—'}
      </div>

      {/* Loại khóa bằng chữ thay cho chấm màu — màu nền card không phải kênh thông tin duy nhất */}
      {cls?.courseType && (
        <div className={clsx('text-[11px] font-medium uppercase tracking-wide truncate opacity-70 mb-1', color.text)}>
          {cls.courseType}
        </div>
      )}

      {/* Teacher name — only shown in admin "all teachers" view */}
      {showTeacher && cls?.teacherName && (
        <div className={clsx('text-xs mb-1 truncate opacity-70', color.text)}>
          {cls.teacherName}
        </div>
      )}

      {/* Time */}
      <div className={clsx('flex items-center gap-1 text-xs', color.text)}>
        <Clock size={11} className="shrink-0" />
        <span>{fmtTime(item.startTime)}–{fmtTime(item.endTime)}</span>
      </div>

      {/* Room */}
      {item.room && (
        <div className={clsx('flex items-center gap-1 text-xs mt-0.5', color.text, 'opacity-80')}>
          <MapPin size={11} className="shrink-0" />
          <span className="truncate" title={item.room}>{item.room}</span>
        </div>
      )}

      {/* Student count */}
      {studentCount != null && (
        <div className={clsx('flex items-center gap-1 text-xs mt-0.5', color.text, 'opacity-70')}>
          <Users size={11} className="shrink-0" />
          <span>{studentCount} HV</span>
        </div>
      )}

      {/* Chip chấm công — hàng riêng dưới cùng, chiếm trọn bề ngang thay vì tranh chỗ với tên lớp */}
      {canCheckAttendance && (
        <button
          className={clsx(
            'mt-2 w-full inline-flex items-center justify-center gap-1 px-1 py-1 rounded-lg text-[11px] font-semibold border transition-colors',
            att.bg, att.text, att.border, 'hover:opacity-80'
          )}
          title={canMarkAbsent ? 'Bấm để đổi: Chưa xác nhận → Đã dạy → Vắng' : 'Bấm để đổi: Chưa xác nhận → Đã dạy'}
          onClick={(e) => { e.stopPropagation(); onToggleAttendance?.(item) }}
        >
          <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', att.dot)} />
          <span className="truncate">{att.label}</span>
        </button>
      )}

      {/* Khi Vắng: chọn người dạy thay + ghi chú (chỉ admin) */}
      {canMarkAbsent && isAbsent && (
        <SubstituteDropdown
          teachers={teachers}
          cls={cls}
          value={attendanceRecord?.substituteTeacherId ?? ''}
          onChange={(id) => onSetSubstitute?.(item, id || null)}
          noteVal={noteVal}
          onNote={handleNote}
          onOpenChange={setDropdownOpen}
        />
      )}
    </div>
  )
}

// ─── SubstituteCard ────────────────────────────────────────
// Card read-only hiển thị buổi GV hiện tại được giao dạy thay.
// Không có chip chấm công, không click chỉnh sửa.
export const SubstituteCard = ({ assignment }) => {
  const color = getCourseColor() // default xám
  return (
    <div className={clsx('relative rounded-xl border p-2.5', color.bg, color.border)}>
      {/* Tên lớp — dòng riêng, giống ScheduleCard: nhãn "Dạy thay" không được tranh chỗ với danh tính */}
      <div className={clsx('text-sm font-bold leading-tight truncate mb-1', color.text)} title={assignment.className}>
        {assignment.className ?? '—'}
      </div>
      <div className={clsx('flex items-center gap-1 text-xs', color.text)}>
        <Clock size={11} className="shrink-0" />
        <span>{fmtTime(assignment.startTime)}–{fmtTime(assignment.endTime)}</span>
      </div>
      {assignment.room && (
        <div className={clsx('flex items-center gap-1 text-xs mt-0.5', color.text, 'opacity-80')}>
          <MapPin size={11} className="shrink-0" />
          <span className="truncate" title={assignment.room}>{assignment.room}</span>
        </div>
      )}
      <div className={clsx('text-xs mt-0.5 truncate', color.text, 'opacity-70')}>
        Thay: {assignment.mainTeacherName ?? '—'}
      </div>
      <span className="mt-2 w-full inline-flex items-center justify-center px-1.5 py-1 rounded-lg text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
        Dạy thay
      </span>
    </div>
  )
}
