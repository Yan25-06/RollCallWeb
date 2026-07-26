// Hàm thuần dựng dữ liệu tổng quan lớp cho tab Dashboard.
// Không import React/supabase → test được bằng Node.
// Điểm danh dùng quy ước "mặc định có mặt": chỉ present===false mới tính vắng,
// mẫu số = số buổi đã qua (date <= today) của lớp — khớp attendanceService.getRate.
// Bài tập dùng cùng phân loại như homeworkService.getStats.

const isDone = (p) => p === 'done' || p === 100

const localToday = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const buildClassOverviewRows = ({
  students = [],
  enrollments = [],
  sessions = [],
  attendance = [],
  homeworks = [],
  today = localToday(),
} = {}) => {
  const studentById = new Map(students.map(s => [s.id, s]))

  const pastSessionIds = new Set(
    sessions.filter(s => s.date && s.date <= today).map(s => s.id)
  )
  const pastCount = pastSessionIds.size

  return enrollments
    .filter(e => e.status === 'active')
    .map(e => {
      const student = studentById.get(e.studentId)
      const name = student?.name ?? '—'

      const absent = attendance.filter(
        a => a.studentId === e.studentId && pastSessionIds.has(a.sessionId) && a.present === false
      ).length
      const attendanceRate = pastCount === 0
        ? null
        : Math.round(((pastCount - absent) / pastCount) * 100)

      const hw = homeworks.filter(h => h.studentId === e.studentId)
      const hwTotal = hw.length
      const hwDone = hw.filter(h => isDone(h.progress)).length
      const hwRate = hwTotal > 0 ? Math.round((hwDone / hwTotal) * 100) : 0

      return { studentId: e.studentId, name, status: e.status, attendanceRate, hwDone, hwTotal, hwRate }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'))
}
