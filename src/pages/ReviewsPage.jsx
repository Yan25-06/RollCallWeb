import { useState, useMemo, useEffect, useCallback } from 'react'
import { GraduationCap, FileText, Users, User, Search, UserCircle, Archive } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { clsx } from 'clsx'
import { Button, Skeleton, toast, ConfirmModal } from '@/components/ui'
import { RadarChartPanel }       from '@/components/reviews/RadarChartPanel'
import { ReviewHistory }         from '@/components/reviews/ReviewHistory'
import { ReviewForm }            from '@/components/reviews/ReviewForm'
import { ReportCardModal }       from '@/components/reviews/ReportCardModal'
import { BulkExportModal }       from '@/components/reviews/BulkExportModal'
import { DateRangeFilter }       from '@/components/reviews/DateRangeFilter'
import { AttendancePanel }       from '@/components/reviews/AttendancePanel'
import { HomeworkPanel }         from '@/components/reviews/HomeworkPanel'
import { ClassOverviewTable }    from '@/components/reviews/ClassOverviewTable'
import { useDebounce }           from '@/utils/useDebounce'
import { reviewService }         from '@/services/reviewService'
import { generalCommentService } from '@/services/generalCommentService'
import { classService }          from '@/services/classService'
import { studentService }        from '@/services/studentService'
import { enrollmentService }     from '@/services/enrollmentService'
import { attendanceService }     from '@/services/attendanceService'
import { homeworkService }       from '@/services/homeworkService'
import { mockTestService }       from '@/services/mockTestService'
import { mockTestResultService } from '@/services/mockTestResultService'

const STORAGE_KEY = 'reviews_ui_state'

const fmtLocalDate = (d) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Default range spans the last 6 months (current month + 5 previous) so reviews
// from earlier months aren't hidden by the filter when the page first loads.
const getDefaultDateRange = () => {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  return { fromDate: fmtLocalDate(from), toDate: fmtLocalDate(now) }
}

const loadState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

