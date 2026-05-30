import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button, Input, toast } from '@/components/ui'
import { createSession, updateSession, getSessionsByClass } from '@/store/db'

// session prop = null → create mode | session object → edit mode
export const SessionModal = ({ open, onClose, classId, session = null, onSaved }) => {
  const isEdit = !!session

  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('09:30')
  const [topic, setTopic] = useState('')
  const [note, setNote] = useState('')
  const [confirmSameDay, setConfirmSameDay] = useState(false)

  useEffect(() => {
    if (!open) return
    if (isEdit) {
      setDate(session.date || '')
      setStartTime(session.startTime || '08:00')
      setEndTime(session.endTime || '09:30')
      setTopic(session.topic || '')
      setNote(session.note || '')
    } else {
      setDate(new Date().toISOString().split('T')[0])
      setStartTime('08:00')
      setEndTime('09:30')
      setTopic('')
      setNote('')
    }
    setConfirmSameDay(false)
  }, [open, session])

  const handleSubmit = () => {
    if (!date) { toast.error('Vui lòng chọn ngày học'); return }
    if (startTime >= endTime) { toast.error('Giờ kết thúc phải sau giờ bắt đầu'); return }

    if (isEdit) {
      updateSession(session.id, { date, startTime, endTime, topic, note })
      toast.success('Đã cập nhật buổi học')
      onSaved?.(session.id)
      onClose?.()
      return
    }

    // Create mode: warn if same day (excluding this session itself for edit)
    const existingSessions = getSessionsByClass(classId)
    const hasSameDay = existingSessions.some(s => s.date === date)
    if (hasSameDay && !confirmSameDay) {
      toast.warning('Đã có buổi học trong ngày này. Bạn có chắc muốn tạo thêm?')
      setConfirmSameDay(true)
      return
    }

    const newSession = createSession({ classId, date, startTime, endTime, topic, note })
    const dateFormatted = new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
    toast.success(`Đã tạo buổi ${dateFormatted}!`)
    onSaved?.(newSession.id)
    onClose?.()
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-navy-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="bg-white rounded-3xl shadow-navy-xl w-full max-w-md animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-navy-50 flex items-center justify-between">
          <h2 className="text-base font-semibold text-navy-900">
            {isEdit ? 'Chỉnh sửa buổi học' : 'Tạo buổi học mới'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-navy-400 hover:text-navy-700 hover:bg-navy-100 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
          <Input
            label="Ngày học"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <div className="flex gap-4">
            <Input
              label="Giờ bắt đầu"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
            <Input
              label="Giờ kết thúc"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
          <Input
            label="Chủ đề buổi học (không bắt buộc)"
            type="text"
            placeholder="VD: Unit 1 - Introduction"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-navy-600 uppercase tracking-wide">
              Ghi chú GV (không bắt buộc)
            </label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="Ghi chú nội bộ cho buổi học này..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {!isEdit && confirmSameDay && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm p-3 rounded-xl mt-2">
              <strong>Cảnh báo:</strong> Đã có buổi học trong ngày này. Bạn có chắc muốn tạo thêm? Bấm &ldquo;Tạo buổi học&rdquo; lần nữa để xác nhận.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-navy-50 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Hủy</Button>
          <Button variant="primary" onClick={handleSubmit}>
            {isEdit ? 'Lưu thay đổi' : 'Tạo buổi học'}
          </Button>
        </div>
      </div>
    </div>
  )
}
