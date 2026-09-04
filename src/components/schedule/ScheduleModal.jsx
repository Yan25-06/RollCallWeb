import { useState, useEffect } from 'react'
import { Modal, Button, Input, Select, toast } from '@/components/ui'
import { Trash2, AlertTriangle } from 'lucide-react'
import { checkConflicts } from '@/utils/scheduleConflict'

const DAY_OPTIONS = [
  { value: 1, label: 'Thứ Hai' },
  { value: 2, label: 'Thứ Ba' },
  { value: 3, label: 'Thứ Tư' },
  { value: 4, label: 'Thứ Năm' },
  { value: 5, label: 'Thứ Sáu' },
  { value: 6, label: 'Thứ Bảy' },
  { value: 0, label: 'Chủ Nhật' },
]

const EMPTY_FORM = {
  classId: '',
  dayOfWeek: '',
  startTime: '',
  endTime: '',
  room: '',
  note: '',
}

/**
 * ScheduleModal — add/edit a ScheduleItem
 * @param {boolean}  open
 * @param {Function} onClose
 * @param {Object}   editingItem - null = add mode, object = edit mode
 * @param {Array}    classes     - all classes
 * @param {Array}    allSchedule - all schedule items (for conflict check)
 * @param {Function} onSave      - callback({ data, isEdit })
 * @param {Function} onDelete    - callback(id)
 */
export const ScheduleModal = ({ open, onClose, editingItem, defaultDay, classes = [], allSchedule = [], onSave, onDelete }) => {
  const isEdit = !!editingItem

  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [conflicts, setConflicts] = useState([])
  const [forceOverride, setForceOverride] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Populate form when editing
  useEffect(() => {
    if (open) {
      if (editingItem) {
        setForm({
          classId:   editingItem.classId ?? '',
          dayOfWeek: editingItem.dayOfWeek ?? '',
          startTime: editingItem.startTime ?? '',
          endTime:   editingItem.endTime ?? '',
          room:      editingItem.room ?? '',
          note:      editingItem.note ?? '',
        })
      } else {
        setForm({ ...EMPTY_FORM, dayOfWeek: defaultDay ?? '' })
      }
      setErrors({})
      setConflicts([])
      setForceOverride(false)
      setConfirmDelete(false)
    }
  }, [open, editingItem])

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))

  // Run conflict check whenever relevant fields change
  useEffect(() => {
    if (!form.dayOfWeek || !form.startTime || !form.endTime || !form.room) {
      setConflicts([])
      return
    }
    const check = {
      id:        editingItem?.id,
      dayOfWeek: Number(form.dayOfWeek),
      startTime: form.startTime,
      endTime:   form.endTime,
      room:      form.room,
    }
    setConflicts(checkConflicts(check, allSchedule, classes))
    setForceOverride(false)
  }, [form.dayOfWeek, form.startTime, form.endTime, form.room])

  const validate = () => {
    const e = {}
    if (!form.classId)   e.classId   = 'Vui lòng chọn lớp'
    if (form.dayOfWeek === '') e.dayOfWeek = 'Vui lòng chọn ngày'
    if (!form.startTime) e.startTime = 'Vui lòng nhập giờ bắt đầu'
    if (!form.endTime)   e.endTime   = 'Vui lòng nhập giờ kết thúc'
    if (form.startTime && form.endTime && form.startTime >= form.endTime)
      e.endTime = 'Giờ kết thúc phải sau giờ bắt đầu'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    if (conflicts.length > 0 && !forceOverride) {
      setForceOverride(true) // show override prompt
      return
    }
    const data = {
      classId:   form.classId,
      dayOfWeek: Number(form.dayOfWeek),
      startTime: form.startTime,
      endTime:   form.endTime,
      room:      form.room.trim(),
      note:      form.note.trim(),
    }
    onSave?.({ data, isEdit, id: editingItem?.id })
    onClose?.()
  }

  const handleDelete = () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    onDelete?.(editingItem.id)
    onClose?.()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Sửa lịch dạy' : 'Thêm lịch dạy'}
      footer={
        <div className="flex items-center justify-between gap-2">
          {isEdit && (
            <Button
              variant="danger"
              size="sm"
              onClick={handleDelete}
              className="flex items-center gap-1.5"
            >
              <Trash2 size={14} />
              {confirmDelete ? 'Xác nhận xóa?' : 'Xóa'}
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="secondary" size="sm" onClick={onClose}>Hủy</Button>
            {conflicts.length > 0 && forceOverride ? (
              <Button variant="danger" size="sm" onClick={handleSubmit}>
                Vẫn lưu (bỏ qua xung đột)
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={handleSubmit}>
                {isEdit ? 'Cập nhật' : 'Thêm lịch'}
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Conflict alert */}
        {conflicts.length > 0 && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
            <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm text-red-700">
              <p className="font-semibold mb-1">Phát hiện xung đột phòng:</p>
              {conflicts.map((c, i) => (
                <p key={i} className="text-xs">{c.reason}</p>
              ))}
              {forceOverride && (
                <p className="text-xs mt-1.5 font-medium text-red-600">
                  Bấm "Vẫn lưu" để tiếp tục hoặc "Hủy" để sửa lại.
                </p>
              )}
            </div>
          </div>
        )}

        <Select
          label="Lớp học"
          value={form.classId}
          onChange={e => set('classId', e.target.value)}
          error={errors.classId}
        >
          <option value="">— Chọn lớp —</option>
          {classes.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>

        <Select
          label="Ngày trong tuần"
          value={form.dayOfWeek}
          onChange={e => set('dayOfWeek', e.target.value)}
          error={errors.dayOfWeek}
        >
          <option value="">— Chọn ngày —</option>
          {DAY_OPTIONS.map(d => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </Select>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Giờ bắt đầu"
            type="time"
            value={form.startTime}
            onChange={e => set('startTime', e.target.value)}
            error={errors.startTime}
          />
          <Input
            label="Giờ kết thúc"
            type="time"
            value={form.endTime}
            onChange={e => set('endTime', e.target.value)}
            error={errors.endTime}
          />
        </div>

        <Input
          label="Phòng học (tùy chọn)"
          placeholder="VD: Phòng 102"
          value={form.room}
          onChange={e => set('room', e.target.value)}
        />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-navy-700">Ghi chú (tùy chọn)</label>
          <textarea
            className="input resize-none"
            rows={2}
            placeholder="Ghi chú thêm về ca dạy..."
            value={form.note}
            onChange={e => set('note', e.target.value)}
          />
        </div>
      </div>
    </Modal>
  )
}