// Compact student list shown in the left panel (individual mode only)
const StudentList = ({ students, enrollmentMap, selectedClassId, selectedStudentId, onSelectStudent }) => {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 200)

  useEffect(() => { setSearch('') }, [selectedClassId])

  const classStudentIds = selectedClassId ? (enrollmentMap.get(selectedClassId) ?? []) : []
  const classStudents   = students.filter(s => classStudentIds.includes(s.id))
  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    return q ? classStudents.filter(s => s.name.toLowerCase().includes(q)) : classStudents
  }, [classStudents, debouncedSearch])

  if (!selectedClassId) {
    return (
      <div className="p-4 text-sm text-navy-400 text-center">Chọn lớp để xem danh sách học viên</div>
    )
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
        <input
          className="input pl-8 text-sm w-full"
          placeholder="Tìm học viên..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1 max-h-[calc(100vh-20rem)] overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <p className="text-sm text-navy-400 text-center py-4">Không tìm thấy</p>
        ) : (
          filtered.map(s => (
            <button
              key={s.id}
              onClick={() => onSelectStudent(s.id)}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all border',
                selectedStudentId === s.id
                  ? 'bg-navy-800 text-white border-navy-800'
                  : 'bg-white text-navy-700 border-navy-100 hover:border-navy-300 hover:bg-navy-50'
              )}
            >
              <UserCircle size={20} className={selectedStudentId === s.id ? 'text-white/70' : 'text-navy-300'} />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{s.name}</p>
                {s.grade && (
                  <p className={clsx('text-xs', selectedStudentId === s.id ? 'text-white/60' : 'text-navy-400')}>
                    {s.grade}
                  </p>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

export const ReviewsPage = ({ settings = {} }) => {
  const { teacher } = useAuth()

  // Restore persisted state on mount
  const saved = loadState()

  const [selectedClassId,   setSelectedClassIdRaw]   = useState(saved.selectedClassId   ?? null)
  const [selectedStudentId, setSelectedStudentIdRaw] = useState(saved.selectedStudentId ?? null)
  const [viewMode,          setViewModeRaw]          = useState(saved.viewMode          ?? 'individual')
  const [dateRange,         setDateRangeRaw]         = useState(saved.dateRange         ?? getDefaultDateRange())
  const [formOpen,       setFormOpen]       = useState(false)
  const [editingReview,  setEditingReview]  = useState(null)
  const [reportOpen,     setReportOpen]     = useState(false)
  const [bulkExportOpen, setBulkExportOpen] = useState(false)
  const [deletingReview, setDeletingReview] = useState(null)

  // Wrap setters to also persist to localStorage
  const persist = (patch) => {
    try {
      const current = loadState()
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...patch }))
    } catch {}
  }

  const setSelectedClassId = (id) => {
    setSelectedClassIdRaw(id)
    persist({ selectedClassId: id })
  }
  const setSelectedStudentId = (id) => {
    setSelectedStudentIdRaw(id)
    persist({ selectedStudentId: id })
  }
  const setViewMode = (mode) => {
    setViewModeRaw(mode)
    persist({ viewMode: mode })
  }
  const setDateRange = (range) => {
    setDateRangeRaw(range)
    persist({ dateRange: range })
  }

  const [classes,        setClasses]        = useState([])
  const [students,       setStudents]       = useState([])
  const [enrollmentMap,  setEnrollmentMap]  = useState(new Map())
  const [reviews,        setReviews]        = useState([])
  const [generalComment, setGeneralComment] = useState(null)
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [mocksByStudent, setMocksByStudent] = useState(new Map())

  // Load classes + students once on mount
  useEffect(() => {
    Promise.all([classService.getAll(), studentService.getAll()])
      .then(([cls, stu]) => { setClasses(cls); setStudents(stu) })
      .catch(() => {})
  }, [])

  // Load enrollments for selected class
  useEffect(() => {
    if (!selectedClassId) { setEnrollmentMap(new Map()); return }
    enrollmentService.getByClass(selectedClassId)
      .then(enrollments => {
        const ids = enrollments.filter(e => e.status === 'active').map(e => e.studentId)
        setEnrollmentMap(new Map([[selectedClassId, ids]]))
      })
      .catch(() => {})
  }, [selectedClassId])

  // Load mock test data for overview table (task 1.2)
  useEffect(() => {
    if (!selectedClassId) { setMocksByStudent(new Map()); return }
    Promise.all([
      mockTestService.getByClass(selectedClassId),
      mockTestResultService.getByClass(selectedClassId),
    ]).then(([tests, results]) => {
      const testMap = new Map(tests.map(t => [t.id, t]))
      const map = new Map()
      results.forEach(r => {
        if (r.totalScore <= 0) return
        const mt = testMap.get(r.mockTestId)
        if (!mt) return
        const arr = map.get(r.studentId) ?? []
        arr.push({ result: r, mockTest: mt })
        map.set(r.studentId, arr)
      })
      // Sort each student's results: newest test date first, then createdAt for tie-breaking (task 2.3)
      map.forEach(entries => {
        entries.sort((a, b) => {
          const dateA = a.mockTest.date || ''
          const dateB = b.mockTest.date || ''
          if (dateB !== dateA) return dateB.localeCompare(dateA)
          return (b.result.createdAt || '').localeCompare(a.result.createdAt || '')
        })
      })
      setMocksByStudent(map)
    }).catch(() => {})
  }, [selectedClassId])

  const selectedStudent = students.find(s => s.id === selectedStudentId) ?? null
  const selectedClass   = classes.find(c => c.id === selectedClassId)   ?? null

  const classStudents = useMemo(() => {
    if (!selectedClassId) return []
    const ids = enrollmentMap.get(selectedClassId) ?? []
    return students.filter(s => ids.includes(s.id))
  }, [students, enrollmentMap, selectedClassId])

  const loadReviews = useCallback(async () => {
    if (!selectedStudentId || !selectedClassId) { setReviews([]); setGeneralComment(null); return }
    setReviewsLoading(true)
    try {
      const [reviewData, commentData] = await Promise.all([
        reviewService.getByStudent(selectedStudentId, selectedClassId),
        generalCommentService.get(selectedStudentId, selectedClassId),
      ])
      setReviews(reviewData)
      setGeneralComment(commentData)
    } catch (err) {
      toast.error('Không tải được đánh giá: ' + err.message)
    } finally {
      setReviewsLoading(false)
    }
  }, [selectedStudentId, selectedClassId])

  useEffect(() => { loadReviews() }, [selectedStudentId, selectedClassId])

  // Enrich reviews whose scoreMax is empty (created before scoreMax was introduced)
  // using the latest mock entry as a fallback — same logic as ReviewForm edit mode.
  const enrichedReviews = useMemo(() => {
    const mockEntry = mocksByStudent.get(selectedStudentId)?.[0]
    if (!mockEntry) return reviews
    const fallbackMax = {}
    ;(mockEntry.mockTest.sections ?? []).forEach(s => { fallbackMax[s.name] = s.maxScore ?? 9 })
    return reviews.map(review => {
      if (review.scoreMax && Object.keys(review.scoreMax).length > 0) return review
      return { ...review, scoreMax: fallbackMax }
    })
  }, [reviews, mocksByStudent, selectedStudentId])

  const filteredReviews = useMemo(
    () => enrichedReviews.filter(r => r.date >= dateRange.fromDate && r.date <= dateRange.toDate),
    [enrichedReviews, dateRange.fromDate, dateRange.toDate]
  )

  const latestReview = enrichedReviews[0] ?? null

  const [attendanceDetail, setAttendanceDetail] = useState(null)
  const [homeworkDetail,   setHomeworkDetail]   = useState(null)

  useEffect(() => {
    if (!selectedStudentId || !selectedClassId) { setAttendanceDetail(null); setHomeworkDetail(null); return }
    Promise.all([
      attendanceService.getRateByRange(selectedStudentId, selectedClassId, dateRange.fromDate, dateRange.toDate),
      homeworkService.getByRange(selectedStudentId, selectedClassId, dateRange.fromDate, dateRange.toDate),
    ]).then(([attRate, hwRecs]) => {
      setAttendanceDetail(attRate
        ? { pct: attRate.pct, present: attRate.present, total: attRate.total, absentDates: attRate.absentDates ?? [] }
        : null)
      if (hwRecs.length) {
        let done = 0, inProg = 0
        const missing = []
        hwRecs.forEach(r => {
          if (r.progress === 'done' || r.progress === 100) done++
          else {
            if (r.progress === 'in_progress' || r.progress === 50) inProg++
            missing.push({ date: r.date, sessionTopic: r.sessionTopic })
          }
        })
        missing.sort((a, b) => (a.date || '').localeCompare(b.date || ''))
        setHomeworkDetail({
          pct: Math.round((done * 100 + inProg * 50) / hwRecs.length),
          done,
          total: hwRecs.length,
          missing,
        })
      } else {
        setHomeworkDetail(null)
      }
    }).catch(() => { setAttendanceDetail(null); setHomeworkDetail(null) })
  }, [selectedStudentId, selectedClassId, dateRange.fromDate, dateRange.toDate])

  const handleSaveReview = async (data) => {
    try {
      await reviewService.upsert(data)
      toast.success(editingReview ? 'Đã cập nhật đánh giá' : 'Đã lưu đánh giá')
      await loadReviews()
    } catch (err) {
      toast.error('Lưu thất bại: ' + err.message)
    }
  }

  const openAdd  = () => { setEditingReview(null); setFormOpen(true) }
  const openEdit = (rev) => { setEditingReview(rev); setFormOpen(true) }

  const handleDeleteReview = async () => {
    if (!deletingReview) return
    try {
      await reviewService.remove(deletingReview.id)
      toast.success('Đã xóa đánh giá')
      await loadReviews()
    } catch (err) {
      toast.error('Xóa thất bại: ' + err.message)
    }
  }

  const hasStudentSelected = !!(selectedClassId && selectedStudentId)

  return (
    <div className="flex flex-col gap-6 animate-fade-in">

      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold text-navy-900">Nhận xét học viên</h1>
          <p className="text-sm text-navy-400 mt-0.5">Đánh giá năng lực và xuất phiếu kết quả</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {selectedClassId && (
            <Button
              variant="secondary" size="md"
              onClick={() => setBulkExportOpen(true)}
              className="flex items-center gap-2"
            >
              <Archive size={16} />
              Xuất tất cả
            </Button>
          )}
          {hasStudentSelected && viewMode === 'individual' && (
            <Button
              variant="secondary" size="md"
              onClick={() => setReportOpen(true)}
              className="flex items-center gap-2"
            >
              <FileText size={16} />
              Xuất Phiếu Gửi Phụ Huynh
            </Button>
          )}
        </div>
      </div>

      {/* ── Toolbar: ViewModeToggle + Class selector + DateRangeFilter ── */}
      <div className="bg-white rounded-2xl border border-navy-100 shadow-navy-sm px-4 py-3 flex flex-wrap items-center gap-3">

        {/* View mode toggle */}
        <div className="flex items-center bg-navy-50 rounded-xl p-1 gap-1 shrink-0">
          <button
            onClick={() => setViewMode('individual')}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              viewMode === 'individual' ? 'bg-white text-navy-800 shadow-sm' : 'text-navy-500 hover:text-navy-700'
            )}
          >
            <User size={14} /> Cá Nhân
          </button>
          <button
            onClick={() => setViewMode('overview')}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              viewMode === 'overview' ? 'bg-white text-navy-800 shadow-sm' : 'text-navy-500 hover:text-navy-700'
            )}
          >
            <Users size={14} /> Tổng quan lớp
          </button>
        </div>

        <div className="w-px h-6 bg-navy-100 shrink-0" />

        {/* Class selector — shared between both modes */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-navy-500 font-medium">Lớp</span>
          <select
            value={selectedClassId ?? ''}
            onChange={e => {
              setSelectedClassId(e.target.value || null)
              setSelectedStudentId(null)
            }}
            className="text-sm border border-navy-200 rounded-lg px-2.5 py-1.5 text-navy-800 focus:outline-none focus:ring-2 focus:ring-navy-300 bg-white"
          >
            <option value="">— Chọn lớp —</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
        </div>

        <div className="w-px h-6 bg-navy-100 shrink-0" />

        {/* Date range filter */}
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* ── Main layout ── */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* Left panel: student list (individual mode only) */}
        {viewMode === 'individual' && (
          <div className="w-full lg:w-64 shrink-0 bg-white rounded-2xl border border-navy-100 shadow-navy-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-navy-50">
              <p className="text-xs font-semibold text-navy-500 uppercase tracking-wide">Học viên</p>
            </div>
            <StudentList
              students={students}
              enrollmentMap={enrollmentMap}
              selectedClassId={selectedClassId}
              selectedStudentId={selectedStudentId}
              onSelectStudent={setSelectedStudentId}
            />
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 min-w-0">

          {/* Overview mode */}
          {viewMode === 'overview' && (
            <ClassOverviewTable
              classId={selectedClassId}
              cls={selectedClass}
              dateRange={dateRange}
              mocksByStudent={mocksByStudent}
            />
          )}

          {/* Individual mode */}
          {viewMode === 'individual' && (
            !hasStudentSelected ? (
              <div className="bg-white rounded-2xl border border-navy-100 shadow-navy-sm p-16 flex flex-col items-center justify-center gap-4 text-center">
                <div className="w-16 h-16 rounded-3xl bg-navy-50 flex items-center justify-center">
                  <GraduationCap size={28} className="text-navy-300" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-semibold text-navy-700">
                    {selectedClassId ? 'Chọn học viên để xem nhận xét' : 'Chọn lớp và học viên'}
                  </p>
                  <p className="text-sm text-navy-400 mt-1">để xem và tạo đánh giá năng lực</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Student banner */}
                <div className="bg-white rounded-2xl border border-navy-100 shadow-navy-sm px-5 py-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-navy-400">Học viên đang xem</p>
                    <p className="text-lg font-bold text-navy-900">{selectedStudent?.name}</p>
                  </div>
                  <span className="text-xs bg-navy-100 text-navy-700 px-3 py-1 rounded-full font-medium">
                    {selectedClass?.name}
                  </span>
                </div>

                {reviewsLoading ? (
                  <>
                    <div className="flex flex-col md:flex-row gap-4 items-start">
                      <Skeleton className="w-full md:w-1/2 h-64 rounded-2xl" />
                      <Skeleton className="w-full md:w-1/2 h-64 rounded-2xl" />
                    </div>
                    <div className="flex flex-col md:flex-row gap-4 items-start">
                      <Skeleton className="w-full md:w-1/2 h-40 rounded-2xl" />
                      <Skeleton className="w-full md:w-1/2 h-40 rounded-2xl" />
                    </div>
                  </>
                ) : (
                  <>
                    {/* Radar + history */}
                    <div className="flex flex-col md:flex-row gap-4 items-start">
                      <div className="w-full md:w-1/2">
                        <RadarChartPanel
                          reviews={filteredReviews}
                          skillConfig={selectedClass?.skillConfig}
                          onAddReview={mocksByStudent.get(selectedStudentId)?.[0] ? openAdd : undefined}
                        />
                      </div>
                      <div className="w-full md:w-1/2">
                        <ReviewHistory reviews={filteredReviews} skillConfig={selectedClass?.skillConfig} onEdit={openEdit} onDelete={setDeletingReview} />
                      </div>
                    </div>

                    {/* Attendance + homework */}
                    <div className="flex flex-col md:flex-row gap-4 items-start">
                      <div className="w-full md:w-1/2">
                        <AttendancePanel
                          studentId={selectedStudentId}
                          classId={selectedClassId}
                          dateRange={dateRange}
                        />
                      </div>
                      <div className="w-full md:w-1/2">
                        <HomeworkPanel
                          studentId={selectedStudentId}
                          classId={selectedClassId}
                          dateRange={dateRange}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )
          )}
        </div>
      </div>

      {/* Modals */}
      <ReviewForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editingReview={editingReview}
        studentId={selectedStudentId}
        classId={selectedClassId}
        teacherName={teacher?.name}
        skillConfig={selectedClass?.skillConfig}
        latestMockEntry={mocksByStudent.get(selectedStudentId)?.[0] ?? null}
        onSave={handleSaveReview}
      />

      <ConfirmModal
        open={!!deletingReview}
        onClose={() => setDeletingReview(null)}
        onConfirm={handleDeleteReview}
        title="Xóa đánh giá"
        message={`Xóa phiếu đánh giá ngày ${deletingReview ? new Date(deletingReview.date).toLocaleDateString('vi-VN') : ''}? Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa"
      />

      <ReportCardModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        student={selectedStudent}
        cls={selectedClass}
        latestReview={latestReview}
        settings={{ ...settings, teacherName: teacher?.name }}
        dateRange={dateRange}
        attendanceDetail={attendanceDetail}
        homeworkDetail={homeworkDetail}
        generalComment={generalComment}
      />

      <BulkExportModal
        open={bulkExportOpen}
        onClose={() => setBulkExportOpen(false)}
        students={classStudents}
        cls={selectedClass}
        settings={{ ...settings, teacherName: teacher?.name }}
        dateRange={dateRange}
      />
    </div>
  )
}
