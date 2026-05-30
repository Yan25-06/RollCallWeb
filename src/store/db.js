// ─── Keys ───────────────────────────────────────────────
const KEYS = {
  STUDENTS: 'phf_students',
  CLASSES: 'phf_classes',
  ATTENDANCE: 'phf_attendance',
  FEES: 'phf_fees',
  SCHEDULE: 'phf_schedule',
  REVIEWS: 'phf_reviews',
  SETTINGS: 'phf_settings',
  ENROLLMENTS: 'phf_enrollments',
  SESSION_REVIEWS: 'phf_session_reviews',
  SESSIONS: 'phf_sessions',
  HOMEWORKS: 'phf_homeworks',
  MOCK_TESTS: 'phf_mock_tests',
  MOCK_TEST_RESULTS: 'phf_mock_test_results',
  PAYMENTS: 'phf_payments',
  HW_ASSIGNMENTS: 'phf_hw_assignments',
  SUBMISSIONS: 'phf_submissions',
}

// ─── Homework progress constants ────────────────────────
export const PROGRESS = { NOT_DONE: 'not_done', IN_PROGRESS: 'in_progress', DONE: 'done' }

// ─── Generic helpers ────────────────────────────────────
const get = (key, fallback = []) => {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : fallback
  } catch { return fallback }
}
const set = (key, value) => localStorage.setItem(key, JSON.stringify(value))
export const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

// ─── Students ───────────────────────────────────────────
export const getStudents = () => get(KEYS.STUDENTS)
export const saveStudents = (s) => set(KEYS.STUDENTS, s)
export const addStudent = (data) => {
  const students = getStudents()
  const student = { id: uid(), createdAt: Date.now(), ...data }
  saveStudents([...students, student])
  return student
}
export const updateStudent = (id, data) => {
  saveStudents(getStudents().map(s => s.id === id ? { ...s, ...data } : s))
}
export const deleteStudent = (id) => {
  saveStudents(getStudents().filter(s => s.id !== id))
  saveEnrollments(getEnrollments().filter(e => e.studentId !== id))
  saveAttendance(getAttendance().filter(a => a.studentId !== id))
  saveHomeworks(getHomeworks().filter(h => h.studentId !== id))
  saveFees(getFees().filter(f => f.studentId !== id))
  saveReviews(getReviews().filter(r => r.studentId !== id))
  saveSessionReviews(getSessionReviews().filter(r => r.studentId !== id))
  savePayments(getPayments().filter(p => p.studentId !== id))
  saveSubmissions(getSubmissions().filter(s => s.studentId !== id))
  // Cascade: xoa MockTestResult cua hoc sinh nay
  saveMockTestResults(getMockTestResults().filter(r => r.studentId !== id))
}

// ─── Classes ────────────────────────────────────────────
export const getClasses = () => get(KEYS.CLASSES)
export const saveClasses = (c) => set(KEYS.CLASSES, c)
export const addClass = (data) => {
  const classes = getClasses()
  const cls = { id: uid(), createdAt: Date.now(), ...data }
  saveClasses([...classes, cls])
  return cls
}
export const updateClass = (id, data) => {
  saveClasses(getClasses().map(c => c.id === id ? { ...c, ...data } : c))
}
export const deleteClass = (id) => {
  saveClasses(getClasses().filter(c => c.id !== id))
  saveEnrollments(getEnrollments().filter(e => e.classId !== id))
  // Cache sessions truoc khi xoa de tranh doc localStorage 2 lan
  const allSessions = getSessions()
  const deletedSessionIds = new Set(allSessions.filter(s => s.classId === id).map(s => s.id))
  saveSessions(allSessions.filter(s => s.classId !== id))
  saveAttendance(getAttendance().filter(a => !deletedSessionIds.has(a.sessionId)))
  saveHomeworks(getHomeworks().filter(h => !deletedSessionIds.has(h.sessionId)))
  saveSessionReviews(getSessionReviews().filter(r => r.classId !== id))
  const allHwAssignments = getHwAssignments()
  const deletedAssignmentIds = new Set(allHwAssignments.filter(a => a.classId === id).map(a => a.id))
  saveHwAssignments(allHwAssignments.filter(a => a.classId !== id))
  saveSubmissions(getSubmissions().filter(s => !deletedAssignmentIds.has(s.hwAssignmentId)))
  savePayments(getPayments().filter(p => p.classId !== id))
  // Cascade: xoa MockTest va MockTestResult cua lop nay
  const allMockTests = getMockTests()
  const deletedMockTestIds = new Set(allMockTests.filter(t => t.classId === id).map(t => t.id))
  saveMockTests(allMockTests.filter(t => t.classId !== id))
  saveMockTestResults(getMockTestResults().filter(r => !deletedMockTestIds.has(r.mockTestId)))
}

