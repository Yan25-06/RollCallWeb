import { useState, useEffect, useCallback } from 'react'
import { clsx } from 'clsx'
import { Users } from 'lucide-react'
import { Skeleton, Card, Button } from '@/components/ui'
import { StudentSidebar } from '@/components/students/StudentSidebar'
import { StudentDetailPanel } from '@/components/students/StudentDetailPanel'
import { EnrollmentModal } from '@/components/students/EnrollmentModal'
import { BulkEnrollPickerModal } from '@/components/students/BulkEnrollPickerModal'
import { StudentEditModal } from '@/components/students/StudentEditModal'
import { studentService } from '@/services/studentService'
import { enrollmentService } from '@/services/enrollmentService'

export const StudentsTab = ({ classId, onEnrollmentChange, isAdmin = false, initialStudentId = null }) => {
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [selectedStudentId, setSelectedStudentId] = useState(null)

  const [mobileShowDetail, setMobileShowDetail] = useState(false)

  const [pickerOpen, setPickerOpen] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [allStudents, classEnrollments] = await Promise.all([
        studentService.getAll(),
        enrollmentService.getByClass(classId),
      ])
      setStudents(allStudents)
      setEnrollments(classEnrollments)

      if (!selectedStudentId || !classEnrollments.find(e => e.studentId === selectedStudentId)) {
        const wanted = initialStudentId && classEnrollments.find(e => e.studentId === initialStudentId)
          ? initialStudentId
          : null
        const firstActive = classEnrollments.find(e => e.status === 'active')
        const first = firstActive || classEnrollments[0]
        setSelectedStudentId(wanted || first?.studentId || null)
      }
    } catch {
      // errors surfaced by empty state
    } finally {
      setLoading(false)
    }
    onEnrollmentChange?.()
  }, [classId, initialStudentId])

  useEffect(() => {
    loadData()
  }, [classId])

  useEffect(() => {
    if (initialStudentId) {
      setSelectedStudentId(initialStudentId)
      setMobileShowDetail(true)
    }
  }, [initialStudentId])

  const handleSelectStudent = (studentId) => {
    setSelectedStudentId(studentId)
    setMobileShowDetail(true)
  }

  const handleAddStudent = () => setPickerOpen(true)
  const handleCreateStudent = () => setCreateModalOpen(true)
  const handleEditEnrollment = () => setEditModalOpen(true)
  const handleModalSaved = () => loadData()

  const selectedStudent = students.find(s => s.id === selectedStudentId) || null
  const selectedEnrollment = selectedStudentId
    ? enrollments.find(e => e.studentId === selectedStudentId) || null
    : null

  if (!loading && enrollments.length === 0) {
    return (
      <>
        <Card className="p-16 flex flex-col items-center justify-center text-center gap-3">
          <Users size={48} className="text-navy-200" />
          <p className="font-semibold text-navy-700">Lớp chưa có học viên nào</p>
          {isAdmin && <p className="text-sm text-navy-400">Bấm nút bên dưới để thêm học viên</p>}
          {isAdmin && (
            <div className="flex items-center gap-2 mt-2">
              <Button onClick={handleAddStudent}>+ Thêm học viên</Button>
              <Button variant="secondary" onClick={handleCreateStudent}>Tạo học sinh mới</Button>
            </div>
          )}
        </Card>
        <BulkEnrollPickerModal
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          classId={classId}
          currentEnrollments={enrollments}
          onSaved={handleModalSaved}
        />
        <EnrollmentModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          mode="add"
          classId={classId}
          onSaved={handleModalSaved}
          isAdmin={isAdmin}
        />
      </>
    )
  }

  if (loading) {
    return (
      <div className="flex gap-4 h-[600px]">
        <div className="w-72 shrink-0 flex flex-col gap-3 p-4 bg-white rounded-2xl border border-navy-100">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-32" />
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
        </div>
        <div className="flex-1 flex flex-col gap-4">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
          </div>
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <>
      {/* ─── Desktop layout: sidebar w-72 + panel flex-1 ─── */}
      <div className="hidden md:flex gap-4 h-full min-h-[600px]">
        <div className="w-72 shrink-0 h-full">
          <StudentSidebar
            enrollments={enrollments}
            students={students}
            activeId={selectedStudentId}
            onSelect={handleSelectStudent}
            onAddStudent={handleAddStudent}
            onCreateStudent={handleCreateStudent}
            isAdmin={isAdmin}
          />
        </div>

        <div className="flex-1 overflow-hidden">
          {selectedStudent && selectedEnrollment ? (
            <StudentDetailPanel
              student={selectedStudent}
              enrollment={selectedEnrollment}
              onEdit={handleEditEnrollment}
              onStatusChange={loadData}
              isAdmin={isAdmin}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-navy-400">
              <p className="text-sm">Chọn học viên để xem chi tiết</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Mobile layout: list → slide-in detail ─── */}
      <div className="md:hidden relative overflow-hidden">
        <div
          className={clsx(
            'transition-transform duration-300 ease-in-out',
            mobileShowDetail ? '-translate-x-full absolute inset-0' : 'translate-x-0'
          )}
        >
          <StudentSidebar
            enrollments={enrollments}
            students={students}
            activeId={selectedStudentId}
            onSelect={handleSelectStudent}
            onAddStudent={handleAddStudent}
            onCreateStudent={handleCreateStudent}
            isAdmin={isAdmin}
          />
        </div>

        <div
          className={clsx(
            'transition-transform duration-300 ease-in-out',
            mobileShowDetail ? 'translate-x-0' : 'translate-x-full absolute inset-0'
          )}
        >
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setMobileShowDetail(false)}
              className="flex items-center gap-1.5 text-sm text-navy-600 hover:text-navy-900 transition-colors"
            >
              ← Danh sách
            </button>
          </div>
          {selectedStudent && selectedEnrollment ? (
            <StudentDetailPanel
              student={selectedStudent}
              enrollment={selectedEnrollment}
              onEdit={handleEditEnrollment}
              onStatusChange={loadData}
              isAdmin={isAdmin}
            />
          ) : null}
        </div>
      </div>

      {/* ─── Bulk enroll picker ─── */}
      <BulkEnrollPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        classId={classId}
        currentEnrollments={enrollments}
        onSaved={handleModalSaved}
      />

      {/* ─── Create new student (admin) ─── */}
      <EnrollmentModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        mode="add"
        classId={classId}
        onSaved={handleModalSaved}
        isAdmin={isAdmin}
      />

      {/* ─── Edit student + enrollment ─── */}
      {selectedStudent && selectedEnrollment && (
        <StudentEditModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          student={selectedStudent}
          enrollment={selectedEnrollment}
          onSaved={handleModalSaved}
        />
      )}
    </>
  )
}
