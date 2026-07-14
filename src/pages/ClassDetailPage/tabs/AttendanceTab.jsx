import { useState, useEffect, useMemo, useCallback } from 'react'
import { clsx } from 'clsx'
import { Trash2, FileText, Pencil } from 'lucide-react'
import { Button, Card, toast, Skeleton, ConfirmModal } from '@/components/ui'
import { SessionSelector } from '@/components/classes/SessionSelector'
import { SessionModal } from '@/components/classes/SessionModal'
import { AttendanceToggle } from '@/components/attendance/AttendanceToggle'
import { StudentAttendancePanel } from '@/components/attendance/StudentAttendancePanel'
import { HomeworkNoteCell } from '@/components/homework/HomeworkNoteCell'
import { sessionService } from '@/services/sessionService'
import { attendanceService } from '@/services/attendanceService'
import { studentService } from '@/services/studentService'
import { enrollmentService } from '@/services/enrollmentService'
import { getInitials } from '@/utils/helpers'

// Update-or-insert one student's attendance cell in a local record array.
const patchCell = (records, sessionId, studentId, patch) => {
  const idx = records.findIndex(a => a.studentId === studentId)
  if (idx >= 0) {
    const next = [...records]
    next[idx] = { ...next[idx], ...patch }
    return next
  }
  // Default present: a student with no record yet is treated as "Có mặt".
  return [...records, { sessionId, studentId, present: true, note: '', ...patch }]
}

