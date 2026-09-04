import { useState, useEffect, useMemo, useCallback } from 'react'
import { UserRound, Plus, Upload, Trash2, ChevronRight, Phone, Mail, Search, X } from 'lucide-react'
import { clsx } from 'clsx'
import { Button, Badge, Card, Empty, Skeleton, Modal, toast, ConfirmModal } from '@/components/ui'
import { studentService } from '@/services/studentService'
import { classService } from '@/services/classService'
import { enrollmentService } from '@/services/enrollmentService'
import { EnrollmentModal } from '@/components/students/EnrollmentModal'
import { BulkEnrollModal } from '@/components/students/BulkEnrollModal'
import { StudentEditModal } from '@/components/students/StudentEditModal'
import { ImportStudentsModal } from '@/components/students/ImportStudentsModal'
import { ExportExcelButton } from '@/components/reports/ExportExcelButton'
import { getInitials, fmtVND } from '@/utils/helpers'
import { useDebounce } from '@/utils/useDebounce'

const STATUS_TABS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'unassigned', label: 'Chưa có lớp' },
  { id: 'active', label: 'Đang học' },
  { id: 'paused', label: 'Tạm ngưng' },
  { id: 'dropped', label: 'Đã nghỉ' },
]

const STATUS_BADGE = {
  active: { label: 'Đang học', variant: 'success' },
  paused: { label: 'Tạm ngưng', variant: 'warning' },
  dropped: { label: 'Đã nghỉ', variant: 'danger' },
  unassigned: { label: 'Chưa có lớp', variant: 'gray' },
}

function calcStatus(enrollments) {
  if (!enrollments || enrollments.length === 0) return 'unassigned'
  if (enrollments.some(e => e.status === 'active')) return 'active'
  if (enrollments.some(e => e.status === 'paused')) return 'paused'
  return 'dropped'
}

// ─── Student row ─────────────────────────────────────────────────────────────
const StudentRow = ({ student, enrollments, classes, selected, onSelect, onClick, classMap, isAdmin, showCheckbox, disabledCheck }) => {
  const status = calcStatus(enrollments)
  const badge = STATUS_BADGE[status]
  const activeEnrollments = enrollments.filter(e => e.status === 'active')
  const classNames = activeEnrollments.map(e => classMap[e.classId]?.name).filter(Boolean)

  return (
    <tr
      className={clsx('border-b border-navy-50 hover:bg-navy-50/50 cursor-pointer transition-colors', selected && 'bg-navy-50')}
      onClick={onClick}
    >
      {showCheckbox && (
        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selected}
            disabled={disabledCheck}
            onChange={onSelect}
            className="rounded border-navy-300 text-navy-800 focus:ring-navy-500 disabled:opacity-40"
          />
        </td>
      )}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center text-xs font-semibold shrink-0">
            {getInitials(student.name)}
          </div>
          <div>
            <p className="font-medium text-navy-900 text-sm">{student.name}</p>
            {student.grade && <p className="text-xs text-navy-400">{student.grade}</p>}
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {classNames.length > 0
            ? classNames.map((n, i) => <Badge key={i} variant="navy" className="text-xs">{n}</Badge>)
            : <span className="text-navy-300 text-sm">—</span>
          }
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-0.5">
          {student.phone
            ? <span className="text-sm text-navy-700 flex items-center gap-1"><Phone size={11} className="text-navy-400" />{student.phone}</span>
            : null
          }
          {student.email
            ? <span className="text-xs text-navy-500 flex items-center gap-1"><Mail size={11} className="text-navy-400" />{student.email}</span>
            : null
          }
          {!student.phone && !student.email && <span className="text-navy-300 text-sm">—</span>}
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-navy-600">
          {enrollments[0]?.goal || <span className="text-navy-300">—</span>}
        </span>
      </td>
      <td className="px-4 py-3">
        <ChevronRight size={16} className="text-navy-300" />
      </td>
    </tr>
  )
}

