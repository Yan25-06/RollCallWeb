import { useState, useEffect } from 'react'
import { Card, Button, Empty, toast, Skeleton, ConfirmModal } from '@/components/ui'
import { Plus, BookOpen } from 'lucide-react'
import { classService, teacherService } from '@/services/classService'
import { enrollmentService } from '@/services/enrollmentService'
import { ClassModal } from '@/components/classes/ClassModal'
import { ClassCard } from '@/components/classes/ClassCard'
import { usePermissions } from '@/hooks/usePermissions'

export const ClassesOverviewPage = ({ onSelectClass }) => {
  const { canManageClasses: isAdmin } = usePermissions()

  const [classes, setClasses] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [classModalOpen, setClassModalOpen] = useState(false)
  const [editingClass, setEditingClass] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null })

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const promises = [classService.getAll(), enrollmentService.getAll()]
      if (isAdmin) promises.push(teacherService.getAll())
      const [cls, enr, tchs] = await Promise.all(promises)
      setClasses(cls)
      setEnrollments(enr)
      if (tchs) setTeachers(tchs)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSaveClass = async (data) => {
    try {
      if (editingClass) {
        await classService.update(editingClass.id, data)
      } else {
        await classService.create(data)
      }
      setClassModalOpen(false)
      setEditingClass(null)
      await loadData()
    } catch (err) {
      toast.error('Lỗi: ' + err.message)
    }
  }

  const handleDeleteClass = (id) => {
    const hasActiveStudents = enrollments
      .filter(e => e.classId === id)
      .some(e => e.status !== 'dropped')
    if (hasActiveStudents) {
      toast.error('Không thể xóa lớp đang có học viên theo học. Vui lòng chuyển học viên sang lớp khác hoặc đổi trạng thái thành "Đã nghỉ" trước.')
      return
    }
    setConfirmDelete({ open: true, id })
  }

  const doDeleteClass = async () => {
    try {
      await classService.remove(confirmDelete.id)
      toast.success('Đã xóa lớp học')
      await loadData()
    } catch (err) {
      toast.error('Lỗi: ' + err.message)
    }
  }

  const openClassModal = (classItem = null) => {
    setEditingClass(classItem)
    setClassModalOpen(true)
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-fade-in">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="rounded-2xl border border-navy-100 overflow-hidden flex flex-col">
              <div className="p-5 flex flex-col gap-4 flex-1">
                <div className="flex justify-between items-start">
                  <Skeleton className="h-5 w-20 rounded-lg" />
                  <Skeleton className="h-5 w-5 rounded" />
                </div>
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <div className="flex flex-col gap-2 mt-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
              <div className="border-t border-navy-100 p-4 px-5">
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4 animate-fade-in">
        <h1 className="text-2xl font-display font-bold text-navy-900">Lớp học</h1>
        <Card className="p-8 text-center">
          <p className="text-red-600 font-medium">Lỗi tải dữ liệu</p>
          <p className="text-sm text-navy-400 mt-1">{error}</p>
          <Button onClick={loadData} className="mt-4">Thử lại</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-navy-900">Lớp học</h1>
          <p className="text-sm text-navy-400 mt-0.5">Quản lý danh sách lớp học</p>
        </div>

        {isAdmin && (
          <Button onClick={() => openClassModal()} className="shrink-0 flex items-center gap-2">
            <Plus size={18} /> Thêm lớp học
          </Button>
        )}
      </div>

      {classes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {classes.map(cls => {
            const studentCount = enrollments
              .filter(e => e.classId === cls.id && e.status === 'active').length
            return (
              <div key={cls.id} onClick={() => onSelectClass(cls.id)} className="cursor-pointer">
                <ClassCard
                  cls={cls}
                  studentCount={studentCount}
                  onEdit={() => openClassModal(cls)}
                  onDelete={isAdmin ? () => handleDeleteClass(cls.id) : undefined}
                  showTeacher={isAdmin}
                />
              </div>
            )
          })}
        </div>
      ) : (
        <Card className="p-12">
          <Empty
            icon={<BookOpen />}
            title="Chưa có lớp nào được giao"
            desc={isAdmin
              ? 'Bấm nút Thêm lớp học để tạo lớp mới'
              : 'Liên hệ quản trị viên để được tạo và giao lớp'}
            action={isAdmin && (
              <Button onClick={() => openClassModal()} className="mt-4 flex items-center gap-2">
                <Plus size={18} /> Thêm lớp học
              </Button>
            )}
          />
        </Card>
      )}

      <ClassModal
        open={classModalOpen}
        onClose={() => setClassModalOpen(false)}
        classItem={editingClass}
        onSave={handleSaveClass}
        isAdmin={isAdmin}
        teachers={teachers}
      />

      <ConfirmModal
        open={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, id: null })}
        onConfirm={doDeleteClass}
        title="Xóa lớp học"
        message="Bạn có chắc chắn muốn xóa lớp học này không?"
        confirmLabel="Xóa"
      />
    </div>
  )
}