export const AttendanceTab = ({ classId, scheduleTime }) => {
  const [sessions, setSessions] = useState([])
  const [activeSessionId, setActiveSessionId] = useState('')
  const [students, setStudents] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [attendance, setAttendance] = useState([])
  const [classAttendance, setClassAttendance] = useState([])

  const [sessionModalOpen, setSessionModalOpen] = useState(false)
  const [editingSession, setEditingSession] = useState(null)  // null = closed
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [confirmDeleteSession, setConfirmDeleteSession] = useState(false)

  // Load sessions, roster, and class-wide attendance (for the chuyên cần column)
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [classSessions, allStudents, classEnrolls, classAtts] = await Promise.all([
        sessionService.getByClass(classId),
        studentService.getAll(),
        enrollmentService.getByClass(classId),
        attendanceService.getByClass(classId),
      ])
      const relevantEnrolls = classEnrolls.filter(e => e.status !== 'dropped')
      setSessions(classSessions)
      setStudents(allStudents.filter(s => relevantEnrolls.some(e => e.studentId === s.id)))
      setEnrollments(relevantEnrolls)
      setClassAttendance(classAtts)
      setActiveSessionId(prev =>
        prev && classSessions.some(s => s.id === prev)
          ? prev
          : (classSessions[0]?.id || '')
      )
    } catch {
      toast.error('Không thể tải dữ liệu điểm danh')
    } finally {
      setLoading(false)
    }
  }, [classId])

  useEffect(() => { loadData() }, [loadData])

  // Load the active session's attendance grid
  useEffect(() => {
    let cancelled = false
    if (!activeSessionId) { setAttendance([]); return }
    attendanceService.getBySession(activeSessionId)
      .then(recs => { if (!cancelled) setAttendance(recs) })
      .catch(() => { if (!cancelled) toast.error('Không thể tải điểm danh buổi học') })
    return () => { cancelled = true }
  }, [activeSessionId])

  const handleSessionSaved = (newId) => {
    setActiveSessionId(newId)
    loadData()
  }

  const handleDeleteSession = () => {
    if (!activeSessionId) return
    setConfirmDeleteSession(true)
  }

  const doDeleteSession = async () => {
    try {
      await sessionService.remove(activeSessionId)
      toast.success('Đã xóa buổi học')
      setActiveSessionId('')
      await loadData()
    } catch {
      toast.error('Không thể xóa buổi học')
    }
  }

  const handleEditSession = () => {
    const session = sessions.find(s => s.id === activeSessionId)
    if (session) setEditingSession(session)
  }

  const handleSessionUpdated = () => {
    // Refresh session list, stay on the same active session
    loadData()
  }

  // Optimistic: flip the cell immediately, then persist. On failure, roll back
  // only this (session, student) cell to its prior value — concurrent cells are
  // untouched because each call captures and restores its own snapshot.
  const persistCell = async (studentId, patch) => {
    const session = sessions.find(s => s.id === activeSessionId)
    if (!session) return
    const prev = attendance.find(a => a.studentId === studentId)
    const snapshot = { present: prev ? prev.present : true, note: prev ? (prev.note ?? '') : '' }
    const optimistic = { ...snapshot, ...patch }
    setAttendance(curr => patchCell(curr, activeSessionId, studentId, optimistic))
    try {
      await attendanceService.upsert({
        sessionId: activeSessionId,
        studentId,
        date: session.date,
        present: optimistic.present,
        ...(patch.note !== undefined ? { note: optimistic.note } : {}),
      })
    } catch (err) {
      setAttendance(curr => patchCell(curr, activeSessionId, studentId, snapshot))
      toast.error(`Không thể lưu điểm danh, đã hoàn tác: ${err?.message || 'lỗi không xác định'}`)
    }
  }

  const handleToggle = (studentId, present) => {
    if (!activeSessionId) return
    persistCell(studentId, { present })
  }

  // Per-student attendance rate over past sessions, computed from the class-wide
  // fetch with the active session overridden by the (possibly optimistic) grid.
  const attendanceRates = useMemo(() => {
    if (students.length === 0) return {}
    const today = new Date().toISOString().split('T')[0]
    const pastSessions = sessions.filter(s => s.date <= today)
    if (pastSessions.length === 0) {
      return Object.fromEntries(students.map(s => [s.id, null]))
    }
    const sessionIdSet = new Set(pastSessions.map(s => s.id))
    const presentMap = new Map() // `${sessionId}|${studentId}` -> present
    classAttendance.forEach(a => {
      if (sessionIdSet.has(a.sessionId)) presentMap.set(`${a.sessionId}|${a.studentId}`, a.present)
    })
    if (sessionIdSet.has(activeSessionId)) {
      attendance.forEach(a => presentMap.set(`${activeSessionId}|${a.studentId}`, a.present))
    }
    return Object.fromEntries(students.map(student => {
      let presentCount = 0
      pastSessions.forEach(s => {
        // Missing record = có mặt; only an explicit `false` counts as vắng.
        if (presentMap.get(`${s.id}|${student.id}`) !== false) presentCount++
      })
      return [student.id, Math.round((presentCount / pastSessions.length) * 100)]
    }))
  }, [students, sessions, classAttendance, attendance, activeSessionId])

  const totalActive = enrollments.filter(e => e.status === 'active').length
  // Mặc định có mặt: chỉ trừ những HS đang hoạt động bị tick "Vắng".
  const absentCount = students.filter(st => {
    const enroll = enrollments.find(e => e.studentId === st.id)
    if (enroll?.status !== 'active') return false
    return attendance.find(a => a.studentId === st.id)?.present === false
  }).length
  const presentCount = totalActive - absentCount

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-14 w-full rounded-2xl" />
        <div className="bg-white rounded-2xl border border-navy-100 overflow-hidden">
          <div className="grid grid-cols-4 gap-4 px-6 py-4 bg-navy-50/50 border-b border-navy-100">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-4 rounded" />)}
          </div>
          {[1,2,3,4,5].map(i => (
            <div key={i} className="grid grid-cols-4 gap-4 px-6 py-3 border-b border-navy-50 items-center">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-5 w-12 mx-auto rounded" />
              <Skeleton className="h-8 w-20 mx-auto rounded-xl" />
              <Skeleton className="h-8 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 relative h-full min-h-[500px]">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-navy-100 shadow-navy-sm">
        <SessionSelector
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelect={setActiveSessionId}
          onAddNew={() => setSessionModalOpen(true)}
        />
        
        {activeSessionId && (
          <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 bg-navy-50 rounded-xl text-sm font-medium text-navy-800 border border-navy-100">
                Có mặt: <span className="text-emerald-600">{presentCount}</span> / {totalActive}
              </div>
              <button
                onClick={handleEditSession}
                className="p-1.5 text-navy-400 hover:text-navy-700 hover:bg-navy-50 rounded-lg transition-colors"
                title="Chỉnh sửa buổi này"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={handleDeleteSession}
                className="p-1.5 text-navy-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Xóa buổi này"
              >
                <Trash2 size={18} />
              </button>
            </div>
        )}
      </div>

      {/* Main Content */}
      {!activeSessionId ? (
        <Card className="p-16 flex flex-col items-center justify-center text-center gap-3">
          <FileText size={48} className="text-navy-200" />
          <p className="font-semibold text-navy-700">Chưa có buổi học nào</p>
          <p className="text-sm text-navy-400">Tạo buổi đầu tiên để bắt đầu điểm danh</p>
          <Button onClick={() => setSessionModalOpen(true)} className="mt-2">
            + Tạo buổi học
          </Button>
        </Card>
      ) : (
        <div className="bg-white rounded-2xl border border-navy-100 shadow-navy-sm overflow-hidden flex flex-col flex-1">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm whitespace-nowrap table-fixed">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="bg-navy-50/50 border-b border-navy-100">
                  <th className="px-6 py-4 font-semibold text-navy-800 w-1/4">Học viên</th>
                  <th className="px-6 py-4 font-semibold text-navy-800 w-1/4 text-center">Chuyên cần</th>
                  <th className="px-6 py-4 font-semibold text-navy-800 w-1/4 text-center">Điểm danh</th>
                  <th className="px-6 py-4 font-semibold text-navy-800 w-1/4">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {students.map(student => {
                  const enroll = enrollments.find(e => e.studentId === student.id)
                  const isPaused = enroll?.status === 'paused'
                  const att = attendance.find(a => a.studentId === student.id)
                  const present = att ? att.present : true  // mặc định có mặt
                  const note = att ? att.note : ''
                  const rate = attendanceRates[student.id] ?? null

                  return (
                    <tr 
                      key={student.id} 
                      className={clsx(
                        "transition-colors hover:bg-navy-50/30",
                        isPaused && "opacity-50 bg-gray-50/50 hover:bg-gray-50/50"
                      )}
                    >
                      <td className="px-6 py-3">
                        <button 
                          className="flex items-center gap-3 text-left w-full group"
                          onClick={() => setSelectedStudent(student)}
                        >
                          <div className="w-9 h-9 rounded-full bg-navy-800 text-white text-xs font-bold flex items-center justify-center shrink-0">
                            {getInitials(student.name)}
                          </div>
                          <div>
                            <p className="font-medium text-navy-900 group-hover:text-navy-600 transition-colors">
                              {student.name}
                            </p>
                            {isPaused && <p className="text-xs text-amber-600 font-medium mt-0.5">Tạm ngưng</p>}
                          </div>
                        </button>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <div className="flex flex-col items-center">
                          <span className={clsx(
                            "text-sm font-semibold",
                            isPaused ? "text-navy-300" : rate === null ? "text-navy-300" : rate >= 80 ? "text-emerald-600" : rate >= 50 ? "text-amber-600" : "text-red-600"
                          )}>
                            {rate === null ? '—' : `${rate}%`}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <AttendanceToggle
                          present={present}
                          disabled={isPaused}
                          onChange={(val) => handleToggle(student.id, val)}
                        />
                      </td>
                      <td className="px-6 py-3">
                        {!isPaused ? (
                          <HomeworkNoteCell
                            note={note || ''}
                            onSave={(val) => persistCell(student.id, { present, note: val })}
                          />
                        ) : (
                          <span className="text-xs text-navy-400 italic">Không áp dụng</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <SessionModal
        open={sessionModalOpen}
        onClose={() => setSessionModalOpen(false)}
        classId={classId}
        scheduleTime={scheduleTime}
        onSaved={handleSessionSaved}
      />

      {/* Edit session modal */}
      <SessionModal
        open={!!editingSession}
        onClose={() => setEditingSession(null)}
        classId={classId}
        session={editingSession}
        onSaved={handleSessionUpdated}
      />

      {selectedStudent && (
        <StudentAttendancePanel
          student={selectedStudent}
          classId={classId}
          onClose={() => setSelectedStudent(null)}
        />
      )}

      <ConfirmModal
        open={confirmDeleteSession}
        onClose={() => setConfirmDeleteSession(false)}
        onConfirm={doDeleteSession}
        title="Xóa buổi học"
        message="Bạn có chắc chắn muốn xóa buổi học này không? Mọi dữ liệu điểm danh của buổi này sẽ bị xóa."
        confirmLabel="Xóa"
      />
    </div>
  )
}