// ─── Attendance ─────────────────────────────────────────
// Record shape: { id, studentId, classId, date: 'YYYY-MM-DD', present: bool, note?, sessionId?: string }
export const getAttendance = () => get(KEYS.ATTENDANCE)
export const saveAttendance = (a) => set(KEYS.ATTENDANCE, a)

export const getAttendanceByDate = (date) =>
  getAttendance().filter(a => a.date === date)

export const getAttendanceByStudent = (studentId) =>
  getAttendance().filter(a => a.studentId === studentId)

export const getAttendanceByMonth = (year, month) => {
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  return getAttendance().filter(a => a.date.startsWith(prefix))
}

export const getAttendanceBySession = (sessionId) =>
  getAttendance().filter(a => a.sessionId === sessionId)

export const upsertAttendanceBySession = (sessionId, studentId, present, note) => {
  const session = getSessionById(sessionId)
  if (!session) return null
  const all = getAttendance()
  const idx = all.findIndex(a => a.sessionId === sessionId && a.studentId === studentId)
  let rec = null
  if (idx >= 0) {
    rec = { ...all[idx], present }
    if (note !== undefined) rec.note = note
    all[idx] = rec
  } else {
    rec = { id: uid(), studentId, date: session.date, present, sessionId, note }
    all.push(rec)
  }
  saveAttendance(all)
  return rec
}

export const getAttendanceRate = (studentId, classId) => {
  const allSessions = getSessionsByClass(classId).filter(s => s.date <= new Date().toISOString().split('T')[0])
  if (allSessions.length === 0) return null

  const sessionIds = new Set(allSessions.map(s => s.id))
  const studentAtts = getAttendanceByStudent(studentId).filter(a => sessionIds.has(a.sessionId))
  let presentCount = 0
  for (const s of allSessions) {
    const att = studentAtts.find(a => a.sessionId === s.id)
    if (att && att.present) presentCount++
  }

  return Math.round((presentCount / allSessions.length) * 100)
}

export const upsertAttendance = (records) => {
  // records: array of { studentId, date, present, note?, sessionId? }
  const all = getAttendance()
  const updated = [...all]
  for (const rec of records) {
    const { classId: _, ...cleanRec } = rec
    const idx = updated.findIndex(
      a => a.studentId === cleanRec.studentId && (cleanRec.sessionId ? a.sessionId === cleanRec.sessionId : a.date === cleanRec.date)
    )
    if (idx >= 0) updated[idx] = { ...updated[idx], ...cleanRec }
    else updated.push({ id: uid(), ...cleanRec })
  }
  saveAttendance(updated)
}

