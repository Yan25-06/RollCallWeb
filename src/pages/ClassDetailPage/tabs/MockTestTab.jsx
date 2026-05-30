import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, FileSpreadsheet, FileText, ChevronDown, ChevronUp, ClipboardList } from 'lucide-react'
import { clsx } from 'clsx'
import { Button, Card, toast } from '@/components/ui'
import { MockTestModal } from '@/components/mock-test/MockTestModal'
import { MockTestScoreTable } from '@/components/mock-test/MockTestScoreTable'
import { StudentTestProfile } from '@/components/mock-test/StudentTestProfile'
import {
  getMockTestsByClass, getMockTestResultsByTest, deleteMockTest,
  getEnrollmentsByClass, getStudents, getResultsByStudent, getSettings,
} from '@/store/db'
import { exportMockTestExcel, exportStudentResultText } from '@/store/mockTestExport'
import { getInitials } from '@/utils/helpers'

const fmt = (iso) =>
  iso ? new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

// Sidebar item for a single student
const SidebarStudentItem = ({ student, latestResult, isActive, onClick }) => {
  const hasScore = latestResult?.totalScore > 0
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full flex items-center gap-3 px-4 py-3 text-left transition-all border-b border-navy-50 last:border-0 border-l-2',
        isActive ? 'bg-navy-50 border-l-navy-800' : 'hover:bg-navy-50/50 border-l-transparent',
      )}
    >
      <div className="w-8 h-8 rounded-full bg-navy-800 text-white text-xs font-bold flex items-center justify-center shrink-0 select-none">
        {getInitials(student.name)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-navy-800 truncate">{student.name}</p>
        <p className={clsx('text-xs truncate', hasScore ? 'text-navy-500' : 'text-navy-300')}>
          {hasScore ? `${latestResult.totalScore} điểm` : 'Chưa thi'}
        </p>
      </div>
    </button>
  )
}

// A single mock test card in class overview
const MockTestCard = ({ mockTest, results, students, className, onEdit, onDelete, onResultChange }) => {
  const [expanded, setExpanded] = useState(false)
  const sections = mockTest.sections ?? []
  const maxTotal = sections.reduce((s, sec) => s + sec.maxScore, 0)
  const totals = results.map(r => r.totalScore ?? 0).filter(v => v > 0)
  const avgTotal = totals.length ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : null
  const avgPct = avgTotal !== null && maxTotal > 0 ? Math.round((avgTotal / maxTotal) * 100) : null

  return (
    <div className="border border-navy-100 rounded-2xl overflow-hidden">
      {/* Card header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-navy-50/30 transition-colors">
        <button
          className="flex-1 flex items-center gap-3 text-left"
          onClick={() => setExpanded(o => !o)}
        >
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-navy-800">{mockTest.title}</p>
            <p className="text-xs text-navy-400 mt-0.5">
              {fmt(mockTest.date)} · {sections.length} phần thi
              {avgTotal !== null && (
                <span className={clsx(
                  'ml-2 font-semibold',
                  avgPct >= 80 ? 'text-emerald-600' : avgPct >= 50 ? 'text-amber-600' : 'text-red-600'
                )}>
                  · TB: {avgTotal}/{maxTotal} ({avgPct}%)
                </span>
              )}
            </p>
          </div>
          {expanded ? <ChevronUp size={16} className="text-navy-400 shrink-0" /> : <ChevronDown size={16} className="text-navy-400 shrink-0" />}
        </button>

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => exportMockTestExcel(mockTest, results, students, className)}
            className="p-1.5 text-navy-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
            title="Xuất Excel"
          >
            <FileSpreadsheet size={15} />
          </button>
          <button
            onClick={() => onEdit(mockTest)}
            className="p-1.5 text-navy-400 hover:text-navy-700 hover:bg-navy-100 rounded-lg transition-colors"
            title="Chỉnh sửa"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => onDelete(mockTest)}
            className="p-1.5 text-navy-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Xóa"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Expanded score table */}
      {expanded && (
        <div className="border-t border-navy-50">
          <MockTestScoreTable
            mockTest={mockTest}
            results={results}
            students={students}
            onResultChange={onResultChange}
          />
        </div>
      )}
    </div>
  )
}

