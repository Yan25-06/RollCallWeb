import { useState, useEffect } from 'react'
import { Modal, Button, Input, CurrencyInput } from '@/components/ui'
import { studentService } from '@/services/studentService'
import { enrollmentService } from '@/services/enrollmentService'
import { classService } from '@/services/classService'
import { todayISO, monthISO } from '@/utils/helpers'

const METHODS = [
  { value: 'cash', label: 'Tiền mặt' },
  { value: 'transfer', label: 'Chuyển khoản' },
]

export const PaymentModal = ({ open, onClose, onSave, defaultStudentId, defaultClassId, defaultPeriod }) => {
  const today = todayISO()
  const [form, setForm] = useState({
    studentId: defaultStudentId ?? '',
    classId: defaultClassId ?? '',
    amount: '',
    paidAt: today,
    method: 'cash',
    period: defaultPeriod ?? monthISO(),
    note: '',
  })
  const [errors, setErrors] = useState({})
  const [students, setStudents] = useState([])
  const [enrollmentsByStudent, setEnrollmentsByStudent] = useState({})
  const [classNames, setClassNames] = useState({})

  useEffect(() => {
    if (!open) return
    setForm({
      studentId: defaultStudentId ?? '',
      classId: defaultClassId ?? '',
      amount: '',
      paidAt: today,
      method: 'cash',
      period: defaultPeriod ?? monthISO(),
      note: '',
    })
    setErrors({})

    Promise.all([studentService.getAll(), enrollmentService.getAll(), classService.getAll()])
      .then(([allStudents, enrollments, classes]) => {
        const active = enrollments.filter(e => e.status !== 'dropped')
        const enrolledIds = new Set(active.map(e => e.studentId))
        setStudents(allStudents.filter(s => enrolledIds.has(s.id)))

        const byStudent = {}
        for (const e of active) {
          (byStudent[e.studentId] ??= []).push(e.classId)
        }
        setEnrollmentsByStudent(byStudent)
        setClassNames(Object.fromEntries(classes.map(c => [c.id, c.name])))
      })
      .catch(() => {})
  }, [open, defaultStudentId, defaultClassId, defaultPeriod])

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))

  const setStudent = (studentId) => {
    const classIds = enrollmentsByStudent[studentId] ?? []
    setForm(f => ({
      ...f,
      studentId,
      classId: classIds.length === 1 ? classIds[0] : '',
    }))
  }

  const studentClassIds = enrollmentsByStudent[form.studentId] ?? []

  const validate = () => {
    const e = {}
    if (!form.studentId) e.studentId = 'Chọn học viên'
    if (!form.classId) e.classId = 'Chọn lớp'
    const amt = Number(form.amount)
    if (!form.amount || isNaN(amt) || amt <= 0) e.amount = 'Số tiền phải lớn hơn 0'
    if (!form.paidAt) e.paidAt = 'Chọn ngày'
    if (!form.period) e.period = 'Chọn tháng'
    return e
  }

  const handleSubmit = () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    onSave({ ...form, amount: Number(form.amount) })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ghi nhận thanh toán"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Huỷ</Button>
          <Button onClick={handleSubmit}>Lưu</Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-navy-700">Học viên *</label>
          <select
            className={`select ${errors.studentId ? 'border-red-400' : ''}`}
            value={form.studentId}
            onChange={e => setStudent(e.target.value)}
          >
            <option value="">-- Chọn học viên --</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {errors.studentId && <span className="text-xs text-red-600">{errors.studentId}</span>}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-navy-700">Lớp *</label>
          <select
            className={`select ${errors.classId ? 'border-red-400' : ''}`}
            value={form.classId}
            onChange={e => set('classId', e.target.value)}
            disabled={!form.studentId}
          >
            <option value="">-- Chọn lớp --</option>
            {studentClassIds.map(id => (
              <option key={id} value={id}>{classNames[id] ?? '—'}</option>
            ))}
          </select>
          {errors.classId && <span className="text-xs text-red-600">{errors.classId}</span>}
        </div>

        <CurrencyInput
          label="Số tiền *"
          value={form.amount}
          onChange={val => set('amount', val)}
          error={errors.amount}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Ngày đóng *"
            type="date"
            value={form.paidAt}
            onChange={e => {
              set('paidAt', e.target.value)
              if (e.target.value) set('period', e.target.value.slice(0, 7))
            }}
            error={errors.paidAt}
          />
          <Input
            label="Tháng áp dụng *"
            type="month"
            value={form.period}
            onChange={e => set('period', e.target.value)}
            error={errors.period}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-navy-700">Hình thức *</label>
          <div className="flex gap-4">
            {METHODS.map(m => (
              <label key={m.value} className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  name="method"
                  value={m.value}
                  checked={form.method === m.value}
                  onChange={() => set('method', m.value)}
                  className="accent-navy-800"
                />
                {m.label}
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-navy-700">Ghi chú</label>
          <textarea
            className="input resize-none h-16 text-sm"
            placeholder="Tuần 1..."
            value={form.note}
            onChange={e => set('note', e.target.value)}
          />
        </div>
      </div>
    </Modal>
  )
}
