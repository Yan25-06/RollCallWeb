import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { clsx } from 'clsx'
import { Button } from '@/components/ui'
import { upsertEnrollment, getStudents, getEnrollmentsByClass, addStudent } from '@/store/db'
import { toast as uiToast } from '@/components/ui'
import { getInitials } from '@/utils/helpers'

const STATUS_OPTIONS = [
  { value: 'active', label: 'Đang học' },
  { value: 'paused', label: 'Tạm ngưng' },
  { value: 'dropped', label: 'Đã nghỉ' },
]

const EMPTY_NEW = { name: '', phone: '', grade: '', feePerSession: '', note: '' }

export const EnrollmentModal = ({
  open,
  onClose,
  mode = 'add',   // 'add' | 'edit'
  classId,
  enrollment,     // existing enrollment (for edit mode)
  student,        // existing student (for edit mode)
  onSaved,
}) => {
  // ── add sub-mode toggle ──
  const [addSubMode, setAddSubMode] = useState('existing') // 'existing' | 'new'

  // ── existing student selection ──
  const [availableStudents, setAvailableStudents] = useState([])
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [studentSearch, setStudentSearch] = useState('')

  // ── new student form ──
  const [newForm, setNewForm] = useState(EMPTY_NEW)
  const [newErrors, setNewErrors] = useState({})

  // ── shared / edit ──
  const [status, setStatus] = useState('active')
  const [feePerSession, setFeePerSession] = useState('')
  const [goal, setGoal] = useState('')
  const [note, setNote] = useState('')
  const [confirmDrop, setConfirmDrop] = useState(false)
  const [pendingStatus, setPendingStatus] = useState(null)

  useEffect(() => {
    if (!open) return
    if (mode === 'add') {
      const allStudents = getStudents()
      const enrolled = getEnrollmentsByClass(classId).map(e => e.studentId)
      setAvailableStudents(allStudents.filter(s => !enrolled.includes(s.id)))
      setSelectedStudentId('')
      setStudentSearch('')
      setAddSubMode('existing')
      setNewForm(EMPTY_NEW)
      setNewErrors({})
      setGoal('')
      setNote('')
      setFeePerSession('')
      setStatus('active')
    } else if (mode === 'edit' && enrollment) {
      setStatus(enrollment.status || 'active')
      setFeePerSession(enrollment.feePerSession != null ? String(enrollment.feePerSession) : '')
      setGoal(enrollment.goal || '')
      setNote(enrollment.note || '')
      setConfirmDrop(false)
      setPendingStatus(null)
    }
  }, [open, mode, classId, enrollment?.studentId])

  const handleStatusChange = (val) => {
    if (val === 'dropped') { setPendingStatus('dropped'); setConfirmDrop(true); return }
    setStatus(val)
  }

  const confirmDropHandler = () => {
    setStatus('dropped'); setConfirmDrop(false); setPendingStatus(null)
  }

  const handleNewFormChange = (e) => {
    const { name, value } = e.target
    setNewForm(prev => ({ ...prev, [name]: value }))
    if (newErrors[name]) setNewErrors(prev => ({ ...prev, [name]: null }))
  }

  const validateNew = () => {
    const errs = {}
    if (!newForm.name.trim()) errs.name = 'Họ và tên là bắt buộc'
    setNewErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = () => {
    if (mode === 'add') {
      if (addSubMode === 'existing') {
        if (!selectedStudentId) return
        upsertEnrollment({
          studentId: selectedStudentId,
          classId,
          status: 'active',
          feePerSession: Number(feePerSession) || 0,
          goal,
          note,
          enrolledAt: new Date().toISOString(),
        })
        uiToast.success('Đã thêm học viên vào lớp')
      } else {
        if (!validateNew()) return
        const fee = Number(newForm.feePerSession) || 0
        const created = addStudent({
          name: newForm.name.trim(),
          phone: newForm.phone.trim(),
          grade: newForm.grade.trim(),
          note: newForm.note.trim(),
        })
        upsertEnrollment({
          studentId: created.id,
          classId,
          status: 'active',
          feePerSession: fee,
          goal,
          note: '',
          enrolledAt: new Date().toISOString(),
        })
        uiToast.success(`Đã tạo và thêm "${created.name}" vào lớp`)
      }
    } else {
      const now = new Date().toISOString()
      const updated = { ...enrollment, status, feePerSession: Number(feePerSession) || 0, goal, note }
      if (status === 'paused' && enrollment.status !== 'paused') {
        updated.pausedAt = now
        uiToast.info('Đã tạm ngưng học viên')
      } else if (status === 'dropped') {
        updated.droppedAt = now
        uiToast.info('Đã ghi nhận học viên đã nghỉ')
      } else if (status === 'active' && enrollment.status !== 'active') {
        updated.pausedAt = null; updated.droppedAt = null
        uiToast.success('Học viên đã quay lại lớp')
      } else {
        uiToast.success('Đã cập nhật thông tin')
      }
      upsertEnrollment(updated)
    }
    onSaved?.()
    onClose?.()
  }

  if (!open) return null

  const filteredStudents = availableStudents.filter(s =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase())
  )

  const submitDisabled =
    mode === 'add' &&
    (addSubMode === 'existing' ? !selectedStudentId : !newForm.name.trim())

  const submitLabel =
    mode !== 'add' ? 'Lưu thay đổi' :
      addSubMode === 'new' ? 'Tạo & Thêm vào lớp' : 'Thêm vào lớp'

  return (
    <div
      className="fixed inset-0 bg-navy-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={e => e.target === e.currentTarget && onClose?.()}
    >
      <div className="bg-white rounded-3xl shadow-navy-xl w-full max-w-md animate-slide-up overflow-hidden">

        {/* ── Header ── */}
        <div className="px-6 pt-6 pb-4 border-b border-navy-50 flex items-center justify-between">
          <h2 className="text-base font-semibold text-navy-900">
            {mode === 'add' ? '+ Thêm học viên vào lớp' : 'Sửa thông tin học viên'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-navy-400 hover:text-navy-700 hover:bg-navy-100 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="px-6 py-5 flex flex-col gap-4 max-h-[72vh] overflow-y-auto">

          {/* ─ Add mode: sub-mode toggle ─ */}
          {mode === 'add' && (
            <div className="flex gap-1 p-1 bg-navy-50 rounded-xl">
              <button
                onClick={() => { setAddSubMode('existing'); setNewErrors({}) }}
                className={clsx(
                  'flex-1 py-1.5 text-xs font-medium rounded-lg transition-all',
                  addSubMode === 'existing'
                    ? 'bg-white shadow-sm text-navy-800'
                    : 'text-navy-500 hover:text-navy-700'
                )}
              >
                Chọn học viên có sẵn
              </button>
              <button
                onClick={() => setAddSubMode('new')}
                className={clsx(
                  'flex-1 py-1.5 text-xs font-medium rounded-lg transition-all',
                  addSubMode === 'new'
                    ? 'bg-white shadow-sm text-navy-800'
                    : 'text-navy-500 hover:text-navy-700'
                )}
              >
                Tạo học viên mới
              </button>
            </div>
          )}

          {/* ─ Sub-mode: existing ─ */}
          {mode === 'add' && addSubMode === 'existing' && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-navy-600 uppercase tracking-wide">
                Chọn học viên
              </label>
              {availableStudents.length === 0 ? (
                <p className="text-sm text-navy-400 text-center py-4">
                  Tất cả học viên đã được thêm vào lớp
                </p>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="Tìm học viên..."
                    value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)}
                    className="input text-sm"
                  />
                  <div className="border border-navy-100 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    {filteredStudents.length === 0 ? (
                      <p className="text-sm text-navy-400 text-center p-4">Không tìm thấy</p>
                    ) : (
                      filteredStudents.map(s => (
                        <button
                          key={s.id}
                          onClick={() => setSelectedStudentId(s.id)}
                          className={clsx(
                            'w-full flex items-center gap-3 px-4 py-3 text-left border-b border-navy-50 last:border-0 transition-colors',
                            selectedStudentId === s.id
                              ? 'bg-navy-50 text-navy-800'
                              : 'hover:bg-navy-50/50 text-navy-700'
                          )}
                        >
                          <div className="w-8 h-8 rounded-full bg-navy-100 text-navy-700 text-xs font-bold flex items-center justify-center shrink-0">
                            {getInitials(s.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{s.name}</p>
                            <p className="text-xs text-navy-400">{s.phone || 'Chưa có SĐT'}</p>
                          </div>
                          {selectedStudentId === s.id && (
                            <div className="w-4 h-4 rounded-full bg-navy-800 flex items-center justify-center">
                              <div className="w-1.5 h-1.5 rounded-full bg-white" />
                            </div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                  {/* Học phí khi thêm học viên có sẵn */}
                  {selectedStudentId && (
                    <div className="flex flex-col gap-1 pt-1">
                      <label className="text-xs font-medium text-navy-600 uppercase tracking-wide">
                        Học phí / buổi (VNĐ)
                      </label>
                      <input
                        type="number"
                        value={feePerSession}
                        onChange={e => setFeePerSession(e.target.value)}
                        placeholder="VD: 150000"
                        min="0"
                        step="1000"
                        className="input text-sm"
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ─ Sub-mode: new student ─ */}
          {mode === 'add' && addSubMode === 'new' && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-navy-400">
                Tạo học viên mới và tự động thêm vào lớp này
              </p>

              {/* Họ và tên */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-navy-600 uppercase tracking-wide">
                  Họ và tên <span className="text-red-400 normal-case">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={newForm.name}
                  onChange={handleNewFormChange}
                  placeholder="Nhập họ và tên..."
                  className={clsx('input text-sm', newErrors.name && 'border-red-400 ring-1 ring-red-200')}
                  autoFocus
                />
                {newErrors.name && <p className="text-xs text-red-500">{newErrors.name}</p>}
              </div>

              {/* Phone + Grade */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-navy-600 uppercase tracking-wide">
                    Số điện thoại
                  </label>
                  <input
                    type="text"
                    name="phone"
                    value={newForm.phone}
                    onChange={handleNewFormChange}
                    placeholder="SĐT phụ huynh"
                    className="input text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-navy-600 uppercase tracking-wide">
                    Khối
                  </label>
                  <input
                    type="text"
                    name="grade"
                    value={newForm.grade}
                    onChange={handleNewFormChange}
                    placeholder="VD: Lớp 5"
                    className="input text-sm"
                  />
                </div>
              </div>

              {/* Học phí/buổi */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-navy-600 uppercase tracking-wide">
                  Học phí / buổi (VNĐ)
                </label>
                <input
                  type="number"
                  name="feePerSession"
                  value={newForm.feePerSession}
                  onChange={handleNewFormChange}
                  placeholder="VD: 150000"
                  min="0"
                  step="1000"
                  className="input text-sm"
                />
              </div>

              {/* Ghi chú */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-navy-600 uppercase tracking-wide">
                  Ghi chú
                </label>
                <input
                  type="text"
                  name="note"
                  value={newForm.note}
                  onChange={handleNewFormChange}
                  placeholder="Ghi chú thêm..."
                  className="input text-sm"
                />
              </div>

              <div className="border-t border-navy-100 pt-1" />
            </div>
          )}

          {/* ─ Edit mode: student info (readonly) ─ */}
          {mode === 'edit' && student && (
            <div className="flex items-center gap-3 p-3 bg-navy-50 rounded-xl">
              <div className="w-9 h-9 rounded-full bg-navy-800 text-white text-sm font-bold flex items-center justify-center shrink-0">
                {getInitials(student.name)}
              </div>
              <div>
                <p className="text-sm font-semibold text-navy-900">{student.name}</p>
                <p className="text-xs text-navy-400">{student.phone || 'Chưa có SĐT'}</p>
              </div>
            </div>
          )}

          {/* ─ Status (edit only) ─ */}
          {mode === 'edit' && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-navy-600 uppercase tracking-wide">
                Trạng thái
              </label>
              <select
                value={status}
                onChange={e => handleStatusChange(e.target.value)}
                className="select text-sm"
              >
                {STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* ─ Học phí/buổi (edit only) ─ */}
          {mode === 'edit' && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-navy-600 uppercase tracking-wide">
                Học phí / buổi (VNĐ)
              </label>
              <input
                type="number"
                value={feePerSession}
                onChange={e => setFeePerSession(e.target.value)}
                placeholder="VD: 150000"
                min="0"
                step="1000"
                className="input text-sm"
              />
              <p className="text-xs text-navy-400">Học phí riêng của học viên này trong lớp này</p>
            </div>
          )}

          {/* ─ Mục tiêu ─ */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-navy-600 uppercase tracking-wide">
              Mục tiêu
            </label>
            <textarea
              value={goal}
              onChange={e => setGoal(e.target.value)}
              placeholder="VD: Đạt 7.0 IELTS để du học..."
              rows={2}
              className="input resize-none text-sm"
            />
          </div>

          {/* ─ Ghi chú nội bộ (edit + existing only) ─ */}
          {(mode === 'edit' || addSubMode === 'existing') && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-navy-600 uppercase tracking-wide">
                Ghi chú nội bộ
              </label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Ghi chú dành riêng cho GV..."
                rows={2}
                className="input resize-none text-sm"
              />
            </div>
          )}

          {/* ─ Confirm drop ─ */}
          {confirmDrop && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col gap-3">
              <p className="text-sm text-amber-800 font-medium">
                Học viên này sẽ không nhận bài tập mới. Tiếp tục?
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="danger" onClick={confirmDropHandler} className="flex-1">
                  Xác nhận cho nghỉ
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => { setConfirmDrop(false); setPendingStatus(null) }}
                  className="flex-1"
                >
                  Hủy
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 bg-navy-50 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Hủy</Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={submitDisabled}
          >
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
