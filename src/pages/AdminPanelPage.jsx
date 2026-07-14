import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { teacherService, classService } from '@/services/classService'
import { studentService } from '@/services/studentService'
import { feeService } from '@/services/feeService'
import { ClassModal } from '@/components/classes/ClassModal'
import { Button, Card, Modal, StatCard, toast, ConfirmModal, CurrencyInput } from '@/components/ui'
import { Plus, Users, GraduationCap, UserCog, AlertCircle, ChevronRight, ShieldCheck, ShieldOff, Pencil, X, ChevronDown, ChevronUp } from 'lucide-react'
import { fmtVND, fmtTime, fmtDayList } from '@/utils/helpers'
import clsx from 'clsx'

export function AdminPanelPage() {
  const { teacher } = useAuth()
  const { canAccessAdmin } = usePermissions()
  const [teachers, setTeachers] = useState([])
  const [classes, setClasses] = useState([])
  const [loadingTeachers, setLoadingTeachers] = useState(true)
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditTeacherModal, setShowEditTeacherModal] = useState(false)
  const [selectedClass, setSelectedClass] = useState(null)
  const [editingTeacherId, setEditingTeacherId] = useState(null)
  const [stats, setStats] = useState(null)
  const [selectedTeacherId, setSelectedTeacherId] = useState(null)
  const [togglingAdminId, setTogglingAdminId] = useState(null)
  const [confirmAdmin, setConfirmAdmin] = useState({ open: false, teacher: null })
  const [editingSalaryId, setEditingSalaryId] = useState(null)  // teacherId đang chỉnh sửa lương
  const [salaryDraft, setSalaryDraft] = useState('')
  const [savingSalaryId, setSavingSalaryId] = useState(null)
  const [expandedTeacherId, setExpandedTeacherId] = useState(null)

  useEffect(() => {
    loadTeachers()
    loadClasses()
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const now = new Date()
      const [students, classList, teacherList, feeRows] = await Promise.all([
        studentService.getAll(),
        classService.getAll(),
        teacherService.getAll(),
        feeService.buildFeesRows(now.getFullYear(), now.getMonth() + 1),
      ])
      const unpaidCount = new Set(
        feeRows.filter(r => r.paid < r.expected).map(r => r.studentId)
      ).size
      setStats({
        totalStudents: students.length,
        activeClasses: classList.length,
        totalTeachers: teacherList.length,
        unpaidCount,
      })
    } catch (err) {
      toast.error('Lỗi tải thống kê: ' + err.message)
    }
  }

  const loadTeachers = async () => {
    try {
      setLoadingTeachers(true)
      const data = await teacherService.getAll()
      setTeachers(data)
    } catch (err) {
      toast.error('Lỗi tải danh sách giáo viên: ' + err.message)
    } finally {
      setLoadingTeachers(false)
    }
  }

  const loadClasses = async () => {
    try {
      setLoadingClasses(true)
      const data = await classService.getAll()
      setClasses(data)
    } catch (err) {
      toast.error('Lỗi tải danh sách lớp: ' + err.message)
    } finally {
      setLoadingClasses(false)
    }
  }

  const handleCreateClass = async (formData) => {
    try {
      await classService.create(formData)
      setShowCreateModal(false)
      loadClasses()
      loadStats()
    } catch (err) {
      toast.error('Lỗi tạo lớp: ' + err.message)
    }
  }

  const handleUpdateTeacher = async () => {
    if (!editingTeacherId) {
      toast.error('Vui lòng chọn giáo viên')
      return
    }
    try {
      await classService.update(selectedClass.id, { teacherId: editingTeacherId })
      toast.success('Cập nhật giáo viên thành công!')
      setShowEditTeacherModal(false)
      loadClasses()
    } catch (err) {
      toast.error('Lỗi cập nhật: ' + err.message)
    }
  }

  const handleToggleAdmin = (t) => {
    setConfirmAdmin({ open: true, teacher: t })
  }

  const doToggleAdmin = async () => {
    const t = confirmAdmin.teacher
    const action = t.is_admin ? 'thu hồi quyền admin' : 'cấp quyền admin'
    setTogglingAdminId(t.id)
    try {
      await teacherService.setAdmin(t.id, !t.is_admin)
      toast.success(`Đã ${action} thành công!`)
      loadTeachers()
      loadStats()
    } catch (err) {
      toast.error('Lỗi: ' + err.message)
    } finally {
      setTogglingAdminId(null)
    }
  }

  const handleEditSalary = (t) => {
    setEditingSalaryId(t.id)
    setSalaryDraft(t.sessionRate != null ? String(t.sessionRate) : '')
  }

  const handleCancelSalary = () => {
    setEditingSalaryId(null)
    setSalaryDraft('')
  }

  const handleSaveSalary = async (t) => {
    const value = salaryDraft === '' ? null : Number(salaryDraft)
    setSavingSalaryId(t.id)
    try {
      await teacherService.update(t.id, { sessionRate: value })
      toast.success('Đã lưu đơn giá/buổi')
      setEditingSalaryId(null)
      setSalaryDraft('')
      loadTeachers()
    } catch (err) {
      toast.error('Lỗi lưu lương: ' + err.message)
    } finally {
      setSavingSalaryId(null)
    }
  }

  // Classes filtered/grouped by selected teacher
  const filteredClasses = selectedTeacherId
    ? classes.filter(c => c.teacherId === selectedTeacherId)
    : classes

  // Count classes per teacher
  const classCountByTeacher = classes.reduce((acc, c) => {
    const tid = c.teacherId || '__unassigned__'
    acc[tid] = (acc[tid] || 0) + 1
    return acc
  }, {})

  if (!canAccessAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-navy-800 font-semibold">Chỉ admin mới có thể truy cập</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-navy-900 mb-2">Bảng Điều Khiển Admin</h1>
        <p className="text-navy-600">Quản lý giáo viên và lớp học</p>
      </div>

      {/* Overview stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Tổng học viên"
          value={stats ? stats.totalStudents : '—'}
          icon={<Users size={16} />}
          accent="navy"
        />
        <StatCard
          label="Lớp đang hoạt động"
          value={stats ? stats.activeClasses : '—'}
          icon={<GraduationCap size={16} />}
          accent="navy"
        />
        <StatCard
          label="Số giáo viên"
          value={stats ? stats.totalTeachers : '—'}
          icon={<UserCog size={16} />}
          accent="navy"
        />
        <StatCard
          label="Chưa đóng phí"
          value={stats ? stats.unpaidCount : '—'}
          sub="tháng này"
          icon={<AlertCircle size={16} />}
          accent={stats && stats.unpaidCount > 0 ? 'danger' : 'success'}
        />
      </div>

      {/* Two-column layout: Teachers (2/3) | Classes (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 items-start">

        {/* Left: Teachers */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-navy-900">Giáo Viên</h2>

          {loadingTeachers ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 rounded-full border-4 border-navy-200 border-t-navy-800 animate-spin" />
            </div>
          ) : teachers.length === 0 ? (
            <Card className="text-center py-8 text-navy-600">Chưa có giáo viên nào</Card>
          ) : (
            <>
              {/* "All" filter chip */}
              <button
                onClick={() => setSelectedTeacherId(null)}
                className={clsx(
                  'w-full text-left px-4 py-3 rounded-xl border-2 transition-all flex items-center justify-between',
                  selectedTeacherId === null
                    ? 'border-navy-800 bg-navy-800 text-white'
                    : 'border-navy-100 bg-white text-navy-700 hover:border-navy-300'
                )}
              >
                <span className="font-medium">Tất cả giáo viên</span>
                <span className={clsx(
                  'text-xs font-semibold px-2 py-0.5 rounded-full',
                  selectedTeacherId === null ? 'bg-white/20 text-white' : 'bg-navy-100 text-navy-700'
                )}>
                  {classes.length} lớp
                </span>
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {teachers.map(t => {
                const count = classCountByTeacher[t.id] || 0
                const isSelected = selectedTeacherId === t.id
                const isSelf = t.id === teacher?.id
                const isToggling = togglingAdminId === t.id
                return (
                  <div
                    key={t.id}
                    className={clsx(
                      'rounded-xl border-2 transition-all',
                      isSelected
                        ? 'border-navy-600 bg-navy-50 shadow-sm'
                        : 'border-navy-100 bg-white'
                    )}
                  >
                    {/* Clickable area to filter classes */}
                    <button
                      onClick={() => setSelectedTeacherId(isSelected ? null : t.id)}
                      className="w-full text-left px-4 pt-3 pb-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className={clsx('font-semibold truncate', isSelected ? 'text-navy-900' : 'text-navy-800')}>
                            {t.name || 'Chưa đặt tên'}
                            {isSelf && <span className="ml-1.5 text-xs font-normal text-navy-400">(bạn)</span>}
                          </p>
                          <p className="text-xs text-navy-500 truncate mt-0.5">{t.email}</p>
                        </div>
                        <div className="flex items-center gap-2 ml-2 shrink-0">
                          <span className={clsx(
                            'text-xs font-semibold px-2 py-0.5 rounded-full',
                            isSelected ? 'bg-navy-600 text-white' : 'bg-navy-100 text-navy-600'
                          )}>
                            {count} lớp
                          </span>
                          {isSelected && <ChevronRight size={14} className="text-navy-600" />}
                        </div>
                      </div>
                      {t.is_admin && (
                        <span className="mt-1.5 inline-block text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                          Admin
                        </span>
                      )}
                    </button>

                    {/* Đơn giá/buổi */}
                    <div className="px-4 pb-3">
                      {editingSalaryId === t.id ? (
                        <div className="flex items-end gap-2">
                          <div className="flex-1 min-w-0">
                            <CurrencyInput
                              label="Đơn giá/buổi"
                              value={salaryDraft}
                              onChange={val => setSalaryDraft(val)}
                              className="text-xs py-1"
                            />
                          </div>
                          <button
                            onClick={() => handleSaveSalary(t)}
                            disabled={savingSalaryId === t.id}
                            className="text-xs font-medium px-2.5 py-1 rounded-lg bg-navy-800 text-white hover:bg-navy-700 transition-colors disabled:opacity-40 mb-0.5"
                          >
                            {savingSalaryId === t.id ? '...' : 'Lưu'}
                          </button>
                          <button
                            onClick={handleCancelSalary}
                            disabled={savingSalaryId === t.id}
                            className="mb-0.5 text-navy-400 hover:text-navy-600 transition-colors disabled:opacity-40"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-navy-500 mb-0.5">Đơn giá/buổi</p>
                            <p className="text-sm font-medium text-navy-800">
                              {t.sessionRate != null ? fmtVND(t.sessionRate) : <span className="text-navy-400 font-normal">Chưa đặt</span>}
                            </p>
                          </div>
                          <button
                            onClick={() => handleEditSalary(t)}
                            className="text-navy-400 hover:text-navy-700 transition-colors p-1"
                            title="Chỉnh sửa lương"
                          >
                            <Pencil size={13} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Admin toggle button */}
                    {!isSelf && (
                      <div className="px-4 pb-3">
                        <button
                          onClick={() => handleToggleAdmin(t)}
                          disabled={isToggling}
                          className={clsx(
                            'flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50',
                            t.is_admin
                              ? 'text-red-600 bg-red-50 hover:bg-red-100'
                              : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                          )}
                        >
                          {isToggling ? (
                            <div className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                          ) : t.is_admin ? (
                            <ShieldOff size={13} />
                          ) : (
                            <ShieldCheck size={13} />
                          )}
                          {t.is_admin ? 'Thu hồi Admin' : 'Cấp Admin'}
                        </button>
                      </div>
                    )}

                    {/* Toggle expand lịch dạy */}
                    <div className="px-4 pb-2">
                      <button
                        onClick={() => setExpandedTeacherId(expandedTeacherId === t.id ? null : t.id)}
                        className="flex items-center gap-1 text-xs font-medium text-navy-500 hover:text-navy-800 transition-colors"
                      >
                        {expandedTeacherId === t.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        {expandedTeacherId === t.id ? 'Ẩn lịch dạy' : 'Xem lịch dạy'}
                      </button>
                    </div>

                    {expandedTeacherId === t.id && (
                      <div className="px-4 pb-3 border-t border-dashed border-navy-100 pt-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-navy-400 mb-1.5">
                          Lớp phụ trách &amp; lịch dạy
                        </p>
                        {classes.filter(c => c.teacherId === t.id).length === 0 ? (
                          <p className="text-xs text-navy-400">Chưa có lớp nào</p>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            {classes.filter(c => c.teacherId === t.id).map(c => (
                              <div key={c.id} className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-navy-800 truncate">{c.name}</p>
                                  <p className="text-[11px] text-navy-500">
                                    {fmtDayList(c.scheduleDayList)}
                                    {c.startTime ? ` · ${fmtTime(c.startTime)}–${fmtTime(c.endTime)}` : ''}
                                    {c.room ? ` · ${c.room}` : ''}
                                  </p>
                                </div>
                                {c.courseType && (
                                  <span className="text-[10px] bg-navy-100 text-navy-600 px-1.5 py-0.5 rounded shrink-0">
                                    {c.courseType}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
              </div>
            </>
          )}
        </div>

        {/* Right: Classes */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-navy-900">
                {selectedTeacherId
                  ? `Lớp của ${teachers.find(t => t.id === selectedTeacherId)?.name || '...'}`
                  : 'Tất Cả Lớp Học'}
              </h2>
              {selectedTeacherId && (
                <p className="text-sm text-navy-500 mt-0.5">
                  {filteredClasses.length} lớp • click vào giáo viên để bỏ lọc
                </p>
              )}
            </div>
            <Button onClick={() => setShowCreateModal(true)} className="gap-2" size="sm">
              <Plus size={16} />
              Tạo Lớp
            </Button>
          </div>

          {loadingClasses ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 rounded-full border-4 border-navy-200 border-t-navy-800 animate-spin" />
            </div>
          ) : filteredClasses.length === 0 ? (
            <Card className="text-center py-12 text-navy-500">
              {selectedTeacherId ? 'Giáo viên này chưa có lớp nào' : 'Chưa có lớp nào'}
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredClasses.map(cls => {
                const teacherForClass = teachers.find(t => t.id === cls.teacherId)
                return (
                  <Card key={cls.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-navy-900">{cls.name}</p>
                      {!selectedTeacherId && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <UserCog size={12} className="text-navy-400 shrink-0" />
                          <p className="text-sm text-navy-500 truncate">
                            {cls.teacherName || 'Chưa gán giáo viên'}
                          </p>
                          {teacherForClass?.is_admin && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                              Admin
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={() => {
                        setSelectedClass(cls)
                        setEditingTeacherId(cls.teacherId)
                        setShowEditTeacherModal(true)
                      }}
                      variant="secondary"
                      size="sm"
                    >
                      Đổi GV
                    </Button>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create Class Modal */}
      <ClassModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        classItem={null}
        onSave={handleCreateClass}
        isAdmin={true}
        teachers={teachers}
      />

      <ConfirmModal
        open={confirmAdmin.open}
        onClose={() => setConfirmAdmin({ open: false, teacher: null })}
        onConfirm={doToggleAdmin}
        title={confirmAdmin.teacher?.is_admin ? 'Thu hồi quyền Admin' : 'Cấp quyền Admin'}
        message={`Bạn có chắc muốn ${confirmAdmin.teacher?.is_admin ? 'thu hồi quyền admin' : 'cấp quyền admin'} cho ${confirmAdmin.teacher?.name || confirmAdmin.teacher?.email}?`}
        confirmLabel={confirmAdmin.teacher?.is_admin ? 'Thu hồi' : 'Cấp quyền'}
        variant={confirmAdmin.teacher?.is_admin ? 'danger' : 'primary'}
      />

      {/* Edit Teacher Modal */}
      <Modal
        open={showEditTeacherModal}
        onClose={() => setShowEditTeacherModal(false)}
        title={`Đổi Giáo Viên cho Lớp ${selectedClass?.name}`}
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setShowEditTeacherModal(false)} size="sm">
              Hủy
            </Button>
            <Button onClick={handleUpdateTeacher} size="sm">
              Cập nhật
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-navy-700">
            Giáo viên phụ trách
          </label>
          <select
            value={editingTeacherId}
            onChange={e => setEditingTeacherId(e.target.value)}
            className="select"
          >
            <option value="">Chọn giáo viên</option>
            {teachers.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </Modal>
    </div>
  )
}
