import { useState, useEffect } from 'react'
import { Modal, Button, Input } from '@/components/ui'
import { Trash2 } from 'lucide-react'

const EMPTY_FORM = { weekNo: '', sessionNo: '', skill: '', content: '', note: '' }

/**
 * SessionModal — thêm/sửa Buổi trong một Tháng.
 * @param {string}      monthId     - tháng đang thêm buổi (ngữ cảnh, dùng khi tạo)
 * @param {Object|null} editingItem - null = thêm, object = sửa
 * @param {Function} onSave   - ({ data, isEdit, id })
 * @param {Function} onDelete - (id)
 */
export const SessionModal = ({ open, onClose, monthId, editingItem, onSave, onDelete }) => {
  const isEdit = !!editingItem
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(editingItem
        ? {
            weekNo: editingItem.weekNo != null ? String(editingItem.weekNo) : '',
            sessionNo: editingItem.sessionNo != null ? String(editingItem.sessionNo) : '',
            skill: editingItem.skill ?? '',
            content: editingItem.content ?? '',
            note: editingItem.note ?? '',
          }
        : EMPTY_FORM)
      setErrors({})
      setConfirmDelete(false)
    }
  }, [open, editingItem])

  const set = (f, v) => setForm(s => ({ ...s, [f]: v }))

  const validate = () => {
    const e = {}
    const n = Number(form.sessionNo)
    if (!form.sessionNo.toString().trim() || !Number.isInteger(n) || n < 1)
      e.sessionNo = 'Nhập số buổi hợp lệ (≥ 1)'
    if (form.weekNo.toString().trim()) {
      const w = Number(form.weekNo)
      if (!Number.isInteger(w) || w < 1) e.weekNo = 'Số tuần phải là số nguyên ≥ 1'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    const data = {
      weekNo: form.weekNo.toString().trim() ? Number(form.weekNo) : null,
      sessionNo: Number(form.sessionNo),
      skill: form.skill.trim() || null,
      content: form.content.trim() || null,
      note: form.note.trim() || null,
    }
    if (!isEdit) data.monthId = monthId
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
      title={isEdit ? 'Sửa Buổi' : 'Thêm Buổi'}
      footer={
        <div className="flex items-center justify-between gap-2">
          {isEdit && (
            <Button variant="danger" size="sm" onClick={handleDelete} className="flex items-center gap-1.5">
              <Trash2 size={14} />
              {confirmDelete ? 'Xác nhận xóa?' : 'Xóa'}
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="secondary" size="sm" onClick={onClose}>Hủy</Button>
            <Button variant="primary" size="sm" onClick={handleSubmit}>
              {isEdit ? 'Cập nhật' : 'Thêm buổi'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Buổi số"
            type="number"
            min={1}
            placeholder="VD: 1"
            value={form.sessionNo}
            onChange={e => set('sessionNo', e.target.value)}
            error={errors.sessionNo}
          />
          <Input
            label="Tuần (tùy chọn)"
            type="number"
            min={1}
            placeholder="VD: 1"
            value={form.weekNo}
            onChange={e => set('weekNo', e.target.value)}
            error={errors.weekNo}
          />
        </div>

        <Input
          label="Kỹ năng (tùy chọn)"
          placeholder="VD: Reading, Listening..."
          value={form.skill}
          onChange={e => set('skill', e.target.value)}
        />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-navy-700">Nội dung giảng dạy (tùy chọn)</label>
          <textarea
            className="input min-h-[80px] resize-y"
            placeholder="Mô tả nội dung buổi học..."
            value={form.content}
            onChange={e => set('content', e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-navy-700">Ghi chú (tùy chọn)</label>
          <textarea
            className="input min-h-[60px] resize-y"
            placeholder="Ghi chú thêm..."
            value={form.note}
            onChange={e => set('note', e.target.value)}
          />
        </div>
      </div>
    </Modal>
  )
}