// Count present sessions for a student in a month, optionally filtered by class
export const countSessions = (studentId, year, month, classId = null) => {
  if (classId) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`
    const sessionIds = new Set(
      getSessionsByClass(classId).filter(s => s.date.startsWith(prefix)).map(s => s.id)
    )
    return getAttendance().filter(
      a => a.studentId === studentId && a.present === true && sessionIds.has(a.sessionId)
    ).length
  }
  return getAttendanceByMonth(year, month).filter(
    a => a.studentId === studentId && a.present === true
  ).length
}

// ─── Fees ────────────────────────────────────────────────
// Shape: { id, studentId, year, month, feePerSession, surcharge, paid, note? }
export const getFees = () => get(KEYS.FEES)
export const saveFees = (f) => set(KEYS.FEES, f)

export const getFeeByStudentMonth = (studentId, year, month) =>
  getFees().find(f => f.studentId === studentId && f.year === year && f.month === month)

export const upsertFee = (data) => {
  const fees = getFees()
  const idx = fees.findIndex(
    f => f.studentId === data.studentId && f.year === data.year && f.month === data.month
  )
  if (idx >= 0) {
    fees[idx] = { ...fees[idx], ...data }
  } else {
    fees.push({ id: uid(), ...data })
  }
  saveFees(fees)
}

// Calculate total fee across all enrollments: Σ(sessions_per_class × feePerSession) + surcharge
export const calcFee = (studentId, year, month) => {
  const feeRec = getFeeByStudentMonth(studentId, year, month)
  const surcharge = feeRec?.surcharge ?? 0
  const activeEnrollments = getEnrollments().filter(
    e => e.studentId === studentId && e.status !== 'dropped'
  )
  const sessionFees = activeEnrollments.reduce((sum, e) => {
    const sessions = countSessions(studentId, year, month, e.classId)
    return sum + sessions * (e.feePerSession ?? 0)
  }, 0)
  return sessionFees + surcharge
}

// ─── Schedule ────────────────────────────────────────────
// Shape: { id, classId, dayOfWeek (0-6), startTime, endTime, room?, note? }
export const getSchedule = () => get(KEYS.SCHEDULE)
export const saveSchedule = (s) => set(KEYS.SCHEDULE, s)
export const addScheduleItem = (data) => {
  const items = getSchedule()
  const item = { id: uid(), ...data }
  saveSchedule([...items, item])
  return item
}
export const deleteScheduleItem = (id) => {
  saveSchedule(getSchedule().filter(s => s.id !== id))
}

// ─── Reviews ─────────────────────────────────────────────
// Shape: { id, studentId, classId, date, speakScore, writeScore, remark, absent?, absentReason? }
export const getReviews = () => get(KEYS.REVIEWS)
export const saveReviews = (r) => set(KEYS.REVIEWS, r)
export const upsertReview = (data) => {
  const reviews = getReviews()
  const idx = reviews.findIndex(
    r => r.studentId === data.studentId && r.date === data.date
  )
  if (idx >= 0) reviews[idx] = { ...reviews[idx], ...data }
  else reviews.push({ id: uid(), ...data })
  saveReviews(reviews)
}

// ─── Homeworks (Phase C) ────────────────────────────
export const getHomeworks = () => get(KEYS.HOMEWORKS)
export const saveHomeworks = (h) => set(KEYS.HOMEWORKS, h)

export const getHomeworkBySession = (sessionId) =>
  getHomeworks().filter(h => h.sessionId === sessionId)

export const getHomeworkByStudent = (studentId, classId) => {
  const sessionIds = new Set(getSessionsByClass(classId).map(s => s.id))
  return getHomeworks().filter(h => h.studentId === studentId && sessionIds.has(h.sessionId))
}

export const updateHomework = (id, data) => {
  const all = getHomeworks()
  const idx = all.findIndex(h => h.id === id)
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...data, updatedAt: new Date().toISOString() }
    saveHomeworks(all)
    return all[idx]
  }
  return null
}

export const updateSessionHomeworkTitle = (sessionId, title) => {
  const all = getHomeworks()
  let changed = false
  all.forEach(h => {
    if (h.sessionId === sessionId) {
      h.title = title
      h.updatedAt = new Date().toISOString()
      changed = true
    }
  })
  if (changed) saveHomeworks(all)
}

export const getHomeworkStats = (studentId, classId) => {
  const records = getHomeworkByStudent(studentId, classId)
  const stats = { done: 0, inProgress: 0, notDone: 0, total: records.length }
  records.forEach(r => {
    if (r.progress === 'done' || r.progress === 100) stats.done++
    else if (r.progress === 'in_progress' || r.progress === 50) stats.inProgress++
    else stats.notDone++
  })
  return stats
}

// ─── Sessions ────────────────────────────────────────────
// Shape: { id, classId, date, startTime, endTime, scheduleItemId?, createdManually, topic?, note?, createdAt }
export const getSessions = () => get(KEYS.SESSIONS)
export const saveSessions = (s) => set(KEYS.SESSIONS, s)

export const getSessionsByClass = (classId) =>
  getSessions().filter(s => s.classId === classId).sort((a, b) => new Date(b.date) - new Date(a.date))

export const getSessionById = (id) => getSessions().find(s => s.id === id)

export const createSession = (data) => {
  const sessions = getSessions()
  const session = { id: uid(), createdAt: new Date().toISOString(), createdManually: true, ...data }
  sessions.push(session)
  saveSessions(sessions)

  // Side-effect: create HomeworkRecord stub for each active student
  const activeStudents = getActiveStudents(data.classId)
  const homeworks = getHomeworks()
  const now = new Date().toISOString()
  activeStudents.forEach(s => {
    homeworks.push({
      id: uid(),
      sessionId: session.id,
      studentId: s.id,
      progress: 'not_done',
      title: '',
      note: '',
      createdAt: now,
      updatedAt: now
    })
  })
  saveHomeworks(homeworks)

  return session
}

// Update session metadata (date, time, topic, note) without touching attendance/homeworks
export const updateSession = (id, data) => {
  saveSessions(getSessions().map(s =>
    s.id === id ? { ...s, ...data, updatedAt: new Date().toISOString() } : s
  ))
}


export const deleteSession = (id) => {
  saveSessions(getSessions().filter(s => s.id !== id))
  // Cascade delete attendance and homeworks
  saveAttendance(getAttendance().filter(a => a.sessionId !== id))
  saveHomeworks(getHomeworks().filter(h => h.sessionId !== id))
}

// ─── StudentEnrollment ───────────────────────────────────
// Shape: { id, studentId, classId, status ('active'|'paused'|'dropped'), goal?, note?, enrolledAt, pausedAt?, droppedAt? }
export const getEnrollments = () => get(KEYS.ENROLLMENTS)
export const saveEnrollments = (e) => set(KEYS.ENROLLMENTS, e)

export const getEnrollmentsByClass = (classId) =>
  getEnrollments().filter(e => e.classId === classId)

export const getEnrollment = (studentId, classId) =>
  getEnrollments().find(e => e.studentId === studentId && e.classId === classId)

export const upsertEnrollment = (data) => {
  const enrollments = getEnrollments()
  const idx = enrollments.findIndex(
    e => e.studentId === data.studentId && e.classId === data.classId
  )
  const now = new Date().toISOString()
  let entry = idx >= 0 ? { ...enrollments[idx], ...data } : { id: uid(), enrolledAt: now, ...data }
  // Auto-write timestamps on status changes
  if (data.status === 'paused' && !entry.pausedAt) entry.pausedAt = now
  if (data.status === 'dropped' && !entry.droppedAt) entry.droppedAt = now
  if (data.status === 'active') { entry.pausedAt = null; entry.droppedAt = null }
  if (idx >= 0) enrollments[idx] = entry
  else enrollments.push(entry)
  saveEnrollments(enrollments)
  return entry
}

export const getActiveStudents = (classId) => {
  const activeEnrollments = getEnrollmentsByClass(classId).filter(e => e.status === 'active')
  const students = getStudents()
  return activeEnrollments.map(e => students.find(s => s.id === e.studentId)).filter(Boolean)
}

// ─── Session Reviews (Quick Remarks) ─────────────────────
// Shape: { id, studentId, classId, sessionId?, text, createdAt }
export const getSessionReviews = () => get(KEYS.SESSION_REVIEWS)
export const saveSessionReviews = (r) => set(KEYS.SESSION_REVIEWS, r)
export const addSessionReview = (data) => {
  const reviews = getSessionReviews()
  const entry = { id: uid(), createdAt: new Date().toISOString(), sessionId: null, ...data }
  saveSessionReviews([...reviews, entry])
  return entry
}
export const getSessionReviewsByStudent = (studentId, classId) =>
  getSessionReviews()
    .filter(r => r.studentId === studentId && r.classId === classId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

// ─── Settings ────────────────────────────────────────────
export const getSettings = () => get(KEYS.SETTINGS, {
  teacherName: '',
  centerName: 'Anh Ngữ Ms.Phương',
  defaultFeePerSession: 0,
  currency: 'đ',
})
export const saveSettings = (s) => set(KEYS.SETTINGS, { ...getSettings(), ...s })

// ─── Dashboard stats ─────────────────────────────────────
export const getDashboardStats = (year, month) => {
  const students = getStudents()
  const classes = getClasses()
  const attMonth = getAttendanceByMonth(year, month)
  const fees = getFees()
  const today = new Date().toISOString().split('T')[0]
  const attToday = getAttendanceByDate(today)
  const presentToday = attToday.filter(a => a.present).length

  // Monthly revenue
  const monthlyRevenue = students.reduce((sum, s) => {
    return sum + calcFee(s.id, year, month)
  }, 0)

  // Yearly revenue: sum calcFee across all months that have a fee record
  const months = [...new Set(fees.filter(f => f.year === year).map(f => f.month))]
  const yearlyRevenue = students.reduce((sum, s) => {
    return sum + months.reduce((mSum, m) => mSum + calcFee(s.id, year, m), 0)
  }, 0)

  return {
    totalStudents: students.length,
    totalClasses: classes.length,
    presentToday,
    monthlyRevenue,
    yearlyRevenue,
  }
}

// ─── Export / Import ─────────────────────────────────────
export const exportData = () => {
  const data = {
    version: 3,
    exportedAt: new Date().toISOString(),
    students: getStudents(),
    classes: getClasses(),
    enrollments: getEnrollments(),
    sessions: getSessions(),
    attendance: getAttendance(),
    homeworks: getHomeworks(),
    fees: getFees(),
    schedule: getSchedule(),
    reviews: getReviews(),
    sessionReviews: getSessionReviews(),
    settings: getSettings(),
    mockTests: getMockTests(),
    mockTestResults: getMockTestResults(),
    payments: getPayments(),
    hwAssignments: getHwAssignments(),
    submissions: getSubmissions(),
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `phieuhocphi_backup_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export const importData = (jsonString) => {
  const data = JSON.parse(jsonString)
  if (!data.version) throw new Error('File không hợp lệ')
  if (data.students) saveStudents(data.students)
  if (data.classes) saveClasses(data.classes)
  if (data.enrollments) saveEnrollments(data.enrollments)
  if (data.sessions) saveSessions(data.sessions)
  if (data.attendance) saveAttendance(data.attendance)
  if (data.homeworks) saveHomeworks(data.homeworks)
  if (data.fees) saveFees(data.fees)
  if (data.schedule) saveSchedule(data.schedule)
  if (data.reviews) saveReviews(data.reviews)
  if (data.sessionReviews) saveSessionReviews(data.sessionReviews)
  if (data.settings) saveSettings(data.settings)
  if (data.mockTests) saveMockTests(data.mockTests)
  if (data.mockTestResults) saveMockTestResults(data.mockTestResults)
  if (data.payments) savePayments(data.payments)
  if (data.hwAssignments) saveHwAssignments(data.hwAssignments)
  if (data.submissions) saveSubmissions(data.submissions)
}

// ─── Mock Tests ──────────────────────────────────────────
// MockTest shape: { id, classId, title, date, sections: [{id, name, maxScore, order}], teacherNote?, createdAt }
// MockTestResult shape: { id, mockTestId, studentId, scores: {[sectionId]: number}, totalScore, teacherNote?, createdAt, updatedAt }

export const getMockTests = () => get(KEYS.MOCK_TESTS)
export const saveMockTests = (v) => set(KEYS.MOCK_TESTS, v)

// 0.4
export const getMockTestsByClass = (classId) =>
  getMockTests()
    .filter(t => t.classId === classId)
    .sort((a, b) => new Date(b.date) - new Date(a.date))

// 0.5
export const createMockTest = (data) => {
  const tests = getMockTests()
  const test = { id: uid(), createdAt: new Date().toISOString(), ...data }
  saveMockTests([...tests, test])
  // Side-effect: create empty results for active students
  const activeStudents = getActiveStudents(data.classId)
  const results = getMockTestResults()
  const now = new Date().toISOString()
  activeStudents.forEach(s => {
    results.push({ id: uid(), mockTestId: test.id, studentId: s.id, scores: {}, totalScore: 0, teacherNote: '', createdAt: now, updatedAt: now })
  })
  saveMockTestResults(results)
  return test
}

// 0.6
export const updateMockTest = (id, data) => {
  const tests = getMockTests()
  const idx = tests.findIndex(t => t.id === id)
  if (idx < 0) return null
  tests[idx] = { ...tests[idx], ...data }
  saveMockTests(tests)
  return tests[idx]
}

// 0.7
export const deleteMockTest = (id) => {
  saveMockTests(getMockTests().filter(t => t.id !== id))
  saveMockTestResults(getMockTestResults().filter(r => r.mockTestId !== id))
}

export const getMockTestResults = () => get(KEYS.MOCK_TEST_RESULTS)
export const saveMockTestResults = (v) => set(KEYS.MOCK_TEST_RESULTS, v)

// 0.8
export const getMockTestResultsByTest = (mockTestId) =>
  getMockTestResults().filter(r => r.mockTestId === mockTestId)

// 0.9
export const getResultsByStudent = (studentId, classId) => {
  const testIds = new Set(getMockTestsByClass(classId).map(t => t.id))
  return getMockTestResults()
    .filter(r => r.studentId === studentId && testIds.has(r.mockTestId))
    .sort((a, b) => {
      const testA = getMockTests().find(t => t.id === a.mockTestId)
      const testB = getMockTests().find(t => t.id === b.mockTestId)
      return new Date(testA?.date) - new Date(testB?.date)
    })
}

// 0.10
export const upsertMockTestResult = (data) => {
  const results = getMockTestResults()
  const idx = results.findIndex(r => r.mockTestId === data.mockTestId && r.studentId === data.studentId)
  const now = new Date().toISOString()
  const scores = data.scores ?? (idx >= 0 ? results[idx].scores : {})
  const totalScore = Object.values(scores).reduce((s, v) => s + (Number(v) || 0), 0)
  const entry = idx >= 0
    ? { ...results[idx], ...data, scores, totalScore, updatedAt: now }
    : { id: uid(), createdAt: now, ...data, scores, totalScore, updatedAt: now }
  if (idx >= 0) results[idx] = entry
  else results.push(entry)
  saveMockTestResults(results)
  return entry
}

// ─── Payments ────────────────────────────────────────────
// Shape: { id, studentId, classId?, amount, paidAt: 'YYYY-MM-DD', method: 'cash'|'transfer', period: 'YYYY-MM', note?, createdAt }
export const getPayments = () => get(KEYS.PAYMENTS)
export const savePayments = (p) => set(KEYS.PAYMENTS, p)

export const getPaymentsByStudent = (studentId) =>
  getPayments()
    .filter(p => p.studentId === studentId)
    .sort((a, b) => b.paidAt.localeCompare(a.paidAt))

export const getPaymentsByPeriod = (period) =>
  getPayments().filter(p => p.period === period)

export const getPaidAmountByStudentPeriod = (studentId, period) =>
  getPayments()
    .filter(p => p.studentId === studentId && p.period === period)
    .reduce((sum, p) => sum + (p.amount ?? 0), 0)

export const createPayment = (data) => {
  const payments = getPayments()
  const payment = { id: uid(), createdAt: Date.now(), ...data }
  savePayments([...payments, payment])
  return payment
}

export const deletePayment = (id) => {
  savePayments(getPayments().filter(p => p.id !== id))
}

// ─── Homework Assignments ─────────────────────────────────
// Shape: { id, classId, title, description?, assignedAt: 'YYYY-MM-DD', dueDate?: 'YYYY-MM-DD', createdAt }
export const getHwAssignments = () => get(KEYS.HW_ASSIGNMENTS)
export const saveHwAssignments = (a) => set(KEYS.HW_ASSIGNMENTS, a)

export const getHwAssignmentsByClass = (classId) =>
  getHwAssignments()
    .filter(a => a.classId === classId)
    .sort((a, b) => b.assignedAt.localeCompare(a.assignedAt))

export const createHwAssignment = (data) => {
  const all = getHwAssignments()
  const entry = { id: uid(), createdAt: Date.now(), ...data }
  saveHwAssignments([...all, entry])
  return entry
}

export const updateHwAssignment = (id, data) => {
  saveHwAssignments(getHwAssignments().map(a => a.id === id ? { ...a, ...data } : a))
}

export const deleteHwAssignment = (id) => {
  saveHwAssignments(getHwAssignments().filter(a => a.id !== id))
  saveSubmissions(getSubmissions().filter(s => s.hwAssignmentId !== id))
}

// ─── Submissions ──────────────────────────────────────────
// Shape: { id, hwAssignmentId, studentId, submitted: bool, score?: number, comment?: string, gradedAt?: number }
export const getSubmissions = () => get(KEYS.SUBMISSIONS)
export const saveSubmissions = (s) => set(KEYS.SUBMISSIONS, s)

export const getSubmissionsByAssignment = (hwAssignmentId) =>
  getSubmissions().filter(s => s.hwAssignmentId === hwAssignmentId)

export const getSubmissionsByStudent = (studentId) =>
  getSubmissions().filter(s => s.studentId === studentId)

export const upsertSubmission = (data) => {
  const all = getSubmissions()
  const idx = all.findIndex(s => s.hwAssignmentId === data.hwAssignmentId && s.studentId === data.studentId)
  const now = Date.now()
  const entry = idx >= 0
    ? { ...all[idx], ...data, gradedAt: now }
    : { id: uid(), ...data, gradedAt: now }
  if (idx >= 0) all[idx] = entry
  else all.push(entry)
  saveSubmissions(all)
  return entry
}

export const deleteSubmissionsByAssignment = (hwAssignmentId) => {
  saveSubmissions(getSubmissions().filter(s => s.hwAssignmentId !== hwAssignmentId))
}

// ─── Seed demo data ──────────────────────────────────────
export const seedDemoData = () => {
  if (getStudents().length > 0) return // already seeded

  const cls1 = addClass({
    name: 'IELTS 02', level: '6.0+', maxStudents: 10,
    courseType: 'IELTS', scheduleDays: 'Thứ 2-4-6', scheduleTime: '19:00-20:30', startDate: '2026-05-11'
  })
  const cls2 = addClass({
    name: 'TOEIC 02', level: '500+', maxStudents: 8,
    courseType: 'TOEIC', scheduleDays: 'Thứ 3-5-7', scheduleTime: '19:00-20:30', startDate: '2026-05-05'
  })

  const names = [
    ['Nguyễn Minh Anh', 'Lớp 5'], ['Trần Bảo Ngọc', 'Lớp 6'],
    ['Lê Hoàng Nam', 'Lớp 7'], ['Phạm Thu Hà', 'Lớp 5'],
    ['Đặng Quốc Tuấn', 'Lớp 8'], ['Vũ Ngọc Linh', 'Lớp 6'],
  ]
  const studentIds = names.map(([name, grade], i) => {
    const s = addStudent({
      name,
      grade,
      phone: `090${String(i + 1).padStart(7, '0')}`,
    })
    return s.id
  })

  // Seed enrollments for demo students (feePerSession lives on enrollment)
  const goals = [
    'Đạt 7.0 IELTS để du học Úc', 'Cải thiện kỹ năng nghe và đọc',
    'Lấy chứng chỉ IELTS', 'Đạt 650 TOEIC cho công việc',
    'Nâng cao kỹ năng giao tiếp', 'Chuẩn bị cho kỳ thi TOEIC tháng 8',
  ]
  const statuses = ['active', 'active', 'active', 'active', 'paused', 'active']
  studentIds.forEach((studentId, i) => {
    const classId = i < 3 ? cls1.id : cls2.id
    const status = statuses[i]
    const entry = {
      studentId,
      classId,
      status,
      feePerSession: 150000,
      goal: goals[i],
      note: '',
      enrolledAt: new Date(Date.now() - (30 - i * 3) * 24 * 60 * 60 * 1000).toISOString(),
    }
    if (status === 'paused') entry.pausedAt = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    upsertEnrollment(entry)
  })

  // Seed sessions
  const y = new Date().getFullYear()
  const m = new Date().getMonth() + 1
  const s1 = createSession({
    classId: cls1.id, date: `${y}-${String(m).padStart(2, '0')}-01`, startTime: '19:00', endTime: '20:30', topic: 'Unit 1: Introduction to IELTS'
  })
  const s2 = createSession({
    classId: cls1.id, date: `${y}-${String(m).padStart(2, '0')}-03`, startTime: '19:00', endTime: '20:30', topic: 'Unit 2: Listening Part 1'
  })
  const s3 = createSession({
    classId: cls1.id, date: `${y}-${String(m).padStart(2, '0')}-05`, startTime: '19:00', endTime: '20:30', topic: 'Unit 3: Reading Techniques'
  })

  // Seed attendance for current month
  const now = new Date()
  const days = [1, 3, 5, 8, 10, 12, 15, 17, 19, 22]
  const recs = []
  const sessionIdsCls1 = [s1.id, s2.id, s3.id, null, null, null, null, null, null, null]
  for (let d_idx = 0; d_idx < days.length; d_idx++) {
    const d = days[d_idx]
    for (let i = 0; i < studentIds.length; i++) {
      const classId = i < 3 ? cls1.id : cls2.id
      let sessionId = null
      if (classId === cls1.id) sessionId = sessionIdsCls1[d_idx]

      recs.push({
        studentId: studentIds[i],
        date: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        present: Math.random() > 0.15,
        sessionId
      })
    }
  }
  upsertAttendance(recs)

  // Seed fees (no feePerSession — lives on enrollment now)
  for (const id of studentIds) {
    upsertFee({ studentId: id, year: y, month: m, surcharge: 0, paid: false })
  }

  saveSettings({ teacherName: 'Ms.Phương', centerName: 'Anh Ngữ Ms.Phương' })
}