// ─── Quick enroll modal ───────────────────────────────────────────────────────
// ─── Student detail sidebar ───────────────────────────────────────────────────
const StudentDetailSidebar = ({ student, enrollments, classMap, onClose, onEdit, onEnroll, onNavigateToClass, isAdmin }) => {
  const status = calcStatus(enrollments)
  const badge = STATUS_BADGE[status]

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-navy-100 gap-2">
        <h3 className="font-semibold text-navy-900 truncate">Chi tiết học sinh</h3>
        <div className="flex items-center gap-1.5 shrink-0">
          {isAdmin && (
            <Button variant="secondary" size="sm" onClick={onEdit}>Sửa</Button>
          )}
          {enrollments.length === 0 && (
            <Button variant="ghost" size="sm" onClick={onEnroll}>+ Ghi danh</Button>
          )}
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-navy-50 text-navy-400 hover:text-navy-700 transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Avatar + name */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center text-base font-semibold shrink-0">
            {getInitials(student.name)}
          </div>
          <div>
            <p className="font-semibold text-navy-900">{student.name}</p>
            <Badge variant={badge.variant} className="text-xs mt-0.5">{badge.label}</Badge>
          </div>
        </div>

        {/* Info */}
        <Card className="p-3 flex flex-col gap-2">
          {student.grade && (
            <div className="flex justify-between text-sm">
              <span className="text-navy-500">Khối</span>
              <span className="text-navy-800 font-medium">{student.grade}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-navy-500">SĐT</span>
            <span className="text-navy-800">{student.phone || '—'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-navy-500">Email</span>
            <span className="text-navy-800">{student.email || '—'}</span>
          </div>
        </Card>

        {/* Enrolled classes */}
        <div>
          <p className="text-sm font-medium text-navy-700 mb-2">Lớp đang ghi danh</p>
          {enrollments.length === 0 ? (
            <p className="text-sm text-navy-400 italic">Chưa xếp lớp</p>
          ) : (
            <div className="flex flex-col gap-2">
              {enrollments.map(enr => {
                const cls = classMap[enr.classId]
                if (!cls) return null
                const enrBadge = STATUS_BADGE[enr.status] || STATUS_BADGE.dropped
                const fee = enr.feeType === 'monthly' ? enr.monthlyFee : enr.courseFee
                return (
                  <Card key={enr.id} className="p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-navy-900 text-sm">{cls.name}</span>
                      <Badge variant={enrBadge.variant} className="text-xs">{enrBadge.label}</Badge>
                    </div>
                    <div className="flex justify-between text-xs text-navy-500">
                      <span>{enr.feeType === 'monthly' ? 'Học phí tháng' : 'Học phí khóa'}</span>
                      <span className="font-medium text-navy-700">
                        {fee != null ? fmtVND(fee) : <span className="text-navy-300 italic">Chưa đặt</span>}
                      </span>
                    </div>
                    {enr.goal && <p className="text-xs text-navy-500">Mục tiêu: {enr.goal}</p>}
                    {enr.note && <p className="text-xs text-navy-400 italic">{enr.note}</p>}
                    <button
                      onClick={() => onNavigateToClass(cls.id)}
                      className="flex items-center gap-1 text-xs text-navy-600 hover:text-navy-900 font-medium transition-colors mt-1"
                    >
                      Đến lớp <ChevronRight size={12} />
                    </button>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export const StudentsDirectoryPage = ({ onNavigateToClass, isAdmin = false }) => {
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [loading, setLoading] = useState(true)

  const [statusTab, setStatusTab] = useState('all')
  const [classFilter, setClassFilter] = useState('')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  const [selectedIds, setSelectedIds] = useState(new Set())
  const [selectedStudent, setSelectedStudent] = useState(null)

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [showEnrollModal, setShowEnrollModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [bulkFeeOpen, setBulkFeeOpen] = useState(false)

  const [quickAddName, setQuickAddName] = useState('')
  const [quickAddLoading, setQuickAddLoading] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [s, c, e] = await Promise.all([
        studentService.getAll(),
        classService.getAll(),
        enrollmentService.getAllForTeacher(),
      ])
      setStudents(s)
      setClasses(c)
      setEnrollments(e)
      setSelectedStudent(prev => prev ? (s.find(st => st.id === prev.id) ?? prev) : null)
    } catch (err) {
      toast.error('Không tải được dữ liệu: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Maps for fast lookup
  const classMap = useMemo(() => Object.fromEntries(classes.map(c => [c.id, c])), [classes])
  const enrollmentsByStudent = useMemo(() => {
    const map = {}
    for (const e of enrollments) {
      if (!map[e.studentId]) map[e.studentId] = []
      map[e.studentId].push(e)
    }
    return map
  }, [enrollments])

  // Filtered students
  const filteredStudents = useMemo(() => {
    let list = students
    const q = debouncedSearch.toLowerCase()

    if (q) {
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q))
      )
    }

    if (statusTab !== 'all') {
      list = list.filter(s => calcStatus(enrollmentsByStudent[s.id] || []) === statusTab)
    }

    if (classFilter) {
      list = list.filter(s =>
        (enrollmentsByStudent[s.id] || []).some(e => e.classId === classFilter)
      )
    }

    return list
  }, [students, debouncedSearch, statusTab, classFilter, enrollmentsByStudent])

  // Bulk select
  const allSelected = filteredStudents.length > 0 && filteredStudents.every(s => selectedIds.has(s.id))
  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev)
        filteredStudents.forEach(s => next.delete(s.id))
        return next
      })
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev)
        filteredStudents.forEach(s => next.add(s.id))
        return next
      })
    }
  }
  const toggleOne = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return
    setConfirmBulkDelete(true)
  }

  const selectedStudentObjs = useMemo(
    () => students.filter(s => selectedIds.has(s.id)),
    [students, selectedIds]
  )

  const handleBulkEnroll = () => {
    if (selectedIds.size === 0) return
    setBulkFeeOpen(true)
  }

  const handleEnrolled = () => {
    setSelectedIds(new Set())
    loadData()
  }

  const doBulkDelete = async () => {
    try {
      await Promise.all([...selectedIds].map(id => studentService.remove(id)))
      toast.success(`Đã xóa ${selectedIds.size} học sinh`)
      setSelectedIds(new Set())
      if (selectedStudent && selectedIds.has(selectedStudent.id)) setSelectedStudent(null)
      await loadData()
    } catch (err) {
      toast.error('Lỗi xóa: ' + err.message)
    }
  }

  const handleQuickAdd = async (e) => {
    if (e.key !== 'Enter') return
    const name = quickAddName.trim()
    if (!name) return
    setQuickAddLoading(true)
    try {
      const newStudent = await studentService.create({ name })
      setStudents(prev => [newStudent, ...prev])
      setQuickAddName('')
      toast.success('Đã thêm học sinh!')
    } catch (err) {
      toast.error('Lỗi: ' + err.message)
    } finally {
      setQuickAddLoading(false)
    }
  }

  const handleStudentSaved = () => {
    loadData()
  }

  const handleEnrollSave = async () => {
    await loadData()
  }

  // Skeleton loading
  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="flex gap-2">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-9 w-24 rounded-xl" />)}
        </div>
        <Card className="p-0 overflow-hidden">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="flex gap-4 px-4 py-3 border-b border-navy-50">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 flex flex-col gap-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </Card>
      </div>
    )
  }

  const selectedStudentEnrollments = selectedStudent ? (enrollmentsByStudent[selectedStudent.id] || []) : []

  return (
    <div className="flex gap-6 h-full min-h-0">
      {/* Main content */}
      <div className={clsx('flex flex-col gap-4 flex-1 min-w-0', selectedStudent && 'hidden lg:flex')}>
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Danh bạ học viên</h1>
          <p className="text-sm text-navy-500 mt-1">Toàn bộ học sinh — lọc, tìm kiếm và quản lý tập trung</p>
        </div>

        {/* Status tabs */}
        <div className="flex gap-1 flex-wrap">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusTab(tab.id)}
              className={clsx(
                'px-3 py-1.5 rounded-xl text-sm font-medium transition-all',
                statusTab === tab.id
                  ? 'bg-navy-800 text-white'
                  : 'bg-white text-navy-500 border border-navy-100 hover:text-navy-800 hover:border-navy-300'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex gap-2 items-center">
          {/* Search — 2 phần */}
          <div className="relative basis-2/3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm theo tên, SĐT, email..."
              className="input pl-9 py-2 text-sm w-full"
            />
          </div>

          {/* Class filter — 1 phần */}
          <select
            value={classFilter}
            onChange={e => setClassFilter(e.target.value)}
            className="select py-2 text-sm basis-1/3"
          >
            <option value="">Tất cả lớp</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Action bar */}
        <div className="flex gap-2 items-center">
          {/* Admin tools */}
          {isAdmin && (
            <>
              <input
                value={quickAddName}
                onChange={e => setQuickAddName(e.target.value)}
                onKeyDown={handleQuickAdd}
                placeholder="Thêm nhanh (Tên + Enter)"
                disabled={quickAddLoading}
                className="input py-2 text-sm w-52"
              />
              <Button variant="primary" size="sm" onClick={() => setAddModalOpen(true)}>
                <Plus size={14} className="mr-1" />
                Thêm
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setShowImportModal(true)}>
                <Upload size={14} className="mr-1" />
                Import
              </Button>
            </>
          )}

          {/* Right-side actions */}
          <div className="ml-auto flex gap-2 items-center">
            <ExportExcelButton
              rows={filteredStudents.map(s => {
                const enrs = enrollmentsByStudent[s.id] || []
                const status = calcStatus(enrs)
                const activeClasses = enrs
                  .filter(e => e.status === 'active')
                  .map(e => classMap[e.classId]?.name)
                  .filter(Boolean)
                  .join(', ')
                const statusLabel = STATUS_BADGE[status]?.label ?? ''
                return {
                  name: s.name,
                  grade: s.grade || '',
                  phone: s.phone || '',
                  email: s.email || '',
                  classes: activeClasses,
                  status: statusLabel,
                }
              })}
              columns={[
                { key: 'name',    label: 'Họ tên' },
                { key: 'grade',   label: 'Khối' },
                { key: 'phone',   label: 'SĐT' },
                { key: 'email',   label: 'Email' },
                { key: 'classes', label: 'Lớp' },
                { key: 'status',  label: 'Trạng thái' },
              ]}
              filename="danh-ba-hoc-vien"
              disabled={filteredStudents.length === 0}
            />
            {isAdmin && selectedIds.size > 0 && (
              <Button size="sm" onClick={handleBulkEnroll}>
                Ghi danh {selectedIds.size} học sinh
              </Button>
            )}
            {isAdmin && selectedIds.size > 0 && (
              <Button variant="danger" size="sm" onClick={handleBulkDelete}>
                <Trash2 size={14} className="mr-1" />
                Xóa {selectedIds.size}
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        {filteredStudents.length === 0 ? (
          <Card>
            <Empty
              icon={<UserRound size={40} />}
              title="Không có học sinh nào"
              desc={students.length === 0 ? 'Bắt đầu thêm học sinh vào danh bạ' : 'Thử thay đổi bộ lọc'}
              action={isAdmin && students.length === 0 && (
                <Button variant="primary" size="sm" onClick={() => setAddModalOpen(true)}>
                  <Plus size={14} className="mr-1" />
                  Thêm học sinh
                </Button>
              )}
            />
          </Card>
        ) : (
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-navy-50 border-b border-navy-100">
                  <tr>
                    {isAdmin && (
                      <th className="px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleAll}
                          className="rounded border-navy-300 text-navy-800 focus:ring-navy-500"
                        />
                      </th>
                    )}
                    <th className="px-4 py-3 text-xs font-semibold text-navy-600 uppercase tracking-wide">Học viên</th>
                    <th className="px-4 py-3 text-xs font-semibold text-navy-600 uppercase tracking-wide">Trạng thái</th>
                    <th className="px-4 py-3 text-xs font-semibold text-navy-600 uppercase tracking-wide">Lớp học</th>
                    <th className="px-4 py-3 text-xs font-semibold text-navy-600 uppercase tracking-wide">Liên hệ</th>
                    <th className="px-4 py-3 text-xs font-semibold text-navy-600 uppercase tracking-wide">Mục tiêu</th>
                    <th className="px-4 py-3 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map(student => (
                    <StudentRow
                      key={student.id}
                      student={student}
                      enrollments={enrollmentsByStudent[student.id] || []}
                      classMap={classMap}
                      isAdmin={isAdmin}
                      showCheckbox={isAdmin}
                      disabledCheck={false}
                      selected={selectedIds.has(student.id)}
                      onSelect={() => toggleOne(student.id)}
                      onClick={() => setSelectedStudent(prev => prev?.id === student.id ? null : student)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 border-t border-navy-50 text-xs text-navy-400">
              {filteredStudents.length} học sinh
            </div>
          </Card>
        )}
      </div>

      {/* Sidebar */}
      {selectedStudent && (
        <div className="w-full lg:w-80 shrink-0 bg-white rounded-2xl border border-navy-100 shadow-navy-sm overflow-hidden flex flex-col lg:self-start lg:sticky lg:top-[25px] lg:h-[calc(100vh-25px)]">
          <StudentDetailSidebar
            student={selectedStudent}
            enrollments={selectedStudentEnrollments}
            classMap={classMap}
            onClose={() => setSelectedStudent(null)}
            onEdit={() => setEditModalOpen(true)}
            onEnroll={() => setShowEnrollModal(true)}
            onNavigateToClass={onNavigateToClass}
            isAdmin={isAdmin}
          />
        </div>
      )}

      {/* Add student modal — no classId = create only, no enrollment */}
      <EnrollmentModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        mode="add"
        onSaved={() => { setAddModalOpen(false); handleStudentSaved() }}
        isAdmin={isAdmin}
      />

      {/* Edit student modal — chỉ profile (Plan A: enrollment edit từ trong lớp) */}
      {selectedStudent && (
        <StudentEditModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          student={selectedStudent}
          onSaved={() => { setEditModalOpen(false); loadData() }}
        />
      )}

      {/* Enroll modal */}
      {selectedStudent && showEnrollModal && (
        <EnrollmentModal
          open={showEnrollModal}
          onClose={() => setShowEnrollModal(false)}
          mode="add"
          student={selectedStudent}
          classes={classes}
          onSaved={handleEnrollSave}
          isAdmin={isAdmin}
        />
      )}

      {/* Import modal */}
      <ImportStudentsModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportDone={loadData}
        classes={classes}
      />

      <ConfirmModal
        open={confirmBulkDelete}
        onClose={() => setConfirmBulkDelete(false)}
        onConfirm={doBulkDelete}
        title="Xóa học sinh"
        message={`Xóa ${selectedIds.size} học sinh? Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa"
      />

      <BulkEnrollModal
        open={bulkFeeOpen}
        onClose={() => setBulkFeeOpen(false)}
        students={selectedStudentObjs}
        classes={classes}
        onSaved={() => { setBulkFeeOpen(false); handleEnrolled() }}
      />
    </div>
  )
}
