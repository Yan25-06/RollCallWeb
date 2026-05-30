import { useMemo } from 'react'
import { X } from 'lucide-react'
import { clsx } from 'clsx'
import { AttendanceRingChart } from './AttendanceRingChart'
import { Badge } from '@/components/ui'
import { getSessionsByClass, getAttendanceByStudent, getEnrollment } from '@/store/db'

export const StudentAttendancePanel = ({ student, classId, onClose }) => {
  const sessions = useMemo(() => getSessionsByClass(classId), [classId])
  const attendances = useMemo(() => getAttendanceByStudent(student?.id || ''), [student?.id])

  // Get enrollment date so we don't penalize student for sessions before they joined
  const enrollment = useMemo(() => getEnrollment(student?.id, classId), [student?.id, classId])
  const enrolledDate = enrollment?.enrolledAt ? enrollment.enrolledAt.split('T')[0] : null

  const history = useMemo(() => {
    return sessions.map(session => {
      const att = attendances.find(a => a.sessionId === session.id)
      return {
        session,
        present: att ? att.present : null,
        note: att ? att.note : ''
      }
    })
  }, [sessions, attendances])

  // Only count past sessions from enrollment date onwards
  const relevantHistory = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return history.filter(h => {
      const isPast = h.session.date <= today
      const afterEnroll = !enrolledDate || h.session.date >= enrolledDate
      return isPast && afterEnroll
    })
  }, [history, enrolledDate])

  const presentCount = relevantHistory.filter(h => h.present === true).length
  const totalCount = relevantHistory.length
  const percent = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0

  const formatDate = (isoStr) => {
    if (!isoStr) return ''
    const d = new Date(isoStr)
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  if (!student) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-navy-950/40 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-none">
        <div className={clsx(
          "bg-white shadow-navy-2xl rounded-2xl flex flex-col w-full max-w-xl max-h-[90vh] pointer-events-auto",
          "animate-scale-in"
        )}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-navy-50 flex items-center justify-between bg-white">
          <h2 className="text-lg font-display font-bold text-navy-900">{student.name}</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-navy-400 hover:text-navy-700 hover:bg-navy-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {/* Overview */}
          <div className="bg-navy-50 rounded-2xl p-6 flex flex-col items-center justify-center gap-3">
            <AttendanceRingChart present={presentCount} total={totalCount} size={80} />
            <div className="text-center">
              <p className="font-semibold text-navy-800">Tỷ lệ chuyên cần: {percent}%</p>
              <p className="text-sm text-navy-500">Đã đi học {presentCount}/{totalCount} buổi</p>
            </div>
          </div>

          {/* History Table */}
          <div>
            <h3 className="text-sm font-semibold text-navy-800 mb-3 uppercase tracking-wide">
              Lịch sử điểm danh
            </h3>
            <div className="border border-navy-100 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-navy-50/50 border-b border-navy-100">
                    <th className="px-4 py-2 font-medium text-navy-600">Buổi / Chủ đề</th>
                    <th className="px-4 py-2 font-medium text-navy-600 text-right">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-50">
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-4 py-6 text-center text-navy-400">
                        Chưa có dữ liệu
                      </td>
                    </tr>
                  ) : (
                    history.map((h, i) => (
                      <tr key={h.session.id} className="hover:bg-navy-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-navy-800">
                              Buổi {history.length - i} · {formatDate(h.session.date)}
                            </span>
                            {h.session.topic && (
                              <span className="text-xs text-navy-500 line-clamp-1">
                                {h.session.topic}
                              </span>
                            )}
                            {h.note && (
                              <span className="text-xs text-amber-600 line-clamp-1 italic">
                                Ghi chú: {h.note}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {h.present === true && <Badge variant="success">Có mặt</Badge>}
                          {h.present === false && <Badge variant="danger">Vắng</Badge>}
                          {h.present === null && <Badge variant="gray">Chưa chấm</Badge>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        </div>
      </div>
    </>
  )
}
