import { useState, useEffect } from 'react'
import { Modal, Button, Input, Select } from '@/components/ui'
import { Trash2 } from 'lucide-react'
import { MATERIAL_TYPES } from './materialType'

const EMPTY_FORM = { title: '', url: '', type: 'ppt' }

/**
 * MaterialModal — thêm/sửa tài liệu giảng dạy
 * @param {boolean}  open
 * @param {Function} onClose
 * @param {Object}   editingItem - null = thêm, object = sửa
 * @param {Function} onSave      - callback({ data, isEdit, id })
 * @param {Function} onDelete    - callback(id)
 */
export const MaterialModal = ({ open, onClose, editingItem, onSave, onDelete }) => {
  const isEdit = !!editingItem
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (open) {
      if (editingItem) {
        setForm({
          title: editingItem.title ?? '',
          url:   editingItem.url ?? '',
          type:  editingItem.type ?? 'ppt',
        })
      } else {
        setForm(EMPTY_FORM)
      }
      setErrors({})
      setConfirmDelete(false)
    }
  }, [open, editingItem])

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))

  const validate = () => {
    const e = {}
    if (!form.title.trim()) e.title = 'Vui lòng nhập tên tài liệu'
    if (!form.url.trim()) e.url = 'Vui lòng nhập đường link'
    else if (!/^https?:\/\//i.test(form.url.trim()))
      e.url = 'Link phải bắt đầu bằng http:// hoặc https://'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    const data = {
      title: form.title.trim(),
      url:   form.url.trim(),
      type:  form.type,
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
      title={isEdit ? 'Sửa Tài Liệu' : 'Thêm Tài Liệu'}
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
              {isEdit ? 'Cập nhật' : 'Thêm tài liệu'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <Input
          label="Tên tài liệu"
          placeholder="VD: Slide Unit 5 - Present Perfect"
          value={form.title}
          onChange={e => set('title', e.target.value)}
          error={errors.title}
        />

        <Select
          label="Loại tài liệu"
          value={form.type}
          onChange={e => set('type', e.target.value)}
        >
          {MATERIAL_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </Select>

        <Input
          label="Đường link"
          placeholder="https://drive.google.com/..."
          value={form.url}
          onChange={e => set('url', e.target.value)}
          error={errors.url}
        />
      </div>
    </Modal>
  )
}