export const MockTestTab = ({ classId, className }) => {
  const [mockTests, setMockTests] = useState([])
  const [resultsByTest, setResultsByTest] = useState({})
  const [students, setStudents] = useState([])
  const [selectedStudentId, setSelectedStudentId] = useState(null) // null = class overview

  const [modalOpen, setModalOpen] = useState(false)
  const [editingTest, setEditingTest] = useState(null)

  const settings = getSettings()

  const loadData = useCallback(() => {
    const tests = getMockTestsByClass(classId)
    setMockTests(tests)

    const byTest = {}
    tests.forEach(t => { byTest[t.id] = getMockTestResultsByTest(t.id) })
    setResultsByTest(byTest)

    const enrollments = getEnrollmentsByClass(classId).filter(e => e.status === 'active')
    const allStudents = getStudents()
    setStudents(allStudents.filter(s => enrollments.some(e => e.studentId === s.id)))
  }, [classId])

  useEffect(() => { loadData() }, [loadData])

  const handleEdit = (test) => { setEditingTest(test); setModalOpen(true) }

  const handleDelete = (test) => {
    if (!window.confirm(`Xóa bài kiểm tra "${test.title}" và toàn bộ điểm của học viên?`)) return
    deleteMockTest(test.id)
    toast.success('Đã xóa bài kiểm tra')
    loadData()
  }

  const handleModalSaved = () => { setEditingTest(null); loadData() }

  const handleResultChange = () => { loadData() }

  // For student profile view
  const selectedStudent = students.find(s => s.id === selectedStudentId) ?? null
  const studentResults = selectedStudentId
    ? getResultsByStudent(selectedStudentId, classId)
    : []

  // Sidebar: latest result per student
  const latestResultByStudent = {}
  students.forEach(stu => {
    const results = getResultsByStudent(stu.id, classId)
    latestResultByStudent[stu.id] = results.find(r => r.totalScore > 0) ?? null
  })

  return (
    <div className="flex gap-4 h-full min-h-0">
      {/* Sidebar */}
      <div className="w-56 shrink-0 flex flex-col h-full bg-white border border-navy-100 rounded-2xl overflow-hidden shadow-navy-sm">
        <div className="px-4 py-3 border-b border-navy-50">
          <p className="text-sm font-semibold text-navy-800">Mock Tests</p>
        </div>

        {/* "Class overview" row */}
        <button
          onClick={() => setSelectedStudentId(null)}
          className={clsx(
            'w-full flex items-center gap-3 px-4 py-3 text-left transition-all border-b border-navy-50 border-l-2',
            selectedStudentId === null ? 'bg-navy-50 border-l-navy-800' : 'hover:bg-navy-50/50 border-l-transparent',
          )}
        >
          <div className="w-8 h-8 rounded-full bg-navy-200 text-navy-700 flex items-center justify-center shrink-0">
            <ClipboardList size={14} />
          </div>
          <p className="text-sm font-medium text-navy-800">Tổng quan lớp</p>
        </button>

        {/* Students */}
        <div className="flex-1 overflow-y-auto">
          {students.map(stu => (
            <SidebarStudentItem
              key={stu.id}
              student={stu}
              latestResult={latestResultByStudent[stu.id]}
              isActive={selectedStudentId === stu.id}
              onClick={() => setSelectedStudentId(stu.id)}
            />
          ))}
        </div>
      </div>

      {/* Main panel */}
      <div className="flex-1 min-w-0 flex flex-col gap-4 overflow-y-auto">
        {selectedStudentId === null ? (
          /* ── Class overview ── */
          <>
            {/* Toolbar — same style as Attendance/Homework */}
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-navy-100 shadow-navy-sm">
              <h2 className="text-base font-semibold text-navy-800">Mock Tests</h2>
              <Button
                variant="primary"
                size="sm"
                onClick={() => { setEditingTest(null); setModalOpen(true) }}
              >
                <Plus size={14} className="mr-1" />
                Tạo Mock Test mới
              </Button>
            </div>

            {mockTests.length === 0 ? (
              <Card className="p-16 flex flex-col items-center justify-center text-center gap-3">
                <ClipboardList size={48} className="text-navy-200" />
                <p className="font-semibold text-navy-700">Chưa có bài kiểm tra nào</p>
                <p className="text-sm text-navy-400">Tạo mock test đầu tiên để bắt đầu nhập điểm</p>
                <Button
                  onClick={() => { setEditingTest(null); setModalOpen(true) }}
                  className="mt-2"
                >
                  + Tạo Mock Test mới
                </Button>
              </Card>
            ) : (
              <div className="flex flex-col gap-3">
                {mockTests.map(test => (
                  <MockTestCard
                    key={test.id}
                    mockTest={test}
                    results={resultsByTest[test.id] ?? []}
                    students={students}
                    className={className}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onResultChange={handleResultChange}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          /* ── Student test profile ── */
          <>
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-navy-100 shadow-navy-sm">
              <button
                onClick={() => setSelectedStudentId(null)}
                className="flex items-center gap-1.5 text-sm text-navy-500 hover:text-navy-800 transition-colors font-medium"
              >
                ← Tổng quan lớp
              </button>
              <span className="text-sm font-semibold text-navy-800">{selectedStudent?.name}</span>
            </div>

            <StudentTestProfile
              student={selectedStudent}
              mockTests={mockTests}
              results={studentResults}
              renderExtraAction={(test, result) => (
                <button
                  onClick={() => exportStudentResultText(selectedStudent, test, result, settings.centerName)}
                  className="flex items-center gap-1.5 text-xs text-navy-400 hover:text-navy-700 transition-colors px-2 py-1 rounded-lg hover:bg-navy-50"
                  title="Xuất kết quả dạng văn bản"
                >
                  <FileText size={13} />
                  Xuất TXT
                </button>
              )}
            />
          </>
        )}
      </div>

      {/* Modal */}
      <MockTestModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingTest(null) }}
        classId={classId}
        mockTest={editingTest}
        onSaved={handleModalSaved}
      />
    </div>
  )
}
