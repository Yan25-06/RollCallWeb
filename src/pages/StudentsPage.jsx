import { useState, useEffect } from 'react'
import { Card, Button, Input, Select, Badge, Empty, toast } from '@/components/ui'
import { Search, Plus, Edit2, Trash2, Users, BookOpen } from 'lucide-react'
import { clsx } from 'clsx'
import {
  getStudents, addStudent, updateStudent, deleteStudent,
  getClasses, addClass, updateClass, deleteClass,
  getEnrollmentsByClass
} from '@/store/db'
import { StudentModal } from '@/components/students/StudentModal'
import { ClassModal } from '@/components/classes/ClassModal'
import { ClassCard } from '@/components/classes/ClassCard'

export const StudentsPage = () => {
  const [activeTab, setActiveTab] = useState('students')
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  
  // Search & Filter
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterClass, setFilterClass] = useState('')

  // Modals
  const [studentModalOpen, setStudentModalOpen] = useState(false)
  const [classModalOpen, setClassModalOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState(null)
  const [editingClass, setEditingClass] = useState(null)

  const loadData = () => {
    setStudents(getStudents())
    setClasses(getClasses())
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 200)
    return () => clearTimeout(timer)
  }, [search])

  const formatCurrency = (n) => new Intl.NumberFormat('vi-VN').format(n || 0) + 'đ'

  // --- Handlers: Student ---
  const handleSaveStudent = (data) => {
    if (editingStudent) {
      updateStudent(editingStudent.id, data)
    } else {
      addStudent(data)
    }
    loadData()
  }

  const handleDeleteStudent = (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa học sinh này không?')) {
      deleteStudent(id)
      toast.success('Đã xóa học sinh')
      loadData()
    }
  }

  const openStudentModal = (student = null) => {
    setEditingStudent(student)
    setStudentModalOpen(true)
  }

  // --- Handlers: Class ---
  const handleSaveClass = (data) => {
    if (editingClass) {
      updateClass(editingClass.id, data)
    } else {
      addClass(data)
    }
    loadData()
  }

  const handleDeleteClass = (id) => {
    const hasStudents = getEnrollmentsByClass(id).some(e => e.status !== 'dropped')
    if (hasStudents) {
      toast.error('Không thể xóa lớp đang có học sinh. Vui lòng chuyển học sinh sang lớp khác trước.')
      return
    }
    
    if (window.confirm('Bạn có chắc chắn muốn xóa lớp học này không?')) {
      deleteClass(id)
      toast.success('Đã xóa lớp học')
      loadData()
    }
  }

  const openClassModal = (classItem = null) => {
    setEditingClass(classItem)
    setClassModalOpen(true)
  }

  // --- Render logic ---
  const filteredStudents = students.filter(s => {
    const matchName = s.name.toLowerCase().includes(debouncedSearch.toLowerCase())
    const matchClass = filterClass ? s.classId === filterClass : true
    return matchName && matchClass
  })

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-navy-900">Quản lý học sinh</h1>
          <p className="text-sm text-navy-400 mt-0.5">Quản lý danh sách học sinh và lớp học</p>
        </div>
        
        {activeTab === 'students' ? (
          <Button onClick={() => openStudentModal()} className="shrink-0 flex items-center gap-2">
            <Plus size={18} /> Thêm học sinh
          </Button>
        ) : (
          <Button onClick={() => openClassModal()} className="shrink-0 flex items-center gap-2">
            <Plus size={18} /> Thêm lớp học
          </Button>
        )}
      </div>

      <div className="flex gap-4 border-b border-navy-100">
        <button
          className={clsx(
            "pb-3 px-1 text-sm font-medium transition-colors relative",
            activeTab === 'students' ? "text-navy-800" : "text-navy-400 hover:text-navy-700"
          )}
          onClick={() => setActiveTab('students')}
        >
          Học Sinh
          {activeTab === 'students' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-navy-800 rounded-t-full" />}
        </button>
        <button
          className={clsx(
            "pb-3 px-1 text-sm font-medium transition-colors relative",
            activeTab === 'classes' ? "text-navy-800" : "text-navy-400 hover:text-navy-700"
          )}
          onClick={() => setActiveTab('classes')}
        >
          Lớp Học
          {activeTab === 'classes' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-navy-800 rounded-t-full" />}
        </button>
      </div>

      {activeTab === 'students' && (
        <Card className="flex flex-col">
          <div className="p-4 border-b border-navy-100 flex flex-col sm:flex-row gap-4 bg-navy-50/50 rounded-t-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" size={18} />
              <input
                type="text"
                placeholder="Tìm học sinh theo tên..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-navy-200 focus:border-navy-500 focus:ring-1 focus:ring-navy-500 text-sm outline-none transition-all"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select
              className="px-4 py-2 rounded-xl border border-navy-200 focus:border-navy-500 focus:ring-1 focus:ring-navy-500 text-sm outline-none transition-all bg-white min-w-[200px]"
              value={filterClass}
              onChange={e => setFilterClass(e.target.value)}
            >
              <option value="">Tất cả lớp</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-navy-100 bg-white">
                  <th className="px-6 py-4 font-medium text-navy-600">Họ và tên</th>
                  <th className="px-6 py-4 font-medium text-navy-600">Lớp</th>
                  <th className="px-6 py-4 font-medium text-navy-600">Khối</th>
                  <th className="px-6 py-4 font-medium text-navy-600">SĐT Phụ huynh</th>
                  <th className="px-6 py-4 font-medium text-navy-600">Học phí/buổi</th>
                  <th className="px-6 py-4 font-medium text-navy-600 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map(student => {
                    const cls = classes.find(c => c.id === student.classId)
                    return (
                      <tr key={student.id} className="hover:bg-navy-50/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-navy-800">{student.name}</td>
                        <td className="px-6 py-4">
                          <Badge variant="navy">{cls ? cls.name : 'N/A'}</Badge>
                        </td>
                        <td className="px-6 py-4 text-navy-600">{student.grade || '-'}</td>
                        <td className="px-6 py-4 text-navy-600">{student.phone || '-'}</td>
                        <td className="px-6 py-4 text-navy-800 font-medium">{formatCurrency(student.feePerSession)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openStudentModal(student)}
                              className="p-1.5 text-navy-400 hover:text-navy-700 hover:bg-navy-100 rounded-lg transition-colors"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteStudent(student.id)}
                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={6}>
                      <Empty
                        icon={<Users />}
                        title="Không có học sinh nào"
                        desc={search || filterClass ? "Không tìm thấy kết quả phù hợp" : "Bấm nút Thêm học sinh để bắt đầu"}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'classes' && (
        <div className="flex flex-col gap-4">
          {classes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {classes.map(cls => {
                const studentCount = students.filter(s => s.classId === cls.id).length
                return (
                  <ClassCard
                    key={cls.id}
                    cls={cls}
                    studentCount={studentCount}
                    onEdit={() => openClassModal(cls)}
                    onDelete={() => handleDeleteClass(cls.id)}
                  />
                )
              })}
            </div>
          ) : (
            <Card className="p-12">
              <Empty
                icon={<BookOpen />}
                title="Không có lớp học nào"
                desc="Bấm nút Thêm lớp học để tạo lớp mới"
              />
            </Card>
          )}
        </div>
      )}

      {/* Modals */}
      <StudentModal
        open={studentModalOpen}
        onClose={() => setStudentModalOpen(false)}
        student={editingStudent}
        classes={classes}
        onSave={handleSaveStudent}
      />
      <ClassModal
        open={classModalOpen}
        onClose={() => setClassModalOpen(false)}
        classItem={editingClass}
        onSave={handleSaveClass}
      />
    </div>
  )
}
