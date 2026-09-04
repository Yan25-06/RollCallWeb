import { useState, useEffect } from 'react'
import { Modal, Button, Input } from '@/components/ui'
import { Trash2 } from 'lucide-react'

const EMPTY_FORM = { monthNo: '', title: '' }

/**
 * MonthModal — thêm/sửa Tháng trong giáo trình.
 * @param {Object|null} editingItem - null = thêm, object = sửa
 * @param {Function} onSave   - ({ data, isEdit, id })
 * @param {Function} onDelete - (id)
 */
export const MonthModal = ({ open, onClose, editingItem, onSave, onDelete }) => {
  const isEdit = !!editingItem
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(editingItem
        ? { monthNo: String(editingItem.monthNo ?? ''), title: editingItem.title ?? '' }
        : EMPTY_FORM)
      setErrors({})
      setConfirmDelete(false)
    }
  }, [open, editingItem])

  const set = (f, v) => setForm(s => ({ ...s, [f]: v }))

  const validate = () => {
    const e = {}
    const n = Number(form.monthNo)
    if (!form.monthNo.toString().trim() || !Number.isInteger(n) || n < 1)
      e.monthNo = 'Nhập số tháng hợp lệ (≥ 1)'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    onSave?.({ data: { monthNo: Number(form.monthNo), title: form.title.trim() || null }, isEdit, id: editingItem?.id })
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
      title={isEdit ? 'Sửa tháng' : 'Thêm tháng'}
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
              {isEdit ? 'Cập nhật' : 'Thêm tháng'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <Input
          label="Số tháng"
          type="number"
          min={1}
          placeholder="VD: 1"
          value={form.monthNo}
          onChange={e => set('monthNo', e.target.value)}
          error={errors.monthNo}
        />
        <Input
          label="Tiêu đề chủ đề (tùy chọn)"
          placeholder="VD: XÂY DỰNG NỀN TẢNG CƠ BẢN..."
          value={form.title}
          onChange={e => set('title', e.target.value)}
        />
      </div>
    </Modal>
  )
}
