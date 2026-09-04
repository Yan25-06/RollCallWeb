import { useState, useEffect } from 'react'
import { Modal, Input, Button, toast } from '@/components/ui'
import { MockTestSectionBuilder } from '@/components/mock-test/MockTestSectionBuilder'
import { DEFAULT_SKILL_CONFIG } from '@/services/classService'
import { COURSE_TYPES } from '@/utils/courseTypes'

const DAY_OPTIONS = [
  { value: 1, label: 'T2' },
  { value: 2, label: 'T3' },
  { value: 3, label: 'T4' },
  { value: 4, label: 'T5' },
  { value: 5, label: 'T6' },
  { value: 6, label: 'T7' },
  { value: 0, label: 'CN' },
]

const toSections = (skillConfig) =>
  skillConfig.map((sk, i) => ({ id: crypto.randomUUID(), name: sk.name, maxScore: 9, order: sk.order ?? i }))

const toSkillConfig = (sections) =>
  sections.map((s, i) => ({ name: s.name, order: i }))

export const ClassModal = ({ open, onClose, classItem = null, onSave, isAdmin = false, teachers = [] }) => {
  const [formData, setFormData] = useState({
    name: '',
    level: '',
    maxStudents: 0,
    courseType: COURSE_TYPES[0],
    scheduleDayList: [],
    startTime: '',
    endTime: '',
    room: '',
    startDate: '',
    teacherId: '',
  })
  const [skillSections, setSkillSections] = useState(() => toSections(DEFAULT_SKILL_CONFIG))
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (open) {
      if (classItem) {
        setFormData({
          name: classItem.name || '',
          level: classItem.level || '',
          maxStudents: classItem.maxStudents || 0,
          courseType: classItem.courseType || COURSE_TYPES[0],
          scheduleDayList: Array.isArray(classItem.scheduleDayList) ? classItem.scheduleDayList : [],
          startTime: classItem.startTime || '',
          endTime: classItem.endTime || '',
          room: classItem.room || '',
          startDate: classItem.startDate || '',
          teacherId: classItem.teacherId || '',
        })
        setSkillSections(toSections(classItem.skillConfig ?? DEFAULT_SKILL_CONFIG))
      } else {
        setFormData({
          name: '',
          level: '',
          maxStudents: 0,
          courseType: COURSE_TYPES[0],
          scheduleDayList: [],
          startTime: '',
          endTime: '',
          room: '',
          startDate: '',
          teacherId: '',
        })
        setSkillSections(toSections(DEFAULT_SKILL_CONFIG))
      }
      setErrors({})
    }
  }, [open, classItem])

  const handleChange = (e) => {
    const { name, value } = e.target
    let parsed = value
    if (name === 'maxStudents') {
      const digits = value.replace(/\D/g, '')
      parsed = Number(digits) || 0
    }
    setFormData(prev => ({ ...prev, [name]: parsed }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }))
  }

  const toggleDay = (d) => {
    setFormData(prev => ({
      ...prev,
      scheduleDayList: prev.scheduleDayList.includes(d)
        ? prev.scheduleDayList.filter(x => x !== d)
        : [...prev.scheduleDayList, d],
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    const newErrors = {}
    if (!formData.name.trim()) newErrors.name = 'Tên lớp là bắt buộc'
    if (isAdmin && !classItem && !formData.teacherId) newErrors.teacherId = 'Vui lòng chọn giáo viên'

    if (formData.scheduleDayList.length > 0) {
      if (!formData.startTime) newErrors.startTime = 'Vui lòng nhập giờ bắt đầu'
      if (!formData.endTime) newErrors.endTime = 'Vui lòng nhập giờ kết thúc'
      if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime)
        newErrors.endTime = 'Giờ kết thúc phải sau giờ bắt đầu'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onSave({ ...formData, maxStudents: Number(formData.maxStudents) || 0, skillConfig: toSkillConfig(skillSections) })
    toast.success(classItem ? 'Đã cập nhật lớp học!' : 'Đã thêm lớp học!')
    onClose()
  }

  const isNew = !classItem

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={classItem ? 'Sửa lớp học' : 'Thêm lớp học'}
      footer={
        <div className="flex gap-2 justify-end w-full">
          <Button variant="ghost" onClick={onClose}>Hủy</Button>
          <Button variant="primary" onClick={handleSubmit}>Lưu</Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">

        {/* Teacher selector — admin only, new class only */}
        {isAdmin && isNew && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-navy-700">
              Giáo viên phụ trách <span className="text-red-400 normal-case">*</span>
            </label>
            <select
              name="teacherId"
              value={formData.teacherId}
              onChange={handleChange}
              className={`select${errors.teacherId ? ' border-red-400 ring-1 ring-red-200' : ''}`}
            >
              <option value="">— Chọn giáo viên —</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name || t.email}
                </option>
              ))}
            </select>
            {errors.teacherId && (
              <p className="text-xs text-red-500">{errors.teacherId}</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Tên lớp"
            name="name"
            value={formData.name}
            onChange={handleChange}
            error={errors.name}
            placeholder="VD: IELTS 02"
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-navy-700">Phân loại (Tag)</label>
            <select
              name="courseType"
              value={formData.courseType}
              onChange={handleChange}
              className="select"
            >
              {COURSE_TYPES.map(ct => (
                <option key={ct} value={ct}>{ct}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Trình độ"
            name="level"
            value={formData.level}
            onChange={handleChange}
            placeholder="VD: 6.0+"
          />
          <Input
            label="Sĩ số tối đa"
            name="maxStudents"
            type="text"
            inputMode="numeric"
            value={formData.maxStudents || ''}
            onChange={handleChange}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-navy-700">Lịch học (Thứ)</label>
          <div className="flex flex-wrap gap-1.5">
            {DAY_OPTIONS.map(d => (
              <button
                key={d.value}
                type="button"
                onClick={() => toggleDay(d.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  formData.scheduleDayList.includes(d.value)
                    ? 'bg-navy-800 text-white border-navy-800'
                    : 'bg-white text-navy-600 border-navy-200 hover:border-navy-300'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Giờ bắt đầu"
            name="startTime"
            type="time"
            value={formData.startTime}
            onChange={handleChange}
            error={errors.startTime}
          />
          <Input
            label="Giờ kết thúc"
            name="endTime"
            type="time"
            value={formData.endTime}
            onChange={handleChange}
            error={errors.endTime}
          />
        </div>

        <Input
          label="Phòng học (tùy chọn)"
          name="room"
          value={formData.room}
          onChange={handleChange}
          placeholder="VD: Phòng 102"
        />

        <Input
          label="Ngày khai giảng"
          name="startDate"
          type="date"
          value={formData.startDate}
          onChange={handleChange}
        />

        {/* Skill config builder */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-navy-700">Cấu hình kỹ năng</label>
            <span className="text-xs text-navy-400">Dùng cho đánh giá & mock test</span>
          </div>
          <MockTestSectionBuilder sections={skillSections} onChange={setSkillSections} showMaxScore={false} />
        </div>
      </div>
    </Modal>
  )
}
