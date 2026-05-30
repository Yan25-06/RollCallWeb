import { useState, useEffect } from 'react'
import { Modal, Input, Select, Button, toast } from '@/components/ui'

export const StudentModal = ({ open, onClose, student = null, classes = [], onSave, isClassContext = false }) => {
  const [formData, setFormData] = useState({
    name: '',
    classId: '',
    grade: '',
    phone: '',
    note: '',
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (open) {
      if (student) {
        setFormData({
          name: student.name || '',
          classId: student.classId || '',
          grade: student.grade || '',
          phone: student.phone || '',
          note: student.note || '',
        })
      } else {
        setFormData({
          name: '',
          classId: classes.length > 0 ? classes[0].id : '',
          grade: '',
          phone: '',
          note: '',
        })
      }
      setErrors({})
    }
  }, [open, student, classes])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    const newErrors = {}
    if (!formData.name.trim()) newErrors.name = 'Họ và tên là bắt buộc'
    if (!formData.classId) newErrors.classId = 'Lớp học là bắt buộc'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onSave(formData)
    toast.success(student ? 'Đã cập nhật học sinh!' : 'Đã thêm học sinh!')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={student ? 'Sửa học sinh' : 'Thêm học sinh'}
      footer={
        <div className="flex gap-2 justify-end w-full">
          <Button variant="ghost" onClick={onClose}>Hủy</Button>
          <Button variant="primary" onClick={handleSubmit}>Lưu</Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <Input
          label="Họ và tên"
          name="name"
          value={formData.name}
          onChange={handleChange}
          error={errors.name}
          placeholder="Nhập họ và tên..."
        />

        <Select
          label="Lớp học"
          name="classId"
          value={formData.classId}
          onChange={handleChange}
          error={errors.classId}
          disabled={isClassContext}
        >
          <option value="">-- Chọn lớp học --</option>
          {classes.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Khối"
            name="grade"
            value={formData.grade}
            onChange={handleChange}
            placeholder="VD: Lớp 5"
          />
          <Input
            label="Số điện thoại"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="SĐT Phụ huynh"
          />
        </div>

        <Input
          label="Ghi chú"
          name="note"
          value={formData.note}
          onChange={handleChange}
          placeholder="Ghi chú thêm..."
        />
      </div>
    </Modal>
  )
}
