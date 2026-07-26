import assert from 'node:assert'
import { buildClassOverviewRows } from '../src/utils/classOverview.js'

// today cố định để test ổn định
const TODAY = '2026-07-24'

const students = [
  { id: 's1', name: 'Nguyễn A' },
  { id: 's2', name: 'Trần B' },
  { id: 's3', name: 'Lê C' },   // active nhưng chưa có bài tập
  { id: 's4', name: 'Phạm D' }, // dropped → không xuất hiện
]
const enrollments = [
  { studentId: 's1', status: 'active' },
  { studentId: 's2', status: 'active' },
  { studentId: 's3', status: 'active' },
  { studentId: 's4', status: 'dropped' },
]
const sessions = [
  { id: 'ss1', date: '2026-07-01' }, // past
  { id: 'ss2', date: '2026-07-10' }, // past
  { id: 'ss3', date: '2026-08-01' }, // future → không tính mẫu số
]
// mặc định có mặt: chỉ present===false mới là vắng
const attendance = [
  { studentId: 's1', sessionId: 'ss1', present: false }, // A vắng 1/2 buổi past
  { studentId: 's2', sessionId: 'ss1', present: true },
  { studentId: 's2', sessionId: 'ss2', present: true },
]
const homeworks = [
  { studentId: 's1', progress: 'done' },
  { studentId: 's1', progress: 'in_progress' },
  { studentId: 's2', progress: 100 },
  { studentId: 's2', progress: 'done' },
]

const rows = buildClassOverviewRows({ students, enrollments, sessions, attendance, homeworks, today: TODAY })

// chỉ HS active, sắp theo tên (vi): Lê C, Nguyễn A, Trần B
assert.deepStrictEqual(rows.map(r => r.studentId), ['s3', 's1', 's2'])

const a = rows.find(r => r.studentId === 's1')
assert.strictEqual(a.attendanceRate, 50)  // (2 past - 1 absent)/2 = 50%
assert.strictEqual(a.hwDone, 1)
assert.strictEqual(a.hwTotal, 2)
assert.strictEqual(a.hwRate, 50)

const b = rows.find(r => r.studentId === 's2')
assert.strictEqual(b.attendanceRate, 100) // không vắng
assert.strictEqual(b.hwDone, 2)
assert.strictEqual(b.hwTotal, 2)
assert.strictEqual(b.hwRate, 100)

const c = rows.find(r => r.studentId === 's3')
assert.strictEqual(c.attendanceRate, 100) // không bản ghi vắng → 100%
assert.strictEqual(c.hwDone, 0)
assert.strictEqual(c.hwTotal, 0)
assert.strictEqual(c.hwRate, 0)

// lớp không có buổi past → attendanceRate null
const noPast = buildClassOverviewRows({
  students, enrollments,
  sessions: [{ id: 'ssx', date: '2026-08-01' }],
  attendance: [], homeworks: [], today: TODAY,
})
assert.strictEqual(noPast.find(r => r.studentId === 's1').attendanceRate, null)

console.log('OK — buildClassOverviewRows', rows.length, 'rows')
