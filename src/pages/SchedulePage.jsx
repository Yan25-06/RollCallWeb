import { useState, useMemo, useCallback, useEffect } from 'react'
import { clsx } from 'clsx'
import { Plus, ChevronLeft, ChevronRight, Calendar, CalendarCheck } from 'lucide-react'
import { Button, toast, Empty, Skeleton } from '@/components/ui'
import { WeeklyGrid } from '@/components/schedule/WeeklyGrid'
import { ScheduleModal } from '@/components/schedule/ScheduleModal'
import { getCourseColor } from '@/components/schedule/ScheduleCard'
import { fmtTime } from '@/utils/helpers'
import { scheduleService } from '@/services/scheduleService'
import { teacherAttendanceService } from '@/services/teacherAttendanceService'
import { classService, teacherService } from '@/services/classService'
import { enrollmentService } from '@/services/enrollmentService'
import { usePermissions } from '@/hooks/usePermissions'
import { PayrollTab } from '@/components/schedule/PayrollTab'
import { MaterialsTab } from '@/components/schedule/MaterialsTab'

// ─── Helpers ────────────────────────────────────────────────
const getWeekStart = (date) => {
  const d = new Date(date)
  const day = d.getDay()
  // Monday = start of week for Vietnamese convention
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

const formatWeekLabel = (weekStart) => {
  const end = new Date(weekStart)
  end.setDate(end.getDate() + 6)
  const opts = { day: 'numeric', month: 'numeric' }
  const s = weekStart.toLocaleDateString('vi-VN', opts)
  const e = end.toLocaleDateString('vi-VN', opts)
  const year = weekStart.getFullYear()
  return `${s} – ${e}, ${year}`
}

const toDateStr = (date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// ─── SchedulePage ────────────────────────────────────────────
export const SchedulePage = ({ onNavigate }) => {
  const { canFilterByTeacher: isAdmin, canCheckOwnAttendance, canMarkAbsent, canViewAllPayroll } = usePermissions()

  // Week navigation state
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const [activeTab, setActiveTab] = useState('schedule')   // 'schedule' | 'payroll' | 'materials'

  // Modal state
  const [modalOpen, setModalOpen]     = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [defaultDay, setDefaultDay]   = useState(null)

  // Data loaded from services
  const [schedule, setSchedule] = useState([])
  const [classes, setClasses] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Teacher attendance
  const [attendance, setAttendance] = useState([])

  // Buổi dạy thay được giao cho GV hiện tại
  const [subAssignments, setSubAssignments] = useState([])

  // Admin filter
  const [selectedTeacherId, setSelectedTeacherId] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const requests = [
        scheduleService.getAll(),
        classService.getAll(),
        enrollmentService.getAll(),
      ]
      if (isAdmin) requests.push(teacherService.getAll())
      const [scheduleItems, allClasses, allEnrollments, allTeachers] = await Promise.all(requests)
      setSchedule(scheduleItems)
      setClasses(allClasses)
      setEnrollments(allEnrollments)
      if (allTeachers) setTeachers(allTeachers)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [isAdmin])

  useEffect(() => { loadData() }, [loadData])

  // Load teacher attendance for the viewed week
  const loadAttendance = useCallback(async () => {
    if (!canCheckOwnAttendance) { setAttendance([]); return }
    const from = toDateStr(weekStart)
    const end = new Date(weekStart); end.setDate(end.getDate() + 6)
    const to = toDateStr(end)
    try {
      const rows = await teacherAttendanceService.getByWeek(from, to)
      setAttendance(rows)
    } catch {
      setAttendance([])
    }
  }, [canCheckOwnAttendance, weekStart])

  useEffect(() => { loadAttendance() }, [loadAttendance])

  // Load buổi dạy thay được giao trong tuần hiện tại
  const loadSubAssignments = useCallback(async () => {
    const from = toDateStr(weekStart)
    const end = new Date(weekStart); end.setDate(end.getDate() + 6)
    try {
      const rows = await teacherAttendanceService.getSubstituteAssignments(from, toDateStr(end))
      setSubAssignments(rows)
    } catch {
      setSubAssignments([])
    }
  }, [weekStart])

  useEffect(() => { loadSubAssignments() }, [loadSubAssignments])

  // Admin filter: narrow classes and schedule by selected teacher
  const visibleClasses = useMemo(() => {
    if (!isAdmin || !selectedTeacherId) return classes
    return classes.filter(c => c.teacherId === selectedTeacherId)
  }, [classes, isAdmin, selectedTeacherId])

  const visibleClassIds = useMemo(() => new Set(visibleClasses.map(c => c.id)), [visibleClasses])

  const visibleSchedule = useMemo(() => {
    if (!isAdmin || !selectedTeacherId) return schedule
    return schedule.filter(s => visibleClassIds.has(s.classId))
  }, [schedule, isAdmin, selectedTeacherId, visibleClassIds])

  // Build student count map (classId → active student count)
  const studentCounts = useMemo(() => {
    const map = new Map()
    for (const cls of visibleClasses) {
      const active = enrollments.filter(e => e.classId === cls.id && e.status === 'active').length
      map.set(cls.id, active)
    }
    return map
  }, [visibleClasses, enrollments])

  // Lookup map for teacher attendance: `${scheduleId}_${date}` → record
  const attendanceMap = useMemo(() => {
    const map = new Map()
    for (const r of attendance) map.set(`${r.scheduleId}_${r.date}`, r)
    return map
  }, [attendance])

  // Today's items
  const todayDow = new Date().getDay()
  const todayItems = visibleSchedule.filter(s => s.dayOfWeek === todayDow)

  // Whether to show teacher name on cards (admin viewing all teachers)
  const showTeacher = isAdmin && !selectedTeacherId

  // Handlers
  const openAdd = useCallback((day) => {
    setEditingItem(null)
    setDefaultDay(day ?? null)
    setModalOpen(true)
  }, [])

  const openEdit = useCallback((item) => {
    setEditingItem(item)
    setDefaultDay(null)
    setModalOpen(true)
  }, [])

  const handleSave = useCallback(async ({ data, isEdit, id }) => {
    try {
      if (isEdit) {
        await scheduleService.update(id, data)
        toast.success('Đã cập nhật lịch dạy')
      } else {
        await scheduleService.add(data)
        toast.success('Đã thêm lịch dạy')
      }
      await loadData()
    } catch {
      toast.error('Không thể lưu lịch dạy')
    }
  }, [loadData])

  const handleDelete = useCallback(async (id) => {
    try {
      await scheduleService.remove(id)
      toast.success('Đã xóa lịch dạy')
      await loadData()
    } catch {
      toast.error('Không thể xóa lịch dạy')
    }
  }, [loadData])

  // Chấm công: GV chỉ pending↔present; admin pending→present→absent→pending.
  const handleToggleAttendance = useCallback(async (item, date) => {
    const cls = classes.find(c => c.id === item.classId)
    if (!cls?.teacherId) { toast.error('Không tìm thấy lớp/giáo viên'); return }
    const record = attendanceMap.get(`${item.id}_${date}`)
    const cur = record?.status === 'present' ? 'present' : record?.status === 'absent' ? 'absent' : 'pending'
    try {
      if (cur === 'pending') {
        await teacherAttendanceService.upsert({ scheduleId: item.id, date, teacherId: cls.teacherId, status: 'present', note: record?.note ?? null })
      } else if (cur === 'present') {
        if (canMarkAbsent) {
          await teacherAttendanceService.upsert({ scheduleId: item.id, date, teacherId: cls.teacherId, status: 'absent', note: record?.note ?? null, substituteTeacherId: record?.substituteTeacherId ?? null })
        } else {
          // GV thường: present → pending (xóa record), KHÔNG sang absent
          await teacherAttendanceService.remove(item.id, date)
        }
      } else {
        // cur === 'absent'
        if (!canMarkAbsent) return   // GV thường không được sửa "Vắng" do admin đặt
        await teacherAttendanceService.remove(item.id, date)
      }
      await loadAttendance()
    } catch {
      toast.error('Không thể chấm công')
    }
  }, [classes, attendanceMap, loadAttendance, canMarkAbsent])

  const handleSetAttendanceNote = useCallback(async (item, date, note) => {
    const cls = classes.find(c => c.id === item.classId)
    if (!cls?.teacherId) return
    const record = attendanceMap.get(`${item.id}_${date}`)
    try {
      await teacherAttendanceService.upsert({
        scheduleId: item.id,
        date,
        teacherId: cls.teacherId,
        status: record?.status ?? 'absent',
        note,
        substituteConfirmed: record?.substituteConfirmed ?? false,
      })
      await loadAttendance()
    } catch {
      toast.error('Không thể lưu ghi chú')
    }
  }, [classes, attendanceMap, loadAttendance])

  // Chọn / bỏ người dạy thay cho một buổi vắng.
  const handleSetSubstitute = useCallback(async (item, date, substituteTeacherId) => {
    const cls = classes.find(c => c.id === item.classId)
    if (!cls?.teacherId) return
    const record = attendanceMap.get(`${item.id}_${date}`)
    try {
      await teacherAttendanceService.upsert({
        scheduleId: item.id,
        date,
        teacherId: cls.teacherId,
        status: record?.status ?? 'absent',
        note: record?.note ?? null,
        substituteTeacherId,
        substituteConfirmed: record?.substituteConfirmed ?? false,
      })
      await loadAttendance()
    } catch {
      toast.error('Không thể lưu người dạy thay')
    }
  }, [classes, attendanceMap, loadAttendance])

  const handleAttendance = useCallback((classId) => {
    onNavigate?.('classes')
  }, [onNavigate])

  const prevWeek = () => setWeekStart(w => {
    const d = new Date(w); d.setDate(d.getDate() - 7); return d
  })
  const nextWeek = () => setWeekStart(w => {
    const d = new Date(w); d.setDate(d.getDate() + 7); return d
  })
  const goToday  = () => setWeekStart(getWeekStart(new Date()))

  const isCurrentWeek = getWeekStart(new Date()).getTime() === weekStart.getTime()

  return (
    <div className="flex flex-col gap-6 animate-fade-in">

      {/* ── Page Header ─────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold text-navy-900">Giảng Dạy</h1>
          <p className="text-sm text-navy-400 mt-0.5">Thời khóa biểu, chấm công và lương giáo viên</p>
        </div>
        {activeTab === 'schedule' && (
          <Button
            variant="primary"
            size="md"
            onClick={() => openAdd(null)}
            className="flex items-center gap-2 shrink-0"
          >
            <Plus size={16} />
            Xếp Lịch
          </Button>
        )}
      </div>

      {/* ── Tabs ─────────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-navy-100">
        <button
          onClick={() => setActiveTab('schedule')}
          className={clsx(
            'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
            activeTab === 'schedule'
              ? 'border-navy-800 text-navy-900'
              : 'border-transparent text-navy-400 hover:text-navy-700'
          )}
        >
          Lịch Dạy
        </button>
        <button
          onClick={() => setActiveTab('payroll')}
          className={clsx(
            'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
            activeTab === 'payroll'
              ? 'border-navy-800 text-navy-900'
              : 'border-transparent text-navy-400 hover:text-navy-700'
          )}
        >
          Bảng Lương
        </button>
        <button
          onClick={() => setActiveTab('materials')}
          className={clsx(
            'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
            activeTab === 'materials'
              ? 'border-navy-800 text-navy-900'
              : 'border-transparent text-navy-400 hover:text-navy-700'
          )}
        >
          Tài Liệu
        </button>
      </div>

      {activeTab === 'schedule' && (
        <>
          {/* ── Week navigation + Teacher filter ─────────── */}
          <div className="flex items-center gap-2 bg-white rounded-2xl border border-navy-100 shadow-navy-sm px-3 py-2">
            {/* Week prev/next */}
            <button
              onClick={prevWeek}
              className="p-1 rounded-lg text-navy-400 hover:text-navy-700 hover:bg-navy-50 transition-colors shrink-0"
              title="Tuần trước"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="text-center shrink-0">
              <p className="text-xs font-semibold text-navy-800 whitespace-nowrap">{formatWeekLabel(weekStart)}</p>
            </div>

            <button
              onClick={nextWeek}
              className="p-1 rounded-lg text-navy-400 hover:text-navy-700 hover:bg-navy-50 transition-colors shrink-0"
              title="Tuần sau"
            >
              <ChevronRight size={16} />
            </button>

            {!isCurrentWeek && (
              <button
                onClick={goToday}
                className="text-xs font-medium text-navy-600 hover:text-navy-900 bg-navy-50 hover:bg-navy-100 px-2.5 py-1 rounded-lg transition-colors shrink-0"
              >
                Hôm nay
              </button>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Admin: Teacher filter dropdown */}
            {isAdmin && teachers.length > 0 && (
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-navy-400 hidden sm:block">Giáo viên:</span>
                <select
                  value={selectedTeacherId}
                  onChange={e => setSelectedTeacherId(e.target.value)}
                  className="text-xs border border-navy-200 rounded-lg px-2.5 py-1.5 text-navy-700 bg-navy-50 hover:bg-navy-100 focus:outline-none focus:ring-2 focus:ring-navy-300 transition-colors cursor-pointer"
                >
                  <option value="">Tất cả giáo viên</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name || t.email}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* ── Thanh "Hôm nay" ngang gọn ── */}
          {!loading && !error && todayItems.length > 0 && (
            <div className="bg-white rounded-2xl border border-navy-100 shadow-navy-sm px-3 py-2 flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-navy-700 shrink-0">Hôm nay:</span>
              {[...todayItems].sort((a, b) => a.startTime.localeCompare(b.startTime)).map(item => {
                const cls = visibleClasses.find(c => c.id === item.classId)
                const color = getCourseColor(cls?.courseType)
                return (
                  <div key={item.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-navy-50 text-xs">
                    <span className={clsx('w-2 h-2 rounded-full shrink-0', color.dot)} />
                    <span className="font-medium text-navy-800">{cls?.name ?? '—'}</span>
                    <span className="text-navy-400">{fmtTime(item.startTime)}–{fmtTime(item.endTime)}</span>
                    {item.room && <span className="text-navy-400">· {item.room}</span>}
                    <button
                      onClick={() => handleAttendance(item.classId)}
                      className="ml-1 text-navy-500 hover:text-navy-800 transition-colors"
                      title="Điểm danh học viên"
                    >
                      <CalendarCheck size={13} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Lưới thời khóa biểu (full bề ngang) ── */}
          <div className="w-full">

            {/* Grid area */}
            <div className="min-w-0">
              {loading ? (
                <div className="bg-white rounded-2xl border border-navy-100 shadow-navy-sm p-4">
                  <div className="grid grid-cols-7 gap-2 mb-3">
                    {[1,2,3,4,5,6,7].map(i => <Skeleton key={i} className="h-6 rounded-lg" />)}
                  </div>
                  {[1,2,3].map(row => (
                    <div key={row} className="grid grid-cols-7 gap-2 mb-2">
                      {[1,2,3,4,5,6,7].map(col => (
                        <Skeleton key={col} className="h-16 rounded-xl" />
                      ))}
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="bg-white rounded-2xl border border-navy-100 shadow-navy-sm p-12">
                  <Empty
                    icon={<Calendar size={40} />}
                    title="Không thể tải lịch dạy"
                    desc="Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại."
                    action={
                      <Button variant="primary" size="sm" onClick={loadData}>Thử lại</Button>
                    }
                  />
                </div>
              ) : visibleSchedule.length === 0 ? (
                <div className="bg-white rounded-2xl border border-navy-100 shadow-navy-sm p-12">
                  <Empty
                    icon={<Calendar size={40} />}
                    title={selectedTeacherId ? 'Giáo viên này chưa có lịch dạy' : 'Chưa có lịch dạy nào'}
                    desc={selectedTeacherId ? 'Thử chọn giáo viên khác hoặc bấm "+ Xếp Lịch".' : "Bấm '+ Xếp Lịch' để thêm ca dạy đầu tiên vào thời khóa biểu."}
                    action={
                      <Button variant="primary" size="sm" onClick={() => openAdd(null)} className="flex items-center gap-1.5">
                        <Plus size={14} />
                        Xếp Lịch Đầu Tiên
                      </Button>
                    }
                  />
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-navy-100 shadow-navy-sm p-4">
                  <WeeklyGrid
                    scheduleItems={visibleSchedule}
                    classes={visibleClasses}
                    studentCounts={studentCounts}
                    showTeacher={showTeacher}
                    onEdit={openEdit}
                    onAddDay={openAdd}
                    weekStart={weekStart}
                    canCheckAttendance={canCheckOwnAttendance}
                    canMarkAbsent={canMarkAbsent}
                    attendanceMap={attendanceMap}
                    onToggleAttendance={handleToggleAttendance}
                    onAttendanceNote={handleSetAttendanceNote}
                    teachers={teachers}
                    onSetSubstitute={handleSetSubstitute}
                    subAssignments={subAssignments}
                  />
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'payroll' && (
        <PayrollTab
          classes={classes}
          schedule={schedule}
          teachers={teachers}
          isAdmin={canViewAllPayroll}
        />
      )}

      {activeTab === 'materials' && (
        <MaterialsTab isAdmin={isAdmin} />
      )}

      {/* ── Modal ──────────────────────────────────────── */}
      <ScheduleModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editingItem={editingItem}
        defaultDay={defaultDay}
        classes={classes}
        allSchedule={schedule}
        onSave={handleSave}
        onDelete={handleDelete}
      />

    </div>
  )
}
